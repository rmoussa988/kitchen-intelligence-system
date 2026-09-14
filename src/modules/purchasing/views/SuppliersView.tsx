import React, { useState } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore, type Item, type SupplierInvoice } from '../../../store';
import { P, money, shortDate, DEMO_TODAY } from '../../../ui';
import { TEXT, UOMS } from '../text';
import { band, BAND_STYLE, BAND_DOT, pvLabel, lastPriceFor, avgPriceFor, trendFor, lastDeliveryFor, priceSeriesFor, supName, supplierCat, termsLabel } from '../../receiving/data';

interface Props {
  supId: string | null; setSupId: (id: string) => void;
  catalog: Record<string, string[]>; unitOverrides: Record<string, string>; setUnitOverride: (key: string, unit: string) => void;
  onNewSupplier: () => void; onAddProduct: () => void; onOrderFrom: (supId: string) => void; onOpenInvoice: (inv: SupplierInvoice) => void;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONA = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/** PUR-SUP-01 — supplier list + detail (contact, terms, spend by period, outstanding, products, invoice history, price history). */
export default function SuppliersView({ supId, setSupId, catalog, unitOverrides, setUnitOverride, onNewSupplier, onAddProduct, onOrderFrom, onOpenInvoice }: Props) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const st = store.state;
  const { ppvAmberPct: amber, ppvRedPct: red, fxRate } = st.settings;
  const [prodTab, setProdTab] = useState<'supplied' | 'catalog'>('supplied');
  const [spendPeriod, setSpendPeriod] = useState<'30d' | '90d' | '12m' | 'all'>('30d');
  const [invFilter, setInvFilter] = useState<'all' | 'due'>('all');
  const [chartItem, setChartItem] = useState<string | null>(null);

  const ALLSUP = st.suppliers.filter((s) => s.active);
  const sup = ALLSUP.find((s) => s.id === supId) ?? ALLSUP[0];
  if (!sup) return null;
  const nm = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const nmAlt = (o: { en: string; ar: string }) => (isAr ? o.en : o.ar);
  const catalogIds = catalog[sup.id] ?? [];
  const items = (ids: string[]) => ids.map((id) => store.item(id)).filter((x): x is Item => !!x);
  const suppliedItems = items(sup.products.filter((id) => !catalogIds.includes(id)));
  const catalogItems = items(catalogIds);
  const isCatalog = prodTab === 'catalog';
  const prodRows = isCatalog ? catalogItems : suppliedItems;
  const unitOf = (it: Item) => unitOverrides[sup.id + '|' + it.id] || it.purch;

  // invoices (from the pipeline)
  const usd = (iv: SupplierInvoice) => (iv.currency === 'LBP' ? iv.amount / fxRate : iv.amount);
  const vat = (v: number) => v - v / 1.11;
  const invoicesAll = st.invoices.filter((i) => i.supplierId === sup.id).slice().sort((a, b) => b.date.localeCompare(a.date));
  const invDueOnly = invFilter === 'due';
  const invList = invDueOnly ? invoicesAll.filter((iv) => iv.stage !== 'paid') : invoicesAll;
  const sOutN = invoicesAll.filter((iv) => iv.stage !== 'paid').reduce((a, iv) => a + usd(iv), 0);
  const TODAY = new Date(DEMO_TODAY);
  const fmtD = (iso: string) => { const p = iso.split('-'); return parseInt(p[2]) + ' ' + (isAr ? MONA : MON)[parseInt(p[1]) - 1] + ' ' + p[0]; };
  const winDays = ({ '30d': 30, '90d': 90, '12m': 365, all: null } as const)[spendPeriod];
  const invSorted = invoicesAll.slice().sort((a, b) => a.date.localeCompare(b.date));
  const inWin = invoicesAll.filter((iv) => winDays == null || (TODAY.getTime() - new Date(iv.date).getTime()) / 86400000 <= winDays);
  const spendN = inWin.reduce((a, iv) => a + usd(iv), 0);
  const periodDefs: [typeof spendPeriod, string][] = [['30d', t.p30], ['90d', t.p90], ['12m', t.p12m], ['all', t.pAll]];
  const spendRange = spendPeriod === 'all'
    ? (invSorted.length ? t.spendFrom + ' ' + fmtD(invSorted[0].date) + ' · ' + t.untilToday : '')
    : (t.spendLast + ' ' + winDays + ' ' + t.days + ' · ' + inWin.length + ' ' + t.invoices);

