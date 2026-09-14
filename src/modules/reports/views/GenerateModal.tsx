import React, { useState } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { Scope } from '../../../store';
import { useToast, shortDate, timeHM, DEMO_TODAY, P } from '../../../ui';
import { TEXT } from '../text';
import { DOFF, GEN, MAXD, MFACT, MONTHS, PERIODS, PER_ROWS, REP, SHARES, TOPICS, scaleVal, type GenRep, type Unit } from '../data';
import { ChipBtn, SEG_WRAP, SegBtn, SELECT } from './shared';

const TILT: Record<Scope, number> = { all: 0, mk: 0.01, rock: -0.045, kad: 0.065 }; // rock runs leaner, kaddoum heavier
const INTENSIVE_CHIP = /avg|ticket|\/|per\b|median|rate|yield|margin|متوسط|وسيط|ساعة|إنتاجية|هامش/i;
const INTENSIVE_ROW = /avg|ticket|\/ labor|per\b|median|rate|yield|margin|متوسط|وسيط|ساعة عمل|إنتاجية|هامش/i;

/** Generated-report preview (opens from the library's Generate). Scope chips are bound to the global location scope. */
export function GenerateModal({ rep, from0, to0, onClose }: { rep: GenRep; from0: string; to0: string; onClose: () => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const scope = store.scope;
  const scopeLabel = scope === 'all' ? t.all : t.locs[scope];

  const [from, setFrom] = useState(from0);
  const [to, setTo] = useState(to0);
  const [topic, setTopic] = useState('Comparison');
  const [perMode, setPerMode] = useState(false);
  const [perA, setPerA] = useState('26-0');
  const [perB, setPerB] = useState('26-7');

  // from–to range drives the period line and the scale factor
  const Pv = (v: string) => v.split('-').map(Number);
  let [fm, fd] = Pv(from), [tm, td] = Pv(to);
  const doy = (mm: number, dd: number) => DOFF[mm] + dd;
  if (doy(fm, fd) > doy(tm, td)) { [fm, fd, tm, td] = [tm, td, fm, fd]; }
  const rangeDays = doy(tm, td) - doy(fm, fd) + 1;
  // monthly reports scale against a full-month base (31d) so a full past month ≈ the Compare tab's figure,
  // not against the truncated Aug MTD length (which would inflate earlier months ~2.6×)
  const baseDays = rep.group === 'daily' ? 1 : rep.group === 'weekly' ? 7 : 31;
  const isCmpRep = rep.key === 'Comparison';
  const repKey = isCmpRep ? topic : rep.key;
  const d = { ...GEN[rep.group], ...(REP[repKey] ?? {}) };
  const f = MFACT[tm] * rangeDays / baseDays;
  const fI = MFACT[tm];
  const fmn = MONTHS[fm][0], tmn = MONTHS[tm][0];
  const period = (fm === tm && fd === td) ? `${fd} ${fmn} 2026` : `${fd} ${fmn} – ${td} ${tmn} 2026`;
  const sc = (v: string) => (Math.abs(f - 1) < 0.005 ? v : scaleVal(v, f));
  const scI = (v: string) => (Math.abs(fI - 1) < 0.005 ? v : scaleVal(v, fI));
  const shares = SHARES[repKey] ?? SHARES._;

  const chips = d.chips.map((c) => {
    const intensive = INTENSIVE_CHIP.test(c[0]);
    // intensive (per-unit) chips take only the month seasonality, never the range-length multiplier
    let v = intensive ? scI(c[2]) : sc(c[2]);
    if (scope !== 'all') {
      const share = shares[scope];
      const scalable = /\$[\d,]|^\d{1,4}$/.test(v);
      if (scalable && !intensive) v = share === 0 ? '—' : scaleVal(v, share);
      if (scalable && intensive && share === 0) v = '—';
    }
    return { label: isAr ? c[1] : c[0], val: v, color: c[3] };
  });
  const rows = d.rows.map((r) => {
    const intensive = INTENSIVE_ROW.test(r[0]);
    const scR = (v: string) => (intensive ? scI(v) : sc(v));
    const locV = scope === 'mk' ? r[2] : scope === 'rock' ? r[3] : scope === 'kad' ? r[4] : r[5];
    return { name: isAr ? r[1] : r[0], mk: scR(r[2]), rock: scR(r[3]), kad: scR(r[4]), tot: scR(r[5]), totColor: r[6], loc: scR(locV) };
  });
  const dateOpts: { v: string; label: string }[] = [];
  for (let mm = 0; mm < 8; mm++) for (let dd = 1; dd <= MAXD[mm]; dd++) dateOpts.push({ v: mm + '-' + dd, label: dd + ' ' + MONTHS[mm][0] + ' 2026' });
  const daysNote = rangeDays + (isAr ? t.day : rangeDays === 1 ? t.day : t.days);

  // ── period-vs-period (Comparison report only) ──
  const opts = PERIODS();
  const pa = opts.find((o) => o.v === perA) ?? opts[0], pb = opts.find((o) => o.v === perB) ?? opts[7];
  const share = scope === 'all' ? 1 : shares[scope];
  const locName = scope === 'all' ? '' : t.locs[scope] + ' · ';
  const fmtP = (v: number, unit: Unit) => unit === '$' ? '$' + Math.round(v).toLocaleString('en-US') : unit === '$2' ? '$' + v.toFixed(2) : unit === '%' ? v.toFixed(1) + '%' : v >= 20 ? String(Math.round(v)) : v.toFixed(1);
  const perRows = (PER_ROWS[repKey] ?? PER_ROWS['Comparison']).map(([en, ar, base, unit, badUp]) => {
    const name = isAr ? ar : en;
    if (share === 0) return { name, a: '—', b: '—', delta: '—', color: P.text4 };
    // $ and counts take the location share × period factor; % metrics drift with period + location tilt
    const val = (ff: number) => (unit === '%' ? base * (0.72 + 0.28 * ff) * (1 + TILT[scope]) : base * ff * share);
    const va = val(pa.f), vb = val(pb.f);
    let delta: string, color: string;
    if (unit === '%') {
      const pt = vb - va;
      delta = (pt >= 0 ? '+' : '−') + Math.abs(pt).toFixed(1) + 'pt';
      color = (pt >= 0) === !badUp ? P.greenFg : P.redFg;
    } else {
      const pc = (vb - va) / Math.abs(va) * 100;
      delta = (pc >= 0 ? '+' : '−') + Math.abs(pc).toFixed(1) + '%';
      color = (pc >= 0) === !badUp ? P.greenFg : P.redFg;
    }
    return { name, a: fmtP(va, unit), b: fmtP(vb, unit), delta, color };
  });
  const showPer = isCmpRep && perMode;
  const showLocTable = !showPer;

  const hdrBtn: React.CSSProperties = { height: 34, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' };
  const ucLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text3 };
  const thead: React.CSSProperties = { gap: 8, padding: '9px 14px', fontSize: 10.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', background: P.thead, borderBottom: `1px solid ${P.border}`, display: 'grid' };
  const trow: React.CSSProperties = { gap: 8, padding: '9px 14px', fontSize: 12.5, borderBottom: '1px solid #EEE9DA', alignItems: 'center', display: 'grid' };

  return (
    <div className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,31,.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 55, padding: 24 }} onClick={onClose}>
      <div className="pop-up" onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px,96%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderBottom: `1px solid ${P.border}`, background: P.thead, flex: 'none' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{rep.name + t.reportSuffix}</div>
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: '#DDE8DA', color: P.greenStrong, fontWeight: 700 }}>{t.genReady}</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => toast(t.pdfToast)} style={hdrBtn}>PDF</button>
          <button onClick={() => toast(t.schedToast)} style={hdrBtn}>{t.schedule}</button>
          <button onClick={onClose} style={{ ...hdrBtn, width: 34, padding: 0, fontSize: 15, fontWeight: 400 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderBottom: `1px solid ${P.border}`, background: P.page, flex: 'none', flexWrap: 'wrap' }}>
          <span style={ucLabel}>{t.genScope}:</span>
          <div style={SEG_WRAP}>
            {(['all', 'mk', 'rock', 'kad'] as Scope[]).map((k) => <SegBtn key={k} on={scope === k} onClick={() => store.setScope(k)} h={28} px={11} fs={11.5}>{k === 'all' ? t.all : t.locs[k]}</SegBtn>)}
          </div>
          <div style={{ width: 1, height: 22, background: '#D5CFBC' }} />
          <span style={ucLabel}>{t.period}:</span>
          <span style={{ fontSize: 11.5, color: P.text3 }}>{t.from}</span>
          <select value={fm + '-' + fd} onChange={(e) => setFrom(e.target.value)} dir="ltr" style={{ ...SELECT, fontSize: 12 }}>{dateOpts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select>
          <span style={{ fontSize: 11.5, color: P.text3 }}>{t.to}</span>
          <select value={tm + '-' + td} onChange={(e) => setTo(e.target.value)} dir="ltr" style={{ ...SELECT, fontSize: 12 }}>{dateOpts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select>
          <span style={{ fontSize: 11.5, color: P.text4 }} dir="ltr">{daysNote}</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '26px 30px', background: P.white }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: 16, borderBottom: `2px solid ${P.ink}` }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '.5px' }}>KIS</div>
              <div style={{ fontSize: 11, color: P.text4 }}>Kitchen Intelligence System</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'end', fontSize: 12, color: P.text3, lineHeight: 1.6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{rep.name + t.reportSuffix}</div>
              <div>{t.genScope}: <b style={{ color: P.text }}>{scopeLabel}</b> · {t.genPeriod}: <b style={{ color: P.text }} dir="ltr">{period}</b></div>
              <div>{t.genAt} <span dir="ltr">{shortDate(DEMO_TODAY)} 2026 · {timeHM(DEMO_TODAY)}</span> · {t.genBy}</div>
            </div>
          </div>

          {isCmpRep && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={ucLabel}>{t.cmpMetric}:</span>
                {TOPICS.map(([en, ar, key]) => <ChipBtn key={key} on={topic === key} onClick={() => setTopic(key)}>{isAr ? ar : en}</ChipBtn>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <div style={SEG_WRAP}>
                  <SegBtn on={!perMode} onClick={() => setPerMode(false)}>{t.byLoc}</SegBtn>
                  <SegBtn on={perMode} onClick={() => setPerMode(true)}>{t.byPeriod}</SegBtn>
                </div>
                {perMode && (
                  <>
                    <select value={perA} onChange={(e) => setPerA(e.target.value)} dir="ltr" style={{ ...SELECT, height: 30, fontSize: 12 }}>{opts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select>
                    <span style={{ fontSize: 12, color: P.text3, fontWeight: 700 }}>{t.vs}</span>
                    <select value={perB} onChange={(e) => setPerB(e.target.value)} dir="ltr" style={{ ...SELECT, height: 30, fontSize: 12 }}>{opts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select>
                  </>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {chips.map((c, i) => (
              <div key={i} style={{ flex: 1, background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 10.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{c.label}</div>
                <div style={{ fontSize: 19, fontWeight: 700, marginTop: 2, color: c.color }} dir="ltr">{c.val}</div>
              </div>
            ))}
          </div>

          {showLocTable && (
            <div style={{ marginTop: 16, border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {scope === 'all' ? (
                <>
                  <div style={{ ...thead, gridTemplateColumns: 'minmax(150px,1.6fr) repeat(4,minmax(76px,1fr))' }}>
                    <div>{t.genMetric}</div><div style={{ textAlign: 'end' }}>{t.mk}</div><div style={{ textAlign: 'end' }}>Rock</div><div style={{ textAlign: 'end' }}>{t.kad}</div><div style={{ textAlign: 'end', fontWeight: 700 }}>{t.genTotal}</div>
                  </div>
                  {rows.map((r, i) => (
                    <div key={i} style={{ ...trow, gridTemplateColumns: 'minmax(150px,1.6fr) repeat(4,minmax(76px,1fr))' }}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{r.mk}</div>
                      <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{r.rock}</div>
                      <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{r.kad}</div>
                      <div style={{ textAlign: 'end', fontWeight: 700, color: r.totColor }} dir="ltr">{r.tot}</div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div style={{ ...thead, gridTemplateColumns: 'minmax(170px,2fr) minmax(110px,1fr)' }}>
                    <div>{t.genMetric}</div><div style={{ textAlign: 'end', fontWeight: 700 }}>{scopeLabel}</div>
                  </div>
                  {rows.map((r, i) => (
                    <div key={i} style={{ ...trow, gridTemplateColumns: 'minmax(170px,2fr) minmax(110px,1fr)' }}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ textAlign: 'end', fontWeight: 700, color: r.totColor }} dir="ltr">{r.loc}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {showPer && (
            <div style={{ marginTop: 16, border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ ...thead, gridTemplateColumns: 'minmax(140px,1.6fr) minmax(84px,1fr) minmax(84px,1fr) 108px' }}>
                <div>{t.genMetric}</div><div style={{ textAlign: 'end' }} dir="ltr">{locName + pa.label}</div><div style={{ textAlign: 'end' }} dir="ltr">{locName + pb.label}</div><div style={{ textAlign: 'end' }}>{t.cmpDelta}</div>
              </div>
              {perRows.map((r, i) => (
                <div key={i} style={{ ...trow, gridTemplateColumns: 'minmax(140px,1.6fr) minmax(84px,1fr) minmax(84px,1fr) 108px' }}>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ textAlign: 'end', color: P.text3 }} dir="ltr">{r.a}</div>
                  <div style={{ textAlign: 'end', fontWeight: 700 }} dir="ltr">{r.b}</div>
                  <div style={{ textAlign: 'end', fontWeight: 700, color: r.color }} dir="ltr">{r.delta}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: P.text4, marginTop: 14, lineHeight: 1.6 }}>{isAr ? d.foot[1] : d.foot[0]}</div>
        </div>
      </div>
    </div>
  );
}
