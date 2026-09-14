import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState, type Delivery, type DeliveryLine, type PurchaseOrder, type LocId } from '../../store';
import { ConfirmSheet, DoneScreen, D, money, fmt, timeHM, shortDate, useToast, DEMO_TODAY } from '../../ui';
import { TEXT } from './text';
import { STAFF_RCV_MODULE, STAFF_RCV_SEED, type StaffRcvState } from './meta';
import { ensureSeed } from '../receiving/seed';
import { isToday, lastPriceFor, pvLabel, supName, supplierCat } from '../receiving/data';
import { PO_NOTES_AR } from '../purchasing/seed';

/** This tablet is the Main Kitchen receiving station (prototype chrome: "Main Kitchen"). */
const STATION: LocId = 'mk';
const TODAY = DEMO_TODAY.slice(0, 10);
import LogSheet, { type LogForm } from './views/LogSheet';

interface DoneInfo { status: 'ok' | 'issue'; supplier: string; inv: string; n: number; total: number; alerts: number }

/** STF-RCV-01 — Receiving Entry (staff tablet). */
export default function StaffReceiving() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [ms, setMs] = useModuleState<StaffRcvState>(STAFF_RCV_MODULE, STAFF_RCV_SEED);
  const [tab, setTab] = useState<'deliveries' | 'summary'>('deliveries');
  const [form, setForm] = useState<LogForm | null>(null);
  const [confirm, setConfirm] = useState<'ok' | 'issue' | null>(null);
  const [done, setDone] = useState<DoneInfo | null>(null);

  useEffect(() => { ensureSeed(store); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const st = store.state;
  const meta = ms.meta;
  // A delivery links to its PO directly (d.poId) or via the invoice (the seed keeps the link on the invoice, not the delivery row).
  const poIdOf = (d: Delivery): string | undefined => d.poId ?? st.invoices.find((i) => i.deliveryId === d.id)?.poId;
  // Only this station's deliveries count on this tablet (Main Kitchen).
  const todays = st.deliveries.filter((d) => isToday(d.ts) && d.loc === STATION).slice().sort((a, b) => a.ts.localeCompare(b.ts));
  const expected = st.purchaseOrders
    .filter((po) => {
      if (po.loc !== STATION) return false;
      if (po.status === 'sent' || po.status === 'partial') return true;
      // A PO already received still belongs on "Expected today" (as a Received chip) when it was due today or received today.
      if (po.status === 'received') return po.expected === TODAY || todays.some((d) => poIdOf(d) === po.id);
      return false;
    })
    .sort((a, b) => (a.expected ?? '').localeCompare(b.expected ?? '') || a.ts.localeCompare(b.ts));
  const receivedFor = (po: PurchaseOrder): Delivery | undefined => todays.find((d) => poIdOf(d) === po.id) ?? (po.status === 'received' ? st.deliveries.find((d) => poIdOf(d) === po.id) : undefined);
  const isIssue = (d: Delivery) => meta[d.id]?.issue ?? d.lines.some((l) => l.quality === 'issue' || (l.rejected ?? 0) > 0);

  const openLog = (po: PurchaseOrder | null) => {
    const ts = store.now();
    if (po) {
      const sup = st.suppliers.find((s) => s.id === po.supplierId);
      setForm({
        poId: po.id, supplierId: po.supplierId, name: supName(sup, isAr), inv: '', scan: null, note: '', time: timeHM(ts), ts, loc: po.loc,
        lines: po.lines.map((l) => ({ itemId: l.itemId, qty: String(Math.max(0, l.qty - (l.received ?? 0))), price: String(l.price), expiry: '', batch: '', temp: '', quality: 'ok', rejected: '', ordered: l.qty })),
      });
    } else {
      setForm({ poId: null, supplierId: null, name: '', inv: '', scan: null, note: '', time: timeHM(ts), ts, loc: 'mk', lines: [] });
    }
  };

  // Deep link from Purchasing: ?po=PO-2026-118 pre-fills the sheet from that order.
  const poParam = sp.get('po');
  const handled = useRef(false);
  useEffect(() => {
    if (!poParam || handled.current) return;
    const po = st.purchaseOrders.find((p) => p.id === poParam);
    if (po && (po.status === 'sent' || po.status === 'partial')) { handled.current = true; openLog(po); }
  }, [poParam, st.purchaseOrders]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSubmit = (status: 'ok' | 'issue') => {
    if (!form) return;
    const nameOk = form.name.trim().length > 0, invOk = form.inv.trim().length > 0, scanOk = !!form.scan, noteOk = form.note.trim().length > 0;
    if (!nameOk) { toast(t.needName, { dark: true }); return; }
    if (status === 'ok' && (!invOk || !scanOk)) { toast(!invOk ? t.needInv : t.needScan, { dark: true }); return; }
    if (status === 'issue' && !noteOk) { toast(t.needNote, { dark: true }); return; }
    setConfirm(status);
  };

  /** The real data chain: receiving movements, moving-average cost, Delivery + SupplierInvoice rows, PO progress, alert, audit. */
  const commit = () => {
    if (!form || !confirm) return;
    const f = form, status = confirm;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    let supplierId = f.supplierId;
    if (!supplierId) {
      const existing = st.suppliers.find((s) => s.name.toLowerCase() === f.name.trim().toLowerCase() || s.nameAr === f.name.trim());
      if (existing) supplierId = existing.id;
      else {
        const id = store.nextId('SUP');
        store.update((d) => { d.suppliers.push({ id, name: f.name.trim(), contact: '—', terms: 'COD', products: [], active: true, meta: { cat: { en: 'General', ar: 'عام' } } }); });
        supplierId = id;
      }
    }
    const sup = st.suppliers.find((s) => s.id === supplierId);
    const supLabel = sup ? supName(sup, isAr) : f.name.trim();
    const dlvId = store.nextId('DLV');
    const siId = store.nextId('SI');
    const invoiceNo = f.inv.trim() || '—';
    const lines: DeliveryLine[] = [];
    let worst = 0, total = 0, alerts = 0;
    for (const fl of f.lines) {
      const qty = parseFloat(fl.qty) || 0;
      const it = st.items.find((i) => i.id === fl.itemId);
      if (qty <= 0 || !it) continue;
      const factor = it.purchFactor ?? 1;
      const rejected = Math.min(qty, parseFloat(fl.rejected) || 0);
      const accepted = qty - rejected;
      const price = parseFloat(fl.price) || 0;
      const last = lastPriceFor(st, fl.itemId);
      const pv = last ? Math.round(((price - last) / last) * 1000) / 10 : 0;
      const baseQty = Math.round(accepted * factor * 1000) / 1000;
      // Item.cost is a single global figure, so weight the moving average by total on-hand across every location.
      const onHandBefore = Object.values(it.onHand).reduce((a, v) => a + (v ?? 0), 0);
      const oldCost = it.cost;
      const unitBaseCost = price / factor;
      const newCost = onHandBefore + baseQty > 0 ? (onHandBefore * oldCost + baseQty * unitBaseCost) / (onHandBefore + baseQty) : unitBaseCost;
      const newAvg = Math.round(newCost * 10000) / 10000;
      if (baseQty > 0) {
        store.postMovement({ itemId: fl.itemId, loc: f.loc, type: 'receiving', qty: baseQty, enteredQty: accepted, enteredUnit: it.purch, value: r2(accepted * price), source: invoiceNo, sourceKind: 'delivery', user: st.settings.staffUser, ts: f.ts });
        store.setItemCost(fl.itemId, newAvg);
      }
      lines.push({ itemId: fl.itemId, ordered: fl.ordered, received: qty, unit: it.purch, baseQty, unitPrice: price, lastPrice: last, variancePct: pv, expiry: fl.expiry.trim() || undefined, batch: fl.batch.trim() || undefined, temp: fl.temp.trim() || undefined, quality: fl.quality, rejected: rejected || undefined, oldAvg: oldCost, newAvg });
      if (Math.abs(pv) > Math.abs(worst)) worst = pv;
      total += accepted * price;
      if (Math.abs(pv) >= st.settings.ppvRedPct) {
        alerts += 1;
        store.addAlert({ severity: 'red', type: 'price_up', loc: f.loc, moduleId: 'receiving',
          en: `${it.en} price ${pvLabel(pv)} vs last receipt (${sup?.name ?? f.name.trim()})`,
          ar: `سعر ${it.ar} ${pvLabel(pv)} مقارنة بآخر استلام (${sup ? (sup.nameAr ?? sup.name) : f.name.trim()})` });
      }
    }
    total = r2(total);
    const sid = supplierId;
    store.update((d) => {
      d.deliveries.push({ id: dlvId, ts: f.ts, supplierId: sid, invoiceNo, loc: f.loc, lines, total, receivedBy: d.settings.staffUser, status: 'received', worstVariancePct: worst, poId: f.poId ?? undefined, scanUrl: f.scan?.url });
      d.invoices.push({ id: siId, supplierId: sid, invoiceNo, date: f.ts.slice(0, 10), amount: total, currency: 'USD', stage: 'received', deliveryId: dlvId, poId: f.poId ?? undefined, loc: f.loc, note: f.note.trim() || undefined });
      if (f.poId) {
        const po = d.purchaseOrders.find((p) => p.id === f.poId);
        if (po) {
          // Advance PO fulfilment by the accepted quantity only; rejected units stay recorded on the DeliveryLine.
          for (const l of lines) { const pl = po.lines.find((x) => x.itemId === l.itemId); if (pl) pl.received = (pl.received ?? 0) + (l.received - (l.rejected ?? 0)); }
          const allIn = po.lines.every((pl) => (pl.received ?? 0) >= pl.qty);
          po.status = allIn || lines.length === 0 ? 'received' : 'partial';
        }
      }
    });
    store.logAudit({ action: status === 'issue' ? 'Delivery submitted with issue' : 'Delivery submitted', entity: `${dlvId} · ${sup?.name ?? f.name.trim()} · ${invoiceNo}`, newValue: `${lines.length} lines · ${money(total)}`, user: st.settings.staffUser, moduleId: 'staff-receiving' });
    setMs((dr) => { dr.meta[dlvId] = { note: f.note.trim(), issue: status === 'issue', scan: !!f.scan }; });
    setConfirm(null); setForm(null);
    setDone({ status, supplier: supLabel, inv: invoiceNo, n: lines.length, total, alerts });
    toast(status === 'issue' ? t.issueToast : t.okToast, { dark: true });
  };

  /* ── derived rows ── */
  const statusChip = (issue: boolean) => issue
    ? { chip: t.withIssue, bg: D.amberChip, fg: D.gold, border: D.amberBorder }
    : { chip: t.received, bg: D.greenBg, fg: D.greenFg, border: D.border };
  const awaiting = expected.filter((po) => !receivedFor(po));
  const issueCount = todays.filter(isIssue).length;
  const statTiles = [
    { label: t.expected, val: expected.length, fg: D.text, bg: D.card3, border: D.headerBorder },
    { label: t.received, val: todays.length, fg: D.greenFg, bg: '#161F19', border: D.border },
    { label: t.withIssue, val: issueCount, fg: D.gold, bg: '#1E1B14', border: D.amberChip },
    { label: t.awaiting, val: awaiting.length, fg: D.text2, bg: D.card3, border: D.headerBorder },
  ];
  const segBtn = (on: boolean): React.CSSProperties => ({ height: 44, padding: '0 22px', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: on ? D.cream : 'transparent', color: on ? D.onCream : D.muted });

  if (done) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, color: D.text }}>
        <DoneScreen title={done.status === 'issue' ? t.issueToast : t.okToast}
          body={<span><span>{done.supplier} · <span dir="ltr">{done.inv}</span> · {done.n ? <>{done.n} {t.linesPosted} · <span dir="ltr">{money(done.total)}</span></> : t.noLines}</span><br />{t.doneBody}{done.alerts ? <><br /><span style={{ color: D.redFg }}>{t.priceAlert} × {done.alerts}</span></> : null}</span>}
          action={t.backToDeliveries} onAction={() => { setDone(null); setTab('deliveries'); }} />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, color: D.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px 0', flex: 'none' }}>
        <div style={{ display: 'flex', gap: 6, background: D.card3, border: `1px solid ${D.headerBorder}`, borderRadius: 14, padding: 5 }}>
          <button onClick={() => setTab('deliveries')} style={segBtn(tab === 'deliveries')}>{t.tabDeliv}</button>
          <button onClick={() => setTab('summary')} style={segBtn(tab === 'summary')}>{t.tabSummary}</button>
        </div>
        <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: D.headerBorder, color: D.muted }}>STF-RCV-01</span>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 15, color: D.muted }} dir="ltr">{t.todayLabel}</div>
      </div>

      {tab === 'deliveries' && (
        <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{t.expectedToday}</div>
              <div style={{ fontSize: 14, color: D.muted }}>{t.fromPurchasing}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
              {expected.map((po) => {
                const got = receivedFor(po);
                const partial = po.status === 'partial';
                const issue = got ? isIssue(got) : false;
                const done = !!got && !partial;                 // fully received (Received/issue chip, inert card)
                const tappable = partial || !got;                // partial orders stay tappable to log the remaining balance
                const sup = st.suppliers.find((s) => s.id === po.supplierId);
                const chip = partial ? t.partial : done ? (issue ? t.withIssue : t.received) : t.expected;
                const chipBg = partial ? D.amberChip : done ? (issue ? D.amberChip : D.greenBg) : D.headerBorder;
                const chipFg = partial ? D.gold : done ? (issue ? D.gold : D.greenFg) : D.muted;
                const noteText = po.note ? (isAr && PO_NOTES_AR[po.id] ? PO_NOTES_AR[po.id] : po.note) : '';
                return (
                  <button key={po.id} onClick={() => { if (tappable) openLog(po); }}
                    style={{ textAlign: 'start', border: `1px solid ${done ? D.border : D.border3}`, background: done ? '#141714' : D.card, borderRadius: 18, padding: '16px 18px', cursor: tappable ? 'pointer' : 'default', fontFamily: 'inherit', color: D.text }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 700 }}>{supName(sup, isAr)}</div>
                      <span style={{ fontSize: 12, padding: '5px 11px', borderRadius: 999, background: chipBg, color: chipFg, fontWeight: 600, whiteSpace: 'nowrap' }}>{chip}</span>
                    </div>
                    <div style={{ fontSize: 14, color: D.muted, marginTop: 6 }}>{sup ? supplierCat(st, sup, isAr) : '—'} · <span dir="ltr">{po.id}</span></div>
                    <div style={{ fontSize: 13.5, color: '#7E877B', marginTop: 3 }}>{po.lines.length} {t.items} · {t.dueBy} <span dir="ltr">{po.expected ? shortDate(po.expected, isAr) : '—'}</span></div>
                    {noteText && <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: '#26211A', border: `1px solid ${D.amberBorder}`, fontSize: 13, color: D.gold, lineHeight: 1.45 }}>{t.noteFromPurchasing}: {noteText}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => openLog(null)} style={{ textAlign: 'start', border: `1.5px dashed ${D.border3}`, background: 'transparent', borderRadius: 18, padding: '18px 20px', cursor: 'pointer', fontFamily: 'inherit', color: D.text2, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: D.key, border: `1px solid ${D.border3}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: D.greenDot, flex: 'none' }}>＋</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: D.text }}>{t.arrivedTitle}</div>
              <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{t.arrivedSub}</div>
            </div>
          </button>

          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>{t.loggedToday} ({todays.length})</div>
            {todays.length === 0 && <div style={{ padding: 26, textAlign: 'center', color: D.dim, fontSize: 15, border: `1px dashed ${D.border}`, borderRadius: 16 }}>{t.noLogged}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todays.slice().reverse().map((d) => {
                const sc = statusChip(isIssue(d));
                const m = meta[d.id];
                const sup = st.suppliers.find((s) => s.id === d.supplierId);
                return (
                  <div key={d.id} style={{ border: `1px solid ${sc.border}`, background: D.card, borderRadius: 16, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>{supName(sup, isAr)}</div>
                        <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}><span dir="ltr">{d.invoiceNo} · {timeHM(d.ts)}</span> · {d.lines.length} {t.items} · <span dir="ltr">{money(d.total)}</span></div>
                      </div>
                      <span style={{ fontSize: 13, padding: '6px 13px', borderRadius: 999, background: sc.bg, color: sc.fg, fontWeight: 600, whiteSpace: 'nowrap' }}>{sc.chip}</span>
                    </div>
                    {m?.note && <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, background: '#26211A', border: `1px solid ${D.amberBorder}`, fontSize: 14, color: D.gold, lineHeight: 1.5 }}>{t.noteFor} {m.note}</div>}
                    <div style={{ fontSize: 12.5, color: D.dim, marginTop: 8 }}>{t.handoff}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'summary' && (
        <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 24px 28px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            {statTiles.map((s, i) => (
              <div key={i} style={{ flex: 1, minWidth: 150, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, color: D.muted, textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.label}</div>
                <div style={{ fontSize: 34, fontWeight: 700, marginTop: 4, color: s.fg }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ border: `1px solid ${D.headerBorder}`, background: '#141714', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px 160px', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${D.headerBorder}`, fontSize: 13, color: D.muted, textTransform: 'uppercase', letterSpacing: '.3px' }}>
              <div dir="ltr">{t.colTime}</div><div>{t.colSupplier}</div><div dir="ltr">{t.colInvoice}</div><div style={{ textAlign: 'end' }}>{t.colStatus}</div>
            </div>
            {todays.map((d) => {
              const sc = statusChip(isIssue(d));
              const m = meta[d.id];
              const sup = st.suppliers.find((s) => s.id === d.supplierId);
              return (
                <div key={d.id} style={{ padding: '0 20px', borderBottom: '1px solid #20251F' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px 160px', gap: 12, alignItems: 'center', padding: '13px 0' }}>
                    <div style={{ fontSize: 15, color: D.text2 }} dir="ltr">{timeHM(d.ts)}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, minWidth: 0 }}>{supName(sup, isAr)}</div>
                    <div style={{ fontSize: 15, color: D.text2 }} dir="ltr">{d.invoiceNo}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 13, padding: '6px 13px', borderRadius: 999, background: sc.bg, color: sc.fg, fontWeight: 600, whiteSpace: 'nowrap' }}>{sc.chip}</span></div>
                  </div>
                  {m?.note && <div style={{ padding: '0 0 12px', fontSize: 13.5, color: D.gold, lineHeight: 1.5 }}>{t.noteFor} {m.note}</div>}
                </div>
              );
            })}
            {awaiting.map((po) => {
              const sup = st.suppliers.find((s) => s.id === po.supplierId);
              return (
                <div key={po.id} style={{ padding: '0 20px', borderBottom: '1px solid #20251F' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px 160px', gap: 12, alignItems: 'center', padding: '13px 0' }}>
                    <div style={{ fontSize: 15, color: D.text2 }} dir="ltr">—</div>
                    <div style={{ fontSize: 16, fontWeight: 600, minWidth: 0 }}>{supName(sup, isAr)}</div>
                    <div style={{ fontSize: 15, color: D.text2 }} dir="ltr">—</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 13, padding: '6px 13px', borderRadius: 999, background: D.headerBorder, color: D.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{t.awaiting}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 13, color: D.dim, marginTop: 12, lineHeight: 1.6 }}>{t.summaryFoot}</div>
        </div>
      )}

      {form && <LogSheet form={form} setForm={setForm} onCancel={() => setForm(null)} onSubmit={doSubmit} />}

      <ConfirmSheet open={!!confirm} title={t.confirmTitle} onCancel={() => setConfirm(null)} onConfirm={commit} cta={confirm === 'issue' ? t.submitIssue : t.submitOk}
        body={form ? <span><span>{form.name.trim()} · <span dir="ltr">{form.inv.trim() || '—'}</span> · {form.lines.filter((l) => (parseFloat(l.qty) || 0) > 0).length} {t.items}</span><br />{t.confirmBody}</span> : undefined}>
        {form && form.lines.some((l) => (parseFloat(l.qty) || 0) > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.lines.filter((l) => (parseFloat(l.qty) || 0) > 0).map((l) => {
              const it = store.item(l.itemId);
              const qty = parseFloat(l.qty) || 0, rej = Math.min(qty, parseFloat(l.rejected) || 0), price = parseFloat(l.price) || 0;
              const last = lastPriceFor(st, l.itemId);
              const pv = last ? Math.round(((price - last) / last) * 1000) / 10 : 0;
              const tone = Math.abs(pv) >= st.settings.ppvRedPct ? D.redFg : Math.abs(pv) >= st.settings.ppvAmberPct ? D.gold : D.greenFg;
              return (
                <div key={l.itemId} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{it ? (isAr ? it.ar : it.en) : l.itemId}</span>
                  <span dir="ltr" style={{ color: D.text2 }}>{fmt(qty - rej)} {it?.purch} × {money(price)}</span>
                  <span dir="ltr" style={{ color: tone, fontWeight: 600 }}>{pvLabel(pv)}</span>
                </div>
              );
            })}
          </div>
        )}
      </ConfirmSheet>
    </div>
  );
}
