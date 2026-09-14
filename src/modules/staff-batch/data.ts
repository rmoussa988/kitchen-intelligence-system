/** Classic batch flow — recipe book (prototype TASKS + SAVED), with store item ids attached where the seed has the item. */
export interface Ingredient { en: string; ar: string; qty: number; unit: string; type: 'inventory' | 'sub' | 'recipe'; cost: number; itemId?: string }
export interface Recipe { en: string; ar: string; plan: number; unit: string; unitAr: string; prefix: string; stdYield: number; itemId?: string; recipe: Ingredient[] }

/** Today's plan (in the prototype); plan quantities are overridden by the store's published plan lines when present. */
export const TASKS: Recipe[] = [
  { en: 'Marinated taouk skewer', ar: 'سيخ طاووق متبّل', plan: 150, unit: 'PCS', unitAr: 'قطعة', prefix: 'SHW', stdYield: 81, itemId: 'PR-002',
    recipe: [
      { en: 'Trimmed chicken breast', ar: 'صدر دجاج مشذّب', qty: 40, unit: 'KG', type: 'inventory', cost: 5.60, itemId: 'RM-001' },
      { en: 'Taouk marinade', ar: 'تتبيلة طاووق', qty: 2, unit: 'KG', type: 'sub', cost: 3.00, itemId: 'SR-007' },
      { en: 'Wooden skewers', ar: 'أسياخ خشبية', qty: 150, unit: 'PCS', type: 'inventory', cost: 0.02, itemId: 'PK-215' },
    ] },
  { en: 'Toum (garlic paste)', ar: 'ثوم مدقوق', plan: 4, unit: 'KG', unitAr: 'كغ', prefix: 'TOM', stdYield: 96, itemId: 'SR-003',
    recipe: [
      { en: 'Garlic, peeled', ar: 'ثوم مقشّر', qty: 4.2, unit: 'KG', type: 'inventory', cost: 2.20, itemId: 'RM-066' },
      { en: 'Lemon juice', ar: 'عصير ليمون', qty: 0.6, unit: 'L', type: 'inventory', cost: 1.50, itemId: 'RM-067' },
      { en: 'Sunflower oil', ar: 'زيت دوّار الشمس', qty: 1.2, unit: 'L', type: 'inventory', cost: 3.10, itemId: 'RM-014' },
      { en: 'Salt', ar: 'ملح', qty: 0.1, unit: 'KG', type: 'inventory', cost: 0.50, itemId: 'RM-071' },
    ] },
  { en: 'Beef patty 150 g', ar: 'قرص لحم ١٥٠ غ', plan: 90, unit: 'PCS', unitAr: 'قطعة', prefix: 'PTY', stdYield: 95, itemId: 'PR-005',
    recipe: [
      { en: 'Beef mince (80/20)', ar: 'لحم بقر مفروم', qty: 13.5, unit: 'KG', type: 'inventory', cost: 5.90, itemId: 'RM-065' },
      { en: 'Seasoning mix', ar: 'خلطة بهارات', qty: 0.5, unit: 'KG', type: 'sub', cost: 4.00, itemId: 'SR-011' },
      { en: 'Breadcrumbs', ar: 'بقسماط', qty: 0.5, unit: 'KG', type: 'inventory', cost: 1.20, itemId: 'RM-072' },
    ] },
];

