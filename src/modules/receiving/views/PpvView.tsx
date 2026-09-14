import React from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import { useModuleNav } from '../../../shell/DesktopShell';
import { Btn, P, money, shortDate, useToast } from '../../../ui';
import { TEXT } from '../text';
import { band, BAND_STYLE, BAND_DOT, pvLabel, priceSeriesFor, computeMovers, PRICE_SERIES, supName } from '../data';

interface Props { chartItem: string; setChartItem: (id: string) => void }

/** MGT-RCV-03 — per-item receipt price vs last agreed price with threshold bands + biggest movers. */
export default function PpvView({ chartItem, setChartItem }: Props) {
  const { lang, isAr, chevron } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const { ppvAmberPct: amber, ppvRedPct: red } = store.state.settings;

  const series = priceSeriesFor(store.state, chartItem);
  const item = store.item(chartItem);
  const sup = store.state.suppliers.find((s) => s.id === series.supplierId);
  const pts = series.points;
  const base = series.base || 1;
  const pctOf = (v: number) => ((v - base) / base) * 100;
  const maxDev = Math.max(red * 1.6, ...pts.map((p) => Math.abs(pctOf(p.v))));
  const H = 120, mid = H / 2;
  const yFor = (pct: number) => mid - (pct / maxDev) * (H / 2 - 8);
  const xFor = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * 340 : 170);
  const chartPoints = pts.map((p, i) => xFor(i).toFixed(1) + ',' + yFor(pctOf(p.v)).toFixed(1)).join(' ');
  const amberY = yFor(amber), redY = yFor(red);

  const chipIds = Object.keys(PRICE_SERIES).filter((id) => store.item(id));
  if (!chipIds.includes(chartItem)) chipIds.unshift(chartItem);
  const movers = computeMovers(store.state, store.inScope).slice(0, 8);

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.2, minWidth: 400, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{store.itemName(chartItem, isAr)}</div>
              <div style={{ fontSize: 12, color: P.text3, marginTop: 2 }}>{supName(sup, isAr)} · {t.pricePer} {series.unit}</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {chipIds.map((id) => {
                const on = id === chartItem;
                return <button key={id} onClick={() => setChartItem(id)} style={{ height: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{store.itemName(id, isAr)}</button>;
              })}
            </div>
          </div>
          <svg viewBox="0 0 340 120" style={{ width: '100%', height: 150, marginTop: 14 }} preserveAspectRatio="none">
            <rect x="0" y="0" width="340" height={redY.toFixed(1)} fill="#F0CFC9" opacity=".45" />
            <rect x="0" y={redY.toFixed(1)} width="340" height={(amberY - redY).toFixed(1)} fill="#F5E3B3" opacity=".45" />
            <line x1="0" y1={mid.toFixed(1)} x2="340" y2={mid.toFixed(1)} stroke="#9A9C8E" strokeWidth="1" strokeDasharray="4 4" />
            {pts.length > 1 && <polyline points={chartPoints} fill="none" stroke="#2E3A2E" strokeWidth="2" />}
            {pts.map((p, i) => <circle key={i} cx={xFor(i).toFixed(1)} cy={yFor(pctOf(p.v)).toFixed(1)} r="3.5" fill={BAND_DOT[band(pctOf(p.v), amber, red)]} />)}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: P.text4, marginTop: 2 }}><span>{pts.length ? shortDate(pts[0].date, isAr) : ''}</span><span>{t.baseline} · {money(base)}</span><span>{t.today}</span></div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 12, color: P.text3, flexWrap: 'wrap', alignItems: 'center' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#F5E3B3', marginInlineEnd: 5 }} />{t.amberBand} ±{amber}%</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#F0CFC9', marginInlineEnd: 5 }} />{t.redBand} ±{red}%</span>
            <div style={{ flex: 1 }} />
            {item && <Btn size="sm" variant="ghost" onClick={() => go('items', { params: { item: chartItem } })}>{t.openItem} {chevron}</Btn>}
            {sup && <Btn size="sm" variant="ghost" onClick={() => go('master-data', { params: { tab: 'suppliers', id: sup.id } })}>{t.openSupplier} {chevron}</Btn>}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.biggestMovers}</div>
          <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,1.3fr) minmax(90px,1fr) 84px 76px', gap: 10, padding: '9px 14px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
              <div>{t.item}</div><div>{t.supplier}</div><div style={{ textAlign: 'end' }}>{t.lastCurrent}</div><div style={{ textAlign: 'end' }}>{t.varPct}</div>
            </div>
            {movers.map((mv) => {
              const b = band(mv.pv, amber, red);
              const bs = BAND_STYLE[b];
              const msup = store.state.suppliers.find((s) => s.id === mv.supplierId);
              return (
                <div key={mv.itemId} className="row-hover" onClick={() => setChartItem(mv.itemId)}
                  style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,1.3fr) minmax(90px,1fr) 84px 76px', gap: 10, padding: '10px 14px', fontSize: 12.5, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', cursor: 'pointer', background: b === 'red' ? '#FBF6F0' : (mv.itemId === chartItem ? P.hover : 'transparent') }}>
                  <div style={{ fontWeight: 600 }}>{store.itemName(mv.itemId, isAr)}</div>
                  <div style={{ color: P.text2 }}>{supName(msup, isAr)}</div>
                  <div style={{ textAlign: 'end', color: P.text3 }} dir="ltr">{money(mv.from)} → {money(mv.to)}</div>
                  <div style={{ textAlign: 'end' }}><span dir="ltr" style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: bs[0], color: bs[1] }}>{pvLabel(mv.pv)}</span></div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => go('reports', { params: { tab: 'thresholds' } })} style={{ height: 36, borderRadius: 8, fontSize: 12.5 }}>{t.setThresholds}</Btn>
            <Btn onClick={() => toast(t.exportToast)} style={{ height: 36, borderRadius: 8, fontSize: 12.5, fontWeight: 400 }}>{t.export}</Btn>
          </div>
          <div style={{ fontSize: 12, color: P.text4 }}>{t.ppvNote}</div>
        </div>
      </div>
    </div>
  );
}
