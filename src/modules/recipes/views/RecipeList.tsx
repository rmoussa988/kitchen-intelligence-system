import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import { Body, GridRow, GridTable, Input, Page, PageHeader, P } from '../../../ui';
import { TEXT } from '../text';
import { TYPE_STYLE, type Recipe, type RecipeType } from '../data';
import { allRecipes, effPrice as effPriceOf, effThreshold, money2, recipeCost, type RecipesState } from '../logic';

export type RTypeFilter = 'all' | RecipeType;
const COLS = 'minmax(180px,1.8fr) 110px minmax(90px,1fr) 100px 90px 96px 96px 120px';
const CHIP_KEYS: RTypeFilter[] = ['all', 'sub', 'recipe', 'prep', 'menu'];

export function RecipeList({ ms, search, setSearch, typeFilter, setTypeFilter, onOpen, onNew }: {
  ms: RecipesState; search: string; setSearch: (v: string) => void; typeFilter: RTypeFilter; setTypeFilter: (v: RTypeFilter) => void;
  onOpen: (id: string) => void; onNew: () => void;
}) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const nm = (o: Recipe) => (isAr ? o.ar : o.en);
  const nmAlt = (o: Recipe) => (isAr ? o.en : o.ar);

  const ALLR = allRecipes(store, ms);
  const q = search.trim().toLowerCase();
  const filtered = ALLR.filter((r) =>
    (typeFilter === 'all' || r.type === typeFilter) &&
    (!q || r.en.toLowerCase().includes(q) || r.ar.includes(search.trim()) || r.id.toLowerCase().includes(q)),
  );
  const costed = new Map(ALLR.map((r) => [r.id, recipeCost(r, ms, store)]));
  // Effective selling price / threshold include builder overrides, so the KPI, the rows and the save-time
  // alert all agree with the builder's band (a price/threshold edited in the builder is honoured here too).
  const overList = ALLR.filter((r) => {
    const ep = effPriceOf(r, ms);
    return !!ep && (costed.get(r.id)?.food ?? 0) / ep * 100 > effThreshold(r, ms);
  });

  return (
    <Page>
      <PageHeader title={t.recipes} screenId="MGT-RCP-01" />
      <Body>
        <div style={{ display: 'flex', gap: 12, flex: 'none' }}>
          <div style={{ flex: 1, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.totalRecipes}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }} dir="ltr">{ALLR.length}</div>
          </div>
          <div style={{ flex: 1, background: P.redBg, border: `1px solid ${P.redBorder}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.redFg, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.overThreshold}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: P.redFg }} dir="ltr">{overList.length}</div>
              <div style={{ fontSize: 12.5, color: P.redFg }}>{overList.map((x) => nm(x)).join(' · ') || '—'}</div>
            </div>
          </div>
          <div style={{ flex: 1.4, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.biggestMover}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{t.kpiMover}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 'none' }}>
          <Input value={search} onChange={setSearch} placeholder={t.searchPh} />
          {CHIP_KEYS.map((k) => {
            const on = typeFilter === k;
            return (
              <button key={k} onClick={() => setTypeFilter(k)} style={{ height: 34, padding: '0 14px', borderRadius: 999, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                {k === 'all' ? t.all : t.types[k]}
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          <button onClick={onNew} style={{ height: 38, padding: '0 18px', borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.newRecipe}</button>
        </div>

        <GridTable cols={COLS} style={{ flex: 1 }}
          head={[t.recipe, t.type, t.yield, { label: t.currentCost, align: 'end' }, { label: t.price, align: 'end' }, { label: t.foodPct, align: 'end' }, { label: t.pkgPct, align: 'end' }, t.status]}>
          {filtered.map((r) => {
            const c = costed.get(r.id) ?? recipeCost(r, ms, store);
            const ts = TYPE_STYLE[r.type];
            const ep = effPriceOf(r, ms);
            const fcPct = ep ? c.food / ep * 100 : null;
            const over = fcPct !== null && fcPct > effThreshold(r, ms);
            return (
              <GridRow key={r.id} cols={COLS} onClick={() => onOpen(r.id)} style={{ padding: '10px 16px' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontWeight: 600 }}>{nm(r)}</div>
                  <div className="ellipsis" style={{ fontSize: 11.5, color: P.text4 }}>{nmAlt(r)} · <span dir="ltr">{r.id}</span></div>
                </div>
                <div><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: ts.bg, color: ts.fg }}>{t.types[r.type]}</span></div>
                <div style={{ color: P.text2 }} dir="ltr">{r.yield}</div>
                <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{money2(c.total) + (r.type === 'menu' ? '' : ' /u')}</div>
                <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{ep ? money2(ep) : '—'}</div>
                <div style={{ textAlign: 'end', fontWeight: 600, color: over ? P.redFg : P.text }} dir="ltr">{fcPct !== null ? fcPct.toFixed(1) + '%' : '—'}</div>
                <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{ep ? (c.pkg / ep * 100).toFixed(1) + '%' : '—'}</div>
                <div>
                  {fcPct !== null && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: over ? P.redPill : P.greenBg, color: over ? P.redFg : P.greenFg }}>{over ? t.statusOver : t.statusOk}</span>
                  )}
                </div>
              </GridRow>
            );
          })}
        </GridTable>
      </Body>
    </Page>
  );
}