/** Full library of saved recipes (everything else in the recipe book) — reachable through the ad-hoc sheet. */
export const SAVED: Recipe[] = [
  { en: 'Hummus', ar: 'حمّص', plan: 6, unit: 'KG', unitAr: 'كغ', prefix: 'HMS', stdYield: 97, itemId: 'HMS',
    recipe: [
      { en: 'Cooked chickpeas', ar: 'حمّص مسلوق', qty: 3.2, unit: 'KG', type: 'inventory', cost: 1.80 },
      { en: 'Tahini', ar: 'طحينة', qty: 1.4, unit: 'KG', type: 'inventory', cost: 4.20 },
      { en: 'Lemon juice', ar: 'عصير ليمون', qty: 0.5, unit: 'L', type: 'inventory', cost: 1.50, itemId: 'RM-067' },
      { en: 'Salt', ar: 'ملح', qty: 0.05, unit: 'KG', type: 'inventory', cost: 0.50, itemId: 'RM-071' },
    ] },
  { en: 'Tabbouleh mix', ar: 'خلطة تبولة', plan: 5, unit: 'KG', unitAr: 'كغ', prefix: 'TAB', stdYield: 92, itemId: 'TAB',
    recipe: [
      { en: 'Parsley, chopped', ar: 'بقدونس مفروم', qty: 3.0, unit: 'KG', type: 'inventory', cost: 2.60 },
      { en: 'Bulgur, fine', ar: 'برغل ناعم', qty: 0.6, unit: 'KG', type: 'inventory', cost: 1.10 },
      { en: 'Tomato, diced', ar: 'بندورة مقطّعة', qty: 1.4, unit: 'KG', type: 'inventory', cost: 1.90, itemId: 'RM-062' },
      { en: 'Lemon–oil dressing', ar: 'صلصة ليمون وزيت', qty: 0.4, unit: 'L', type: 'sub', cost: 3.40 },
    ] },
  { en: 'Shawarma marinade', ar: 'تتبيلة شاورما', plan: 3, unit: 'KG', unitAr: 'كغ', prefix: 'SMR', stdYield: 98, itemId: 'SMR',
    recipe: [
      { en: 'Spice blend', ar: 'خلطة بهارات', qty: 0.8, unit: 'KG', type: 'sub', cost: 5.20 },
      { en: 'Yogurt', ar: 'لبن', qty: 1.2, unit: 'L', type: 'inventory', cost: 1.30, itemId: 'RM-064' },
      { en: 'Vinegar', ar: 'خلّ', qty: 0.4, unit: 'L', type: 'inventory', cost: 0.90 },
      { en: 'Sunflower oil', ar: 'زيت دوّار الشمس', qty: 0.6, unit: 'L', type: 'inventory', cost: 3.10, itemId: 'RM-014' },
    ] },
  { en: 'Falafel mix', ar: 'خلطة فلافل', plan: 8, unit: 'KG', unitAr: 'كغ', prefix: 'FLF', stdYield: 94, itemId: 'FLF',
    recipe: [
      { en: 'Soaked chickpeas', ar: 'حمّص منقوع', qty: 5.5, unit: 'KG', type: 'inventory', cost: 1.60 },
      { en: 'Onion & garlic', ar: 'بصل وثوم', qty: 1.0, unit: 'KG', type: 'inventory', cost: 1.40 },
      { en: 'Falafel spice', ar: 'بهار فلافل', qty: 0.4, unit: 'KG', type: 'sub', cost: 4.80 },
      { en: 'Fresh herbs', ar: 'أعشاب طازجة', qty: 1.1, unit: 'KG', type: 'inventory', cost: 2.90 },
    ] },
];

export const RECIPES: Recipe[] = [...TASKS, ...SAVED];
export const recipeByKey = (key: string | null | undefined) => (key ? RECIPES.find((r) => r.prefix === key) : undefined);

/** Ingredient type tag colours (prototype typeStyle). */
export const TYPE_STYLE: Record<Ingredient['type'], { bg: string; fg: string }> = {
  inventory: { bg: '#223142', fg: '#8FB0C9' },
  sub: { bg: '#22352A', fg: '#7FC79A' },
  recipe: { bg: '#3A3320', fg: '#E0C989' },
};

export const KB_ROWS = {
  en: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']],
  ar: [['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح'], ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك'], ['ظ', 'ط', 'ذ', 'ء', 'ؤ', 'ر', 'ى', 'ة', 'و', 'ز', 'د']],
};

export const fmtN = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US');
export const moneyN = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
