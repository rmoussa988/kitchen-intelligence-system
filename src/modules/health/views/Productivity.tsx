import { P } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import type { Text } from '../text';
import { DEPT_PANELS, type Bi } from '../data';

interface Props { t: Text }

/** MGT-PRV-01 — Productivity: prep + service department panels with the manual-hours caveat. */
export default function ProductivityView({ t }: Props) {
  const { isAr } = useLang();
  const bi = (b: Bi) => (isAr ? b.ar : b.en);

  return (
    <>
      <div style={{ fontSize: 13, color: P.text3, marginBottom: 14 }}>{t.prodHint}</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {DEPT_PANELS.map((dp, i) => (
          <div key={i} style={{ flex: 1, minWidth: 340, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: P.thead, borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, flex: 1 }}>{bi(dp.title)}</span>
              <span style={{ fontSize: 11, color: P.text3 }}>{bi(dp.src)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {dp.metrics.map((m, mi) => (
                <div key={mi} style={{ padding: '12px 18px', borderBottom: `1px solid ${P.borderRow}` }}>
                  <div style={{ fontSize: 11, color: P.text3 }}>{bi(m.name)}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                    <span dir="ltr" style={{ fontSize: 18, fontWeight: 700, color: m.bad ? P.redFg : P.text }}>{m.v}</span>
                    <span dir="ltr" style={{ fontSize: 10.5, color: m.delta.startsWith('+') ? '#48603A' : '#96382E' }}>{m.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: P.text4, marginTop: 12 }}>{t.prodNote}</div>
    </>
  );
}
