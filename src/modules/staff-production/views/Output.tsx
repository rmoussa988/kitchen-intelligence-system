import { D } from '../../../ui';
import type { Text } from '../text';
import type { ProductSpec } from '../data';
import { fmt2, money, type Derived, type Flow } from '../logic';
import type { PadSpec } from '../logic';

/** STF-PRD-04 — output as a COUNT, leftover return (draw mode), reconciliation: recipe standard vs actual, THE GAP three ways. */
export default function Output({ t, isAr, spec, flow, dv, name, outU, inU, setFlow, openPad, onPause, onComplete }: {
  t: Text; isAr: boolean; spec: ProductSpec; flow: Flow; dv: Derived; name: string; outU: string; inU: string;
  setFlow: (p: Partial<Flow>) => void; openPad: (title: string, sub: string, unit: string, initial: number | null, key: PadSpec['key']) => void; onPause: () => void; onComplete: () => void;
}) {
  const rule = isAr ? spec.ruleAr : spec.ruleEn;
  const gap = dv.gap;
  const gapBorder = gap == null ? D.border : dv.gapBig ? D.redBorder : D.greenBorder;
  const chipBg = gap == null ? D.card : dv.gapBig ? D.redChip : D.greenBg;
  const gapFg = gap == null ? D.muted : dv.gapBig ? D.redFg : D.greenFg;
  const canComplete = flow.out != null;
  const editLeftover = () => openPad(t.leftoverReturn, t.leftoverNote, inU, flow.leftover, 'leftover');
  const usedDerivation = flow.mode === 'draw' ? `${fmt2(flow.raw || 0)} − ${fmt2(flow.leftover || 0)} − ${fmt2(flow.trim || 0)} ${t.trimWord}` : t.commitDeriv;

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => openPad(t.outCount, rule, outU, flow.out, 'out')} style={{ flex: 1.2, minWidth: 270, textAlign: 'start', border: '1px solid #4A5348', background: '#1C221C', borderRadius: 18, padding: '18px 22px', cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
          <div style={{ fontSize: 13, color: '#A9C0A9', textTransform: 'uppercase', letterSpacing: '.5px' }}>{name} — {t.outCount}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: flow.out != null ? D.text : D.dim }} dir="ltr">{flow.out != null ? fmt2(flow.out) : '—'}</span>
            <span style={{ fontSize: 17, color: D.muted }}>{outU}</span>
          </div>
          <div style={{ fontSize: 12.5, color: D.greenDot, marginTop: 4 }}>{t.outUnitNote}</div>
        </button>
        {flow.mode === 'draw' && (
          <button onClick={editLeftover} style={{ flex: 1, minWidth: 250, textAlign: 'start', border: `1px solid ${D.border2}`, background: D.card3, borderRadius: 18, padding: '18px 22px', cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
            <div style={{ fontSize: 13, color: D.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.leftoverReturn}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: flow.leftover != null ? D.text : D.dim }} dir="ltr">{flow.leftover != null ? fmt2(flow.leftover) : '—'}</span>
              <span style={{ fontSize: 17, color: D.muted }}>{inU}</span>
            </div>
            <div style={{ fontSize: 12.5, color: D.dim, marginTop: 4 }}>{t.leftoverNote}</div>
          </button>
        )}
        <div style={{ flex: 1, minWidth: 230, border: `1px solid ${D.border}`, background: D.card, borderRadius: 18, padding: '18px 22px' }}>
          <div style={{ fontSize: 13, color: D.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.actualUsed}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 40, fontWeight: 700 }} dir="ltr">{fmt2(dv.netInUse)}</span>
            <span style={{ fontSize: 17, color: D.muted }}>{inU}</span>
          </div>
          <div style={{ fontSize: 12.5, color: D.dim, marginTop: 4 }} dir="ltr">{usedDerivation}</div>
        </div>
      </div>

      <div style={{ border: `1px solid ${gapBorder}`, background: D.card3, borderRadius: 18, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: D.muted, textTransform: 'uppercase', letterSpacing: '.5px', flex: 1 }}>{t.reconcile}</div>
          <span style={{ fontSize: 12, color: D.greenDot }} dir={isAr ? undefined : 'ltr'}>{rule}</span>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13.5, color: D.muted }}>{t.recipeStandard}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }} dir="ltr">{dv.stdWeight != null ? `${fmt2(dv.stdWeight)} ${inU}` : '—'}</div>
            <div style={{ fontSize: 12, color: D.dim, marginTop: 1 }} dir="ltr">{flow.out != null ? `${fmt2(flow.out)} × ${spec.perUnit * 1000} g` : ''}</div>
          </div>
          <div style={{ fontSize: 22, color: D.dim }}>{isAr ? '←' : '→'}</div>
          <div>
            <div style={{ fontSize: 13.5, color: D.muted }}>{t.actualUsed}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }} dir="ltr">{fmt2(dv.netInUse)} {inU}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              [gap != null ? `${gap >= 0 ? '+' : '−'}${fmt2(Math.abs(gap))} ${inU}` : '—', t.gapWeight],
              [gap != null ? `${gap >= 0 ? '+' : '−'}${Math.abs(dv.gapPctN).toFixed(1)}%` : '—', t.gapPct],
              [gap != null ? `${gap >= 0 ? '−' : '+'}${money(dv.gapCostN)}` : '—', t.gapCost],
            ].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center', padding: '12px 18px', borderRadius: 13, background: chipBg }}>
                <div style={{ fontSize: 21, fontWeight: 700, color: gapFg }} dir="ltr">{v}</div>
                <div style={{ fontSize: 11.5, color: gapFg, opacity: .8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {dv.showReturnPrompt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, padding: '13px 17px', borderRadius: 13, background: '#211E14', border: `1px solid ${D.amberBorder}`, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, color: D.gold, lineHeight: 1.5, flex: 1, minWidth: 220 }}>{t.returnPromptQ}</span>
            <button onClick={editLeftover} style={{ height: 46, padding: '0 18px', borderRadius: 12, border: 'none', background: D.gold, color: D.onCream, fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.returnPromptYes}</button>
            <button onClick={() => setFlow({ promptDismissed: true })} style={{ height: 46, padding: '0 16px', borderRadius: 12, border: `1px solid ${D.amberBorder}`, background: 'transparent', color: D.gold, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{t.returnPromptNo}</button>
          </div>
        )}
        <div style={{ fontSize: 12.5, color: D.dim, marginTop: 12 }}>{t.gapFlagNote}</div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
        <button onClick={onPause} style={{ height: 60, padding: '0 22px', borderRadius: 15, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{t.pauseSwitch}</button>
        <div style={{ flex: 1 }} />
        <button onClick={onComplete} disabled={!canComplete} style={{ height: 60, padding: '0 38px', borderRadius: 15, border: 'none', background: canComplete ? D.cream : D.disabled, color: D.onCream, fontSize: 18, fontWeight: 700, fontFamily: 'inherit', cursor: canComplete ? 'pointer' : 'not-allowed' }}>{t.completeBatch}</button>
      </div>
    </div>
  );
}
