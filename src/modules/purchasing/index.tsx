import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState, type Delivery, type PurchaseOrder, type SupplierInvoice } from '../../store';
import { useModuleNav, ModuleView } from '../../shell/DesktopShell';
import { Page, PageHeader, LocationSelector, ConfirmModal, Btn, money, useToast } from '../../ui';
import { TEXT } from './text';
import { ensureSeed } from '../receiving/seed';
import { supName } from '../receiving/data';
import OrdersView from './views/OrdersView';
import ReceivedView from './views/ReceivedView';
import SuppliersView from './views/SuppliersView';
import { CreateOrderModal, AddProductModal, NewSupplierModal, type CreateInitial, type DraftPayload, type NewSupplierInput } from './views/modals';

interface PurState { catalog: Record<string, string[]>; unitOverrides: Record<string, string> }
const PUR_SEED: PurState = { catalog: {}, unitOverrides: {} };

const TABS = ['po', 'orders', 'invoice', 'sup'] as const;
type Tab = typeof TABS[number];

/** Purchasing — order requests (MGT-PUR-01), received suppliers, embedded invoice review (PUR-INV-01), suppliers (PUR-SUP-01). */
export default function Purchasing() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [sp, setSp] = useSearchParams();
  const [ms, setMs] = useModuleState<PurState>('purchasing', PUR_SEED);

  const idParam = sp.get('id');
  const tabParam = sp.get('tab');
  const initTab: Tab = (TABS as readonly string[]).includes(tabParam ?? '') ? (tabParam as Tab) : idParam?.startsWith('SUP-') ? 'sup' : idParam?.startsWith('DLV-') ? 'orders' : 'po';
  const [tab, setTab] = useState<Tab>(initTab);
  const [poId, setPoId] = useState<string | null>(idParam?.startsWith('PO-') ? idParam : null);
  const [recId, setRecId] = useState<string | null>(idParam?.startsWith('DLV-') ? idParam : null);
  const [supId, setSupId] = useState<string | null>(idParam?.startsWith('SUP-') ? idParam : null);
  const [create, setCreate] = useState<CreateInitial | null>(null);
  const [addProd, setAddProd] = useState(false);
  const [newSup, setNewSup] = useState(false);
  const [cancelPo, setCancelPo] = useState<PurchaseOrder | null>(null);

  useEffect(() => { ensureSeed(store); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const st = store.state;
  const currentSup = st.suppliers.filter((s) => s.active).find((s) => s.id === supId) ?? st.suppliers.find((s) => s.active);
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const nextPoId = () => {
    let max = 100;
    for (const p of st.purchaseOrders) { const m = /^PO-2026-(\d+)$/.exec(p.id); if (m) max = Math.max(max, parseInt(m[1], 10)); }
    return `PO-2026-${max + 1}`;
  };

  /* ── store actions ── */
  const openCreate = (supplierId: string | null = null) => setCreate({ supplierId, loc: store.scope === 'all' ? 'mk' : store.scope, draft: {}, prices: {}, note: '', editId: null });
  const editPo = (po: PurchaseOrder) => setCreate({ supplierId: po.supplierId, loc: po.loc, draft: Object.fromEntries(po.lines.map((l) => [l.itemId, l.qty])), prices: Object.fromEntries(po.lines.map((l) => [l.itemId, l.price])), note: po.note ?? '', editId: po.id });

  const submitOrder = (p: DraftPayload, status: 'sent' | 'draft') => {
    const total = r2(p.lines.reduce((a, l) => a + l.qty * l.price, 0));
    const sup = st.suppliers.find((s) => s.id === p.supplierId);
    const id = p.editId ?? nextPoId();
    if (p.editId) {
      store.update((d) => {
        const po = d.purchaseOrders.find((x) => x.id === p.editId);
        if (!po) return;
        po.supplierId = p.supplierId; po.loc = p.loc; po.lines = p.lines.map((l) => ({ ...l })); po.total = total; po.note = p.note || undefined;
        if (status === 'sent') po.status = 'sent';
      });
    } else {
      const ts = store.now();
      store.update((d) => {
        d.purchaseOrders.unshift({ id, ts, supplierId: p.supplierId, loc: p.loc, status, lines: p.lines.map((l) => ({ ...l })), total, expected: '2026-08-13', createdBy: d.settings.currentUser, note: p.note || undefined });
      });
    }
    store.logAudit({ action: status === 'sent' ? 'Order request sent' : 'Order request saved as draft', entity: `${id} · ${sup?.name ?? p.supplierId}`, newValue: `${p.lines.length} lines · ${money(total)}`, moduleId: 'purchasing' });
    setCreate(null); setTab('po'); setPoId(id);
    toast(status === 'sent' ? t.orderToast : t.draftToast);
  };

  const sendPo = (po: PurchaseOrder) => {
    store.update((d) => { const x = d.purchaseOrders.find((y) => y.id === po.id); if (x) x.status = 'sent'; });
    store.logAudit({ action: 'Order request sent', entity: `${po.id} · ${store.supplierName(po.supplierId)}`, oldValue: 'draft', newValue: 'sent', moduleId: 'purchasing' });
    toast(t.orderToast);
  };
  const confirmCancel = () => {
    if (!cancelPo) return;
    const po = cancelPo;
    store.update((d) => { const x = d.purchaseOrders.find((y) => y.id === po.id); if (x) x.status = 'cancelled'; });
    store.logAudit({ action: 'Order request cancelled', entity: `${po.id} · ${store.supplierName(po.supplierId)}`, oldValue: po.status, newValue: 'cancelled', moduleId: 'purchasing' });
    setCancelPo(null);
    toast(t.cancelToast);
  };
  const receivePo = (po: PurchaseOrder) => go('staff-receiving', { params: { po: po.id } });
  const openInvoice = (inv: SupplierInvoice | undefined, fallback?: string) => {
    setTab('invoice');
    setSp({ tab: 'invoice', id: inv?.id ?? fallback ?? '' });
    toast(t.invToast);
  };
  const invoiceForPo = (po: PurchaseOrder) => {
    const direct = st.invoices.find((i) => i.poId === po.id);
    const dlv = st.deliveries.find((d) => d.poId === po.id);
    openInvoice(direct ?? (dlv ? st.invoices.find((i) => i.deliveryId === dlv.id) : undefined), po.id);
  };
  const reviewDelivery = (d: Delivery) => openInvoice(st.invoices.find((i) => i.deliveryId === d.id), d.id);

  const saveProduct = (name: string, unit: string, cost: number) => {
    if (!currentSup) return;
    const id = store.nextId('RM');
    const supId2 = currentSup.id;
    store.update((d) => {
      const s = d.suppliers.find((x) => x.id === supId2);
      d.items.push({ id, en: name, ar: name, type: 'raw', cat: 'Catalog', catAr: 'كتالوج', base: unit, purch: unit, purchFactor: 1, cost, supplier: supId2, stocked: true, onHand: {} });
      if (s && !s.products.includes(id)) s.products.push(id);
    });
    setMs((dr) => { dr.catalog[supId2] = [...(dr.catalog[supId2] ?? []), id]; });
    store.logAudit({ action: 'Catalog product added', entity: `${supId2} · ${name}`, newValue: `${money(cost)} / ${unit}`, moduleId: 'purchasing' });
    setAddProd(false);
    toast(t.addProductToast);
  };
  const saveSupplier = (ns: NewSupplierInput) => {
    let n = st.suppliers.length + 1;
    let id = 'SUP-' + String(n).padStart(2, '0');
    while (st.suppliers.some((s) => s.id === id)) { n += 1; id = 'SUP-' + String(n).padStart(2, '0'); }
    const cat = ns.cat.trim() || (isAr ? 'عام' : 'General');
    store.update((d) => {
      d.suppliers.push({ id, name: ns.name, contact: ns.contact.trim() || '—', phone: ns.phone.trim() || undefined, terms: ns.terms.trim() || 'Net 30', products: [], spendMonth: 0, active: true, meta: { cat: { en: cat, ar: cat }, isNew: true } });
    });
    store.logAudit({ action: 'Supplier created', entity: `${id} · ${ns.name}`, moduleId: 'purchasing' });
    setNewSup(false); setTab('sup'); setSupId(id);
    toast(t.newSupplierSaved);
  };

  const screenId = tab === 'invoice' ? 'PUR-INV-01' : tab === 'sup' ? 'PUR-SUP-01' : 'MGT-PUR-01';
  const tabs = Object.assign([
    { value: 'po', label: t.tabPo, badge: st.purchaseOrders.filter((p) => store.inScope(p.loc) && (p.status === 'sent' || p.status === 'partial')).length || undefined },
    { value: 'orders', label: t.tabOrders, badge: st.deliveries.filter((d) => store.inScope(d.loc) && !st.invoices.some((i) => i.deliveryId === d.id && i.stage !== 'received')).length || undefined },
    { value: 'invoice', label: t.tabInvoice },
    { value: 'sup', label: t.tabSuppliers },
  ], { active: tab, onChange: (v: string) => setTab(v as Tab) });

  return (
    <Page>
      <PageHeader title={t.title} screenId={screenId} tabs={tabs}
        right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><LocationSelector /><Btn variant="primary" onClick={() => openCreate()}>＋ {t.newOrder}</Btn></div>} />

      {tab === 'po' && <OrdersView poId={poId} setPoId={setPoId} onCreate={() => openCreate()} onEdit={editPo} onSend={sendPo} onCancel={setCancelPo} onReceive={receivePo} onInvoice={invoiceForPo} />}
      {tab === 'orders' && <ReceivedView recId={recId} setRecId={setRecId} onCreate={() => openCreate()} onReview={reviewDelivery} />}
      {tab === 'invoice' && <div style={{ flex: 1, minHeight: 0, display: 'flex' }}><div style={{ flex: 1, minWidth: 0, minHeight: 0 }}><ModuleView id="invoice-review" embedded /></div></div>}
      {tab === 'sup' && (
        <SuppliersView supId={currentSup?.id ?? null} setSupId={setSupId} catalog={ms.catalog} unitOverrides={ms.unitOverrides}
          setUnitOverride={(k, u) => setMs((dr) => { dr.unitOverrides[k] = u; })}
          onNewSupplier={() => setNewSup(true)} onAddProduct={() => setAddProd(true)} onOrderFrom={(id) => openCreate(id)} onOpenInvoice={(inv) => openInvoice(inv)} />
      )}

      {create && <CreateOrderModal key={create.editId ?? create.supplierId ?? 'new'} initial={create} onClose={() => setCreate(null)} onSubmit={submitOrder}
        onCatalogAdd={(sid, itemId) => setMs((dr) => { dr.catalog[sid] = [...(dr.catalog[sid] ?? []), itemId]; })} />}
      <AddProductModal open={addProd} supplier={currentSup} onClose={() => setAddProd(false)} onSave={saveProduct} />
      <NewSupplierModal open={newSup} onClose={() => setNewSup(false)} onSave={saveSupplier} />
      <ConfirmModal open={!!cancelPo} onCancel={() => setCancelPo(null)} onConfirm={confirmCancel} title={t.cancelQ} ctaVariant="danger" cta={t.cancelCta}
        body={cancelPo ? <span><span dir="ltr">{cancelPo.id}</span> · {supName(st.suppliers.find((s) => s.id === cancelPo.supplierId), isAr)} · <span dir="ltr">{money(cancelPo.lines.reduce((a, l) => a + l.qty * l.price, 0))}</span><br />{t.cancelBody}</span> : undefined} />
    </Page>
  );
}
