/** Product tabs → output item ids in the store. */
export const PRODUCT_KEYS = ['taouk', 'patties', 'toum', 'all'] as const;
export type ProductKey = typeof PRODUCT_KEYS[number];
export const PRODUCT_ITEMS: Record<ProductKey, string[] | null> = { taouk: ['PR-002'], patties: ['PR-005'], toum: ['SR-003'], all: null };
export const productKeyFor = (itemId: string): ProductKey => (Object.keys(PRODUCT_ITEMS) as ProductKey[]).find((k) => PRODUCT_ITEMS[k]?.includes(itemId)) ?? 'all';

/** Recipe ids for the "recipe-change suggestion" jump — the Recipes module keys recipes by item id (same ids as PRODUCT_ITEMS). */
export const RECIPE_IDS: Record<ProductKey, string> = { taouk: 'PR-002', patties: 'PR-005', toum: 'SR-003', all: 'PR-002' };

/** 8-week gap trend (weekly avg %) — prototype data for taouk; the other products carry a flat within-tolerance history. */
export const TREND: Record<ProductKey, number[]> = {
  taouk: [3.2, 4.1, 8.4, 9.1, 10.2, 8.8, 9.6, 9.3],
  patties: [2.1, 1.8, 2.5, 2.2, 1.9, 2.6, 2.3, 2.4],
  toum: [3.9, 4.2, 3.8, 4.4, 4.1, 4.0, 4.3, 4.3],
  all: [3.0, 3.6, 6.1, 6.7, 7.2, 6.4, 6.9, 6.8],
};

/** Prototype demo rows — kept for reference; the live table reads store.state.batches (rows the shared seed lacks are merged from ./seed.ts). */
export const DEMO_BATCHES = {
  taouk: [
    { batch: 'PRD-0817-1', date: '17 Aug', std: '14.0 KG', act: '15.5 KG', gapW: 1.5, gapPct: 10.7, cost: 7.20, mar: '+0.6 KG', empEn: 'Rami', empAr: 'رامي' },
    { batch: 'PRD-0815-2', date: '15 Aug', std: '12.0 KG', act: '13.1 KG', gapW: 1.1, gapPct: 9.2, cost: 5.28, mar: '+0.2 KG', empEn: 'Layal', empAr: 'ليال' },
    { batch: 'PRD-0814-1', date: '14 Aug', std: '15.0 KG', act: '16.2 KG', gapW: 1.2, gapPct: 8.0, cost: 5.76, mar: '−0.1 KG', empEn: 'Rami', empAr: 'رامي' },
    { batch: 'PRD-0812-3', date: '12 Aug', std: '14.0 KG', act: '15.2 KG', gapW: 1.2, gapPct: 8.6, cost: 5.76, mar: '+0.4 KG', empEn: 'Hassan', empAr: 'حسان' },
    { batch: 'PRD-0811-1', date: '11 Aug', std: '12.0 KG', act: '12.1 KG', gapW: 0.1, gapPct: 0.8, cost: 0.48, mar: '0', empEn: 'Layal', empAr: 'ليال' },
    { batch: 'PRD-0809-2', date: '09 Aug', std: '16.0 KG', act: '17.5 KG', gapW: 1.5, gapPct: 9.4, cost: 7.20, mar: '+0.3 KG', empEn: 'Hassan', empAr: 'حسان' },
  ],
  patties: [
    { batch: 'PRD-0816-2', date: '16 Aug', std: '12.0 KG', act: '12.3 KG', gapW: 0.3, gapPct: 2.5, cost: 1.77, mar: '—', empEn: 'Layal', empAr: 'ليال' },
    { batch: 'PRD-0813-1', date: '13 Aug', std: '13.5 KG', act: '13.6 KG', gapW: 0.1, gapPct: 0.7, cost: 0.59, mar: '—', empEn: 'Rami', empAr: 'رامي' },
  ],
  toum: [
    { batch: 'PRD-0816-3', date: '16 Aug', std: '2.3 KG', act: '2.4 KG', gapW: 0.1, gapPct: 4.3, cost: 0.26, mar: '—', empEn: 'Hassan', empAr: 'حسان' },
  ],
};
