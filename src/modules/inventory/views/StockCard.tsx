import { useMemo, type CSSProperties } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { Item, LocId, Movement } from '../../../store';
import { P, TYPE_STYLE, fmt, money, shortDate, timeHM, DEMO_TODAY } from '../../../ui';
import type { InvText } from '../text';
import { MV_KEY, MV_STYLE, VAR_STYLE } from '../data';
import { calcCard } from '../calc';

const HEAD: CSSProperties = { padding: '12px 18px', borderBottom: `1px solid ${P.border}`, background: P.thead, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 };
const BTN: CSSProperties = { height: 40, padding: '0 18px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' };

export function StockCardView({ item, loc, t, onAdjust, onStartCount, onExport }: {
  item: Item; loc: LocId; t: InvText; onAdjust: () => void; onStartCount: () => void; onExport: () => void;
}) {
  const { isAr, fwdGlyph } = useLang();
  const store = useStore();
  const { movements, transfers, settings } = store.state;
  const c = useMemo(() => calcCard(item, loc, movements, settings.varianceTolerancePct, DEMO_TODAY), [item, loc, movements, settings.varianceTolerancePct]);

  const ts = TYPE_STYLE[item.type];
  const typeLabel = item.type === 'raw' ? t.rawMaterial : item.type === 'sub' ? t.subRecipe : item.type === 'prep' ? t.prepared : item.type === 'menu' ? t.menuItem : t.packaging;
  const base = item.base;
  const onHandAlt = item.purchFactor && item.purch !== base && item.purch !== '—' ? `= ${fmt(c.onHand / item.purchFactor, 1)} ${item.purch}` : '';
  const avg = '$' + item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' / ' + base;
  const minMax = item.min != null || item.max != null ? `${item.min ?? '—'} / ${item.max ?? '—'} ${base}` : '—';
  const vs = VAR_STYLE[c.status];
  const varLabel = c.status === 'fav' ? t.favorable : c.status === 'within' ? t.withinTol : t.unfavorable;

  // sparkline (viewBox 300×80, same math as the prototype)
  const mn = Math.min(...c.spark, item.min ?? Infinity);
  const mx = Math.max(...c.spark, item.min ?? -Infinity);
  const span = mx - mn || 1;
  const pts = c.spark.map((v, i) => ((i / (c.spark.length - 1)) * 300).toFixed(1) + ',' + (74 - ((v - mn) / span) * 68).toFixed(1)).join(' ');
  const minY = item.min != null ? (74 - ((item.min - mn) / span) * 68).toFixed(1) : null;

  const qtyText = (v: number, signed: boolean) => (v === 0 ? '0' : signed ? `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))} ${base}` : `${fmt(v)} ${base}`);

  const moveLabel = (m: Movement) => {
    const k = MV_KEY[m.type];
    let s: string = t.types[k];
    if (m.type === 'receiving' && m.enteredUnit && m.enteredUnit !== base) s += ` ${fmt(m.enteredQty ?? 0)} ${m.enteredUnit}`;
    if (m.type === 'transfer_out' || m.type === 'transfer_in') {
      const tr = transfers.find((x) => x.id === m.source);
      if (tr) s += ` ${fwdGlyph} ${t.locs[m.type === 'transfer_out' ? tr.to : tr.from]}`;
    }
    if (m.type === 'count' && m.beyondTolerance) s += ` — ${t.beyondTol}`;
    return s;
  };
  const moveColor = (m: Movement) => (m.type === 'count' && m.beyondTolerance ? P.redFg : MV_STYLE[MV_KEY[m.type]].fg);
  const moveQty = (m: Movement) => (m.type === 'count' ? `${m.qty > 0 ? '+' : m.qty < 0 ? '−' : ''}${fmt(Math.abs(m.qty))} ${base}` : `${m.qty > 0 ? '+' : '−'}${fmt(m.enteredQty ?? Math.abs(m.qty))} ${m.enteredUnit ?? base}`);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: 1.4, minWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 21, fontWeight: 700 }}>{isAr ? item.ar : item.en}</div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: ts.bg, color: ts.fg }}>{typeLabel}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 11px', borderRadius: 999, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8FA88F' }} />{t.locs[loc]}</span>
                {c.low && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: P.amberPill, color: P.amberFg }}>{t.belowMin}</span>}
              </div>
              <div style={{ fontSize: 13, color: P.text3, marginTop: 3 }}>{isAr ? item.en : item.ar} · <span dir="ltr">{item.id}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 22 }}>
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.onHandNow}</div>
                <div style={{ fontSize: 28, fontWeight: 700 }} dir="ltr">{fmt(c.onHand)} {base}</div>
                <div style={{ fontSize: 11.5, color: P.text4, minHeight: 15 }} dir="ltr">{onHandAlt}</div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.avgCost}</div>
                <div style={{ fontSize: 28, fontWeight: 700 }} dir="ltr">{avg}</div>
                <div style={{ fontSize: 11.5, color: P.text4 }} dir="ltr">{t.minMax}: {minMax}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={HEAD}>{t.stockStatement} · {t.thisWeek}</div>
          <StmtLine op="" label={t.stmt.opening} qty={qtyText(c.opening, false)} base="" weight={500} />
          {c.rows.map((r, i) => (
            <StmtLine key={r.key + i} op={r.op} label={t.stmt[r.key]} qty={qtyText(r.value, r.signed)} base={r.detail ?? (r.refs.length ? r.refs.join(' · ') : '—')} weight={500} />
          ))}
          <StmtLine op="=" label={t.stmt.expected} qty={qtyText(c.expected, false)} base="" weight={700} bg={P.hover} />
          <StmtLine op="" label={t.stmt.physical} qty={qtyText(c.physical, false)} base={c.countRefs.length ? c.countRefs.join(' · ') : '—'} weight={700} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: vs[2] }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{t.variance}</span>
            <span style={{ fontSize: 15, fontWeight: 700 }} dir="ltr">{qtyText(c.countAdj, true)}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }} dir="ltr">{money(c.countValue, { sign: true })}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: vs[0], color: vs[1] }}>{varLabel}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onAdjust} style={BTN}>{t.adjustStock}</button>
          <button onClick={onStartCount} style={BTN}>{t.startCount}</button>
          <button onClick={onExport} style={{ ...BTN, color: P.text2, fontWeight: 400 }}>{t.export}</button>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '14px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.onHandTrend}</div>
          <svg viewBox="0 0 300 80" style={{ width: '100%', height: 80, marginTop: 10 }} preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke={P.text2} strokeWidth={2} />
            {minY != null && <line x1={0} y1={minY} x2={300} y2={minY} stroke={P.amberDot} strokeWidth={1} strokeDasharray="4 4" />}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: P.text4, marginTop: 4 }}><span>{t.daysAgo}</span><span style={{ color: P.amberFg }}>{t.minLine}</span><span>{t.today}</span></div>
        </div>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={HEAD}>{t.recentMoves}</div>
          {c.moves.slice(0, 5).map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: `1px solid ${P.borderRow}`, fontSize: 12.5 }}>
              <span style={{ color: P.text3, width: 76, flex: 'none' }} dir="ltr">{shortDate(m.ts, isAr)} {timeHM(m.ts)}</span>
              <span style={{ flex: 1 }}>{moveLabel(m)}</span>
              <span style={{ fontWeight: 600, color: moveColor(m) }} dir="ltr">{moveQty(m)}</span>
            </div>
          ))}
          {c.moves.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: P.text4, fontSize: 13 }}>{t.emptyLedger}</div>}
        </div>
      </div>
    </div>
  );
}

function StmtLine({ op, label, qty, base, weight, bg }: { op: string; label: string; qty: string; base: string; weight: number; bg?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px', borderBottom: `1px solid ${P.borderRow}`, background: bg ?? 'transparent' }}>
      <span style={{ width: 22, textAlign: 'center', fontWeight: 700, color: P.text4, fontSize: 14 }}>{op}</span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: weight }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600 }} dir="ltr">{qty}</span>
      <span className="ellipsis" style={{ width: 90, textAlign: 'end', fontSize: 12, color: P.text3 }} dir="ltr">{base}</span>
    </div>
  );
}