  // price history chart
  const chartProducts = [...suppliedItems, ...catalogItems];
  const chartSel = chartProducts.find((p) => p.id === chartItem) ?? chartProducts[0];
  const series = chartSel ? priceSeriesFor(st, chartSel.id) : null;
  const cs = series ? series.points : [];
  const vals = cs.map((x) => x.v);
  const mn = vals.length ? Math.min(...vals) : 0, mx = vals.length ? Math.max(...vals) : 1, rng = (mx - mn) || 1;
  const cx = (i: number) => (cs.length > 1 ? (i / (cs.length - 1)) * 320 : 160);
  const cy = (v: number) => 80 - ((v - mn) / rng) * 65;
  const sChartPoints = cs.map((x, i) => cx(i).toFixed(1) + ',' + cy(x.v).toFixed(1)).join(' ');
  const selTrend = chartSel ? trendFor(st, chartSel.id) : 0;
  const dotColor = BAND_DOT[band(selTrend, amber, red)];

  const card: React.CSSProperties = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '12px 14px' };
  const lab: React.CSSProperties = { fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 300, flex: 'none', borderInlineEnd: `1px solid ${P.border}`, background: P.thead, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onNewSupplier} style={{ height: 38, borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>＋ {t.newSupplier}</button>
        {ALLSUP.map((sp) => {
          const on = sp.id === sup.id;
          return (
            <button key={sp.id} onClick={() => { setSupId(sp.id); setChartItem(null); setInvFilter('all'); }} style={{ textAlign: 'start', border: `1px solid ${on ? '#4A5348' : P.border}`, background: on ? P.card : P.surface, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', color: P.text }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{supName(sp, isAr)}</span>
                {sp.alert && <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.redStrong }} />}
              </div>
              <div style={{ fontSize: 11.5, color: P.text3, marginTop: 3 }}>{supplierCat(st, sp, isAr)} · {sp.products.length} {t.items}</div>
            </button>
          );
        })}
      </div>

      <div className="fade-in" style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{supName(sup, isAr)}</div>
            <div style={{ fontSize: 13, color: P.text3, marginTop: 3 }}><span dir="ltr">{sup.id}</span> · {supplierCat(st, sup, isAr)}</div>
          </div>
          <button onClick={() => onOrderFrom(sup.id)} style={{ height: 38, padding: '0 16px', borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.orderFrom} {supName(sup, isAr)}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, marginTop: 16 }}>
          <div style={card}>
            <div style={lab}>{t.contact}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{sup.contact}</div>
            <div style={{ fontSize: 12.5, color: P.text2, marginTop: 2 }} dir="ltr">{sup.phone ?? '—'}</div>
          </div>
          <div style={card}>
            <div style={lab}>{t.terms}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{termsLabel(sup.terms, isAr)}</div>
          </div>
          <div style={card}>
            <div style={lab}>{t.spend}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4 }} dir="ltr">{money(spendN)}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {periodDefs.map(([k, label]) => {
                const on = spendPeriod === k;
                return <button key={k} onClick={() => setSpendPeriod(k)} style={{ height: 26, padding: '0 10px', borderRadius: 7, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text3, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{label}</button>;
              })}
            </div>
            <div style={{ fontSize: 10.5, color: P.text4, marginTop: 7 }} dir="ltr">{spendRange}</div>
          </div>
          <button onClick={() => setInvFilter(invDueOnly ? 'all' : 'due')} style={{ textAlign: 'start', background: P.card, border: `1px solid ${invDueOnly ? P.amberFg : P.border}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={lab}>{t.outstanding}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4, color: sOutN > 0 ? P.redFg : P.greenFg }} dir="ltr">{money(sOutN)}</div>
            <div style={{ fontSize: 10.5, color: P.blueFg, marginTop: 4 }}>{invDueOnly ? t.clearFilterHint : t.filterHint}</div>
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 4, background: P.thead, border: `1px solid ${P.border}`, borderRadius: 9, padding: 3 }}>
              {(['supplied', 'catalog'] as const).map((k) => {
                const on = prodTab === k;
                return <button key={k} onClick={() => setProdTab(k)} style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: on ? P.ink : 'transparent', color: on ? P.onInk : P.text3 }}>{k === 'supplied' ? t.prodSupplied : t.prodCatalog}</button>;
              })}
            </div>
            <div style={{ flex: 1 }} />
            {isCatalog && <button onClick={onAddProduct} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.addProduct}</button>}
          </div>
          <div style={{ fontSize: 11.5, color: P.text4, marginBottom: 8 }}>{isCatalog ? t.catalogHint : t.suppliedHint}</div>
          <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px,1.3fr) 64px 90px 90px 88px 72px', gap: 10, padding: '9px 16px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
              <div>{t.product}</div><div>{t.unit}</div><div style={{ textAlign: 'end' }}>{t.lastPrice}</div><div style={{ textAlign: 'end' }}>{t.avgPrice}</div><div style={{ textAlign: 'end' }}>{t.trend90}</div><div style={{ textAlign: 'end' }}>{t.lastDelivery}</div>
            </div>
            {prodRows.map((p) => {
              const trend = trendFor(st, p.id);
              const ts = BAND_STYLE[band(trend, amber, red)];
              const last = lastDeliveryFor(st, p.id);
              const opts = UOMS.includes(unitOf(p)) ? UOMS : [unitOf(p), ...UOMS];
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px,1.3fr) 64px 90px 90px 88px 72px', gap: 10, padding: '10px 16px', fontSize: 12.5, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
                  <div><div style={{ fontWeight: 600 }}>{nm(p)}</div><div style={{ fontSize: 11, color: P.text4 }}>{nmAlt(p)}</div></div>
                  <div>
                    <select value={unitOf(p)} onChange={(e) => setUnitOverride(sup.id + '|' + p.id, e.target.value)} style={{ width: '100%', height: 32, padding: '0 4px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', color: P.text, cursor: 'pointer', outline: 'none' }}>
                      {opts.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{money(lastPriceFor(st, p.id))}</div>
                  <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{money(avgPriceFor(st, p.id))}</div>
                  <div style={{ textAlign: 'end' }}><span dir="ltr" style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: ts[0], color: ts[1] }}>{pvLabel(trend)}</span></div>
                  <div style={{ textAlign: 'end', color: P.text3, fontSize: 11.5 }}>{last ? shortDate(last, isAr) : '—'}</div>
                </div>
              );
            })}
            {prodRows.length === 0 && <div style={{ padding: '22px 16px', textAlign: 'center', color: P.text4, fontSize: 13 }}>{isCatalog ? t.noCatalog : t.noSupplied}</div>}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.invoiceHistory} ({invList.length})</div>
            {invDueOnly && <button onClick={() => setInvFilter('all')} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 999, border: `1px solid ${P.amberBorder}`, background: P.amberBg, color: P.amberFg, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.unpaidOnly} ✕</button>}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: P.text3 }}>{t.fromPipeline}</span>
          </div>
          <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.3fr) 84px 100px 92px 116px', gap: 10, padding: '9px 16px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
              <div dir="ltr">{t.colInvNo}</div><div dir="ltr">{t.colDate}</div><div style={{ textAlign: 'end' }}>{t.colValue}</div><div style={{ textAlign: 'end' }}>{t.colVat}</div><div style={{ textAlign: 'end' }}>{t.status}</div>
            </div>
            {invList.map((iv) => {
              const paid = iv.stage === 'paid';
              const v = usd(iv);
              return (
                <div key={iv.id} className="row-hover" onClick={() => onOpenInvoice(iv)} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.3fr) 84px 100px 92px 116px', gap: 10, padding: '10px 16px', fontSize: 12.5, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600 }} dir="ltr">{iv.invoiceNo}</div>
                  <div style={{ color: P.text2 }} dir="ltr">{shortDate(iv.date, isAr)}</div>
                  <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{money(v)}</div>
                  <div style={{ textAlign: 'end', color: P.text3 }} dir="ltr">{money(vat(v))}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: paid ? P.greenBg : P.amberBg, color: paid ? P.greenFg : P.amberFg }}>{paid ? t.paid : t.due}</span>
                    {!paid && iv.due && <span style={{ fontSize: 10.5, color: P.text4 }} dir="ltr">{t.dueLine}{shortDate(iv.due, isAr)}</span>}
                  </div>
                </div>
              );
            })}
            {invList.length === 0 && <div style={{ padding: '20px 16px', textAlign: 'center', color: P.text4, fontSize: 13 }}>{invDueOnly ? t.noUnpaid : t.noInvoices}</div>}
          </div>
        </div>

        <div style={{ marginTop: 18, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px', maxWidth: 640 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.priceHistory} — {chartSel ? nm(chartSel) : '—'}</div>
          {cs.length >= 2 ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {chartProducts.map((p) => {
                  const on = chartSel?.id === p.id;
                  return <button key={p.id} onClick={() => setChartItem(p.id)} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{nm(p)}</button>;
                })}
              </div>
              <svg viewBox="0 0 320 90" style={{ width: '100%', height: 110, marginTop: 12 }} preserveAspectRatio="none">
                <polyline points={sChartPoints} fill="none" stroke="#2E3A2E" strokeWidth="2" />
                {cs.map((x, i) => <circle key={i} cx={cx(i).toFixed(1)} cy={cy(x.v).toFixed(1)} r="3" fill={dotColor} />)}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: P.text4 }}><span>{shortDate(cs[0].date, isAr)}</span><span>{t.today}</span></div>
            </>
          ) : (
            <>
              {chartProducts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {chartProducts.map((p) => {
                    const on = chartSel?.id === p.id;
                    return <button key={p.id} onClick={() => setChartItem(p.id)} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{nm(p)}</button>;
                  })}
                </div>
              )}
              <div style={{ padding: '18px 0', textAlign: 'center', color: P.text4, fontSize: 13 }}>{t.noHistory}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
