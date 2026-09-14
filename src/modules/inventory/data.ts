import type { Item, LocId, MovementType, Scope } from '../../store';

/* ───────── movement types (9) ───────── */
export type MvKey = 'rcv' | 'prodIn' | 'prodOut' | 'trfOut' | 'trfIn' | 'waste' | 'sale' | 'adj' | 'count';

export const MV_KEY: Record<MovementType, MvKey> = {
  receiving: 'rcv', production_in: 'prodIn', production_out: 'prodOut', transfer_in: 'trfIn', transfer_out: 'trfOut',
  waste: 'waste', sale: 'sale', adjustment: 'adj', count: 'count',
};

/** Pill colours per movement type — identical to the prototype's TYPE_STYLE. */
export const MV_STYLE: Record<MvKey, { bg: string; fg: string }> = {
  rcv: { bg: '#DCE4EC', fg: '#37536B' }, prodIn: { bg: '#E4E0EE', fg: '#5B5378' }, prodOut: { bg: '#E4E0EE', fg: '#5B5378' },
  trfOut: { bg: '#DCE8E6', fg: '#33625C' }, trfIn: { bg: '#DCE8E6', fg: '#33625C' }, waste: { bg: '#EADFD3', fg: '#7A5A32' },
  sale: { bg: '#E6E2DA', fg: '#6E6A5E' }, adj: { bg: '#E6E2DA', fg: '#6E6A5E' }, count: { bg: '#EDEAE0', fg: '#6E7266' },
};

export const CHIP_KEYS = ['all', 'rcv', 'prod', 'trf', 'waste', 'sale', 'count'] as const;
export type ChipKey = (typeof CHIP_KEYS)[number];

export function chipMatches(chip: ChipKey, k: MvKey): boolean {
  if (chip === 'all') return true;
  if (chip === 'prod') return k === 'prodIn' || k === 'prodOut';
  if (chip === 'trf') return k === 'trfIn' || k === 'trfOut';
  return chip === k;
}

/* ───────── count setup (MGT-INV-03) ───────── */
export type Freq = 'daily' | 'weekly' | 'monthly' | 'adhoc';
export const FREQ_CYCLE: Freq[] = ['daily', 'weekly', 'monthly', 'adhoc'];
/** [bg, fg, border] */
export const FREQ_STYLE: Record<Freq, [string, string, string]> = {
  daily: ['#E0E8DA', '#48603A', '#B9CDB9'], weekly: ['#DCE4EC', '#37536B', '#B7C6D4'], monthly: ['#E6E2DA', '#6E6A5E', '#CFC9B6'], adhoc: ['#EDEAE0', '#9A9C8E', '#D5CFBC'],
};

export interface SetupRow { key: string; itemId?: string; en: string; ar: string; unit: string; mk: Freq | null; rock: Freq | null; kad: Freq | null; crit: boolean }

export const SETUP: SetupRow[] = [
  { key: 'RM-001', itemId: 'RM-001', en: 'Chicken breast', ar: 'صدر دجاج', unit: 'KG', mk: 'daily', rock: 'daily', kad: null, crit: true },
  { key: 'PR-002', itemId: 'PR-002', en: 'Marinated taouk skewer', ar: 'سيخ طاووق متبّل', unit: 'PCS', mk: 'daily', rock: 'daily', kad: null, crit: true },
  { key: 'RM-014', itemId: 'RM-014', en: 'Sunflower oil', ar: 'زيت دوّار الشمس', unit: 'CAN / L', mk: 'daily', rock: 'weekly', kad: 'weekly', crit: true },
  { key: 'RM-022', itemId: 'RM-022', en: 'Akkawi cheese', ar: 'جبنة عكاوي', unit: 'KG', mk: 'daily', rock: 'daily', kad: null, crit: true },
  { key: 'PR-005', itemId: 'PR-005', en: 'Beef patty 150 g', ar: 'قرص لحم ١٥٠ غ', unit: 'PCS', mk: 'daily', rock: 'daily', kad: null, crit: true },
  { key: 'RM-035', itemId: 'RM-035', en: 'Fresh oranges', ar: 'برتقال', unit: 'KG', mk: null, rock: null, kad: 'daily', crit: true },
  { key: 'SR-003', itemId: 'SR-003', en: 'Toum (garlic paste)', ar: 'ثوم مدقوق', unit: 'KG', mk: 'daily', rock: 'daily', kad: null, crit: false },
  { key: 'RM-060', itemId: 'RM-060', en: 'Pita bread', ar: 'خبز عربي', unit: 'PACK', mk: 'weekly', rock: 'weekly', kad: null, crit: false },
  { key: 'RM-041', itemId: 'RM-041', en: 'Sugar', ar: 'سكر', unit: 'BAG', mk: 'monthly', rock: null, kad: 'monthly', crit: false },
  { key: 'PK-201', itemId: 'PK-201', en: 'Sandwich wrap paper', ar: 'ورق تغليف', unit: 'PACK', mk: 'monthly', rock: 'monthly', kad: null, crit: false },
  { key: 'cleaning', en: 'Cleaning supplies', ar: 'مواد تنظيف', unit: 'PCS', mk: 'monthly', rock: 'monthly', kad: 'monthly', crit: false },
];

