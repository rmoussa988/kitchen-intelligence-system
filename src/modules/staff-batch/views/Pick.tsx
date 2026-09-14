import { D } from '../../../ui';
import type { Text } from '../text';
import { TASKS, fmtN, moneyN, type Recipe } from '../data';
import type { LogEntry } from '../index';

const STATUS = {
  none: { bg: '#2A2F28', fg: '#C9CFC4', accent: '#2E342E' },
  progress: { bg: '#3A3320', fg: '#E0C989', accent: '#5A5230' },
  done: { bg: '#22352A', fg: '#7FC79A', accent: '#3B5A46' },
};

/** STF-PRD-02 (classic) — today's plan cards, work-done log, ad-hoc batch. */
export default function Pick({ t, isAr, statusOf, planQty, log, finished, progress, onPick, onAdhoc }: {
  t: Text; isAr: boolean; statusOf: (r: Recipe) => 'none' | 'progress' | 'done'; planQty: (r: Recipe) => number; log: LogEntry[]; finished: Record<string, boolean>; progress: Record<string, boolean>; onPick: (r: Recipe) => void; onAdhoc: () => void;
}) {
  const nm = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const nmAlt = (o: { en: string; ar: string }) => (isAr ? o.en : o.ar);
  // Derive the summary from this session's work (as the prototype does) so it matches the log rows below it —
  // a store-done plan surfaces its badge on the card, but it is not counted here without a session batch.
  const doneCount = Object.keys(finished).length;
  const progCount = Object.keys(progress).length;
  const parts: string[] = [];
  if (doneCount) parts.push(`${doneCount} ${t.finishedWord}`);
  if (progCount) parts.push(`${progCount} ${t.inProgressWord}`);

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 16, color: D.muted }}>{t.pickHint}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
        {TASKS.map((tk) => {
          const st = statusOf(tk);
          const sm = STATUS[st];
          const label = st === 'done' ? t.statusDone : st === 'progress' ? t.statusProgress : t.assigned;
          return (
            <button key={tk.prefix} onClick={() => onPick(tk)} className="tile-hover" style={{ textAlign: 'start', border: `1px solid ${sm.accent}`, background: D.card, borderRadius: 18, padding: '18px 20px', cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{nm(tk)}</div>
                <span style={{ fontSize: 13, padding: '5px 11px', borderRadius: 999, background: sm.bg, color: sm.fg, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
              </div>
              <div style={{ fontSize: 14, color: D.muted, marginTop: 5 }}>{nmAlt(tk)}</div>
              <div style={{ fontSize: 15, color: D.text2, marginTop: 10 }} dir="ltr">{fmtN(planQty(tk))} {isAr ? tk.unitAr : tk.unit} {t.planned} · {tk.recipe.length} {t.ingredients}</div>
            </button>
          );
        })}
      </div>
      {log.length > 0 && (
        <div style={{ border: `1px solid ${D.border}`, background: '#161A16', borderRadius: 18, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{t.workDone}</div>
            <div style={{ fontSize: 14, color: D.muted }}>{parts.join(' · ')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {log.map((e) => {
              const low = e.yieldPct != null && e.yieldPct < e.stdYield - 3;
              return (
                <div key={e.batchId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: `1px solid ${D.chip}`, background: D.card, borderRadius: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{nm(e)}</div>
                    <div style={{ fontSize: 12.5, color: '#7C857A', marginTop: 2 }} dir="ltr">{e.batchId}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 15, color: D.text2 }} dir="ltr">{e.produced != null ? fmtN(e.produced) : '—'} {isAr ? e.unitAr : e.unit}</div>
                    <div style={{ fontSize: 12.5, marginTop: 2, color: low ? '#E0A06A' : D.greenFg }} dir="ltr">{t.overallYield} {e.yieldPct != null ? e.yieldPct.toFixed(0) + '%' : '—'}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: D.cream, minWidth: 82, textAlign: 'end' }} dir="ltr">{moneyN(e.cost)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <button onClick={onAdhoc} style={{ alignSelf: 'flex-start', height: 52, padding: '0 20px', borderRadius: 14, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.adhocBatch}</button>
    </div>
  );
}
