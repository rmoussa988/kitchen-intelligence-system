import { D } from '../../../ui';
import type { Text } from '../text';
import { fmt2, type Derived, type Flow } from '../logic';

/** Completion sheet: output → stock at built-up cost, gap → sent to MGT-PRD-06, back to plans. */
export default function Done({ t, flow, dv, name, outU, inU, onBack }: { t: Text; isAr: boolean; flow: Flow; dv: Derived; name: string; outU: string; inU: string; onBack: () => void }) {
  const gap = dv.gap;
  const doneGap = gap != null && Math.abs(dv.gapPctN) > 0.5
    ? `${t.gapWord}${gap >= 0 ? '+' : '−'}${fmt2(Math.abs(gap))} ${inU} (${gap >= 0 ? '+' : '−'}${Math.abs(dv.gapPctN).toFixed(1)}%) → ${t.sentToReview}`
    : null;
  return (
    <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
      <div style={{ width: 92, height: 92, borderRadius: '50%', background: D.greenBg, border: `1px solid ${D.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke={D.greenFg} strokeWidth="2.4"><path d="M4 12.5l5 5L20 6.5" /></svg>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center' }}>{t.doneTitle} — {name}</div>
      <div style={{ fontSize: 16.5, color: D.muted, textAlign: 'center', maxWidth: 560, lineHeight: 1.6 }}>{flow.out != null ? <><span dir="ltr">{fmt2(flow.out)} {outU}</span> → {t.entersStock}</> : ''}</div>
      {doneGap && <div style={{ fontSize: 14.5, color: D.gold, textAlign: 'center', maxWidth: 560, lineHeight: 1.5 }}>{doneGap}</div>}
      <button onClick={onBack} style={{ marginTop: 8, height: 58, padding: '0 30px', borderRadius: 15, border: `1px solid ${D.border3}`, background: D.card, color: D.text, fontSize: 17, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.backToPlans}</button>
    </div>
  );
}