/* ───────── count review (MGT-INV-05) ───────── */
export type VarStatus = 'fav' | 'within' | 'unfav';

export interface ReviewRow { itemId: string; en: string; ar: string; loc: LocId; unit: string; varQty: number; impact: number; status: VarStatus; source: string }

export const REVIEW: ReviewRow[] = [
  { itemId: 'RM-001', en: 'Chicken breast', ar: 'صدر دجاج', loc: 'mk', unit: 'KG', varQty: -3.3, impact: -15.84, status: 'unfav', source: 'CNT-0812-MK' },
  { itemId: 'PR-002', en: 'Marinated taouk skewer', ar: 'سيخ طاووق متبّل', loc: 'rock', unit: 'PCS', varQty: -6, impact: -6.9, status: 'unfav', source: 'CNT-0812-RK' },
  { itemId: 'RM-014', en: 'Sunflower oil', ar: 'زيت دوّار الشمس', loc: 'mk', unit: 'L', varQty: -2, impact: -6.25, status: 'within', source: 'CNT-0812-MK' },
  { itemId: 'RM-068', en: 'Mango pulp', ar: 'لب مانجو', loc: 'kad', unit: 'KG', varQty: -0.8, impact: -2.24, status: 'within', source: 'CNT-0812-KD' },
  { itemId: 'RM-022', en: 'Akkawi cheese', ar: 'جبنة عكاوي', loc: 'rock', unit: 'KG', varQty: 0.2, impact: 1.44, status: 'fav', source: 'CNT-0812-RK' },
  { itemId: 'RM-035', en: 'Fresh oranges', ar: 'برتقال', loc: 'kad', unit: 'KG', varQty: -1.5, impact: -1.35, status: 'within', source: 'CNT-0812-KD' },
  { itemId: 'RM-060', en: 'Pita bread', ar: 'خبز عربي', loc: 'rock', unit: 'PACK', varQty: 0, impact: 0, status: 'fav', source: 'CNT-0812-RK' },
];

export const reviewKey = (r: ReviewRow) => `${r.itemId}:${r.loc}`;

/**
 * Expected / physical for a review row, derived from live store on-hand so the accept flow, the audit trail
 * and the stock card reconcile: expected = current book on-hand at this location; physical = book + variance
 * (i.e. exactly what on-hand becomes once the count movement of `varQty` is posted on accept).
 */
export function reviewExpPhys(item: Item | undefined, r: ReviewRow): { exp: number; phys: number } {
  const exp = item?.onHand[r.loc] ?? 0;
  return { exp, phys: Math.round((exp + r.varQty) * 1000) / 1000 };
}

/** Count accuracy KPI per scope (prototype constants). */
export const ACCURACY: Record<Scope, string> = { all: '96.8%', mk: '95.9%', rock: '97.2%', kad: '98.1%' };

/** [pillBg, pillFg, rowBg] */
export const VAR_STYLE: Record<VarStatus, [string, string, string]> = {
  fav: ['#E0E8DA', '#48603A', '#EAF0E4'], within: ['#F5E3B3', '#8A6D1F', '#FBF3DF'], unfav: ['#F0CFC9', '#96382E', '#F6E3E0'],
};
