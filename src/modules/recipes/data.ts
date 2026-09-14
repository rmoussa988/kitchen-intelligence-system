/**
 * Recipe definitions — copied from "KIS Recipes.dc.html" (MI-101, MI-115, MI-108, RC-001, PR-002, PR-005,
 * SR-003, SR-007) plus recipes for the remaining seed recipe-output items (MI-102, MI-103, MI-109, SR-009)
 * so every `isRecipe` item in the store has a builder. Ingredient unit costs are resolved live from
 * `store.state.items` where the line name maps to a seed item (see ITEM_MAP); otherwise the literal `cpu`.
 */

export type RecipeType = 'sub' | 'recipe' | 'prep' | 'menu';
export type SubLine = [string, string, string, string]; // name, qty, unit cost, cost
export interface RecipeLine {
  en: string; ar: string; qty: number; unit: string; unitAr?: string;
  /** Literal unit cost per `unit` (fallback when the line is not mapped to a store item). */
  cpu: number;
  isSub?: boolean; sub?: SubLine[];
  /** Explicit store item mapping (lines added from the pool); by-name mapping is used otherwise. */
  itemId?: string;
  /** Explicit line-unit → base-unit factor override. */
  factor?: number;
}
export type DiffMark = '+' | '~' | '−' | '=';
export type DiffRow = [DiffMark, string, string];
export interface RecipeVersion { v: number; date: string; who: string; reason: string; reasonAr?: string; cost: string; txns: number; diff: DiffRow[]; costChange: string }
export interface Recipe {
  id: string; en: string; ar: string; type: RecipeType; yield: string; price?: number; threshold?: number; prevCost: number;
  food: RecipeLine[]; pkg: RecipeLine[]; versions: RecipeVersion[];
}

export const TYPE_STYLE: Record<RecipeType, { bg: string; fg: string }> = {
  sub: { bg: '#E4E0EE', fg: '#5B5378' }, recipe: { bg: '#DCE6EC', fg: '#37536B' }, prep: { bg: '#E0E8DA', fg: '#48603A' }, menu: { bg: '#EADFD3', fg: '#7A5A32' },
};

export type LineKind = 'ing' | 'subr' | 'rcp' | 'prepitem' | 'pkg';
/** What each recipe type may connect as lines. */
export const LINE_KINDS: Record<RecipeType, LineKind[]> = {
  sub: ['ing', 'pkg'],
  recipe: ['ing', 'subr', 'pkg'],
  prep: ['ing', 'rcp', 'pkg'],
  menu: ['ing', 'rcp', 'prepitem', 'pkg'],
};
export const KIND_LABEL: Record<LineKind, [string, string]> = {
  ing: ['Item (inventory)', 'صنف (مخزون)'], subr: ['Sub-recipe', 'وصفة فرعية'],
  rcp: ['Recipe', 'وصفة'], prepitem: ['Prepared', 'مُحضّر'], pkg: ['Packaging', 'تغليف'],
};

const NADIM = 'Nadim (superuser)';

