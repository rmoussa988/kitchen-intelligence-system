/**
 * Recipes — port of "KIS Recipes.dc.html".
 * MGT-RCP-01 list with cost-% health · MGT-RCP-02 builder (expandable sub-recipe layers, packaging split,
 * live recompute) · MGT-RCP-03 append-only version history with diffs and a mandatory reason.
 * Ingredient unit costs come from store.state.items (moving average) where a line maps to a seed item.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import { Btn, Page, ScreenId, Tabs, useToast, P, shortDate } from '../../ui';
import { useModuleNav } from '../../shell/DesktopShell';
import { TEXT } from './text';
import { KIND_LABEL, LINE_KINDS, TYPE_STYLE, type DiffRow, type LineKind, type Recipe, type RecipeLine, type RecipeType, type RecipeVersion } from './data';
import { RECIPES_SEED, effPrice as effPriceOf, effThreshold, findRecipe, fmtCpu, fmtPoolCpu, kindPool, lineCpu, matchItem, money2, recipeCost, versionsOf, type RecipesState } from './logic';
import { RecipeList, type RTypeFilter } from './views/RecipeList';
import { RecipeBuilder, EXPANDED_INIT, HELP_INIT, type HelpState, type QtyEditReq } from './views/RecipeBuilder';
import { RecipeVersions } from './views/RecipeVersions';
import { AmberNote, Dialog, DialogBtns, FormInput } from './views/Dialog';

type Tab = 'builder' | 'versions';

export default function RecipesModule() {
  const { lang, isAr, backGlyph, chevron } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [sp, setSp] = useSearchParams();
  const [ms, setMs] = useModuleState<RecipesState>('recipes', RECIPES_SEED);

  const spRecipe = sp.get('recipe') ?? sp.get('id');
  const [view, setView] = useState<'list' | 'detail'>(() => (spRecipe && findRecipe(store, ms, spRecipe) ? 'detail' : 'list'));
  const [recipeId, setRecipeId] = useState<string | null>(() => (spRecipe && findRecipe(store, ms, spRecipe) ? spRecipe : null));
  const [tab, setTab] = useState<Tab>('builder');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RTypeFilter>('all');
  const [diffV, setDiffV] = useState<number | null>(null);
  // builder line-expansion + help-box toggles — kept here (not in RecipeBuilder) so they survive the
  // builder↔versions conditional render and recipe changes, matching the prototype's top-level state
  const [expanded, setExpanded] = useState<Record<string, boolean>>(EXPANDED_INIT);
  const [help, setHelp] = useState<HelpState>(HELP_INIT);
  // qty modal
  const [qtyEdit, setQtyEdit] = useState<QtyEditReq | null>(null);
  const [qtyVal, setQtyVal] = useState('');
  // save-version modal
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveReason, setSaveReason] = useState('');
  // quick creation forms
  const [form, setForm] = useState<'recipe' | 'line' | null>(null);
  const [f1, setF1] = useState(''); const [f2, setF2] = useState(''); const [f3, setF3] = useState('');
  const [formType, setFormType] = useState<RecipeType>('menu');
  const [lineKind, setLineKind] = useState<LineKind>('ing');

  // deep link (?recipe=MI-101 / ?id=)
  useEffect(() => {
    if (spRecipe && findRecipe(store, ms, spRecipe)) { setRecipeId(spRecipe); setView('detail'); setTab('builder'); setDiffV(null); }
    // arriving from Production gap review with a recipe-change suggestion (MGT-PRD-06 → B3)
    if (sp.get('suggest')) {
      const note = sp.get('note');
      toast((isAr ? 'اقتراح تغيير الوصفة من مراجعة فجوات الإنتاج' : 'Recipe-change suggestion from production gap review') + (note ? ` — ${note}` : ''), { ms: 4000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spRecipe]);

  // r is undefined on a fresh/empty database — guard everything below and render the (empty) list.
  const r: Recipe | undefined = findRecipe(store, ms, recipeId);
  const nm = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const versions = r ? versionsOf(r, ms) : [];
  const c = r ? recipeCost(r, ms, store) : null;
  const dts = TYPE_STYLE[r?.type ?? 'menu'];
  const screenId = tab === 'versions' ? 'MGT-RCP-03' : 'MGT-RCP-02';

  const openRecipe = (id: string) => { setRecipeId(id); setView('detail'); setTab('builder'); setDiffV(null); };
  const backToList = () => { setView('list'); if (spRecipe) setSp({}, { replace: true }); };

  // ── qty edit ──
  const qtySave = () => {
    const v = parseFloat(qtyVal);
    if (qtyEdit && !isNaN(v) && v >= 0) { const k = qtyEdit.key; setMs((d) => { d.qtyOverrides[k] = v; }); }
    setQtyEdit(null);
  };

  // ── save new version (append-only, mandatory reason) ──
  const demoDate = () => { const d = new Date(store.now()); return `${shortDate(d)} ${d.getFullYear()}`; };
  const saveGo = () => {
    if (!r || !c) return;
    if (!saveReason.trim()) return;
    const diff: DiffRow[] = [];
    const extras = ms.extraLines[r.id] ?? [], extrasP = ms.extraPkg[r.id] ?? [];
    r.food.concat(extras).forEach((ln, i) => {
      const ov = ms.qtyOverrides[`${r.id}:f:${i}`];
      if (ov != null && ov !== ln.qty) diff.push(['~', nm(ln), `${ln.qty} → ${ov} ${ln.unit || ''}`]);
    });
    r.pkg.concat(extrasP).forEach((ln, i) => {
      const ov = ms.qtyOverrides[`${r.id}:p:${i}`];
      if (ov != null && ov !== ln.qty) diff.push(['~', nm(ln), `${ln.qty} → ${ov} ${ln.unit || ''}`]);
    });
    extras.forEach((ln) => diff.push(['+', nm(ln), `${ln.qty} ${ln.unit} @ ${fmtPoolCpu(lineCpu(ln, ms, store))}/${ln.unit}`]));
    extrasP.forEach((ln) => diff.push(['+', nm(ln) + t.pkgSuffix, `${ln.qty} ${ln.unit} @ $${lineCpu(ln, ms, store).toFixed(2)}`]));
    const pOv = ms.priceOv[r.id];
    if (pOv != null && parseFloat(pOv) !== r.price) diff.push(['~', t.dSellingPrice, `${money2(r.price || 0)} → ${money2(parseFloat(pOv) || 0)}`]);
    const tOv = ms.thOv[r.id];
    if (tOv != null && parseFloat(tOv) !== r.threshold) diff.push(['~', t.dThreshold, `${r.threshold ?? 30}% → ${tOv}%`]);
    const yOv = ms.yieldOv[r.id];
    if (yOv) diff.push(['~', t.dBatchYield, `${r.yield} → ${yOv.qty} ${yOv.unit}`]);
    const xOv = ms.xferOv[r.id];
    if (xOv && parseFloat(xOv) > 0) diff.push(['~', t.dXfer, `${t.atCost} → $${parseFloat(xOv).toFixed(2)}`]);
    if (!diff.length) diff.push(['~', t.noStructural, `${money2(r.prevCost)} → ${money2(c.total)}`]);
    const newV: RecipeVersion = { v: versions[0].v + 1, date: demoDate(), who: t.you, reason: saveReason, reasonAr: saveReason, cost: money2(c.total), txns: 0, diff, costChange: `${money2(r.prevCost)} → ${money2(c.total)}` };
    const rid = r.id;
    // Commit the builder's edits (qty overrides, added lines, price/threshold/yield) ONTO the recipe
    // row so the recipes table is the source of truth, then push the new version — then clear the
    // transient module_state overlays for this recipe.
    const committedFood = r.food.concat(extras).map((ln, i) => ({ ...ln, qty: ms.qtyOverrides[`${rid}:f:${i}`] ?? ln.qty }));
    const committedPkg = r.pkg.concat(extrasP).map((ln, i) => ({ ...ln, qty: ms.qtyOverrides[`${rid}:p:${i}`] ?? ln.qty }));
    const committedPrice = pOv != null ? (parseFloat(pOv) || undefined) : r.price;
    const committedTh = tOv != null ? (parseFloat(tOv) || undefined) : r.threshold;
    const committedYield = yOv ? `${yOv.qty} ${yOv.unit}` : r.yield;
    store.update((d) => {
      const rec = d.recipes.find((x) => x.id === rid);
      if (rec) {
        rec.food = committedFood; rec.pkg = committedPkg;
        rec.price = committedPrice; rec.threshold = committedTh; rec.yield = committedYield;
        rec.prevCost = c.total;
        rec.versions = [newV, ...rec.versions];
      }
    });
    setMs((d) => {
      for (const k of Object.keys(d.qtyOverrides)) if (k.startsWith(rid + ':')) delete d.qtyOverrides[k];
      delete d.extraLines[rid]; delete d.extraPkg[rid];
      delete d.priceOv[rid]; delete d.thOv[rid]; delete d.yieldOv[rid]; delete d.xferOv[rid];
      delete d.extraVersions[rid];
    });
    store.logAudit({ action: 'Recipe version saved', entity: `${r.id} ${r.en} · v${newV.v}`, oldValue: money2(r.prevCost), newValue: `${money2(c.total)} · ${saveReason.trim()}`, moduleId: 'recipes' });
    const eff = effPriceOf(r, ms);
    const th = effThreshold(r, ms);
    // recipe output that is a seed item → its moving-average cost follows the built-up cost, and a
    // selling price edited in the builder follows through to the store item (Items & UOM) — the same
    // effective values the list, KPI and alert now read, so no view contradicts the band.
    const outItem = store.item(r.id);
    if (outItem) {
      store.setItemCost(r.id, Math.round(c.total * 1000) / 1000);
      if (r.type === 'menu' && eff && eff !== outItem.price) store.update((d) => { const it = d.items.find((x) => x.id === r.id); if (it) it.price = eff; });
    }
    // threshold breach → alert (once per recipe)
    if (r.type === 'menu' && eff && c.food / eff * 100 > th) {
      const pct = (c.food / eff * 100).toFixed(1);
      const en = `${r.en} food cost ${pct}% > ${th}% threshold`;
      if (!store.state.alerts.some((a) => !a.dismissed && a.type === 'recipe_cost' && a.en.startsWith(r.en))) {
        store.addAlert({ severity: 'amber', type: 'recipe_cost', en, ar: `كلفة ${r.ar} ${pct}٪ > حد ${th}٪`, moduleId: 'recipes' });
      }
    }
    setSaveOpen(false); setTab('versions'); setDiffV(0);
    toast(outItem ? t.toastSaved : `${t.saveVersion} ✓ v${newV.v}`);
  };

  // ── quick creation forms ──
  const openNewRecipe = () => { setForm('recipe'); setF1(''); setF2(''); setF3(''); setFormType('menu'); };
  const openAddLine = () => { setForm('line'); setF1(''); setF2(''); setF3(''); setLineKind('ing'); };
  const kinds = LINE_KINDS[r?.type ?? 'menu'] || ['ing'];
  const kind: LineKind = kinds.includes(lineKind) ? lineKind : kinds[0];
  const pool = form === 'line' ? kindPool(kind, ms, store) : [];
  const matched = form === 'line' ? matchItem(f1, kind, ms, store) : null;
  const idle = f1.trim().length < 2;
  const formGoOk = (() => {
    if (!f1.trim()) return false;
    if (form === 'recipe') return true;
    return !!f2.trim() && !isNaN(parseFloat(f2)) && !!matched;
  })();
  const formGo = () => {
    if (!f1.trim()) return;
    if (form === 'line' && !f2.trim()) return;
    if (form === 'recipe') {
      const isMenu = formType === 'menu';
      const price = parseFloat(f3);
      const id = 'NEW-' + String(store.state.recipes.filter((x) => x.id.startsWith('NEW-')).length + 1).padStart(2, '0');
      const nr: Recipe = {
        id, en: f1.trim(), ar: f1.trim(), type: formType,
        yield: isMenu ? '1 PCS' : t.yieldTbd,
        price: isMenu && !isNaN(price) && price > 0 ? price : undefined, threshold: 30, prevCost: 0,
        food: [], pkg: [],
        versions: [{ v: 1, date: demoDate(), who: t.you, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$0.00', txns: 0, diff: [['+', 'Initial recipe', '0 lines']], costChange: '— → $0.00' }],
      };
      store.update((d) => { d.recipes.push(nr); });
      store.logAudit({ action: 'Recipe created', entity: `${id} ${nr.en} · v1`, newValue: t.types[formType], moduleId: 'recipes' });
      setForm(null);
      setRecipeId(id); setView('detail'); setTab('builder'); setDiffV(null);
      toast(t.toastRecipe);
    } else {
      const qv = parseFloat(f2);
      const it = matched;
      if (isNaN(qv) || qv <= 0 || !it || !r) return;
      const ln: RecipeLine = { en: it.en, ar: it.ar, qty: qv, unit: it.unit || 'PCS', unitAr: it.unit || 'قطعة', cpu: it.cpu, itemId: it.itemId };
      const rid = r.id;
      if (kind === 'pkg') {
        setMs((d) => { (d.extraPkg[rid] ??= []).push(ln); });
        setForm(null); toast(t.toastPkg);
      } else {
        setMs((d) => { (d.extraLines[rid] ??= []).push(ln); });
        setForm(null); toast(t.toastLine);
      }
    }
  };

  // mapping box (line form)
  const mapLabel = matched
    ? (kind === 'ing' ? t.mapItem : kind === 'pkg' ? t.mapPkg : KIND_LABEL[kind][isAr ? 1 : 0] + t.mapLive)
    : t.mapping;
  const mapName = matched ? nm(matched) : idle ? t.mapIdle : t.mapNone;
  const mapCost = matched ? `${fmtCpu(matched.cpu)} / ${matched.unit}` : '—';
  const mapBg = matched ? '#EDF2E8' : idle ? P.white : P.amberBg;
  const mapBorder = matched ? '#B9CBA8' : idle ? P.borderInput : P.amberBorder;
  const mapLabelFg = matched ? P.greenStrong : idle ? '#8A8D7C' : P.amberFg;
  const mapMiss = !matched && !idle;
  const mapMissNote = kind === 'pkg' ? t.missPkg : kind === 'ing' ? t.missIng : `${t.missRecipeA}${isAr ? KIND_LABEL[kind][1] : KIND_LABEL[kind][0].toLowerCase()}${t.missRecipeB}`;
  const mapMissIsItems = kind === 'ing' || kind === 'pkg';

  return (
    <>
      {view === 'list' || !r ? (
        <RecipeList ms={ms} search={search} setSearch={setSearch} typeFilter={typeFilter} setTypeFilter={setTypeFilter} onOpen={openRecipe} onNew={openNewRecipe} />
      ) : (
        <Page>
          <div style={{ flex: 'none', padding: '14px 22px 0', background: P.surface, borderBottom: `1px solid ${P.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Btn size="sm" onClick={backToList}>{backGlyph} {t.recipes}</Btn>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{nm(r)}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: dts.bg, color: dts.fg }}>{t.types[r.type]}</span>
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: P.chip, color: P.text3 }} dir="ltr">v{versions[0].v}</span>
                  <ScreenId id={screenId} />
                </div>
                <div style={{ fontSize: 13, color: P.text3, marginTop: 2 }}>{isAr ? r.en : r.ar} · {t.yield}: <span dir="ltr">{r.yield}</span></div>
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => { setSaveOpen(true); setSaveReason(''); }} style={{ height: 38, padding: '0 18px', borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.saveVersion}</button>
            </div>
            <Tabs style={{ marginTop: 12 }} active={tab} onChange={(v) => setTab(v as Tab)} tabs={[{ value: 'builder', label: t.builder }, { value: 'versions', label: t.versions }]} />
          </div>
          <div key={tab + r.id} className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 22px' }}>
            {tab === 'builder'
              ? <RecipeBuilder r={r} ms={ms} setMs={(fn) => setMs(fn)} onEditQty={(q) => { setQtyEdit(q); setQtyVal(String(q.qty)); }} onAddLine={openAddLine} expanded={expanded} setExpanded={setExpanded} help={help} setHelp={setHelp} />
              : <RecipeVersions versions={versions} diffV={diffV} setDiffV={setDiffV} />}
          </div>
        </Page>
      )}

      {form && (
        <Dialog onClose={() => setForm(null)}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{form === 'recipe' ? t.formNewRecipe : t.formAddLine + (r ? nm(r) : '')}</div>
          <div style={{ fontSize: 13, color: P.text3, marginTop: 4, lineHeight: 1.5 }}>{form === 'recipe' ? t.formSubRecipe : t.formSubLine}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
            {form === 'line' && kinds.length > 1 && (
              <div style={{ display: 'flex', border: `1px solid ${P.borderInput}`, borderRadius: 9, overflow: 'hidden', background: P.white, alignSelf: 'flex-start' }}>
                {kinds.map((k) => {
                  const on = kind === k;
                  return <button key={k} onClick={() => { setLineKind(k); setF1(''); }} style={{ height: 32, padding: '0 14px', border: 'none', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: on ? P.ink : P.white, color: on ? P.onInk : P.text3 }}>{KIND_LABEL[k][isAr ? 1 : 0]}</button>;
                })}
              </div>
            )}
            {form === 'line' && (
              <select value={matched ? matched.en : ''} onChange={(e) => setF1(e.target.value)} style={{ height: 44, padding: '0 12px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontFamily: 'inherit', color: P.text, cursor: 'pointer', outline: 'none' }}>
                <option value="">{t.pickFromList}</option>
                {pool.map((p) => <option key={p.en} value={p.en}>{`${nm(p)} — ${fmtPoolCpu(p.cpu)} / ${p.unit}`}</option>)}
              </select>
            )}
            <FormInput autoFocus value={f1} onChange={setF1} placeholder={form === 'recipe' ? t.fp1Recipe : t.fp1Line} />
            {form === 'line' && <FormInput value={f2} onChange={setF2} placeholder={t.fp2} ltr onEnter={formGo} />}
            {form === 'recipe' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {t.typeChips.map((tc) => {
                    const on = formType === tc.k;
                    return (
                      <button key={tc.k} onClick={() => setFormType(tc.k)} style={{ flex: 1, height: 52, borderRadius: 10, border: `1.5px solid ${on ? P.greenStrong : P.borderInput}`, background: on ? '#EDF2E8' : P.white, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', padding: '0 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: on ? P.ink : P.text2 }}>{tc.label}</div>
                        <div style={{ fontSize: 11, color: P.text4, marginTop: 1 }}>{tc.sub}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11.5, color: '#8A8D7C', lineHeight: 1.5, padding: '0 3px' }}>{t.typeHint[formType]}</div>
                {formType === 'menu' && <FormInput value={f3} onChange={setF3} placeholder={t.fp3} ltr onEnter={formGo} />}
              </>
            )}
            {form === 'line' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: `1px solid ${mapBorder}`, background: mapBg }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: mapLabelFg }}>{mapLabel}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: P.text }}>{mapName}</div>
                  </div>
                  <div style={{ textAlign: 'end' }} dir="ltr"><span style={{ fontSize: 14, fontWeight: 700, color: matched ? P.greenStrong : P.text4 }}>{mapCost}</span></div>
                </div>
                {mapMiss && (
                  <div style={{ fontSize: 12, color: P.amberFg }}>{mapMissNote} {mapMissIsItems && <a href="#" onClick={(e) => { e.preventDefault(); go('items'); }} style={{ fontWeight: 700, color: P.blueFg }}>{t.itemsCta} {chevron}</a>}</div>
                )}
              </>
            )}
          </div>
          <AmberNote style={{ marginTop: 14 }}>{form === 'recipe' ? t.formWarnRecipe : t.formWarnLine}</AmberNote>
          <DialogBtns cancel={t.cancel} onCancel={() => setForm(null)} cta={form === 'recipe' ? t.ctaRecipe : t.ctaLine} onGo={formGo} goBg={formGoOk ? P.ink : P.text4} />
        </Dialog>
      )}

      {qtyEdit && (
        <Dialog width={420} onClose={() => setQtyEdit(null)}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{qtyEdit.name}</div>
          <div style={{ fontSize: 13, color: P.text3, marginTop: 4 }}>{t.editQtyIn} <span dir="ltr">{qtyEdit.unit}</span></div>
          <input value={qtyVal} autoFocus onChange={(e) => setQtyVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') qtySave(); }} dir="ltr"
            style={{ width: '100%', marginTop: 16, height: 48, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 19, fontWeight: 700, fontFamily: 'inherit', textAlign: 'center', color: P.text, outline: 'none' }} />
          <DialogBtns cancel={t.cancel} onCancel={() => setQtyEdit(null)} cta={t.apply} onGo={qtySave} />
        </Dialog>
      )}

      {saveOpen && (
        <Dialog width={480} onClose={() => setSaveOpen(false)}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{t.saveVersion}</div>
          <div style={{ fontSize: 13, color: P.text3, marginTop: 4 }}>{t.reasonRequired}</div>
          <input value={saveReason} autoFocus onChange={(e) => setSaveReason(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveGo(); }} placeholder={t.reasonPh}
            style={{ width: '100%', marginTop: 16, height: 46, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontFamily: 'inherit', color: P.text, outline: 'none' }} />
          <AmberNote style={{ marginTop: 14, padding: '12px 14px' }}>{t.versionWarning}</AmberNote>
          <DialogBtns cancel={t.cancel} onCancel={() => setSaveOpen(false)} cta={t.saveAsNew} onGo={saveGo} goBg={saveReason.trim() ? P.ink : P.text4} />
        </Dialog>
      )}
    </>
  );
}
