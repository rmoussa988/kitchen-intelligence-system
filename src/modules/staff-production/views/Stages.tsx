import { D } from '../../../ui';
import type { Text } from '../text';
import type { ProductSpec } from '../data';
import { fmt2, type Derived, type Flow } from '../logic';
import type { PadSpec } from '../logic';

/** STF-PRD-03 — marination step (recipe-computed from the working quantity), remaining steps, stage waste, pause & switch. */
export default function Stages({ t, isAr, spec, flow, dv, inU, openPad, toggleStep, onPause, onNext, onWaste }: {
  t: Text; isAr: boolean; spec: ProductSpec; flow: Flow; dv: Derived; inU: string;
  openPad: (title: string, sub: string, unit: string, initial: number | null, key: PadSpec['key']) => void; toggleStep: (idx: number, on: boolean) => void; onPause: () => void; onNext: () => void; onWaste: () => void;
}) {
  const stepNames = isAr ? spec.stepsAr : spec.stepsEn;
  const secLabel = spec.secIsOilEn ? (isAr ? spec.secIsOilAr ?? spec.secIsOilEn : spec.secIsOilEn) : t.marinadeActual;
  const secVar = dv.secVarN != null && Math.abs(dv.secVarN) > 0.05
    ? `${dv.secVarN > 0 ? '+' : '−'}${fmt2(Math.abs(dv.secVarN))} ${inU} ${dv.drawUnresolved ? t.provisional : t.recorded}`
    : null;
  const inUse = dv.drawUnresolved ? `${fmt2(dv.planNet)} ${inU} ${t.planDrawn(fmt2(flow.raw || 0))}` : `${fmt2(dv.netInUse)} ${inU}`;
  const canNext = flow.sec != null;

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {stepNames.map((name, i) => {
          const on = !!flow.steps[i];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 999, border: `1px solid ${on ? D.greenBorder : D.border}`, background: on ? D.greenBg : D.card }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: on ? '#8FB89F' : D.chip, color: on ? '#0C0F0C' : D.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: on ? '#C8E0CF' : D.muted }}>{name}</span>
            </div>
          );
        })}
      </div>

      <div style={{ border: '1px solid #4A5348', background: '#1C221C', borderRadius: 18, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, color: '#A9C0A9', textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.marinationStep}</div>
        <div style={{ display: 'flex', gap: 26, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 14, color: D.muted }}>{t.chickenInUse}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 3 }} dir="ltr">{inUse}</div>
          </div>
          <div>
            <div style={{ fontSize: 14, color: D.muted }}>{t.marinadeNeeded}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 3, color: '#A9C0A9' }} dir="ltr">{fmt2(dv.secNeeded)} {inU}</div>
          </div>
          <button onClick={() => openPad(secLabel, `${t.neededPrefix}${fmt2(dv.secNeeded)} ${inU}`, inU, flow.sec, 'sec')} style={{ textAlign: 'start', border: `1px solid ${D.border2}`, background: D.card3, borderRadius: 14, padding: '12px 18px', cursor: 'pointer', fontFamily: 'inherit', color: D.text, minWidth: 200 }}>
            <div style={{ fontSize: 13, color: D.muted }}>{t.marinadeActual}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 2 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: flow.sec != null ? D.text : D.dim }} dir="ltr">{flow.sec != null ? fmt2(flow.sec) : '—'}</span>
              <span style={{ fontSize: 14, color: D.muted }}>{inU}</span>
            </div>
          </button>
        </div>
        {secVar && <div style={{ fontSize: 13, color: D.muted, marginTop: 10 }} dir="ltr">{secVar}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stepNames.slice(1).map((name, i) => {
          const idx = i + 1;
          const on = !!flow.steps[idx];
          return (
            <button key={idx} onClick={() => toggleStep(idx, on)} style={{ textAlign: 'start', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', border: `1px solid ${on ? D.greenBorder : D.border}`, background: D.card, borderRadius: 15, cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${on ? '#8FB89F' : D.border3}`, background: on ? '#8FB89F' : 'transparent', color: '#0C0F0C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flex: 'none' }}>{on ? '✓' : ''}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 13, color: D.muted, marginTop: 2 }}>{on ? t.completedWord : t.tapWhenDone}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={onWaste} style={{ alignSelf: 'flex-start', height: 50, padding: '0 20px', borderRadius: 13, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>{t.stageWaste}</button>

      <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
        <button onClick={onPause} style={{ height: 60, padding: '0 22px', borderRadius: 15, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{t.pauseSwitch}</button>
        <div style={{ flex: 1 }} />
        <button onClick={onNext} disabled={!canNext} style={{ height: 60, padding: '0 38px', borderRadius: 15, border: 'none', background: canNext ? D.cream : D.disabled, color: D.onCream, fontSize: 18, fontWeight: 700, fontFamily: 'inherit', cursor: canNext ? 'pointer' : 'not-allowed' }}>{t.toOutput}</button>
      </div>
    </div>
  );
}
