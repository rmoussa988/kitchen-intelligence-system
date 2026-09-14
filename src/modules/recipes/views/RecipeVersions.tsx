import { useLang } from '../../../i18n/LangContext';
import { P } from '../../../ui';
import { TEXT } from '../text';
import type { DiffMark, RecipeVersion } from '../data';

const MARK_STYLE: Record<DiffMark, [string, string]> = { '+': [P.greenBg, P.greenFg], '~': [P.amberPill, P.amberFg], '−': [P.redPill, P.redFg], '=': ['#EDEAE0', P.text4] };

/** MGT-RCP-03 — append-only version history with per-version diffs. */
export function RecipeVersions({ versions, diffV, setDiffV }: { versions: RecipeVersion[]; diffV: number | null; setDiffV: (i: number) => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const sel = diffV ?? 0;
  const dv = versions[Math.min(sel, versions.length - 1)];
  const prev = dv.v - 1 > 0 ? String(dv.v - 1) : '—';

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {versions.map((v, i) => {
          const on = sel === i;
          return (
            <div key={`${v.v}-${i}`} onClick={() => setDiffV(i)} style={{ border: `1px solid ${on ? P.text2 : P.border}`, background: on ? P.hover : P.card, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }} dir="ltr">v{v.v}</span>
                {i === 0 && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: P.greenBg, color: P.greenFg }}>{t.current}</span>}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: P.text3 }} dir="ltr">{v.date}</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6 }}>{isAr ? (v.reasonAr || v.reason) : v.reason}</div>
              <div style={{ fontSize: 12, color: P.text3, marginTop: 4 }}>{v.who} · {t.costAtVersion}: <span dir="ltr" style={{ fontWeight: 600, color: P.text }}>{v.cost}</span> · <span dir="ltr">{v.txns}</span> {t.txnsUsed}</div>
            </div>
          );
        })}
        <div style={{ fontSize: 12, color: P.text4, marginTop: 4 }}>{t.versionRule}</div>
      </div>
      <div style={{ flex: 1.2, minWidth: 380, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}><span dir="ltr">v{dv.v}</span> {t.diffVs} <span dir="ltr">v{prev}</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {dv.diff.map((d, i) => {
            const hasArrow = d[2].includes('→');
            const detailOld = hasArrow ? d[2].slice(0, d[2].lastIndexOf('→') + 1) + ' ' : '';
            const detailNew = hasArrow ? d[2].slice(d[2].lastIndexOf('→') + 1).trim() : d[2];
            const ms = MARK_STYLE[d[0]] ?? MARK_STYLE['='];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: ms[0] + '55', fontSize: 13 }}>
                <span style={{ width: 20, fontWeight: 700, color: ms[1], flex: 'none', textAlign: 'center' }}>{d[0]}</span>
                <span style={{ flex: 1 }}>{d[1]}</span>
                <span dir="ltr"><span style={{ color: P.text3 }}>{detailOld}</span><span style={{ color: P.blueFg, fontWeight: 700 }}>{detailNew}</span></span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${P.border}`, fontSize: 13.5 }}>
          <span style={{ color: P.text3 }}>{t.costChange}</span>
          <span style={{ fontWeight: 700 }} dir="ltr">{dv.costChange}</span>
        </div>
      </div>
    </div>
  );
}
