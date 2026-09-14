/**
 * Recipe specs per output item — the prototype's PLANS map keyed by store item id.
 * perUnit = kg NET raw per output unit (the 100 g-NET rule for taouk), secPerKg = secondary (marinade/oil) kg per kg net raw.
 */
export interface ProductSpec {
  prefix: string;            // batch id prefix (SHW-20260812-001)
  perUnit: number;           // kg net raw per output unit
  secPerKg: number;          // secondary kg per kg of net raw
  rawItemId?: string;        // store raw item (production_out)
  secItemId?: string;        // store secondary item (production_out)
  costFallback: number;      // $/kg raw when the store item is missing
  inEn: string; inAr: string; drawEn: string; drawAr: string;
  ruleEn: string; ruleAr: string;
  stepsEn: string[]; stepsAr: string[];
  secIsOilEn?: string; secIsOilAr?: string; // secondary label override (prototype: garlic sauce → oil)
}

export const SPECS: Record<string, ProductSpec> = {
  'PR-002': {
    prefix: 'SHW', perUnit: 0.100, secPerKg: 0.45, rawItemId: 'RM-001', secItemId: 'SR-007', costFallback: 4.80,
    inEn: 'chicken used', inAr: 'الدجاج المستخدم', drawEn: 'chicken drawn', drawAr: 'الدجاج المسحوب',
    ruleEn: '1 skewer = 100 g NET chicken (5 cuts × 20–22 g) — marinade NOT counted', ruleAr: 'السيخ = ١٠٠ غ دجاج صافٍ (٥ قطع × ٢٠–٢٢ غ) — التتبيلة غير محسوبة',
    stepsEn: ['Marination', 'Cutting (20–22 g pieces)', 'Skewer assembly (5 cuts each)'], stepsAr: ['التتبيل', 'التقطيع (قطع ٢٠–٢٢ غ)', 'تركيب الأسياخ (٥ قطع لكل سيخ)'],
  },
  'PR-005': {
    prefix: 'PAT', perUnit: 0.150, secPerKg: 0.036, rawItemId: 'RM-065', costFallback: 5.90,
    inEn: 'ground beef used', inAr: 'اللحم المفروم المستخدم', drawEn: 'beef drawn', drawAr: 'اللحم المسحوب',
    ruleEn: '1 patty = 150 g NET ground beef — spice mix NOT counted', ruleAr: 'القرص = ١٥٠ غ لحم صافٍ — البهارات غير محسوبة',
    stepsEn: ['Spice mix in', 'Portioning (150 g)', 'Press & stack'], stepsAr: ['خلط البهارات', 'التقسيم (١٥٠ غ)', 'الكبس والرص'],
    secIsOilEn: 'spice mix needed', secIsOilAr: 'البهارات المطلوبة',
  },
  'SR-009': {
    prefix: 'GAR', perUnit: 0.155, secPerKg: 2.6, rawItemId: 'RM-066', secItemId: 'RM-014', costFallback: 2.60,
    inEn: 'peeled garlic used', inAr: 'الثوم المقشر المستخدم', drawEn: 'garlic drawn', drawAr: 'الثوم المسحوب',
    ruleEn: '1 kg sauce = 155 g peeled garlic + oil emulsion by recipe', ruleAr: 'كيلو الصوص = ١٥٥ غ ثوم مقشر + مستحلب زيت حسب الوصفة',
    stepsEn: ['Blend garlic + salt', 'Oil emulsion', 'Portion to containers'], stepsAr: ['خفق الثوم والملح', 'استحلاب الزيت', 'التعبئة في العبوات'],
    secIsOilEn: 'oil needed', secIsOilAr: 'الزيت المطلوب',
  },
  'SR-003': {
    prefix: 'TOM', perUnit: 0.32, secPerKg: 2.0, rawItemId: 'RM-066', secItemId: 'RM-014', costFallback: 2.40,
    inEn: 'peeled garlic used', inAr: 'الثوم المقشر المستخدم', drawEn: 'garlic drawn', drawAr: 'الثوم المسحوب',
    ruleEn: '1 kg toum = 320 g peeled garlic + oil emulsion by recipe', ruleAr: 'كيلو الثوم المدقوق = ٣٢٠ غ ثوم مقشر + مستحلب زيت حسب الوصفة',
    stepsEn: ['Blend garlic + salt', 'Oil emulsion', 'Portion to containers'], stepsAr: ['خفق الثوم والملح', 'استحلاب الزيت', 'التعبئة في العبوات'],
    secIsOilEn: 'oil needed', secIsOilAr: 'الزيت المطلوب',
  },
  'MI-108': {
    prefix: 'JUC', perUnit: 0.22, secPerKg: 0.05, rawItemId: 'RM-035', secItemId: 'RM-041', costFallback: 0.90,
    inEn: 'oranges used', inAr: 'البرتقال المستخدم', drawEn: 'oranges drawn', drawAr: 'البرتقال المسحوب',
    ruleEn: '1 cup = 220 g fresh oranges pressed — ice NOT counted', ruleAr: 'الكوب = ٢٢٠ غ برتقال طازج معصور — الثلج غير محسوب',
    stepsEn: ['Wash & halve', 'Press', 'Fill cups'], stepsAr: ['غسل وتقسيم', 'عصر', 'تعبئة الأكواب'],
    secIsOilEn: 'sugar needed', secIsOilAr: 'السكر المطلوب',
  },
};

export const GENERIC_SPEC: ProductSpec = {
  prefix: 'PRD', perUnit: 1, secPerKg: 0, costFallback: 1,
  inEn: 'raw used', inAr: 'الخام المستخدم', drawEn: 'raw drawn', drawAr: 'الخام المسحوب',
  ruleEn: '1 unit = 1 kg raw by recipe', ruleAr: 'الوحدة = ١ كغ خام حسب الوصفة',
  stepsEn: ['Prep', 'Process', 'Portion'], stepsAr: ['تحضير', 'معالجة', 'تقسيم'],
};

export const specFor = (itemId: string): ProductSpec => SPECS[itemId] ?? GENERIC_SPEC;

export const UNIT_AR: Record<string, string> = { PCS: 'قطعة', KG: 'كغ', L: 'ل', PACK: 'عبوة' };
export const unitLabel = (u: string, isAr: boolean) => (isAr ? UNIT_AR[u] ?? u : u);
