import { D } from '../../../ui';
import type { Text } from '../text';
import { TYPE_STYLE, fmtN, moneyN, type Recipe } from '../data';

/** STF-PRD-04 (classic) — review what you used, waste, produced, yield, batch id, destination → Production done. */
export default function Summary({ t, isAr, task, batchId, used, wasteCount, produced, un, yieldPct, yieldLow, cost, onBack, onDone }: {
  t: Text; isAr: boolean; task: Recipe; batchId: string; used: Record<string, number>; wasteCount: number; produced: number | null; un: string; yieldPct: number | null; yieldLow: boolean; cost: number; onBack: () => void; onDone: () => void;
}) {
  const nm = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const typeLabel = { inventory: t.typeInventory, sub: t.typeSub, recipe: t.typeRecipe };
  const cell = { border: `1px solid ${D.border}`, background: D.card, borderRadius: 16, padding: '14px 18px' };
  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ border: `1px solid ${D.border2}`, background: D.card3, borderRadius: 18, padding: '18px 22px' }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{nm(task)}</div>
          <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{t.batch} <span dir="ltr">{batchId}</span> · {t.summaryFor}</div>
        </div>

        <div style={{ border: `1px solid ${D.border}`, background: D.card, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', fontSize: 13, color: D.muted, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${D.headerBorder}` }}>{t.usedTitle}</div>
          {task.recipe.map((ig, i) => {
            const ts = TYPE_STYLE[ig.type];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderTop: '1px solid #20251F' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: ts.bg, color: ts.fg, fontWeight: 600 }}>{typeLabel[ig.type]}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600 }}>{nm(ig)}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }} dir="ltr">{used[i] != null ? `${fmtN(used[i])} ${ig.unit}` : '—'}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={cell}>
            <div style={{ fontSize: 13, color: D.muted }}>{t.wasteSection}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: wasteCount ? D.gold : D.muted, marginTop: 2 }} dir="ltr">{wasteCount ? `${wasteCount} ${t.items}` : t.none}</div>
          </div>
          <div style={cell}>
            <div style={{ fontSize: 13, color: D.muted }}>{t.producedSection}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }} dir="ltr">{produced != null ? `${fmtN(produced)} ${un}` : '—'}</div>
          </div>
          <div style={cell}>
            <div style={{ fontSize: 13, color: D.muted }}>{t.overallYield}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 700 }} dir="ltr">{yieldPct !== null ? yieldPct.toFixed(0) + '%' : '—'}</span>
              {yieldPct !== null && <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: yieldLow ? D.amberChip : D.greenBg, color: yieldLow ? D.gold : D.greenFg }}>{yieldLow ? t.yieldLow : t.yieldOk}</span>}
            </div>
          </div>
          <div style={cell}>
            <div style={{ fontSize: 13, color: D.muted }}>{t.batchIdLabel}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }} dir="ltr">{batchId}</div>
            <div style={{ fontSize: 12, color: D.dim, marginTop: 2 }}>{t.trackNote}</div>
          </div>
        </div>

        <div style={{ border: `1px solid ${D.border}`, background: D.card, borderRadius: 16, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, color: D.muted }}>{t.destination}</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{t.destVal}</span>
          <span style={{ fontSize: 13, color: D.muted, width: '100%' }}>{t.batchCost}: <b style={{ color: D.text }} dir="ltr">{moneyN(cost)}</b>{produced ? <span dir="ltr"> · {moneyN(cost / produced)} / {task.unit}</span> : null}</span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onBack} style={{ height: 68, padding: '0 24px', borderRadius: 16, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 17, fontFamily: 'inherit', cursor: 'pointer' }}>{t.back}</button>
          <button onClick={onDone} style={{ flex: 1, height: 68, borderRadius: 16, border: 'none', background: D.greenFg, color: '#0F1A12', fontSize: 20, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.productionDone}</button>
        </div>
      </div>
    </div>
  );
}
