import { useMemo } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { LocId } from '../../../store';
import { GridTable, GridRow, KpiCard, P, fmt, money } from '../../../ui';
import type { InvText } from '../text';
import { REVIEW, ACCURACY, VAR_STYLE, reviewKey, reviewExpPhys, type ReviewRow } from '../data';

const GRID_ALL = 'minmax(126px,1.4fr) 86px 76px 76px 86px 88px 94px 128px';
const GRID_ONE = 'minmax(126px,1.4fr) 76px 76px 86px 88px 94px 128px';

export function CountReviewView({ t, isAccepted, recounts, onAccept, onRecount }: {
  t: InvText; isAccepted: (r: ReviewRow) => boolean; recounts: Record<string, boolean>; onAccept: (r: ReviewRow) => void; onRecount: (r: ReviewRow) => void;
}) {
  const { isAr } = useLang();
  const store = useStore();
  const isAll = store.scope === 'all';
  const rows = useMemo(() => REVIEW.filter((r) => store.inScope(r.loc)), [store]);
  const sorted = useMemo(() => [...rows].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)), [rows]);
  const fav = rows.filter((r) => r.impact > 0).reduce((a, r) => a + r.impact, 0);
  const unfav = rows.filter((r) => r.impact < 0).reduce((a, r) => a + r.impact, 0);
  const net = fav + unfav;
  const grid = isAll ? GRID_ALL : GRID_ONE;
  const sq = (n: number, unit: string) => (n === 0 ? '0' : `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))} ${unit}`);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flex: 'none' }}>
        <div style={{ flex: 1, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.greenFg, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.totalFavorable}</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: P.greenFg }} dir="ltr">+${fav.toFixed(2)}</div>
        </div>
        <div style={{ flex: 1, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.redFg, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.totalUnfavorable}</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: P.redFg }} dir="ltr">−${Math.abs(unfav).toFixed(2)}</div>
        </div>
        <KpiCard tone="ink" label={t.netVariance} value={<span style={{ fontSize: 24 }}>{(net >= 0 ? '+' : '−') + '$' + Math.abs(net).toFixed(2)}</span>} />
        <KpiCard label={t.countAccuracy} value={<span style={{ fontSize: 24 }}>{ACCURACY[store.scope]}</span>} />
      </div>
      <div style={{ fontSize: 12.5, color: P.text3, flex: 'none' }}>{t.reviewHint}</div>
      <GridTable cols={grid} style={{ flex: 1, minHeight: 0 }} empty={t.emptyReview}
        head={[t.product, ...(isAll ? [t.location] : []), { label: t.expected, align: 'end' }, { label: t.physical, align: 'end' }, { label: t.qtyVariance, align: 'end' }, { label: t.costImpact, align: 'end' }, t.status, '']}>
        {sorted.map((r) => {
          const it = store.item(r.itemId);
          const name = it ? (isAr ? it.ar : it.en) : (isAr ? r.ar : r.en);
          const nameAlt = it ? (isAr ? it.en : it.ar) : (isAr ? r.en : r.ar);
          const { exp, phys } = reviewExpPhys(it, r);
          const vs = VAR_STYLE[r.status];
          const varColor = r.impact > 0 ? P.greenFg : r.impact < 0 ? P.redFg : P.text3;
          const acc = isAccepted(r);
          const rc = !!recounts[reviewKey(r)];
          const pillLabel = r.status === 'fav' ? t.favorable : r.status === 'within' ? t.withinTol : t.unfavorable;
          return (
            <GridRow key={reviewKey(r)} cols={grid} style={{ padding: '10px 16px', background: r.status === 'unfav' ? '#FBF6F0' : undefined }}>
              <div style={{ minWidth: 0 }}>
                <div className="ellipsis" style={{ fontWeight: 600 }}>{name}</div>
                <div className="ellipsis" style={{ fontSize: 11.5, color: P.text4 }}>{nameAlt}</div>
              </div>
              {isAll && <div style={{ color: P.text2, fontSize: 12.5 }}>{t.locs[r.loc as LocId]}</div>}
              <div style={{ textAlign: 'end' }} dir="ltr">{fmt(exp)} {r.unit}</div>
              <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{fmt(phys)} {r.unit}</div>
              <div style={{ textAlign: 'end', fontWeight: 600, color: varColor }} dir="ltr">{sq(r.varQty, r.unit)}</div>
              <div style={{ textAlign: 'end', fontWeight: 700, color: varColor }} dir="ltr">{money(r.impact, { sign: true })}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: vs[0], color: vs[1], whiteSpace: 'nowrap' }}>{pillLabel}</span>
                {rc && !acc && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: P.chip, color: P.text3, whiteSpace: 'nowrap' }}>{t.recountPending}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => { if (!acc) onAccept(r); }} style={{ height: 28, padding: '0 8px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: acc ? P.greenBg : P.white, color: acc ? P.greenFg : P.text2, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: acc ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>{acc ? t.accepted : t.accept}</button>
                <button onClick={() => onRecount(r)} style={{ height: 28, padding: '0 8px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.recount}</button>
              </div>
            </GridRow>
          );
        })}
      </GridTable>
    </>
  );
}
