import React, { useState } from 'react';
import { Modal, Btn, Input, Select, Toggle, useToast, money, lbp, shortDate, P } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { Supplier, SupplierInvoice } from '../../../store';
import { useModuleNav } from '../../../shell/DesktopShell';
import { TEXT } from '../text';
import { PRICE_HISTORY, PRICE_TREND, SUP_CAT, TERMS_AR, TERMS_OPTIONS } from '../data';

const MODULE_ID = 'master-data';
interface Form { mode: 'new' | 'edit'; id?: string; name: string; nameAr: string; contact: string; phone: string; terms: string; active: boolean }
/** PPV bands (amber/red %) come from settings so this screen agrees with MGT-RCV-03. */
const trendStyle = (v: number, amber: number, red: number): [string, string] => (v > red ? ['#F0CFC9', '#96382E'] : Math.abs(v) > amber ? ['#F5E3B3', '#8A6D1F'] : ['#E0E8DA', '#48603A']);
const dotColor = (pctv: number, amber: number, red: number) => (pctv > red ? '#C0392B' : Math.abs(pctv) > amber ? '#C99A2E' : '#48603A');

export default function SuppliersView({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { lang, isAr, fwdGlyph } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const st = store.state;
  const fx = st.settings.fxRate;
  const { ppvAmberPct: amber, ppvRedPct: red } = st.settings;
  const [form, setForm] = useState<Form | null>(null);

  const list = st.suppliers;
  const sup = list.find((s) => s.id === selectedId) ?? list[0];
  const nm = (s: Supplier) => (isAr && s.nameAr ? s.nameAr : s.name);
  const catOf = (s: Supplier) => { const c = SUP_CAT[s.id]; if (c) return isAr ? c.ar : c.en; const it = store.item(s.products[0] ?? ''); return it ? (isAr ? it.catAr ?? it.cat : it.cat) : '—'; };
  const termsLabel = (terms: string) => (isAr ? TERMS_AR[terms] ?? terms : terms);
  const usdOf = (inv: SupplierInvoice) => (inv.currency === 'LBP' ? inv.amount / fx : inv.amount);
  /** VAT share of a VAT-inclusive amount at 11% (prototype demo: 410.70 → 40.70), in the invoice's own currency. */
  const vatOf = (inv: SupplierInvoice) => inv.amount - inv.amount / 1.11;

  /* ── products supplied: last price from receiving, trend from data.ts ── */
  const supDeliveries = sup ? st.deliveries.filter((d) => d.supplierId === sup.id).slice().sort((a, b) => b.ts.localeCompare(a.ts)) : [];
  const lastLine = (itemId: string) => { for (const d of supDeliveries) { const l = d.lines.find((x) => x.itemId === itemId); if (l) return { line: l, ts: d.ts }; } return null; };
  const products = sup ? sup.products.map((id) => store.item(id)).filter((x): x is NonNullable<typeof x> => !!x).map((it) => {
    const ll = lastLine(it.id);
    const hist = PRICE_HISTORY[it.id];
    const price = ll ? ll.line.unitPrice : hist ? hist.series[hist.series.length - 1][0] : it.cost * (it.purchFactor ?? 1);
    const trend = PRICE_TREND[it.id] ?? ll?.line.variancePct ?? 0;
    const ts = trendStyle(trend, amber, red);
    return { it, name: isAr ? it.ar : it.en, nameAlt: isAr ? it.en : it.ar, unit: ll ? ll.line.unit : it.purch, price, trend,
      trendLabel: trend === 0 ? '0%' : (trend > 0 ? '+' : '−') + Math.abs(trend).toFixed(1) + '%', tBg: ts[0], tFg: ts[1], last: ll ? shortDate(ll.ts, isAr) : '—' };
  }) : [];
  const chartProd = products.reduce<typeof products[number] | null>((best, p) => (!best || Math.abs(p.trend) > Math.abs(best.trend) ? p : best), null);
  const hist = chartProd ? PRICE_HISTORY[chartProd.it.id] : undefined;
  const series: [number, string][] = chartProd ? (hist ? hist.series.map((pt, i, arr) => (i === arr.length - 1 ? [chartProd.price, pt[1]] : pt)) : [[chartProd.price, 'May'], [chartProd.price, 'Jun'], [chartProd.price, 'Jul'], [chartProd.price, 'Aug']]) : [];
  const base = hist?.base ?? (chartProd?.price ?? 1);
  const vals = series.map((x) => x[0]);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
  const px = (i: number) => ((i / Math.max(1, series.length - 1)) * 320).toFixed(1);
  const py = (v: number) => (80 - ((v - mn) / rng) * 65).toFixed(1);
  const chartPoints = series.map((x, i) => `${px(i)},${py(x[0])}`).join(' ');

  /* ── invoice history ── */
  const invoices = sup ? st.invoices.filter((i) => i.supplierId === sup.id && store.inScope(i.loc)).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const outstanding = invoices.filter((i) => i.stage === 'approved').reduce((a, i) => a + usdOf(i), 0);
  const chipOf = (inv: SupplierInvoice) => inv.stage === 'paid' ? { label: t.paid, bg: '#E0E8DA', fg: '#48603A' }
    : inv.stage === 'approved' ? { label: t.due, bg: P.amberBg, fg: '#8A6D1F' }
    : inv.stage === 'disputed' ? { label: t.stages.disputed, bg: '#F0CFC9', fg: '#96382E' }
    : { label: t.stages[inv.stage], bg: P.chip, fg: P.text3 };

  /* ── create / edit (never delete) ── */
  const save = () => {
    if (!form) return;
    const name = form.name.trim();
    if (!name) { toast(t.needName); return; }
    if (form.mode === 'new') {
      const id = store.nextId('SUP');
      const s: Supplier = { id, name, nameAr: form.nameAr.trim() || undefined, contact: form.contact.trim(), phone: form.phone.trim() || undefined, terms: form.terms, products: [], spendMonth: 0, active: true };
      store.update((d) => { d.suppliers.push(s); });
      store.logAudit({ action: t.auditSupCreated, entity: `${id} · ${name}`, newValue: `${form.contact.trim()} · ${form.terms}`, moduleId: MODULE_ID });
      setForm(null); onSelect(id); toast(t.savedToast);
    } else {
      const before = st.suppliers.find((s) => s.id === form.id);
      store.update((d) => { const s = d.suppliers.find((x) => x.id === form.id); if (!s) return; s.name = name; s.nameAr = form.nameAr.trim() || undefined; s.contact = form.contact.trim(); s.phone = form.phone.trim() || undefined; s.terms = form.terms; s.active = form.active; });
      const changedActive = before && before.active !== form.active;
      store.logAudit({ action: t.auditSupUpdated, entity: `${form.id} · ${name}`, oldValue: before ? `${before.contact} · ${before.terms} · ${before.active ? t.active : t.inactive}` : undefined, newValue: `${form.contact.trim()} · ${form.terms} · ${form.active ? t.active : t.inactive}`, moduleId: MODULE_ID });
      setForm(null); toast(changedActive ? (form.active ? t.supReacToast : t.supDeacToast) : t.savedToast);
    }
  };
  const fieldLbl: React.CSSProperties = { fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 };
  const pCols = 'minmax(130px,1.4fr) 80px 96px 96px 80px';
  const iCols = 'minmax(120px,1.3fr) 84px 100px 92px 116px';

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 300, flex: 'none', borderInlineEnd: `1px solid ${P.border}`, background: P.thead, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => setForm({ mode: 'new', name: '', nameAr: '', contact: '', phone: '', terms: 'Net 15', active: true })} style={{ height: 38, borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>＋ {t.newSupplier}</button>
        {list.map((sp) => {
          const on = sup?.id === sp.id;
          return (
            <button key={sp.id} onClick={() => onSelect(sp.id)} style={{ textAlign: 'start', border: `1px solid ${on ? P.text2 : P.border}`, background: on ? P.card : P.surface, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', color: P.text, opacity: sp.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{nm(sp)}</span>
                {sp.alert && <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.redStrong }} />}
              </div>
              <div style={{ fontSize: 11.5, color: P.text3, marginTop: 3 }}>{catOf(sp)} · {sp.products.length} {t.itemsSuffix}</div>
            </button>
          );
        })}
      </div>

      {sup && (
        <div key={sup.id} className="fade-in" style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{nm(sup)}</div>
              <div style={{ fontSize: 13, color: P.text3, marginTop: 3 }}><span dir="ltr">{sup.id}</span> · {catOf(sup)}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 999, background: sup.active ? '#E0E8DA' : '#E6E2DA', color: sup.active ? '#48603A' : P.text4 }}>{sup.active ? t.active : t.inactive}</span>
            <button onClick={() => setForm({ mode: 'edit', id: sup.id, name: sup.name, nameAr: sup.nameAr ?? '', contact: sup.contact, phone: sup.phone ?? '', terms: sup.terms, active: sup.active })} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.edit}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10, marginTop: 16 }}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.contact}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{sup.contact}</div>
              <div style={{ fontSize: 12.5, color: P.text2, marginTop: 2 }} dir="ltr">{sup.phone ?? '—'}</div>
            </div>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.terms}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{termsLabel(sup.terms)}</div>
            </div>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.spend30}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4 }} dir="ltr">{money(sup.spendMonth ?? 0, { min: 0, max: 0 })}</div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, marginBottom: 8 }}>{t.productsSupplied}</div>
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: pCols, gap: 10, padding: '9px 16px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
                <div>{t.product}</div><div>{t.unit}</div><div style={{ textAlign: 'end' }}>{t.lastPrice}</div><div style={{ textAlign: 'end' }}>{t.trend90}</div><div style={{ textAlign: 'end' }}>{t.lastDelivery}</div>
              </div>
              {products.map((pr) => (
                <div key={pr.it.id} className="row-hover" onClick={() => go('receiving', { params: { tab: 'ppv', item: pr.it.id } })} title="MGT-RCV-03" style={{ display: 'grid', gridTemplateColumns: pCols, gap: 10, padding: '10px 16px', fontSize: 12.5, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{pr.name}</div>
                    <div style={{ fontSize: 11, color: P.text4 }}>{pr.nameAlt} · <span dir="ltr">{pr.it.id}</span></div>
                  </div>
                  <div style={{ color: P.text2 }} dir="ltr">{pr.unit}</div>
                  <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{money(pr.price)}</div>
                  <div style={{ textAlign: 'end' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: pr.tBg, color: pr.tFg }} dir="ltr">{pr.trendLabel}</span>
                  </div>
                  <div style={{ textAlign: 'end', color: P.text3, fontSize: 11.5 }}>{pr.last}</div>
                </div>
              ))}
              {products.length === 0 && <div style={{ padding: 26, textAlign: 'center', color: P.text4, fontSize: 13 }}>{t.noProducts}</div>}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, flex: 1 }}>{t.invoiceHistory} ({invoices.length})</div>
              <span style={{ fontSize: 12, color: P.text3 }}>{t.outstanding}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: outstanding > 0 ? P.redFg : '#48603A' }} dir="ltr">{money(outstanding)}</span>
            </div>
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: iCols, gap: 10, padding: '9px 16px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
                <div>{t.colInvNo}</div><div>{t.colDate}</div><div style={{ textAlign: 'end' }}>{t.colValue}</div><div style={{ textAlign: 'end' }}>{t.colVat}</div><div style={{ textAlign: 'end' }}>{t.status}</div>
              </div>
              {invoices.map((iv) => { const c = chipOf(iv); return (
                <div key={iv.id} className="row-hover" onClick={() => go('invoice-review', { params: { id: iv.id } })} title="INV-REV-01" style={{ display: 'grid', gridTemplateColumns: iCols, gap: 10, padding: '10px 16px', fontSize: 12.5, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600 }} dir="ltr">{iv.invoiceNo || iv.id}<span style={{ fontSize: 11, color: P.text4, fontWeight: 400, marginInlineStart: 6 }}>{iv.id}</span></div>
                  <div style={{ color: P.text2 }} dir="ltr">{shortDate(iv.date, isAr)}</div>
                  <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{iv.currency === 'LBP' ? lbp(iv.amount) : money(iv.amount)}</div>
                  <div style={{ textAlign: 'end', color: P.text3 }} dir="ltr">{iv.currency === 'LBP' ? lbp(vatOf(iv)) : money(vatOf(iv))}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: c.bg, color: c.fg }}>{c.label}</span>
                    {iv.stage === 'approved' && iv.due && <span style={{ fontSize: 10.5, color: P.text4 }} dir="ltr">{t.dueLbl} {shortDate(iv.due, isAr)}</span>}
                  </div>
                </div>
              ); })}
              {invoices.length === 0 && <div style={{ padding: 26, textAlign: 'center', color: P.text4, fontSize: 13 }}>{t.noInvoices}</div>}
            </div>
          </div>

          {chartProd && (
            <div style={{ marginTop: 18, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px', maxWidth: 640 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, flex: 1 }}>{t.priceHistory} — {chartProd.name}</div>
                <a href="#" onClick={(e) => { e.preventDefault(); go('receiving', { params: { tab: 'ppv', item: chartProd.it.id } }); }} style={{ fontSize: 12, color: '#37536B' }} title="MGT-RCV-03">{t.openPpv} {fwdGlyph}</a>
              </div>
              <svg viewBox="0 0 320 90" style={{ width: '100%', height: 110, marginTop: 10 }} preserveAspectRatio="none">
                <polyline points={chartPoints} fill="none" stroke={P.ink} strokeWidth={2} />
                {series.map((x, i) => <circle key={i} cx={px(i)} cy={py(x[0])} r={3} fill={dotColor(((x[0] - base) / base) * 100, amber, red)} />)}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: P.text4 }}><span>{series[0]?.[1]}</span><span>{t.today}</span></div>
            </div>
          )}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.mode === 'new' ? t.nsTitle : t.editSup} sub={form?.mode === 'edit' ? form.id : undefined} width={480}
        footer={<><Btn size="lg" variant="ghost" style={{ flex: 1 }} onClick={() => setForm(null)}>{t.cancel}</Btn><Btn size="lg" variant="primary" style={{ flex: 1.4, fontWeight: 700 }} onClick={save}>{form?.mode === 'new' ? t.createSup : t.save}</Btn></>}>
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={fieldLbl}>{t.nameEn}</div><Input value={form.name} autoFocus onChange={(v) => setForm({ ...form, name: v })} width="100%" /></div>
              <div><div style={fieldLbl}>{t.nameArLbl}</div><Input value={form.nameAr} onChange={(v) => setForm({ ...form, nameAr: v })} width="100%" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={fieldLbl}>{t.contact}</div><Input value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} width="100%" /></div>
              <div><div style={fieldLbl}>{t.phone}</div><Input value={form.phone} ltr onChange={(v) => setForm({ ...form, phone: v })} width="100%" /></div>
            </div>
            <div>
              <div style={fieldLbl}>{t.terms}</div>
              <Select value={form.terms} width="100%" onChange={(v) => setForm({ ...form, terms: v })} options={TERMS_OPTIONS.map((x) => ({ value: x, label: termsLabel(x) }))} />
            </div>
            {form.mode === 'edit' && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Toggle on={form.active} onChange={(v) => setForm({ ...form, active: v })} /><span style={{ fontSize: 13 }}>{t.activeLbl}</span><span style={{ fontSize: 11.5, color: P.text4 }}>— {t.deacNote}</span></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
