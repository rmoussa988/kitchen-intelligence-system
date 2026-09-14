import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import { P } from '../../../ui';
import { TEXT } from '../text';
import type { Recipe, RecipeLine } from '../data';
import { effPrice as effPriceOf, effThreshold, fmtCpu, foodLines, lineCpu, lineQty, money2, pkgLines, qtyKey, recipeCost, type RecipesState } from '../logic';

const LINE_COLS = 'minmax(148px,1.7fr) 82px minmax(82px,.9fr) 76px 6px';
const Y_UNITS = ['KG', 'G', 'L', 'ML', 'PCS'];
const DARK_INPUT = { borderRadius: 8, border: `1px solid ${P.inkBorder}`, background: '#1F281F', fontFamily: 'inherit', color: P.page, outline: 'none' } as const;

export interface QtyEditReq { key: string; name: string; unit: string; qty: number }
export type HelpKey = 'fc' | 'pkg' | 'fp' | 'fpp';
export type HelpState = Record<HelpKey, boolean>;
/** Initial state for the builder's per-line expansion and help-box toggles (lifted to the parent so they survive tab/recipe changes). */
export const EXPANDED_INIT: Record<string, boolean> = {};
export const HELP_INIT: HelpState = { fc: false, pkg: false, fp: false, fpp: false };

