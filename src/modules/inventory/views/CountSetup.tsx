import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { LocId } from '../../../store';
import { GridTable, GridRow, P } from '../../../ui';
import type { InvText } from '../text';
import { SETUP, FREQ_CYCLE, FREQ_STYLE, type Freq } from '../data';

const GRID = 'minmax(180px,1.6fr) 90px repeat(3,minmax(150px,1fr))';
const LOCS: LocId[] = ['mk', 'rock', 'kad'];

export function CountSetupView({ t, freqs, crits, onFreq, onCrit, onStartAll, onStartOne, scopeSingle }: {
  t: InvText; freqs: Record<string, Freq>; crits: Record<string, boolean>;
  onFreq: (row: string, loc: LocId, from: Freq, to: Freq) => void; onCrit: (row: string, to: boolean) => void;
  onStartAll: () => void; onStartOne: () => void; scopeSingle: string;
}) {
  const { isAr } = useLang();
  const store = useStore();
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
        <div style={{ fontSize: 14, color: P.text2 }}>{t.setupHint}</div>
        <div style={{ flex: 1 }} />
        <button onClick={onStartAll} style={{ height: 40, padding: '0 18px', borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.startCountAll}</button>
        <button onClick={onStartOne} style={{ height: 40, padding: '0 18px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.startCountOne} · {scopeSingle}</button>
      </div>
      <GridTable cols={GRID} style={{ flex: 1, minHeight: 0 }} head={[t.item, t.critical, t.locs.mk, t.locs.rock, t.locs.kad]}>
        {SETUP.map((su) => {
          const it = su.itemId ? store.item(su.itemId) : undefined;
          const name = it ? (isAr ? it.ar : it.en) : (isAr ? su.ar : su.en);
          const nameAlt = it ? (isAr ? it.en : it.ar) : (isAr ? su.en : su.ar);
          const crit = crits[su.key] ?? su.crit;
          return (
            <GridRow key={su.key} cols={GRID}>
              <div style={{ minWidth: 0 }}>
                <div className="ellipsis" style={{ fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 11.5, color: P.text4 }}>{nameAlt} · {t.countUnitLbl}: <span dir="ltr">{su.unit}</span></div>
              </div>
              <div>
                <button onClick={() => onCrit(su.key, !crit)} aria-pressed={crit} style={{ width: 40, height: 24, borderRadius: 999, border: `1px solid ${crit ? P.text2 : P.borderInput}`, background: crit ? P.text2 : P.chip, cursor: 'pointer', position: 'relative', padding: 0 }}>
                  <span style={{ position: 'absolute', top: 2, insetInlineStart: crit ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: P.white, boxShadow: '0 1px 2px rgba(0,0,0,.2)', transition: 'all .15s' }} />
                </button>
              </div>
              {LOCS.map((lk) => {
                const baseF = su[lk];
                if (!baseF) return <div key={lk}><span style={{ fontSize: 12, color: '#C6C0AB' }}>—</span></div>;
                const f = freqs[`${su.key}:${lk}`] ?? baseF;
                const st = FREQ_STYLE[f];
                const next = FREQ_CYCLE[(FREQ_CYCLE.indexOf(f) + 1) % FREQ_CYCLE.length];
                return (
                  <div key={lk}>
                    <button onClick={() => onFreq(su.key, lk, f, next)} style={{ height: 30, padding: '0 13px', borderRadius: 999, border: `1px solid ${st[2]}`, background: st[0], color: st[1], fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.freqs[f]}</button>
                  </div>
                );
              })}
            </GridRow>
          );
        })}
      </GridTable>
      <div style={{ fontSize: 12, color: P.text4, flex: 'none' }}>{t.setupNote}</div>
    </>
  );
}
