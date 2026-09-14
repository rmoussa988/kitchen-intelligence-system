/** Cost engine + pools for the Recipes module (pure functions over the module state and the store). */
import type { StoreApi } from '../../store';
import { ITEMS_POOL, PKG_ITEMS, RECIPES, mappedItem, type LineKind, type PoolItem, type Recipe, type RecipeLine, type RecipeType, type RecipeVersion } from './data';

/** Module-private persisted state (survives navigation). */
export interface RecipesState {
  qtyOverrides: Record<string, number>;
  priceOv: Record<string, string>;
  thOv: Record<string, string>;
  yieldOv: Record<string, { qty: string; unit: string }>;
  xferOv: Record<string, string>;
  extraLines: Record<string, RecipeLine[]>;
  extraPkg: Record<string, RecipeLine[]>;
  extraRecipes: Recipe[];
  extraVersions: Record<string, RecipeVersion[]>;
}
export const RECIPES_SEED: RecipesState = { qtyOverrides: {}, priceOv: {}, thOv: {}, yieldOv: {}, xferOv: {}, extraLines: {}, extraPkg: {}, extraRecipes: [], extraVersions: {} };

export const money2 = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Unit-cost display: 4 dp under 1¢, 3 dp under $1, else 2 dp (prototype rule). */
export const fmtCpu = (cpu: number) => '$' + (cpu < 0.01 ? cpu.toFixed(4) : cpu.toFixed(cpu < 1 ? 3 : 2));
/** Pool option display: 4 dp under 1¢ else 2 dp. */
export const fmtPoolCpu = (cpu: number) => '$' + (cpu < 0.01 ? cpu.toFixed(4) : cpu.toFixed(2));

/** Metric conversions; KG↔L pairs use a density-1 approximation (yogurt/laban, sauces). */
const UNIT_T: Record<string, number> = {
  'G>KG': 0.001, 'KG>G': 1000, 'ML>L': 0.001, 'L>ML': 1000,
  'KG>L': 1, 'L>KG': 1, 'G>L': 0.001, 'ML>KG': 0.001, 'L>G': 1000, 'KG>ML': 1000,
};
export function unitFactor(from: string, to: string): number | undefined {
  if (from === to) return 1;
  return UNIT_T[from + '>' + to];
}

/**
 * Unit cost of a line, per the line's unit:
 * - Sub-recipe / recipe / prepared lines (the mapped id is itself a recipe with a builder) are priced from
 *   that recipe's live built-up cost, so the Add-line pool, the added row, and the recipe's own builder agree.
 * - Ingredient / packaging lines use the mapped store item's moving average (converted to the line unit).
 * - Otherwise the literal cpu.
 */
export function lineCpu(line: RecipeLine, ms: RecipesState, store: StoreApi): number {
  const map = line.itemId ? { id: line.itemId, factor: line.factor } : mappedItem(line.en);
  if (!map) return line.cpu;
  const rec = allRecipes(ms).find((r) => r.id === map.id);
  if (rec) {
    const rc = recipeCost(rec, ms, store);
    const f = line.factor ?? map.factor ?? unitFactor(line.unit, rc.yUnit);
    if (f == null) return line.cpu;
    return rc.total * f;
  }
  const it = store.item(map.id);
  if (!it) return line.cpu;
  const f = line.factor ?? map.factor ?? unitFactor(line.unit, it.base);
  if (f == null) return line.cpu;
  return it.cost * f;
}
export function lineItemId(line: RecipeLine): string | undefined {
  return line.itemId ?? mappedItem(line.en)?.id;
}

export const allRecipes = (ms: RecipesState): Recipe[] => RECIPES.concat(ms.extraRecipes);
export const findRecipe = (ms: RecipesState, id: string | null | undefined): Recipe | undefined => (id ? allRecipes(ms).find((r) => r.id === id) : undefined);
export const foodLines = (r: Recipe, ms: RecipesState): RecipeLine[] => r.food.concat(ms.extraLines[r.id] ?? []);
export const pkgLines = (r: Recipe, ms: RecipesState): RecipeLine[] => r.pkg.concat(ms.extraPkg[r.id] ?? []);
export const qtyKey = (r: Recipe, kind: 'f' | 'p', i: number) => `${r.id}:${kind}:${i}`;
export const lineQty = (r: Recipe, kind: 'f' | 'p', i: number, ln: RecipeLine, ms: RecipesState) => ms.qtyOverrides[qtyKey(r, kind, i)] ?? ln.qty;

