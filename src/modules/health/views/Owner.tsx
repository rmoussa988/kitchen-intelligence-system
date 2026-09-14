import { KpiCard, P } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import type { Text } from '../text';
import { OWNER_KPIS, PROBLEMS, IMPROVEMENTS, RECOMMENDED, REPORT_MONTH, PREV_MONTH, type Bi } from '../data';

interface Props { t: Text; compare: boolean; onCompare: () => void; onExport: () => void }

/** OWN-RPT-01 — Monthly owner report: auto executive summary, problems vs improvements, 3 recommended actions, export. */
export default function OwnerView({ t, compare, onCompare, onExport }: Props) {
  const { isAr } = useLang();
  const bi = (b: Bi) => (isAr ? b.ar : b.en);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 700 }}>{t.ownerTitle}</div>
          <div style={{ fontSize: 13, color: P.text3, marginTop: 2 }}>
            {t.ownerSub} · <span dir="ltr">{compare ? `${PREV_MONTH} → ${REPORT_MONTH}` : REPORT_MONTH}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onCompare} aria-pressed={compare}
          style={{ height: 34, padding: '0 14px', borderRadius: 8, border: `1px solid ${compare ? P.ink : P.borderInput}`, background: compare ? P.ink : P.white, color: compare ? P.onInk : P.text2, fontSize: 12.5, fontWeight: compare ? 600 : 400, fontFamily: 'inherit', cursor: 'pointer' }}>
          {t.compare}
        </button>
        <button onClick={onExport} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: 'none', background: P.ink, color: P.onInk, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.exportShare}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 10, marginTop: 16 }}>
        {OWNER_KPIS.map((k, i) => (
          <KpiCard key={i} label={bi(k.name)} value={k.v} tone={k.tone}
            sub={<span dir="ltr" style={{ display: 'inline-block' }}>{compare ? `${k.prev} ${t.inJun}` : bi(k.sub)}</span>}
            style={{ padding: '13px 16px', ...(k.tone === 'amber' || k.tone === 'red' ? { background: P.surface } : {}) }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.redFg }}>{t.biggestProblems}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {PROBLEMS.map((p, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.55, padding: '9px 12px', borderRadius: 9, background: '#FBF6F0' }}>
                <span style={{ fontWeight: 700 }}>{bi(p.head)}</span> — {bi(p.body)}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 300, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.greenFg }}>{t.biggestImprovements}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {IMPROVEMENTS.map((p, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.55, padding: '9px 12px', borderRadius: 9, background: '#F0F3EA' }}>
                <span style={{ fontWeight: 700 }}>{bi(p.head)}</span> — {bi(p.body)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, background: P.ink, color: P.page, borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.recommendedActions}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
          {RECOMMENDED.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.5 }}>
              <span style={{ color: '#7FA98A', fontWeight: 700, flex: 'none' }}>{i + 1}.</span><span>{bi(a)}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: P.inkMuted, marginTop: 12 }}>{t.ownerNote}</div>
      </div>
    </div>
  );
}