export const RECIPES: Recipe[] = [
  { id: 'MI-101', en: 'Taouk sandwich', ar: 'ساندويش طاووق', type: 'menu', yield: '1 PCS', price: 6.50, threshold: 28, prevCost: 1.84,
    food: [
      { en: 'Marinated taouk skewer', ar: 'سيخ طاووق متبّل', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 1.15, isSub: true,
        sub: [['Chicken breast · صدر دجاج', '180 G', '$4.80 / KG', '$0.86'], ['Taouk marinade · تتبيلة (SUB)', '80 G', '$2.10 / KG', '$0.17'], ['Skewer stick + labor share', '1 PCS', '—', '$0.12']] },
      { en: 'Pita bread', ar: 'خبز عربي', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.11 },
      { en: 'Toum (garlic paste)', ar: 'ثوم مدقوق', qty: 25, unit: 'G', unitAr: 'غ', cpu: 0.0036, isSub: true,
        sub: [['Garlic · ثوم', '9 G', '$2.60 / KG', '$0.02'], ['Sunflower oil · زيت', '14 ML', '$3.125 / L', '$0.04'], ['Lemon + salt', '2 G', '—', '$0.03']] },
      { en: 'Pickles (mixed)', ar: 'كبيس مشكّل', qty: 35, unit: 'G', unitAr: 'غ', cpu: 0.002 },
      { en: 'Fries 9 mm', ar: 'بطاطا ٩ مم', qty: 150, unit: 'G', unitAr: 'غ', cpu: 0.0016 },
    ],
    pkg: [
      { en: 'Sandwich wrap paper', ar: 'ورق تغليف', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.04 },
      { en: 'Fries cup', ar: 'كوب بطاطا', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.07 },
      { en: 'Carry bag', ar: 'كيس حمل', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.09 },
    ],
    versions: [
      { v: 3, date: '12 Aug 2026', who: NADIM, reason: 'Fries portion 140 g → 150 g', reasonAr: 'حصة البطاطا ١٤٠ غ ← ١٥٠ غ', cost: '$1.86', txns: 41,
        diff: [['~', 'Fries 9 mm', '140 G → 150 G'], ['=', 'Marinated taouk skewer', '1 PCS'], ['=', 'Pita bread', '1 PCS'], ['=', 'Toum', '25 G']], costChange: '$1.84 → $1.86 (+$0.02)' },
      { v: 2, date: '03 May 2026', who: NADIM, reason: 'Added fries cup to packaging', reasonAr: 'إضافة كوب البطاطا إلى التغليف', cost: '$1.84', txns: 1206,
        diff: [['+', 'Fries cup (packaging)', '1 PCS · $0.07'], ['=', 'All food lines', 'unchanged']], costChange: '$1.77 → $1.84 (+$0.07)' },
      { v: 1, date: '12 Jan 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$1.77', txns: 3480,
        diff: [['+', 'Initial recipe', '5 food + 2 packaging lines']], costChange: '— → $1.77' },
    ] },
  { id: 'MI-115', en: 'Halloumi burger', ar: 'برغر حلوم', type: 'menu', yield: '1 PCS', price: 8.00, threshold: 30, prevCost: 2.61,
    food: [
      { en: 'Beef patty 150 g', ar: 'قرص لحم ١٥٠ غ', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.95, isSub: true,
        sub: [['Ground beef · لحم مفروم', '150 G', '$5.90 / KG', '$0.89'], ['Spice mix + labor', '—', '—', '$0.06']] },
      { en: 'Halloumi slice', ar: 'شريحة حلوم', qty: 80, unit: 'G', unitAr: 'غ', cpu: 0.01475 },
      { en: 'Burger bun', ar: 'خبز برغر', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.22 },
      { en: 'Fresh tomatoes', ar: 'بندورة', qty: 40, unit: 'G', unitAr: 'غ', cpu: 0.0011 },
      { en: 'Lettuce', ar: 'خس', qty: 20, unit: 'G', unitAr: 'غ', cpu: 0.0013 },
      { en: 'Garlic sauce', ar: 'صوص الثوم', qty: 30, unit: 'G', unitAr: 'غ', cpu: 0.0034 },
    ],
    pkg: [
      { en: 'Burger box', ar: 'علبة برغر', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.11 },
      { en: 'Carry bag', ar: 'كيس حمل', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.09 },
    ],
    versions: [
      { v: 2, date: '28 Jul 2026', who: NADIM, reason: 'Halloumi price rise — supplier change pending', reasonAr: 'ارتفاع سعر الحلوم — تغيير المورد قيد الدرس', cost: '$2.72', txns: 230,
        diff: [['~', 'Halloumi slice', '$0.98 → $1.18 per slice']], costChange: '$2.61 → $2.72 (+$0.11)' },
      { v: 1, date: '02 Mar 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$2.61', txns: 1914,
        diff: [['+', 'Initial recipe', '6 food + 2 packaging lines']], costChange: '— → $2.61' },
    ] },
  { id: 'MI-108', en: 'Fresh orange juice', ar: 'عصير برتقال طازج', type: 'menu', yield: '1 PCS', price: 4.00, threshold: 20, prevCost: 0.74,
    food: [{ en: 'Fresh oranges', ar: 'برتقال', qty: 650, unit: 'G', unitAr: 'غ', cpu: 0.0009 }],
    pkg: [
      { en: 'Juice cup 12 oz', ar: 'كوب عصير ١٢ أونصة', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.07 },
      { en: 'Lid + straw', ar: 'غطاء وقشة', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.08 },
    ],
    versions: [
      { v: 1, date: '15 Feb 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$0.74', txns: 5120,
        diff: [['+', 'Initial recipe', '1 food + 2 packaging lines']], costChange: '— → $0.74' },
    ] },
  { id: 'RC-001', en: 'Taouk filling', ar: 'حشوة طاووق', type: 'recipe', yield: '10 KG', prevCost: 5.62,
    food: [
      { en: 'Chicken breast', ar: 'صدر دجاج', qty: 9.0, unit: 'KG', unitAr: 'كغ', cpu: 4.80 },
      { en: 'Taouk marinade', ar: 'تتبيلة طاووق', qty: 2.4, unit: 'KG', unitAr: 'كغ', cpu: 2.10 },
      { en: 'Sunflower oil', ar: 'زيت دوار الشمس', qty: 0.4, unit: 'L', unitAr: 'لتر', cpu: 3.125 },
    ],
    pkg: [],
    versions: [
      { v: 1, date: '02 Feb 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$5.65', txns: 640,
        diff: [['+', 'Initial recipe', '3 lines']], costChange: '— → $5.65' },
    ] },
  { id: 'PR-002', en: 'Marinated taouk skewer', ar: 'سيخ طاووق متبّل', type: 'prep', yield: '140 PCS', prevCost: 1.14,
    food: [
      { en: 'Chicken breast', ar: 'صدر دجاج', qty: 27.5, unit: 'KG', unitAr: 'كغ', cpu: 4.80 },
      { en: 'Taouk marinade', ar: 'تتبيلة طاووق', qty: 12.4, unit: 'KG', unitAr: 'كغ', cpu: 2.10, isSub: true,
        sub: [['Yogurt · لبن', '5.6 KG', '$1.40 / KG', '$7.84'], ['Sunflower oil · زيت', '2.2 L', '$3.125 / L', '$6.88'], ['Spices + lemon', '3.4 KG', '—', '$8.80']] },
      { en: 'Skewer sticks', ar: 'أسياخ خشب', qty: 140, unit: 'PCS', unitAr: 'قطعة', cpu: 0.02 },
    ],
    pkg: [],
    versions: [
      { v: 4, date: '12 Aug 2026', who: NADIM, reason: 'Chicken receipt cost moved avg $4.75 → $4.80', reasonAr: 'متوسط كلفة الدجاج ٤٫٧٥ ← ٤٫٨٠', cost: '$1.15', txns: 12,
        diff: [['~', 'Chicken breast', 'unit cost $4.75 → $4.80']], costChange: '$1.14 → $1.15 (+$0.01)' },
      { v: 3, date: '20 Jun 2026', who: NADIM, reason: 'Marinade ratio adjusted', reasonAr: 'تعديل نسبة التتبيلة', cost: '$1.14', txns: 1450,
        diff: [['~', 'Taouk marinade', '11.6 KG → 12.4 KG']], costChange: '$1.12 → $1.14 (+$0.02)' },
    ] },
  { id: 'PR-005', en: 'Beef patty 150 g', ar: 'قرص لحم ١٥٠ غ', type: 'prep', yield: '90 PCS', prevCost: 0.95,
    food: [
      { en: 'Ground beef', ar: 'لحم مفروم', qty: 14.0, unit: 'KG', unitAr: 'كغ', cpu: 5.90 },
      { en: 'Spice mix', ar: 'خلطة بهارات', qty: 0.5, unit: 'KG', unitAr: 'كغ', cpu: 5.80 },
    ],
    pkg: [],
    versions: [
      { v: 1, date: '12 Jan 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$0.95', txns: 2100,
        diff: [['+', 'Initial recipe', '2 food lines']], costChange: '— → $0.95' },
    ] },
  { id: 'SR-003', en: 'Toum (garlic paste)', ar: 'ثوم مدقوق', type: 'sub', yield: '4.2 KG', prevCost: 3.35,
    food: [
      { en: 'Garlic (peeled)', ar: 'ثوم مقشر', qty: 2.3, unit: 'KG', unitAr: 'كغ', cpu: 2.60 },
      { en: 'Sunflower oil', ar: 'زيت دوّار الشمس', qty: 2.4, unit: 'L', unitAr: 'لتر', cpu: 3.125 },
      { en: 'Lemon juice', ar: 'عصير حامض', qty: 0.4, unit: 'L', unitAr: 'لتر', cpu: 1.90 },
      { en: 'Salt', ar: 'ملح', qty: 0.06, unit: 'KG', unitAr: 'كغ', cpu: 0.40 },
    ],
    pkg: [],
    versions: [
      { v: 2, date: '02 Aug 2026', who: NADIM, reason: 'Oil moving avg updated', reasonAr: 'تحديث متوسط كلفة الزيت', cost: '$3.40', txns: 34,
        diff: [['~', 'Sunflower oil', 'unit cost $3.05 → $3.125']], costChange: '$3.35 → $3.40 (+$0.05)' },
    ] },
  { id: 'SR-007', en: 'Taouk marinade', ar: 'تتبيلة طاووق', type: 'sub', yield: '8 KG', prevCost: 2.10,
    food: [
      { en: 'Yogurt', ar: 'لبن', qty: 4.2, unit: 'KG', unitAr: 'كغ', cpu: 1.40 },
      { en: 'Sunflower oil', ar: 'زيت دوّار الشمس', qty: 1.6, unit: 'L', unitAr: 'لتر', cpu: 3.125 },
      { en: 'Spice blend', ar: 'خلطة بهارات', qty: 1.0, unit: 'KG', unitAr: 'كغ', cpu: 4.10 },
      { en: 'Lemon juice', ar: 'عصير حامض', qty: 0.95, unit: 'L', unitAr: 'لتر', cpu: 1.90 },
    ],
    pkg: [],
    versions: [
      { v: 1, date: '12 Jan 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$2.10', txns: 980,
        diff: [['+', 'Initial recipe', '4 food lines']], costChange: '— → $2.10' },
    ] },
  // ── Recipes for the remaining seed recipe-output items (same world: MK / Rock / Kaddoum, Aug 2026) ──
  { id: 'MI-102', en: 'Beef burger', ar: 'برغر لحم', type: 'menu', yield: '1 PCS', price: 7.50, threshold: 30, prevCost: 2.10,
    food: [
      { en: 'Beef patty 150 g', ar: 'قرص لحم ١٥٠ غ', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.95, isSub: true,
        sub: [['Ground beef · لحم مفروم', '150 G', '$5.90 / KG', '$0.89'], ['Spice mix + labor', '—', '—', '$0.06']] },
      { en: 'Burger bun', ar: 'خبز برغر', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.22 },
      { en: 'Cheddar slice', ar: 'شريحة شيدر', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.28 },
      { en: 'Fresh tomatoes', ar: 'بندورة', qty: 40, unit: 'G', unitAr: 'غ', cpu: 0.0011 },
      { en: 'Lettuce', ar: 'خس', qty: 20, unit: 'G', unitAr: 'غ', cpu: 0.0013 },
      { en: 'Pickles (mixed)', ar: 'كبيس مشكّل', qty: 30, unit: 'G', unitAr: 'غ', cpu: 0.002 },
      { en: 'Garlic sauce', ar: 'صوص الثوم', qty: 30, unit: 'G', unitAr: 'غ', cpu: 0.0034 },
      { en: 'Fries 9 mm', ar: 'بطاطا ٩ مم', qty: 150, unit: 'G', unitAr: 'غ', cpu: 0.0016 },
    ],
    pkg: [
      { en: 'Burger box', ar: 'علبة برغر', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.11 },
      { en: 'Carry bag', ar: 'كيس حمل', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.09 },
    ],
    versions: [
      { v: 2, date: '20 Jul 2026', who: NADIM, reason: 'Added cheddar slice', reasonAr: 'إضافة شريحة الشيدر', cost: '$2.12', txns: 610,
        diff: [['+', 'Cheddar slice', '1 PCS · $0.28']], costChange: '$1.84 → $2.12 (+$0.28)' },
      { v: 1, date: '12 Jan 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$1.84', txns: 2880,
        diff: [['+', 'Initial recipe', '7 food + 2 packaging lines']], costChange: '— → $1.84' },
    ] },
  { id: 'MI-103', en: 'Halloumi sandwich', ar: 'ساندويش حلّوم', type: 'menu', yield: '1 PCS', price: 6.00, threshold: 30, prevCost: 1.82,
    food: [
      { en: 'Halloumi slice', ar: 'شريحة حلوم', qty: 100, unit: 'G', unitAr: 'غ', cpu: 0.01467 },
      { en: 'Pita bread', ar: 'خبز عربي', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.11 },
      { en: 'Fresh tomatoes', ar: 'بندورة', qty: 30, unit: 'G', unitAr: 'غ', cpu: 0.0011 },
      { en: 'Pickles (mixed)', ar: 'كبيس مشكّل', qty: 25, unit: 'G', unitAr: 'غ', cpu: 0.002 },
      { en: 'Fries 9 mm', ar: 'بطاطا ٩ مم', qty: 150, unit: 'G', unitAr: 'غ', cpu: 0.0016 },
    ],
    pkg: [
      { en: 'Sandwich wrap paper', ar: 'ورق تغليف', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.04 },
    ],
    versions: [
      { v: 2, date: '28 Jul 2026', who: NADIM, reason: 'Halloumi price rise — supplier change pending', reasonAr: 'ارتفاع سعر الحلوم — تغيير المورد قيد الدرس', cost: '$1.89', txns: 412,
        diff: [['~', 'Halloumi slice', '$1.20 → $1.47 per portion']], costChange: '$1.82 → $1.89 (+$0.07)' },
      { v: 1, date: '02 Mar 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$1.82', txns: 1650,
        diff: [['+', 'Initial recipe', '5 food + 1 packaging line']], costChange: '— → $1.82' },
    ] },
  { id: 'MI-109', en: 'Mango smoothie', ar: 'سموذي مانجو', type: 'menu', yield: '1 PCS', price: 5.00, threshold: 20, prevCost: 1.05,
    food: [
      { en: 'Mango pulp', ar: 'لب مانجو', qty: 200, unit: 'G', unitAr: 'غ', cpu: 0.0028 },
      { en: 'Fresh milk', ar: 'حليب طازج', qty: 200, unit: 'ML', unitAr: 'مل', cpu: 0.00085 },
      { en: 'Laban', ar: 'لبن', qty: 50, unit: 'ML', unitAr: 'مل', cpu: 0.00135 },
      { en: 'Sugar', ar: 'سكر', qty: 20, unit: 'G', unitAr: 'غ', cpu: 0.0007 },
      { en: 'Honey', ar: 'عسل', qty: 10, unit: 'G', unitAr: 'غ', cpu: 0.012 },
    ],
    pkg: [
      { en: 'Juice cup 12 oz', ar: 'كوب عصير ١٢ أونصة', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.07 },
      { en: 'Lid + straw', ar: 'غطاء وقشة', qty: 1, unit: 'PCS', unitAr: 'قطعة', cpu: 0.08 },
    ],
    versions: [
      { v: 1, date: '15 Feb 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$1.05', txns: 2240,
        diff: [['+', 'Initial recipe', '5 food + 2 packaging lines']], costChange: '— → $1.05' },
    ] },
  { id: 'SR-009', en: 'Garlic sauce', ar: 'صوص الثوم', type: 'sub', yield: '15 KG', prevCost: 2.85,
    food: [
      { en: 'Garlic (peeled)', ar: 'ثوم مقشر', qty: 2.5, unit: 'KG', unitAr: 'كغ', cpu: 2.60 },
      { en: 'Sunflower oil', ar: 'زيت دوّار الشمس', qty: 9, unit: 'L', unitAr: 'لتر', cpu: 3.125 },
      { en: 'Laban', ar: 'لبن', qty: 3, unit: 'L', unitAr: 'لتر', cpu: 1.40 },
      { en: 'Lemon juice', ar: 'عصير حامض', qty: 1.2, unit: 'L', unitAr: 'لتر', cpu: 1.90 },
      { en: 'Potato starch', ar: 'نشاء بطاطا', qty: 1, unit: 'KG', unitAr: 'كغ', cpu: 3.20 },
      { en: 'Salt', ar: 'ملح', qty: 0.15, unit: 'KG', unitAr: 'كغ', cpu: 0.40 },
    ],
    pkg: [],
    versions: [
      { v: 2, date: '02 Aug 2026', who: NADIM, reason: 'Oil moving avg updated', reasonAr: 'تحديث متوسط كلفة الزيت', cost: '$2.90', txns: 58,
        diff: [['~', 'Sunflower oil', 'unit cost $3.05 → $3.125']], costChange: '$2.85 → $2.90 (+$0.05)' },
      { v: 1, date: '12 Jan 2026', who: NADIM, reason: 'Initial recipe', reasonAr: 'الوصفة الأولية', cost: '$2.85', txns: 1320,
        diff: [['+', 'Initial recipe', '6 food lines']], costChange: '— → $2.85' },
    ] },
];

