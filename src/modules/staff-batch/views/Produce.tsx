import { D } from '../../../ui';
import type { Text } from '../text';
import { TYPE_STYLE, fmtN, type Ingredient, type Recipe } from '../data';
import type { PadField } from '../index';

/** STF-PRD-03 (classic) — system recipe, enter what you used; waste by item; quantity produced. */
export default function Produce({ t, isAr, task, planned, un, factor, used, wasteCount, produced, openPad, onWaste, onBack, onReview }: {
  t: Text; isAr: boolean; task: Recipe; planned: number; un: string; factor: number; used: Record<string, number>; wasteCount: number; produced: number | null; costOf: (ig: Ingredient) => number;
  openPad: (field: PadField, title: string, unit: string, initial: number | null) => void; onWaste: () => void; onBack: () => void; onReview: () => void;
}) {
  const nm = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const nmAlt = (o: { en: string; ar: string }) => (isAr ? o.en : o.ar);
  const typeLabel = { inventory: t.typeInventory, sub: t.typeSub, recipe: t.typeRecipe };
  const usedAny = Object.keys(used).length > 0;

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${D.border2}`, background: D.card3, borderRadius: 18, padding: '16px 20px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 23, fontWeight: 700 }}>{nm(task)}</div>
            <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{nmAlt(task)}</div>
          </div>
          <button onClick={() => openPad('planned', t.plannedQty, un, planned)} style={{ textAlign: 'end', padding: '8px 16px', borderRadius: 14, border: `1px solid ${D.border3}`, background: D.card2, fontFamily: 'inherit', cursor: 'pointer' }}>
            <div style={{ fontSize: 12.5, color: D.muted }}>{t.plannedQty}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: D.text }} dir="ltr">{fmtN(planned)} {un}</div>
          </button>
        </div>

        <div style={{ border: `1px solid ${D.border2}`, background: '#141714', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${D.headerBorder}` }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t.recipeHeader}</div>
            <div style={{ fontSize: 13.5, color: D.muted, marginTop: 3 }}>{t.recipeSub}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 128px', gap: 8, padding: '9px 20px', fontSize: 12, color: '#6E7266', textTransform: 'uppercase', letterSpacing: '.3px', background: '#12160F' }}>
            <div>{t.colIngredient}</div><div style={{ textAlign: 'end' }}>{t.colNeeds}</div><div style={{ textAlign: 'center' }}>{t.colUsed}</div>
          </div>
          {task.recipe.map((ig, i) => {
            const needs = Math.round(ig.qty * factor * 10) / 10;
            const v = used[i];
            const ts = TYPE_STYLE[ig.type];
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 128px', gap: 8, alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #20251F' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16.5, fontWeight: 600 }}>{nm(ig)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, padding: '2px 9px', borderRadius: 999, background: ts.bg, color: ts.fg, fontWeight: 600 }}>{typeLabel[ig.type]}</span>
                    <span style={{ fontSize: 12.5, color: D.dim }}>{nmAlt(ig)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'end', fontSize: 15, color: D.muted }} dir="ltr">{fmtN(needs)} {ig.unit}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => openPad(`used:${i}`, nm(ig), ig.unit, v ?? null)} style={{ minWidth: 118, height: 56, borderRadius: 14, border: `1px solid ${v != null ? '#4A5348' : D.border3}`, background: D.card2, color: v != null ? D.text : D.dim, fontSize: 22, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }} dir="ltr">{v != null ? `${fmtN(v)} ${ig.unit}` : '—'}</button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={onWaste} style={{ flex: 1, minWidth: 220, textAlign: 'start', padding: '16px 20px', borderRadius: 16, border: `1px solid ${wasteCount ? D.amberBorder : D.border3}`, background: D.card3, fontFamily: 'inherit', cursor: 'pointer' }}>
            <div style={{ fontSize: 13.5, color: D.muted }}>{t.wasteSection}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: wasteCount ? D.gold : D.dim, marginTop: 2 }}>{wasteCount ? `${wasteCount} ${t.items}` : t.none}</div>
            <div style={{ fontSize: 12.5, color: D.dim, marginTop: 2 }}>{t.wasteHint}</div>
          </button>
          <button onClick={() => openPad('produced', t.producedSection, un, produced)} style={{ flex: 1, minWidth: 220, textAlign: 'start', padding: '16px 20px', borderRadius: 16, border: `1px solid ${produced != null ? '#4A5348' : D.border3}`, background: D.card3, fontFamily: 'inherit', cursor: 'pointer' }}>
            <div style={{ fontSize: 13.5, color: D.muted }}>{t.producedSection}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: produced != null ? D.text : D.dim, marginTop: 2 }} dir="ltr">{produced != null ? `${fmtN(produced)} ${un}` : '—'}</div>
            <div style={{ fontSize: 12.5, color: D.dim, marginTop: 2 }}>{t.producedHint}</div>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onBack} style={{ height: 64, padding: '0 24px', borderRadius: 16, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 17, fontFamily: 'inherit', cursor: 'pointer' }}>{t.back}</button>
          <button onClick={onReview} style={{ flex: 1, height: 64, borderRadius: 16, border: 'none', background: usedAny ? D.cream : D.disabled, color: D.onCream, fontSize: 19, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.review}</button>
        </div>
      </div>
    </div>
  );
}
