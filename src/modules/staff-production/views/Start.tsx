import { D } from '../../../ui';
import type { ProductionPlan } from '../../../store';
import type { Text } from '../text';
import type { ProductSpec } from '../data';
import { fmt2, type Derived, type Flow } from '../logic';
import type { PadSpec } from '../logic';

/** STF-PRD-02 — planned qty, RECOMMENDED panel, commit-exact vs draw-&-return, raw + trimming waste, start. */
export default function Start({ t, isAr, plan, spec, flow, dv, outU, inU, batchLabel, setFlow, openPad, onBack, onStart }: {
  t: Text; isAr: boolean; plan: ProductionPlan; spec: ProductSpec; flow: Flow; dv: Derived; name: string; outU: string; inU: string; batchLabel: string;
  setFlow: (p: Partial<Flow>) => void; openPad: (title: string, sub: string, unit: string, initial: number | null, key: PadSpec['key']) => void; onBack: () => void; onStart: () => void;
}) {
  const rule = isAr ? spec.ruleAr : spec.ruleEn;
  const rawLabel = flow.mode === 'draw' ? (isAr ? spec.drawAr : spec.drawEn) : (isAr ? spec.inAr : spec.inEn);
  const secLabel = spec.secIsOilEn ? (isAr ? spec.secIsOilAr ?? spec.secIsOilEn : spec.secIsOilEn) : t.recSecLabel;
  const ready = !!flow.mode && flow.raw != null;
  const absurd = flow.raw != null && flow.mode === 'commit' && flow.raw > dv.planNet * 1.5;
  const modeCard = (on: boolean) => ({ flex: 1, minWidth: 250, textAlign: 'start' as const, border: `1.5px solid ${on ? D.cream : D.border}`, background: on ? '#1C221C' : D.card, borderRadius: 16, padding: '16px 20px', cursor: 'pointer', fontFamily: 'inherit', color: D.text });

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1.2, minWidth: 280, border: `1px solid ${D.border}`, background: D.card, borderRadius: 18, padding: '18px 22px' }}>
          <div style={{ fontSize: 13, color: D.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.plannedQty}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 38, fontWeight: 700 }} dir="ltr">{plan.plannedQty}</span>
            <span style={{ fontSize: 17, color: D.muted }}>{outU}</span>
          </div>
          <div style={{ fontSize: 13, color: D.dim, marginTop: 4 }}><span dir="ltr">{batchLabel}</span> · {t.autoId}</div>
        </div>
        <div style={{ flex: 2, minWidth: 340, border: '1px solid #4A5348', background: '#1C221C', borderRadius: 18, padding: '18px 22px' }}>
          <div style={{ fontSize: 13, color: '#A9C0A9', textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.recommended}</div>
          <div style={{ display: 'flex', gap: 26, marginTop: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700 }} dir="ltr">{fmt2(dv.planNet)} {inU}</div>
              <div style={{ fontSize: 13.5, color: D.muted, marginTop: 2 }}>{t.recRawLabel}</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700 }} dir="ltr">{fmt2(dv.planNet * spec.secPerKg)} {inU}</div>
              <div style={{ fontSize: 13.5, color: D.muted, marginTop: 2 }}>{secLabel}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: D.greenDot, marginTop: 10 }} dir={isAr ? undefined : 'ltr'}>{rule}</div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: D.muted, marginBottom: 10 }}>{t.inputMode}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setFlow({ mode: 'commit' })} style={modeCard(flow.mode === 'commit')}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{t.commitExact}</div>
            <div style={{ fontSize: 13.5, color: D.muted, marginTop: 4 }}>{t.commitSub}</div>
          </button>
          <button onClick={() => setFlow({ mode: 'draw' })} style={modeCard(flow.mode === 'draw')}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{t.drawReturn}</div>
            <div style={{ fontSize: 13.5, color: D.muted, marginTop: 4 }}>{t.drawSub}</div>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => openPad(rawLabel, rule, inU, flow.raw, 'raw')} style={{ flex: 1.4, minWidth: 270, textAlign: 'start', border: `1px solid ${D.border2}`, background: D.card3, borderRadius: 16, padding: '16px 20px', cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
          <div style={{ fontSize: 13, color: D.muted }}>{rawLabel}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: flow.raw != null ? D.text : D.dim }} dir="ltr">{flow.raw != null ? fmt2(flow.raw) : '—'}</span>
            <span style={{ fontSize: 15, color: D.muted }}>{inU}</span>
          </div>
          <div style={{ fontSize: 12, color: D.dim, marginTop: 3 }}>{flow.raw != null ? <>= <span dir="ltr">{fmt2(flow.raw)}</span> {t.ruleBase}</> : ''}</div>
        </button>
        <button onClick={() => openPad(t.trimWaste, t.trimNote, inU, flow.trim, 'trim')} style={{ flex: 1, minWidth: 230, textAlign: 'start', border: `1px solid ${D.border2}`, background: D.card3, borderRadius: 16, padding: '16px 20px', cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
          <div style={{ fontSize: 13, color: D.muted }}>{t.trimWaste}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: flow.trim != null ? D.text : D.dim }} dir="ltr">{flow.trim != null ? fmt2(flow.trim) : '—'}</span>
            <span style={{ fontSize: 15, color: D.muted }}>{inU}</span>
          </div>
          <div style={{ fontSize: 12, color: D.dim, marginTop: 3 }}>{t.trimNote}</div>
        </button>
      </div>

      {absurd && (
        <div style={{ display: 'flex', gap: 10, padding: '13px 17px', borderRadius: 13, background: '#211E14', border: `1px solid ${D.amberBorder}` }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C99A2E', flex: 'none', marginTop: 6 }} />
          <span style={{ fontSize: 14, color: D.gold, lineHeight: 1.5 }}>{t.absurd}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
        <button onClick={onBack} style={{ height: 60, padding: '0 22px', borderRadius: 15, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{t.saveLater}</button>
        <div style={{ flex: 1 }} />
        <button onClick={onStart} disabled={!ready} style={{ height: 60, padding: '0 38px', borderRadius: 15, border: 'none', background: ready ? D.cream : D.disabled, color: D.onCream, fontSize: 18, fontWeight: 700, fontFamily: 'inherit', cursor: ready ? 'pointer' : 'not-allowed' }}>{t.startBatch}</button>
      </div>
    </div>
  );
}