/** Id vocabulary shared with the Items module ("Open in Recipe builder"). */
export const RECIPE_IDS = RECIPES.map((r) => r.id);
export function recipeIdForItem(itemId: string): string | undefined {
  return RECIPE_IDS.includes(itemId) ? itemId : undefined;
}

/** Pool entry for the "Add line" form (mirrors the prototype's ITEMS / PKG_ITEMS catalogs). */
export interface PoolItem { en: string; ar: string; cpu: number; unit: string; itemId?: string }

/** Item catalog (mirrors KIS Items & UOM) — unit cost = moving average per base unit. */
export const ITEMS_POOL: PoolItem[] = [
  { en: 'Chicken breast', ar: 'صدر دجاج', cpu: 4.80, unit: 'KG' },
  { en: 'Tahini', ar: 'طحينة', cpu: 0.006, unit: 'G' },
  { en: 'Sunflower oil', ar: 'زيت دوار الشمس', cpu: 3.125, unit: 'L' },
  { en: 'Garlic paste', ar: 'معجون ثوم', cpu: 0.0042, unit: 'G' },
  { en: 'Lemon juice', ar: 'عصير حامض', cpu: 0.0031, unit: 'ML' },
  { en: 'Pita bread', ar: 'خبز عربي', cpu: 0.18, unit: 'PCS' },
  { en: 'Pickles', ar: 'كبيس', cpu: 0.0028, unit: 'G' },
  { en: 'Halloumi', ar: 'حلوم', cpu: 9.40, unit: 'KG' },
  { en: 'Fries (frozen)', ar: 'بطاطا مقلية (مجمدة)', cpu: 1.65, unit: 'KG' },
  { en: 'Wrap box', ar: 'علبة راب', cpu: 0.09, unit: 'PCS' },
];
/** Packaging items (from Items & UOM, type: packaging). */
export const PKG_ITEMS: PoolItem[] = [
  { en: 'Sandwich wrap paper', ar: 'ورق تغليف', cpu: 0.04, unit: 'PCS' },
  { en: 'Wrap box', ar: 'علبة راب', cpu: 0.09, unit: 'PCS' },
  { en: 'Burger box', ar: 'علبة برغر', cpu: 0.11, unit: 'PCS' },
  { en: 'Juice cup 12 oz + lid', ar: 'كوب عصير ١٢ أونصة مع غطاء', cpu: 0.15, unit: 'PCS' },
  { en: 'Container 750 ml', ar: 'علبة ٧٥٠ مل', cpu: 0.16, unit: 'PCS' },
  { en: 'Carry bag', ar: 'كيس حمل', cpu: 0.09, unit: 'PCS' },
];