export interface CostResult { food: number; pkg: number; total: number; batchFood: number; batchPkg: number; yieldN: number; yUnit: string }

export function yieldUnitOf(r: Recipe): string {
  if (!/\d/.test(r.yield)) return r.type === 'prep' || r.type === 'menu' ? 'PCS' : 'KG';
  return r.yield.replace(/[\d.,\s]+/g, '') || 'PCS';
}

export function recipeCost(r: Recipe, ms: RecipesState, store: StoreApi): CostResult {
  const sum = (arr: RecipeLine[], kind: 'f' | 'p') => arr.reduce((a, ln, i) => a + lineQty(r, kind, i, ln, ms) * lineCpu(ln, ms, store), 0);
  const food = sum(foodLines(r, ms), 'f'), pkg = sum(pkgLines(r, ms), 'p');
  const yo = ms.yieldOv[r.id];
  const yieldN = yo ? (parseFloat(yo.qty) || 1) : (parseFloat(r.yield) || 1);
  const yUnit = yo ? yo.unit : yieldUnitOf(r);
  const div = r.type === 'menu' ? 1 : yieldN;
  return { food: food / div, pkg: pkg / div, total: (food + pkg) / div, batchFood: food, batchPkg: pkg, yieldN, yUnit };
}

/** Effective selling price: the builder's price override if set, else the recipe's posted price (0 = none). */
export const effPrice = (r: Recipe, ms: RecipesState): number =>
  parseFloat(ms.priceOv[r.id] ?? (r.price != null ? String(r.price) : '')) || 0;
/** Effective food-cost threshold: the builder's threshold override if set, else the recipe's threshold (default 30). */
export const effThreshold = (r: Recipe, ms: RecipesState): number =>
  parseFloat(ms.thOv[r.id] ?? '') || (r.threshold ?? 30);

/** Versions newest-first (session-saved versions on top). */
export const versionsOf = (r: Recipe, ms: RecipesState): RecipeVersion[] => (ms.extraVersions[r.id] ?? []).concat(r.versions);

function dedupe(primary: PoolItem[], extra: PoolItem[]): PoolItem[] {
  const seen = new Set(primary.map((p) => p.en.toLowerCase()));
  return primary.concat(extra.filter((p) => !seen.has(p.en.toLowerCase())));
}

const POOL_TYPE: Record<'subr' | 'rcp' | 'prepitem', RecipeType> = { subr: 'sub', rcp: 'recipe', prepitem: 'prep' };

/** Candidate lines per kind: store items (live moving average) + the prototype catalog entries that have no store twin. */
export function kindPool(kind: LineKind, ms: RecipesState, store: StoreApi): PoolItem[] {
  if (kind === 'pkg') {
    const fromStore = store.state.items.filter((i) => i.type === 'pack').map((i) => ({ en: i.en, ar: i.ar, cpu: i.cost, unit: i.base, itemId: i.id }));
    return dedupe(fromStore, PKG_ITEMS.filter((p) => !mappedItem(p.en)).map((p) => ({ ...p, unit: 'PCS' })));
  }
  if (kind === 'subr' || kind === 'rcp' || kind === 'prepitem') {
    const type = POOL_TYPE[kind];
    return allRecipes(ms).filter((r) => r.type === type).map((r) => { const c = recipeCost(r, ms, store); return { en: r.en, ar: r.ar, cpu: c.total, unit: c.yUnit }; });
  }
  const fromStore = store.state.items.filter((i) => i.type === 'raw').map((i) => ({ en: i.en, ar: i.ar, cpu: i.cost, unit: i.base, itemId: i.id }));
  return dedupe(fromStore, ITEMS_POOL.filter((p) => !mappedItem(p.en)));
}

export function matchItem(q: string, kind: LineKind, ms: RecipesState, store: StoreApi): PoolItem | null {
  const s = (q || '').trim().toLowerCase();
  if (s.length < 2) return null;
  return kindPool(kind, ms, store).find((i) => i.en.toLowerCase().includes(s) || i.ar.includes(s)) || null;
}
