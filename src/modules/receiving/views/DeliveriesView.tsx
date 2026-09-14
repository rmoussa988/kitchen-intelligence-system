import React from 'react';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore, type Delivery, type DeliveryLine } from '../../../store';
import { KpiCard, Btn, P, money, fmt, shortDate, useToast } from '../../../ui';
import { TEXT } from '../text';
import { band, BAND_STYLE, pvLabel, money3, isToday, dateTime, supName } from '../data';

interface Props {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onAdjust: (d: Delivery) => void;
}

/** MGT-RCV-02 — KPI strip + deliveries table with expandable per-line detail. */
export default function DeliveriesView({ openId, setOpenId, onAdjust }: Props) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const { ppvAmberPct: amber, ppvRedPct: red } = store.state.settings;
  const isAll = store.scope === 'all';
  const names = LOC_NAMES[lang];

  const visible = store.state.deliveries.filter((d) => store.inScope(d.loc)).slice().sort((a, b) => b.ts.localeCompare(a.ts));
  const todayTotal = visible.filter((d) => isToday(d.ts)).reduce((a, d) => a + d.total, 0);
  const alerts = visible.filter((d) => band(d.worstVariancePct ?? 0, amber, red) === 'red').length;
  const rejTotal = visible.reduce((a, d) => a + d.lines.reduce((b, l) => b + (l.rejected ?? 0) * l.unitPrice, 0), 0);
  const grid = isAll ? '92px minmax(110px,1.2fr) 78px 88px 50px 80px 96px 78px 24px' : '92px minmax(110px,1.2fr) 78px 50px 80px 96px 78px 24px';
  const detailGrid = 'minmax(130px,1.4fr) 86px 86px 76px minmax(120px,1.2fr) minmax(96px,1fr)';

  const linePv = (l: DeliveryLine) => l.variancePct ?? (l.lastPrice ? Math.round(((l.unitPrice - l.lastPrice) / l.lastPrice) * 1000) / 10 : 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 22px', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flex: 'none' }}>
        <KpiCard tone="ink" flex={1.2} label={t.receivedToday} value={money(todayTotal)} />
        <KpiCard label={t.deliveriesK} value={visible.length} ltr={false} />
        <KpiCard tone="red" label={t.priceAlerts} value={alerts} ltr={false} />
        <KpiCard tone="amber" label={t.rejected} value={money(rejTotal)} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: `1px solid ${P.border}`, borderRadius: 12, background: P.card }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 16px', fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}`, position: 'sticky', top: 0, background: P.thead, zIndex: 2 }}>
          <div>{t.date}</div><div>{t.supplier}</div><div>{t.invoice}</div>
          {isAll && <div>{t.location}</div>}
          <div style={{ textAlign: 'end' }}>{t.lines}</div><div style={{ textAlign: 'end' }}>{t.total}</div><div>{t.worstPv}</div><div>{t.receivedBy}</div><div />
        </div>
        {visible.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: P.text4, fontSize: 14 }}>{t.noDeliveries}</div>}
        {visible.map((d) => {
          const worst = d.worstVariancePct ?? 0;
          const wb = band(worst, amber, red);
          const ws = BAND_STYLE[wb];
          const open = openId === d.id;
          const sup = store.state.suppliers.find((s) => s.id === d.supplierId);
          return (
            <div key={d.id}>
              <div className="row-hover" onClick={() => setOpenId(open ? null : d.id)}
                style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', cursor: 'pointer', background: wb === 'red' ? '#FBF6F0' : 'transparent' }}>
                <div style={{ color: P.text3, fontSize: 12 }} dir="ltr">{dateTime(d.ts, isAr)}</div>
                <div style={{ fontWeight: 600 }}>{supName(sup, isAr)}{d.status === 'adjusted' && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: P.chip, color: P.text3, marginInlineStart: 6 }}>{t.adjusted}</span>}</div>
                <div style={{ color: P.blueFg, fontSize: 12.5 }} dir="ltr">{d.invoiceNo}</div>
                {isAll && <div style={{ color: P.text2, fontSize: 12.5 }}>{names[d.loc]}</div>}
                <div style={{ textAlign: 'end' }}>{d.lines.length}</div>
                <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{money(d.total)}</div>
                <div><span dir="ltr" style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: ws[0], color: ws[1], whiteSpace: 'nowrap' }}>{pvLabel(worst)}</span></div>
                <div style={{ color: P.text2, fontSize: 12.5 }}>{store.userName(d.receivedBy, isAr)}</div>
                <div style={{ textAlign: 'end', color: P.text4, fontSize: 15 }}>{open ? '▾' : '▸'}</div>
              </div>
              {open && (
                <div className="fade-in" style={{ background: '#F3F1E8', borderBottom: `1px solid ${P.borderRow}`, padding: '12px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: detailGrid, gap: 10, padding: '0 0 8px', fontSize: 10.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                    <div>{t.item}</div><div style={{ textAlign: 'end' }}>{t.ordRecv}</div><div style={{ textAlign: 'end' }}>{t.price}</div><div style={{ textAlign: 'end' }}>{t.varPct}</div><div style={{ textAlign: 'end' }}>{t.avgCostMove}</div><div>{t.batchExp}</div>
                  </div>
                  {d.lines.map((l, i) => {
                    const it = store.item(l.itemId);
                    const pv = linePv(l);
                    const ls = BAND_STYLE[band(pv, amber, red)];
                    const baseTxt = it && l.unit !== it.base ? `${fmt(l.received)} ${l.unit} = ${fmt(l.baseQty)} ${it.base}` : `${fmt(l.baseQty)} ${it?.base ?? l.unit} ${t.base}`;
                    const cost = it?.cost ?? l.unitPrice;
                    // Corrections are adjustment movements, not edits to the immutable delivery line.
                    const adjs = store.state.movements.filter((m) => m.sourceKind === 'adjustment' && m.source === d.invoiceNo && m.itemId === l.itemId);
                    return (
                      <React.Fragment key={i}>
                      <div style={{ display: 'grid', gridTemplateColumns: detailGrid, gap: 10, padding: '8px 0', fontSize: 12.5, alignItems: 'center', borderTop: `1px solid ${P.borderRow}` }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{store.itemName(l.itemId, isAr)}</div>
                          <div style={{ fontSize: 11, color: P.text4 }} dir="ltr">{baseTxt}</div>
                        </div>
                        <div style={{ textAlign: 'end' }} dir="ltr">{fmt(l.ordered ?? l.received)} → {fmt(l.received)} {l.unit}</div>
                        <div style={{ textAlign: 'end' }} dir="ltr">{money(l.unitPrice)}</div>
                        <div style={{ textAlign: 'end' }}><span dir="ltr" style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: ls[0], color: ls[1] }}>{pvLabel(pv)}</span></div>
                        <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{money3(l.oldAvg ?? cost)} → {money3(l.newAvg ?? cost)}</div>
                        <div style={{ fontSize: 11.5, color: P.text3 }} dir="ltr">
                          {l.batch ?? '—'} · {l.expiry ? shortDate(l.expiry, isAr) : '—'}
                          {l.rejected ? <span style={{ color: P.redFg, fontWeight: 600 }}> · {fmt(l.rejected)} {l.unit} {t.rejectedQuality}</span> : null}
                        </div>
                      </div>
                      {adjs.map((m) => {
                        const delta = (m.value < 0 ? -1 : 1) * (m.enteredQty ?? 0);
                        const nq = Math.round((l.received + delta) * 1000) / 1000;
                        return (
                          <div key={m.id} style={{ fontSize: 11.5, color: '#8A6D1F', background: '#FBF3DF', border: '1px solid #E2CD96', borderRadius: 8, padding: '6px 10px', marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 700 }}>{t.adjMove}</span>
                            <span dir="ltr">{fmt(l.received)} → {fmt(nq)} {l.unit} · {money3(m.value)}</span>
                            {m.note ? <span style={{ color: P.text3 }}>· {m.note}</span> : null}
                          </div>
                        );
                      })}
                      </React.Fragment>
                    );
                  })}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <Btn size="sm" onClick={() => onAdjust(d)} style={{ height: 32, padding: '0 13px', borderRadius: 8 }}>{t.adjustLine}</Btn>
                    <Btn size="sm" onClick={() => toast(t.exportToast)} style={{ height: 32, padding: '0 13px', borderRadius: 8, fontWeight: 400 }}>{t.export}</Btn>
                    {d.scanUrl && (
                      <a href={d.scanUrl} target="_blank" rel="noopener noreferrer" title={t.invoiceScan}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px 0 8px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.white, color: P.blueFg, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
                        {/\.pdf(\?|$)/i.test(d.scanUrl) ? (
                          <span style={{ width: 22, height: 28, borderRadius: 4, background: P.blueBg, border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.blueFg} strokeWidth="1.8"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
                          </span>
                        ) : (
                          <img src={d.scanUrl} alt={t.invoiceScan} style={{ width: 22, height: 28, objectFit: 'cover', borderRadius: 4, border: `1px solid ${P.border}`, flex: 'none' }} />
                        )}
                        {t.viewScan}
                      </a>
                    )}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11.5, color: P.text4, alignSelf: 'center' }}>{t.immutableNote}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
