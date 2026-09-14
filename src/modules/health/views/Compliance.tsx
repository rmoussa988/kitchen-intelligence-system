import { Pill, P, shortDate, timeHM, DEMO_TODAY } from '../../../ui';
import { useLang, arDigits } from '../../../i18n/LangContext';
import type { Text } from '../text';
import { checklistScore, scorePillStyle, ST_STYLE, SEV_MAP, atLocalMidnight, type Bi, type HealthState } from '../data';

interface Props { t: Text; ms: HealthState; onToggleItem: (checklistId: string, itemId: string) => void; onCycle: (actionId: string) => void }

const COLS = 'minmax(112px,1.5fr) 58px 60px 62px 80px';

/** MGT-CMP-01 — Compliance: weighted checklists with scores + corrective-action tracker (tap status to advance). */
export default function ComplianceView({ t, ms, onToggleItem, onCycle }: Props) {
  const { isAr } = useLang();
  const bi = (b: Bi) => (isAr ? b.ar : b.en);
  const today = DEMO_TODAY.slice(0, 10);
  const when = (ts: string) => {
    const hm = timeHM(ts);
    return ts.slice(0, 10) === today ? hm : `${t.yesterday} ${isAr ? arDigits(hm) : hm}`;
  };

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* ── checklists ── */}
      <div style={{ flex: 1, minWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.checklists}</div>
        {ms.checklists.map((cl) => {
          const score = checklistScore(cl);
          const [sbg, sfg] = scorePillStyle(score);
          return (
            <div key={cl.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, flex: 1 }}>{bi(cl.name)}</div>
                <span style={{ fontSize: 12, color: P.text3 }}>{t.locs[cl.loc]} · {when(cl.ts)}</span>
                <Pill bg={sbg} fg={sfg} size="md" ltr style={{ fontSize: 13, fontWeight: 700 }}>{score} / 100</Pill>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                {cl.items.map((ci) => (
                  <div key={ci.id} role="button" tabIndex={0} title={t.tapItem} onClick={() => onToggleItem(cl.id, ci.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleItem(cl.id, ci.id); } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '6px 10px', borderRadius: 8, background: ci.pass ? '#F3F1E8' : '#FBF6F4', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ width: 16, textAlign: 'center', fontWeight: 700, color: ci.pass ? '#48603A' : '#C0392B' }}>{ci.pass ? '✓' : '✕'}</span>
                    <span style={{ flex: 1 }}>{bi(ci.name)}</span>
                    <span dir="ltr" style={{ color: P.text3, fontSize: 11.5 }}>{ci.note ? bi(ci.note) : ''}</span>
                    <span dir="ltr" style={{ color: P.text4, fontSize: 11 }}>w{ci.weight}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── corrective actions ── */}
      <div style={{ flex: 1.1, minWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.correctiveActions}</div>
        <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '9px 14px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
            <div>{t.issue}</div><div>{t.owner2}</div><div>{t.severity}</div><div>{t.deadline}</div><div>{t.status}</div>
          </div>
          {ms.actions.map((ca) => {
            const [stBg, stBorder, stFg] = ST_STYLE[ca.status];
            const [sevBg, sevFg, sevLabel] = SEV_MAP[ca.sev];
            const overdue = ca.status === 'overdue';
            return (
              <div key={ca.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '10px 14px', fontSize: 12.5, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: overdue ? '#FBF6F0' : 'transparent' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{bi(ca.issue)}</div>
                  <div style={{ fontSize: 11, color: P.text4 }}>{t.locs[ca.loc]} · {bi(ca.src)}</div>
                </div>
                <div style={{ color: P.text2, fontSize: 12 }}>{ca.owner}</div>
                <div><Pill bg={sevBg} fg={sevFg} size="xs" style={{ fontWeight: 700, padding: '3px 8px' }}>{bi(sevLabel)}</Pill></div>
                <div dir="ltr" style={{ color: overdue ? P.redFg : P.text3, fontSize: 12, textAlign: 'start' }}>{shortDate(atLocalMidnight(ca.deadline), isAr)}</div>
                <div>
                  <button onClick={() => onCycle(ca.id)} title={t.tapStatus}
                    style={{ height: 26, padding: '0 10px', borderRadius: 999, border: `1px solid ${stBorder}`, background: stBg, color: stFg, fontSize: 10.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {t.st[ca.status]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: P.text4 }}>{t.compNote}</div>
      </div>
    </div>
  );
}