/**
 * By-name mapping of ingredient lines to seed item ids. `factor` = line unit → base unit multiplier
 * when it is not a plain metric conversion (e.g. 1 pita PCS = 0.1 PACK).
 */
export const ITEM_MAP: Record<string, { id: string; factor?: number }> = {
  'chicken breast': { id: 'RM-001' },
  'taouk marinade': { id: 'SR-007' },
  'marinated taouk skewer': { id: 'PR-002' },
  'toum (garlic paste)': { id: 'SR-003' },
  'toum': { id: 'SR-003' },
  'garlic sauce': { id: 'SR-009' },
  'pita bread': { id: 'RM-060', factor: 0.1 },
  'pickles (mixed)': { id: 'RM-050' },
  'pickles': { id: 'RM-050' },
  'fries 9 mm': { id: 'RM-061' },
  'fries (frozen)': { id: 'RM-061' },
  'sandwich wrap paper': { id: 'PK-201' },
  'juice cup 12 oz': { id: 'PK-205' },
  'carry bag': { id: 'PK-210' },
  'paper bag': { id: 'PK-210' },
  'fresh oranges': { id: 'RM-035' },
  'akkawi cheese': { id: 'RM-022' },
  'beef patty 150 g': { id: 'PR-005' },
  'ground beef': { id: 'RM-065' },
  'beef mince': { id: 'RM-065' },
  'sugar': { id: 'RM-041' },
  'lemon juice': { id: 'RM-067' },
  'garlic (peeled)': { id: 'RM-066' },
  'fresh milk': { id: 'RM-069' },
  'milk': { id: 'RM-069' },
  'mango pulp': { id: 'RM-068' },
  'sunflower oil': { id: 'RM-014' },
  'fresh tomatoes': { id: 'RM-062' },
  'lettuce': { id: 'RM-063' },
  'laban': { id: 'RM-064' },
  'yogurt': { id: 'RM-064' },
};
export function mappedItem(name: string): { id: string; factor?: number } | undefined {
  return ITEM_MAP[name.trim().toLowerCase()];
}