/** MGT-RCP-02 — builder: food lines (expandable sub-recipe layers), packaging split, live built-up cost panel. */
export function RecipeBuilder({ r, ms, setMs, onEditQty, onAddLine, expanded, setExpanded, help, setHelp }: {
  r: Recipe; ms: RecipesState; setMs: (recipe: (d: RecipesState) => void) => void; onEditQty: (q: QtyEditReq) => void; onAddLine: () => void;
  expanded: Record<string, boolean>; setExpanded: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void;
  help: HelpState; setHelp: (fn: (p: HelpState) => HelpState) => void;
}) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toggleHelp = (k: HelpKey) => setHelp((p) => ({ ...p, [k]: !p[k] }));

  const nm = (o: RecipeLine) => (isAr ? o.ar : o.en);
  const nmAlt = (o: RecipeLine) => (isAr ? o.en : o.ar);
  const un = (o: RecipeLine) => (isAr ? (o.unitAr || o.unit) : o.unit);

  const c = recipeCost(r, ms, store);
  const isMenu = r.type === 'menu';
  const effPrice = effPriceOf(r, ms);
  const effTh = effThreshold(r, ms);
  const fcPct = isMenu && effPrice ? c.food / effPrice * 100 : 0;
  const pkgPct = isMenu && effPrice ? c.pkg / effPrice * 100 : 0;
  const over = isMenu && !!effPrice && fcPct > effTh;
  const delta = c.total - r.prevCost;
  const priceOk = isMenu && !!effPrice;
  const fp = effPrice - c.food;
  const hasPkg = pkgLines(r, ms).length > 0;
  const pCost = money2(c.total) + (isMenu ? '' : ' / ' + c.yUnit);

  // transfer pricing (non-menu)
  const xRaw = ms.xferOv[r.id] ?? '';
  const xp = parseFloat(xRaw);
  const xHas = !isNaN(xp) && xp > 0;
  const xProfit = xHas ? (xp - c.total) / xp * 100 : null;
  const xProfitColor = xProfit === null ? P.inkMuted : xProfit >= 0 ? '#A9D3B5' : '#E5A9A0';

  const HelpBtn = ({ k }: { k: 'fc' | 'pkg' | 'fp' | 'fpp' }) => (
    <button onClick={() => toggleHelp(k)} title={t.howCalc} style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #4A5A4A', background: help[k] ? P.page : 'transparent', color: help[k] ? P.ink : P.inkMuted, fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', lineHeight: 1, padding: 0 }}>?</button>
  );
  const HelpBox = ({ formula, math, body }: { formula: string; math: string; body?: string }) => (
    <div style={{ marginTop: 10, padding: '11px 13px', borderRadius: 10, background: '#1F281F', border: `1px solid ${P.inkBorder}`, fontSize: 12, color: P.inkText, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 700, color: P.page }}>{formula}</div>
      <div style={{ marginTop: 4 }} dir="ltr">{math}</div>
      {body && <div style={{ marginTop: 6 }}>{body}</div>}
    </div>
  );
  const sign = (n: number) => (n >= 0 ? '+' : '−');

  const renderLine = (ln: RecipeLine, i: number, kind: 'f' | 'p') => {
    const key = qtyKey(r, kind, i);
    const qty = lineQty(r, kind, i, ln, ms);
    const cpu = lineCpu(ln, ms, store);
    const isSub = !!ln.isSub;
    const open = !!expanded[key];
    return (
      <div key={key}>
        <div style={{ display: 'grid', gridTemplateColumns: LINE_COLS, gap: 10, padding: '10px 14px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {isSub && (
              <button onClick={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>{open ? '−' : '＋'}</button>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="ellipsis" style={{ fontWeight: 600 }}>{nm(ln)} {isSub && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: P.purpleBg, color: P.purpleFg }}>{t.subBadge}</span>}</div>
              <div className="ellipsis" style={{ fontSize: 11, color: P.text4 }}>{nmAlt(ln)}</div>
            </div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <button onClick={() => onEditQty({ key, name: nm(ln), unit: un(ln), qty })} dir="ltr" style={{ height: 30, padding: '0 10px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{qty} {un(ln)}</button>
          </div>
          <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{fmtCpu(cpu)} / {ln.unit}</div>
          <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{money2(qty * cpu)}</div>
          <div />
        </div>
        {isSub && open && (
          <div style={{ background: '#F3F1E8', borderBottom: `1px solid ${P.borderRow}` }}>
            {(ln.sub ?? []).map((sl, j) => (
              <div key={j} style={{ display: 'grid', gridTemplateColumns: LINE_COLS, gap: 10, padding: '7px 14px', paddingInlineStart: 46, fontSize: 12, color: P.text2, alignItems: 'center' }}>
                <div className="ellipsis">{sl[0]}</div>
                <div style={{ textAlign: 'end' }} dir="ltr">{sl[1]}</div>
                <div style={{ textAlign: 'end' }} dir="ltr">{sl[2]}</div>
                <div style={{ textAlign: 'end' }} dir="ltr">{sl[3]}</div>
                <div />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: 1.5, minWidth: 470, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, marginBottom: 8 }}>{t.foodLines}</div>
          <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: LINE_COLS, gap: 10, padding: '9px 14px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
              <div>{t.ingredient}</div><div style={{ textAlign: 'end' }}>{t.qty}</div><div style={{ textAlign: 'end' }}>{t.unitCost}</div><div style={{ textAlign: 'end' }}>{t.lineCost}</div><div />
            </div>
            {foodLines(r, ms).map((ln, i) => renderLine(ln, i, 'f'))}
            {foodLines(r, ms).length === 0 && <div style={{ padding: 24, textAlign: 'center', color: P.text4, fontSize: 13 }}>—</div>}
          </div>
        </div>
        {hasPkg && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, marginBottom: 8 }}>{t.pkgLines}</div>
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
              {pkgLines(r, ms).map((ln, i) => renderLine(ln, i, 'p'))}
            </div>
          </div>
        )}
        <button onClick={onAddLine} style={{ alignSelf: 'flex-start', height: 34, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.addLine}</button>
      </div>

      <div style={{ flex: 1, minWidth: 300, position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: P.ink, color: P.page, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.builtUpCost}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700 }} dir="ltr">{pCost}</div>
            <div style={{ fontSize: 13, color: Math.abs(delta) < 0.005 ? P.inkMuted : delta > 0 ? '#E5A9A0' : '#A9D3B5' }} dir="ltr">{sign(delta)}${Math.abs(delta).toFixed(2)}</div>
          </div>
          <div style={{ fontSize: 12, color: P.inkMuted, marginTop: 2 }}>{t.prevCost}: <span dir="ltr">{money2(r.prevCost)}</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, borderBottom: `1px solid ${P.inkBorder}`, paddingBottom: 8 }}>
              <span style={{ color: P.inkText }}>{t.foodCost}</span><span style={{ fontWeight: 700 }} dir="ltr">{money2(c.food)}</span>
            </div>
            {hasPkg && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, borderBottom: `1px solid ${P.inkBorder}`, paddingBottom: 8 }}>
                <span style={{ color: P.inkText }}>{t.pkgCost}</span><span style={{ fontWeight: 700 }} dir="ltr">{money2(c.pkg)}</span>
              </div>
            )}
            {isMenu && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, borderBottom: `1px solid ${P.inkBorder}`, paddingBottom: 8, gap: 10 }}>
                  <span style={{ color: P.inkText }}>{t.sellingPrice}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ color: P.inkMuted, fontWeight: 700 }}>$</span>
                    <input value={ms.priceOv[r.id] ?? (r.price != null ? String(r.price) : '')} onChange={(e) => { const v = e.target.value; setMs((d) => { d.priceOv[r.id] = v; }); }} placeholder="0.00" dir="ltr"
                      style={{ ...DARK_INPUT, width: 76, height: 32, padding: '0 8px', fontSize: 14, fontWeight: 700, textAlign: 'end' }} />
                  </div>
                </div>
                {!effPrice && <div style={{ fontSize: 11.5, color: '#E5C98F', lineHeight: 1.4 }}>{t.priceMissing}</div>}
              </>
            )}
          </div>

          {!isMenu && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: P.ink2 }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.batchYield}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <input value={ms.yieldOv[r.id] ? ms.yieldOv[r.id].qty : String(c.yieldN)} dir="ltr"
                  onChange={(e) => { const v = e.target.value; const unit = c.yUnit; setMs((d) => { d.yieldOv[r.id] = { qty: v, unit: (d.yieldOv[r.id] ?? { unit }).unit }; }); }}
                  style={{ ...DARK_INPUT, width: 80, height: 36, padding: '0 10px', fontSize: 15, fontWeight: 700, textAlign: 'center' }} />
                <select value={c.yUnit} dir="ltr" onChange={(e) => { const v = e.target.value; const qty = String(c.yieldN); setMs((d) => { d.yieldOv[r.id] = { qty: (d.yieldOv[r.id] ?? { qty }).qty, unit: v }; }); }}
                  style={{ ...DARK_INPUT, height: 36, padding: '0 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {(Y_UNITS.includes(c.yUnit) ? Y_UNITS : [c.yUnit, ...Y_UNITS]).map((yu) => <option key={yu} value={yu}>{yu}</option>)}
                </select>
                <div style={{ flex: 1, textAlign: 'end' }}>
                  <div style={{ fontSize: 11, color: P.inkMuted }}>{t.batchCost} <span dir="ltr">{money2(c.batchFood + c.batchPkg)}</span></div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#A9D3B5', marginTop: 1 }} dir="ltr">{money2(c.total)} / {c.yUnit}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: P.inkMuted, marginTop: 8, lineHeight: 1.5 }}>{t.batchYieldNote}</div>
            </div>
          )}

          {!isMenu && (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: P.ink2 }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.xferTitle}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <span style={{ color: P.inkMuted, fontWeight: 700 }}>$</span>
                <input value={xRaw} onChange={(e) => { const v = e.target.value; setMs((d) => { d.xferOv[r.id] = v; }); }} placeholder={c.total.toFixed(2)} dir="ltr"
                  style={{ ...DARK_INPUT, width: 88, height: 36, padding: '0 10px', fontSize: 15, fontWeight: 700, textAlign: 'end' }} />
                <span style={{ fontSize: 12, color: P.inkMuted }} dir="ltr">/ {c.yUnit}</span>
                <div style={{ flex: 1, textAlign: 'end' }}>
                  <div style={{ fontSize: 11, color: P.inkMuted }}>{t.xferProfit}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: xProfitColor, marginTop: 1 }} dir="ltr">{xProfit === null ? '—' : sign(xProfit) + Math.abs(xProfit).toFixed(1) + '%'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: '#1F281F' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px', color: P.inkMuted }}>{t.xferCostPct}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1, color: !xHas ? P.inkMuted : c.total / xp * 100 > 100 ? '#E5A9A0' : P.page }} dir="ltr">{xHas ? (c.total / xp * 100).toFixed(1) + '%' : '—'}</div>
                </div>
                <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: '#1F281F' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px', color: P.inkMuted }}>{t.xferProfitVal}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1, color: xProfitColor }} dir="ltr">{xHas ? sign(xp - c.total) + '$' + Math.abs(xp - c.total).toFixed(2) + ' / ' + c.yUnit : '—'}</div>
                </div>
                <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: '#1F281F' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px', color: P.inkMuted }}>{t.xferProfitPct}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1, color: xProfitColor }} dir="ltr">{xProfit === null ? '—' : sign(xProfit) + Math.abs(xProfit).toFixed(1) + '%'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 10, borderTop: `1px solid ${P.inkBorder}`, paddingTop: 8 }}>
                <span style={{ color: P.inkText }}>{t.xferRecvCost}</span><span style={{ fontWeight: 700 }} dir="ltr">{xHas ? money2(xp) : money2(c.total)} / {c.yUnit}</span>
              </div>
              <div style={{ fontSize: 11, color: P.inkMuted, marginTop: 8, lineHeight: 1.5 }}>{xHas ? t.xNoteHas : t.xNoteEmpty}</div>
            </div>
          )}

          {isMenu && (
            <>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: P.ink2, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.foodPct}</div>
                    <HelpBtn k="fc" />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: over ? '#E5A9A0' : P.page }} dir="ltr">{fcPct.toFixed(1)}%</div>
                  <div style={{ fontSize: 11, color: P.inkMuted, marginTop: 2 }}>{t.threshold}: <span dir="ltr">{effTh}%</span></div>
                </div>
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: P.ink2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.pkgPct}</div>
                    <HelpBtn k="pkg" />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }} dir="ltr">{pkgPct.toFixed(1)}%</div>
                </div>
              </div>
              {help.pkg && <HelpBox formula={t.pkgHelpFormula} math={priceOk ? `$${c.pkg.toFixed(2)} ÷ $${effPrice.toFixed(2)} × 100 = ${(c.pkg / effPrice * 100).toFixed(1)}%` : '—'} />}
              {help.fc && <HelpBox formula={t.fcHelpFormula} math={priceOk ? `$${c.food.toFixed(2)} ÷ $${effPrice.toFixed(2)} × 100 = ${(c.food / effPrice * 100).toFixed(1)}%` : '—'} body={t.fcHelpBody} />}
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: P.ink2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.foodProfitVal}</div>
                    <HelpBtn k="fp" />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: !priceOk ? P.inkMuted : fp >= 0 ? '#A9D3B5' : '#E5A9A0' }} dir="ltr">{priceOk ? sign(fp) + '$' + Math.abs(fp).toFixed(2) : '—'}</div>
                </div>
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: P.ink2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.foodProfitPct}</div>
                    <HelpBtn k="fpp" />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: !priceOk ? P.inkMuted : fp >= 0 ? '#A9D3B5' : '#E5A9A0' }} dir="ltr">{priceOk ? sign(fp) + Math.abs(fp / effPrice * 100).toFixed(1) + '%' : '—'}</div>
                </div>
              </div>
              {help.fp && <HelpBox formula={t.fpHelpFormula} math={priceOk ? `$${effPrice.toFixed(2)} − $${c.food.toFixed(2)} = ${sign(fp)}$${Math.abs(fp).toFixed(2)}` : '—'} />}
              {help.fpp && <HelpBox formula={t.fppHelpFormula} math={priceOk ? `${sign(fp)}$${Math.abs(fp).toFixed(2)} ÷ $${effPrice.toFixed(2)} × 100 = ${sign(fp)}${Math.abs(fp / effPrice * 100).toFixed(1)}%` : '—'} />}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: over ? '#4A2A26' : P.ink2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: over ? '#D96C5F' : '#7FA98A', flex: 'none' }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: over ? '#E5A9A0' : '#B9CDB9', flex: 1 }}>{over ? t.overBand : t.withinTolerance}</span>
                <span style={{ fontSize: 11, color: P.inkMuted }}>{t.threshold}</span>
                <input value={ms.thOv[r.id] ?? String(r.threshold ?? 30)} onChange={(e) => { const v = e.target.value; setMs((d) => { d.thOv[r.id] = v; }); }} dir="ltr"
                  style={{ ...DARK_INPUT, width: 52, height: 30, padding: '0 6px', borderRadius: 7, fontSize: 13, fontWeight: 700, textAlign: 'center' }} />
                <span style={{ fontSize: 12, color: P.inkMuted }}>%</span>
              </div>
            </>
          )}
        </div>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text3 }}>{t.costNote}</div>
          <div style={{ fontSize: 12.5, color: P.text2, lineHeight: 1.6, marginTop: 6 }}>{t.costNoteBody}</div>
        </div>
      </div>
    </div>
  );
}
