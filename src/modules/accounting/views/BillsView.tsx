import React, { useMemo, useState } from 'react';
import { Btn, Modal, Notice, P, money, num, shortDate, useToast, DEMO_TODAY } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { SupplierInvoice } from '../../../store';
import { useModuleNav } from '../../../shell/DesktopShell';
import { TEXT } from '../text';
import { lbpShort, money0 } from '../helpers';

const GRID = 'minmax(130px,1.4fr) minmax(90px,1fr) 80px 90px minmax(90px,1fr) 96px 110px';
type BillSt = 'open' | 'partial' | 'paid' | 'overdue';

export default function BillsView({ focusId }: { focusId: string | null }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const rate = store.state.settings.fxRate;
  const today = DEMO_TODAY.slice(0, 10);
  const weekEnd = '2026-08-18';
  const [payId, setPayId] = useState<string | null>(null);

  const stOf = (i: SupplierInvoice): BillSt => i.stage === 'paid' ? 'paid' : (i.paidAmount && i.paidAmount < i.amount) ? 'partial' : (i.due && i.due < today) ? 'overdue' : 'open';
  const usdOf = (i: SupplierInvoice, amt = i.amount) => (i.currency === 'USD' ? amt : amt / rate);
  const ORDER: Record<BillSt, number> = { overdue: 0, partial: 1, open: 2, paid: 3 };

  const bills = useMemo(() => store.state.invoices
    .filter((i) => (i.stage === 'approved' || i.stage === 'paid') && store.inScope(i.loc))
    .map((i) => ({ i, st: stOf(i) }))
    .sort((a, b) => ORDER[a.st] - ORDER[b.st] || (a.i.due ?? '').localeCompare(b.i.due ?? '')), [store]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBills = bills.filter((b) => b.st !== 'paid');
  const owedOf = (b: { i: SupplierInvoice }) => b.i.amount - (b.i.paidAmount ?? 0);
  const totalOwed = openBills.reduce((a, b) => a + usdOf(b.i, owedOf(b)), 0);
  const overdue = openBills.filter((b) => b.st === 'overdue').reduce((a, b) => a + usdOf(b.i, owedOf(b)), 0);
  const dueWeek = openBills.filter((b) => b.i.due && b.i.due >= today && b.i.due <= weekEnd).reduce((a, b) => a + usdOf(b.i, owedOf(b)), 0);
  const owedUsd = openBills.filter((b) => b.i.currency === 'USD').reduce((a, b) => a + owedOf(b), 0);
  const owedLbp = openBills.filter((b) => b.i.currency === 'LBP').reduce((a, b) => a + owedOf(b), 0);

  const stMap: Record<BillSt, [string, string, string]> = { open: [t.open, P.blueBg, P.blueFg], partial: [t.partial, P.amberPill, P.amberFg], paid: [t.paidSt, P.greenBg, P.greenFg], overdue: [t.overdueSt, P.redPill, P.redFg] };
  const amountOf = (i: SupplierInvoice) => (i.currency === 'USD' ? money(i.amount) : `${lbpShort(i.amount)} LBP`);

  const paying = payId ? store.state.invoices.find((i) => i.id === payId) : undefined;
  const pay = () => {
    if (!paying) return;
    const amt = paying.amount - (paying.paidAmount ?? 0);
    store.update((d) => { const x = d.invoices.find((y) => y.id === paying.id); if (x) { x.stage = 'paid'; x.paidAmount = x.amount; x.paymentMethod = 'cash'; } });
    store.logAudit({ action: 'Supplier bill paid from central cash', entity: `${paying.id} · ${store.supplierName(paying.supplierId)} · ${paying.invoiceNo}`, newValue: paying.currency === 'USD' ? money(amt) : `${num(amt)} LL (= ${money(amt / rate)})`, moduleId: 'accounting' });
    setPayId(null);
    toast(t.payToast);
  };

  const kpi = (label: string, value: React.ReactNode, tone?: 'red' | 'amber', small?: boolean) => {
    const bg = tone === 'red' ? P.redBg : tone === 'amber' ? P.amberBg : P.surface;
    const bd = tone === 'red' ? P.redBorder : tone === 'amber' ? P.amberBorder : P.border;
    const fg = tone === 'red' ? P.redFg : tone === 'amber' ? P.amberFg : undefined;
    return (
      <div style={{ flex: 1, minWidth: 160, background: bg, border: `1px solid ${bd}`, borderRadius: 12, padding: '12px 16px' }}>
        <div style={{ fontSize: 11.5, color: fg ?? P.text3, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: small ? 15 : 23, fontWeight: 700, marginTop: small ? 6 : 2, color: fg }} dir="ltr">{value}</div>
      </div>
    );
  };

  return (
    <div style={{ padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        {kpi(t.totalOwed, money0(totalOwed))}
        {kpi(t.overdue, money0(overdue), 'red')}
        {kpi(t.dueWeek, money0(dueWeek), 'amber')}
        {kpi(t.byCurrency, `${money0(owedUsd)} · ${owedLbp ? lbpShort(owedLbp) : '0'} LBP`, undefined, true)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: P.text3, flex: 1, minWidth: 260 }}>{t.billsHint}</span>
        <button onClick={() => go('invoice-pipeline')} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>{t.openPipeline}</button>
      </div>
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '10px 16px', fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
          <div>{t.supplier}</div><div>{t.invoice}</div><div>{t.due}</div><div style={{ textAlign: 'end' }}>{t.amount}</div><div>{t.linkedRcv}</div><div>{t.status}</div><div></div>
        </div>
        {bills.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.text4, fontSize: 13.5 }}>{t.noBills}</div>}
        {bills.map(({ i, st }) => {
          const sm = stMap[st];
          const focused = focusId === i.id;
          return (
            <div key={i.id} className="row-hover" onClick={() => go('invoice-review', { params: { id: i.id } })}
              style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '10px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: focused ? P.hover : st === 'overdue' ? '#FBF6F0' : 'transparent', cursor: 'pointer' }}>
              <div style={{ fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.supplierName(i.supplierId)}</div>
              <div style={{ color: P.text3, fontSize: 12 }} dir="ltr">{i.invoiceNo}</div>
              <div style={{ color: st === 'overdue' ? P.redFg : P.text3, fontSize: 12.5 }} dir="ltr">{i.due ? shortDate(i.due, isAr) : '—'}</div>
              <div style={{ textAlign: 'end', fontWeight: 700 }} dir="ltr">{amountOf(i)}</div>
              <div>{i.deliveryId ? <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); go('receiving', { params: { id: i.deliveryId as string } }); }} style={{ fontSize: 12, color: P.blueFg }} dir="ltr">{i.deliveryId}</a> : <span style={{ color: P.text4 }}>—</span>}</div>
              <div><span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: sm[1], color: sm[2], whiteSpace: 'nowrap' }}>{sm[0]}</span></div>
              <div style={{ textAlign: 'end' }}>
                {st !== 'paid' && (
                  <button onClick={(e) => { e.stopPropagation(); setPayId(i.id); }} style={{ height: 28, padding: '0 12px', borderRadius: 7, border: 'none', background: P.ink, color: P.onInk, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.recordPayment}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: P.text4, marginTop: 8 }}>{t.billsFoot}</div>

      <Modal open={!!paying} onClose={() => setPayId(null)} width={500} title={paying ? `${t.payTitle} — ${store.supplierName(paying.supplierId)}` : t.payTitle} sub={t.payBody.replace('90,000', num(rate))}
        footer={<>
          <Btn size="lg" variant="ghost" style={{ flex: 1, borderRadius: 10 }} onClick={() => setPayId(null)}>{t.cancel}</Btn>
          <Btn size="lg" variant="primary" style={{ flex: 1.4, fontWeight: 700, borderRadius: 10 }} onClick={pay}>{t.payCta}</Btn>
        </>}>
        {paying && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: P.text2, flexWrap: 'wrap' }}>
              <span>{t.invoice} <b dir="ltr">{paying.invoiceNo}</b></span>
              <span>{t.amount} <b dir="ltr">{amountOf(paying)}</b>{paying.currency === 'LBP' && <span style={{ color: P.text4 }} dir="ltr"> (= {money(paying.amount / rate)})</span>}</span>
              <span>{t.payMethod} <b>{t.methods.cash}</b></span>
            </div>
            <Notice tone="amber">{t.payWarn}</Notice>
          </div>
        )}
      </Modal>
    </div>
  );
}
