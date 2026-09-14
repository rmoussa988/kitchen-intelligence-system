import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang, arDigits } from '../../i18n/LangContext';
import { useStore } from '../../store';
import type { LocId } from '../../store';
import { useModuleNav } from '../../shell/DesktopShell';
import { Page, PageHeader, Body, KpiCard, LocationSelector, Btn, useToast, P } from '../../ui';
import { TEXT } from './text';
import { LOCS, liveDeltas, figuresFor, combined, fmtRange, m, type Figures } from './data';

type Tab = 'dash' | 'comp';
type CSS = React.CSSProperties;

const uc: CSS = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 };

/** Prototype-style centred overlay (header / body / footer are supplied by the caller). */
function Overlay({ onClose, width, children }: { onClose: () => void; width: number; children: React.ReactNode }) {
  return (
    <div onClick={onClose} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,31,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 55 }}>
      <div onClick={(e) => e.stopPropagation()} className="pop-up" style={{ width: `min(${width}px, 92%)`, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 18, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

export default function PnlModule() {
  const { lang, isAr, fwdGlyph } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [sp, setSp] = useSearchParams();
  const tab: Tab = sp.get('tab') === 'compare' ? 'comp' : 'dash';
  const setTab = (v: string) => setSp(v === 'comp' ? { tab: 'compare' } : {}, { replace: true });

  const [helpOpen, setHelpOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodMode, setPeriodMode] = useState<'month' | 'range'>('range');
  const [periodLabel, setPeriodLabel] = useState('1–12 Aug 2026');
  const [fromVal, setFromVal] = useState('2026-08-01');
  const [toVal, setToVal] = useState('2026-08-12');
  const [monthSel, setMonthSel] = useState('2026-08');

  const scope = store.scope;
  const isAll = scope === 'all';
  const per = useMemo<Record<LocId, Figures>>(() => {
    const dl = liveDeltas(store.state);
    return { mk: figuresFor('mk', dl.mk), rock: figuresFor('rock', dl.rock), kad: figuresFor('kad', dl.kad) };
  }, [store.state]);
  const d: Figures = isAll ? combined(per) : per[scope];

  const foodPct = d.sales ? (d.cons / d.sales) * 100 : null;
  const wastePct = d.wastePct;
  const mkScope = scope === 'mk';
  const scopeLabel = isAll ? t.all : t.locs[scope];

  // ── statement rows: label, op, value, note, drill target ──
  const stmt = [
    { op: '', label: t.begStock, val: d.beg, note: '', drill: () => go('inventory', { params: { tab: 'ledger' } }) },
    { op: '+', label: t.purchases, val: d.purch, note: '', drill: () => go('receiving') },
    { op: '+', label: t.transfersIn, val: d.trfIn, note: isAll ? t.combinedNote : t.atCost, drill: () => go('transfers') },
    { op: '−', label: t.transfersOut, val: d.trfOut, note: isAll ? t.combinedNote : t.atCost, drill: () => go('transfers') },
    { op: '−', label: t.salesCons, val: d.cons, note: t.salesXrecipes, drill: () => go('inventory', { params: { tab: 'ledger', type: 'sale' } }) },
    { op: '−', label: t.wasteRow, val: d.waste, note: '', drill: () => go('waste') },
    { op: '=', label: t.endStock, val: d.end, note: '', drill: () => go('inventory', { params: { tab: 'ledger' } }) },
    { op: '', label: t.physical, val: d.phys, note: t.fromB2, drill: () => go('inventory', { params: { tab: 'ledger', type: 'count' } }) },
  ];
  const reconDiff = Math.round(d.phys - d.end);
  const reconOk = reconDiff === 0;

  const trfIn = isAll ? per.rock.trfIn + per.kad.trfIn : d.trfIn;
  const trfOut = isAll ? per.mk.trfOut : d.trfOut;

  // ── period picker ──
  const rangeError = periodMode === 'range' && toVal < fromVal;
  const applyPeriod = () => {
    if (periodMode === 'month') {
      const mm = t.months.find((x) => x.k === monthSel) ?? t.months[0];
      setPeriodLabel(mm.l);
    } else {
      if (rangeError) return;
      setPeriodLabel(fmtRange(fromVal, toVal, t.mon));
    }
    setPeriodOpen(false);
  };

  const headerRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={() => setPeriodOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px', border: `1px solid ${P.borderInput}`, borderRadius: 9, background: P.white, color: P.text, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
        <span style={{ color: P.text3, fontWeight: 500 }}>{t.period}</span><span dir="ltr">{periodLabel}</span><span style={{ color: P.text4 }}>▾</span>
      </button>
      {tab === 'dash' && <LocationSelector />}
      <button onClick={() => setHelpOpen(true)} title={t.help} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>?</button>
    </div>
  );

  return (
    <Page>
      <PageHeader title={t.title} screenId={tab === 'dash' ? 'MGT-PNL-01' : 'MGT-PNL-02'} right={headerRight}
        tabs={Object.assign([{ value: 'dash', label: t.dashboard }, { value: 'comp', label: t.comparison }], { active: tab, onChange: setTab })} />

      {tab === 'dash' && (
        <Body pad="16px 22px" gap={14}>
          {/* KPI row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <KpiCard tone="ink" flex={1.2} style={{ minWidth: 180, padding: '13px 16px' }} label={t.sales} value={d.sales ? m(d.sales) : '—'}
              sub={mkScope ? <span style={{ fontSize: 11.5 }}>{t.supplies}</span> : isAll ? <span style={{ fontSize: 11.5 }}>{t.rockKad}</span> : undefined} />
            <KpiCard style={{ minWidth: 130, padding: '13px 16px' }} label={t.foodCost}
              value={<span style={{ color: foodPct !== null && foodPct > 28 ? P.redFg : P.text }}>{foodPct !== null ? foodPct.toFixed(1) + '%' : '—'}</span>}
              sub={<span dir="ltr" style={{ fontSize: 10.5, color: P.text4 }}>{foodPct != null ? `${m(d.cons)} ÷ ${m(d.sales ?? 0)}` : t.noDirectSales}</span>} />
            <KpiCard style={{ minWidth: 130, padding: '13px 16px' }} label={t.waste}
              value={<span style={{ color: wastePct !== null && wastePct > 2 ? P.amberFg : P.text }}>{wastePct !== null ? wastePct.toFixed(1) + '%' : '—'}</span>} />
            <KpiCard style={{ minWidth: 150, padding: '13px 16px' }} label={t.contribution} value={<span style={{ color: P.greenFg }}>{d.contrib ? m(d.contrib) : '—'}</span>} />
            <KpiCard style={{ minWidth: 150, padding: '13px 16px' }} label={t.stockValue} value={m(d.end)} />
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* statement */}
            <div style={{ flex: 1.3, minWidth: 420, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${P.border}`, background: P.thead, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ ...uc, flex: 1 }}>{t.statement} · {scopeLabel}</span>
                <span style={{ fontSize: 11, color: P.text3 }}>{t.movingAvgNote}</span>
              </div>
              {stmt.map((r, i) => {
                const last = i === stmt.length - 1;
                const w = r.op === '=' || last ? 700 : 500;
                return (
                  <div key={i} className="row-hover" onClick={r.drill} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: `1px solid ${P.borderRow}`, background: r.op === '=' ? P.hover : 'transparent', cursor: 'pointer' }}>
                    <span style={{ width: 22, textAlign: 'center', fontWeight: 700, color: P.text4, fontSize: 14 }}>{r.op}</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: w }}>{r.label}</span>
                    <span style={{ fontSize: 11.5, color: P.text4 }}>{r.note}</span>
                    <span style={{ width: 96, textAlign: 'end', fontSize: 14, fontWeight: w }} dir="ltr">{(r.op === '−' && r.val > 0 ? '−' : '') + m(r.val)}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: reconOk ? '#EAF0E4' : P.amberBg }}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{t.reconciled}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700 }} dir="ltr">{reconOk ? '✓' : `${reconDiff < 0 ? '−' : '+'}$${Math.abs(reconDiff).toLocaleString('en-US')} ${t.openVariance}`}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: reconOk ? P.greenBg : P.amberPill, color: reconOk ? P.greenFg : P.amberFg }}>{reconOk ? t.reconciledPill : t.flaggedPill}</span>
              </div>
            </div>

            {/* side column */}
            <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
                <div style={uc}>{t.transfersAtCost}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, fontSize: 13.5 }}>
                  <div onClick={() => go('transfers')} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${P.borderRow}`, paddingBottom: 8, cursor: 'pointer' }}><span style={{ color: P.text3 }}>{t.transfersIn}</span><span style={{ fontWeight: 600 }} dir="ltr">{m(trfIn)}</span></div>
                  <div onClick={() => go('transfers')} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${P.borderRow}`, paddingBottom: 8, cursor: 'pointer' }}><span style={{ color: P.text3 }}>{t.transfersOut}</span><span style={{ fontWeight: 600 }} dir="ltr">{m(trfOut)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: P.text3 }}>{t.netNote}</span><span style={{ fontWeight: 600, fontSize: 12, color: P.greenFg }}>{t.combinedNote}</span></div>
                </div>
              </div>
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
                <div style={uc}>{t.assembledNote}</div>
                <div style={{ fontSize: 12.5, color: P.text2, lineHeight: 1.65, marginTop: 8 }}>{t.assembledBody}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn onClick={() => toast(t.exportToast)} style={{ height: 40, padding: '0 18px', color: P.ink }}>{t.export}</Btn>
                <Btn onClick={() => toast(t.compareToast)} style={{ height: 40, padding: '0 18px', color: P.ink }}>{t.comparePeriods}</Btn>
              </div>
            </div>
          </div>
        </Body>
      )}

      {tab === 'comp' && (
        <Body pad="16px 22px" gap={0}>
          <div style={{ fontSize: 13, color: P.text3, marginBottom: 12 }}>{t.compHint}</div>
          <div style={{ border: `1px solid ${P.border}`, borderRadius: 14, background: P.card, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.1fr) repeat(3,minmax(130px,1fr))', gap: 10, padding: '12px 18px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
              <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', alignSelf: 'end' }}>KPI</div>
              {LOCS.map((k) => (
                <button key={k} onClick={() => { store.setScope(k); setTab('dash'); }} style={{ textAlign: 'start', border: 'none', background: 'transparent', fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{t.locs[k]}</div>
                  <div style={{ fontSize: 11, color: P.blueFg, marginTop: 2 }}>{t.drillFull} {fwdGlyph}</div>
                </button>
              ))}
            </div>
            {compRows(per, t).map((cr, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.1fr) repeat(3,minmax(130px,1fr))', gap: 10, padding: '11px 18px', borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
                <div style={{ fontSize: 12.5, color: P.text3, fontWeight: 600 }}>{cr.kpi}</div>
                {cr.cells.map((cc, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: cc.color }} dir="ltr">{cc.val}</span>
                    {cc.flag && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: cc.sev === 'red' ? P.redPill : P.amberPill, color: cc.sev === 'red' ? P.redFg : P.amberFg, whiteSpace: 'nowrap' }}>{cc.flag}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, padding: '14px 16px', borderRadius: 12, background: P.amberBg, border: `1px solid ${P.amberBorder}` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none', marginTop: 5 }} />
            <span style={{ fontSize: 13, color: P.amberFg, lineHeight: 1.6 }}>{outlierNote(per, t, isAr)}</span>
          </div>
        </Body>
      )}

      {/* period picker */}
      {periodOpen && (
        <Overlay onClose={() => setPeriodOpen(false)} width={440}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${P.border}`, background: P.thead, fontSize: 16, fontWeight: 700 }}>{t.periodTitle}</div>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', border: `1px solid ${P.borderInput}`, borderRadius: 10, overflow: 'hidden', background: P.white }}>
              {(['month', 'range'] as const).map((md) => (
                <button key={md} onClick={() => setPeriodMode(md)} style={{ flex: 1, height: 40, border: 'none', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', background: periodMode === md ? P.ink : 'transparent', color: periodMode === md ? P.onInk : P.text3 }}>{md === 'month' ? t.byMonth : t.customRange}</button>
              ))}
            </div>
            {periodMode === 'month' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {t.months.map((mm) => {
                  const on = monthSel === mm.k;
                  return <button key={mm.k} onClick={() => setMonthSel(mm.k)} dir="ltr" style={{ textAlign: 'start', height: 46, padding: '0 16px', borderRadius: 10, border: `1px solid ${on ? P.text2 : P.borderInput}`, background: on ? P.hover : P.white, color: P.text, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{mm.l}</button>;
                })}
              </div>
            )}
            {periodMode === 'range' && (
              <>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  {([['from', fromVal, setFromVal], ['to', toVal, setToVal]] as const).map(([k, v, set]) => (
                    <div key={k} style={{ flex: 1 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text3 }}>{k === 'from' ? t.from : t.to}</div>
                      <input type="date" value={v} onChange={(e) => set(e.target.value)} style={{ width: '100%', height: 44, marginTop: 6, padding: '0 12px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontFamily: 'inherit', color: P.text, outline: 'none' }} />
                    </div>
                  ))}
                </div>
                {rangeError && <div style={{ fontSize: 12, color: P.redFg, marginTop: 8 }}>{t.rangeErr}</div>}
              </>
            )}
          </div>
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, background: P.thead, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setPeriodOpen(false)} style={{ height: 42, padding: '0 20px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cancelBtn}</button>
            <button onClick={applyPeriod} style={{ height: 42, padding: '0 22px', borderRadius: 10, border: 'none', background: rangeError ? '#9AA192' : P.ink, color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.apply}</button>
          </div>
        </Overlay>
      )}

      {/* help */}
      {helpOpen && (
        <Overlay onClose={() => setHelpOpen(false)} width={560}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t.helpTitle}</div>
            <div style={{ fontSize: 12.5, color: P.text2, lineHeight: 1.6, marginTop: 6 }}>{t.helpIntro}</div>
          </div>
          <div style={{ overflow: 'auto', padding: '6px 0' }}>
            {t.helpItems.map((hr) => (
              <div key={hr.k} style={{ padding: '12px 22px', borderTop: `1px solid ${P.borderRow}` }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: P.text }}>{hr.k}</div>
                <div style={{ fontSize: 12.5, color: P.text2, lineHeight: 1.6, marginTop: 3 }}>{hr.v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, background: P.thead, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setHelpOpen(false)} style={{ height: 42, padding: '0 22px', borderRadius: 10, border: 'none', background: P.ink, color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.gotIt}</button>
          </div>
        </Overlay>
      )}
    </Page>
  );
}

/* ── MGT-PNL-02 rows: outlier flags are data-driven (food cost > 28%, waste > 2%, open count variance) ── */
interface Cell { val: string; color: string; flag?: string; sev?: 'red' | 'amber' }
function compRows(per: Record<LocId, Figures>, t: typeof TEXT.en): { kpi: string; cells: Cell[] }[] {
  const food = (k: LocId) => (per[k].sales ? (per[k].cons / (per[k].sales ?? 1)) * 100 : null);
  return [
    { kpi: t.sales, cells: LOCS.map((k) => ({ val: per[k].sales ? m(per[k].sales ?? 0) : '—', color: P.text })) },
    { kpi: t.foodCost, cells: LOCS.map((k) => { const f = food(k); const hi = f !== null && f > 28; return { val: f !== null ? f.toFixed(1) + '%' : '—', color: hi ? P.redFg : P.text, ...(hi ? { flag: t.high, sev: 'amber' as const } : {}) }; }) },
    { kpi: t.waste, cells: LOCS.map((k) => { const w = per[k].wastePct ?? 0; const over = w > 2; return { val: w.toFixed(1) + '%', color: over ? P.amberFg : P.text, ...(over ? { flag: t.over, sev: 'amber' as const } : {}) }; }) },
    { kpi: t.stockValue, cells: LOCS.map((k) => ({ val: m(per[k].end), color: P.text })) },
    { kpi: t.contribution, cells: LOCS.map((k) => ({ val: per[k].contrib ? m(per[k].contrib ?? 0) : '—', color: P.greenFg })) },
    { kpi: t.countVariance, cells: LOCS.map((k) => { const v = Math.round(per[k].phys - per[k].end); return { val: v === 0 ? '$0' : (v < 0 ? '−$' : '+$') + Math.abs(v).toLocaleString('en-US'), color: v === 0 ? P.greenFg : P.amberFg, ...(v !== 0 ? { flag: t.open, sev: 'amber' as const } : {}) }; }) },
  ];
}

/* ── outlier note: assembled from the same live `per` figures as compRows, so the sentence and the flags
      can never disagree after a runtime change (highest food cost, its open count variance, any waste > 2%). ── */
function outlierNote(per: Record<LocId, Figures>, t: typeof TEXT.en, isAr: boolean): string {
  const pct = (x: number) => (isAr ? arDigits(x.toFixed(1)).replace('.', '٫') : x.toFixed(1));
  const money = (v: number) => (v < 0 ? '−' : '+') + (isAr ? arDigits(Math.abs(v)) + '$' : '$' + Math.abs(v).toLocaleString('en-US'));
  const food = (k: LocId) => (per[k].sales ? (per[k].cons / (per[k].sales ?? 1)) * 100 : null);

  let worst: LocId | null = null; let worstF = -Infinity;
  for (const k of LOCS) { const f = food(k); if (f !== null && f > worstF) { worstF = f; worst = k; } }
  const overWaste = LOCS.filter((k) => (per[k].wastePct ?? 0) > 2).sort((a, b) => (per[b].wastePct ?? 0) - (per[a].wastePct ?? 0));

  const parts: string[] = [];
  if (worst) {
    const v = Math.round(per[worst].phys - per[worst].end);
    let s = `${t.outlierLead} ${t.locs[worst]} — ` + t.outlierFoodHigh.replace('{p}', pct(worstF));
    if (v !== 0) s += ' ' + t.outlierVarOpen.replace('{v}', money(v));
    parts.push(s + '.');
  }
  if (overWaste.length) {
    const k = overWaste[0];
    parts.push(t.outlierWasteOver.replace('{loc}', t.locs[k]).replace('{w}', pct(per[k].wastePct ?? 0)) + '.');
  }
  return parts.length ? parts.join(' ') : t.outlierAllOk;
}
