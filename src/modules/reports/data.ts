/** Demo data + pure helpers for Alerts & Reports — ported from the prototype script. Today = 12 Aug 2026 (the shared demo day). */
import type { LocId } from '../../store';

export type Unit = '$' | '$2' | 'n' | '%';
export type Group = 'daily' | 'weekly' | 'monthly';

export const MONTHS: [string, string][] = [['Jan', 'ك٢'], ['Feb', 'شباط'], ['Mar', 'آذار'], ['Apr', 'نيسان'], ['May', 'أيار'], ['Jun', 'حزيران'], ['Jul', 'تموز'], ['Aug', 'آب']];
/** Demo "today" is 12 Aug 2026 — August is month-to-date up to day 12. */
export const TODAY_D = 12;
export const MAXD = [31, 28, 31, 30, 31, 30, 31, TODAY_D];
export const DOFF = [0, 31, 59, 90, 120, 151, 181, 212];
/** Seasonality vs Aug. */
export const MFACT = [0.78, 0.74, 0.83, 0.88, 0.95, 1.06, 1.12, 1.0];

export function weekRanges(m: number): { from: number; to: number; label: string }[] {
  const mn = MONTHS[m][0], end = MAXD[m];
  return [0, 1, 2, 3].map((i) => {
    const from = i * 7 + 1, to = i === 3 ? end : Math.min(from + 6, end);
    return { from, to, label: from + '–' + to + ' ' + mn };
  }).filter((w) => w.from <= end);
}

/** Scales every $ amount (and bare 2–4 digit counts) inside a display string by `f`. */
export function scaleVal(v: string, f: number): string {
  return v.replace(/([+−-]?)\$([\d,]+(?:\.\d+)?)/g, (_m, sign: string, num: string) => {
    const n = parseFloat(num.replace(/,/g, '')) * f;
    const out = n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(2);
    return sign + '$' + out;
  }).replace(/^(\d{2,4})$/, (mm) => String(Math.round(parseInt(mm) * f)));
}

export type Chip = [string, string, string, string]; // en, ar, value, colour
export type GRow = [string, string, string, string, string, string, string]; // en, ar, mk, rock, kad, total, colour
export interface RepDef { chips: Chip[]; rows: GRow[] }
export interface GroupDef extends RepDef { period: string; foot: [string, string] }

export const GEN: Record<Group, GroupDef> = {
  daily: {
    period: '12 Aug 2026',
    chips: [['Net sales', 'صافي المبيعات', '$2,418', '#1F241F'], ['COGS consumed', 'كلفة الاستهلاك', '$688', '#1F241F'], ['Net variance', 'صافي الفرق', '−$31.55', '#96382E']],
    rows: [
      ['Net sales', 'صافي المبيعات', '—', '$1,392', '$1,026', '$2,418', '#1F241F'],
      ['Orders', 'الطلبات', '—', '164', '121', '285', '#1F241F'],
      ['Consumption (theoretical)', 'الاستهلاك النظري', '$212', '$281', '$195', '$688', '#1F241F'],
      ['Waste recorded', 'الهدر المسجل', '$9.40', '$4.15', '$12.80', '$26.35', '#8A6D1F'],
      ['Transfers out (at cost)', 'تحويلات صادرة (بالكلفة)', '$486', '—', '—', '$486', '#1F241F'],
      ['Count variance', 'فرق الجرد', '−$5.94', '−$22.02', '−$3.59', '−$31.55', '#96382E'],
    ],
    foot: ['Assembled from the perpetual ledger: sales deduct via recipes at order fire; transfers move at cost (Rule 12); variance = counted − expected. Figures render per-location or combined by the scope selector.',
      'مُجمَّع من السجل المستمر: المبيعات تخصم عبر الوصفات لحظة إرسال الطلب؛ التحويلات بالكلفة (القاعدة ١٢)؛ الفرق = المعدود − المتوقع. الأرقام حسب محدد النطاق.'],
  },
  weekly: {
    period: '6–12 Aug 2026',
    chips: [['Waste %', 'نسبة الهدر', '2.6%', '#8A6D1F'], ['Avg yield', 'متوسط الإنتاجية', '96.8%', '#48603A'], ['Net variance', 'صافي الفرق', '−$118', '#96382E']],
    rows: [
      ['Waste % of consumption', 'الهدر ٪ من الاستهلاك', '1.9%', '1.4%', '4.1%', '2.6%', '#8A6D1F'],
      ['Yield vs standard', 'الإنتاجية مقابل المعيار', '96.8%', '—', '—', '96.8%', '#48603A'],
      ['Production batches', 'دفعات الإنتاج', '38', '—', '—', '38', '#1F241F'],
      ['Count variance (week)', 'فرق الجرد (الأسبوع)', '−$74', '−$29', '−$15', '−$118', '#96382E'],
      ['Orders / labor hour', 'الطلبات / ساعة عمل', '—', '6.1', '4.8', '5.6', '#1F241F'],
      ['Compliance tasks done', 'مهام الالتزام المنجزة', '11/12', '9/9', '8/10', '28/31', '#1F241F'],
    ],
    foot: ['Weekly aggregates compare against the prior 4-week average; yield measured on completed batches at Main Kitchen only.',
      'التجميعات الأسبوعية تُقارن بمتوسط الأسابيع الأربعة السابقة؛ الإنتاجية تقاس على الدفعات المكتملة في المطبخ الرئيسي فقط.'],
  },
  monthly: {
    period: 'Aug 2026 (MTD)',
    chips: [['Food cost %', 'كلفة الطعام ٪', '27.4%', '#48603A'], ['Purchases', 'المشتريات', '$14,210', '#1F241F'], ['Inventory value', 'قيمة المخزون', '$8,642', '#1F241F']],
    rows: [
      ['Food cost % of sales', 'كلفة الطعام ٪ من المبيعات', '—', '26.1%', '29.2%', '27.4%', '#48603A'],
      ['Packaging % of sales', 'التغليف ٪ من المبيعات', '—', '3.2%', '3.8%', '3.4%', '#1F241F'],
      ['Purchases (received)', 'المشتريات (المستلمة)', '$11,830', '$1,540', '$840', '$14,210', '#1F241F'],
      ['Purchase price variance', 'فرق أسعار الشراء', '+$186', '+$22', '+$9', '+$217', '#8A6D1F'],
      ['Inventory value (close)', 'قيمة المخزون (إقفال)', '$5,910', '$1,680', '$1,052', '$8,642', '#1F241F'],
      ['Gross margin', 'الهامش الإجمالي', '—', '70.7%', '67.0%', '69.2%', '#48603A'],
    ],
    foot: ['Month-to-date; closes with the month-end count. Purchase price variance measures moving-average drift vs first receipt of the month.',
      'حتى تاريخه؛ يُقفل مع جرد نهاية الشهر. فرق أسعار الشراء يقيس انحراف المتوسط المتحرك عن أول استلام في الشهر.'],
  },
};

/** Per-report overrides (chips/rows) so each report has its own content; GEN[group] is the fallback. */
export const REP: Record<string, RepDef> = {
  'Sales': {
    chips: [['Net sales', 'صافي المبيعات', '$2,418', '#1F241F'], ['Orders', 'الطلبات', '285', '#1F241F'], ['Avg ticket', 'متوسط الفاتورة', '$8.48', '#1F241F']],
    rows: [
      ['Gross sales', 'إجمالي المبيعات', '—', '$1,466', '$1,081', '$2,547', '#1F241F'],
      ['Discounts & comps', 'الحسومات والضيافة', '—', '−$46', '−$31', '−$77', '#8A6D1F'],
      ['Voids (approved)', 'الإلغاءات (الموافق عليها)', '—', '−$28', '−$24', '−$52', '#8A6D1F'],
      ['Net sales', 'صافي المبيعات', '—', '$1,392', '$1,026', '$2,418', '#1F241F'],
      ['Cash / card split', 'نقد / بطاقة', '—', '58/42%', '63/37%', '60/40%', '#1F241F'],
      ['Top seller', 'الأكثر مبيعاً', '—', 'Taouk sandwich', 'Halloumi sandwich', '—', '#1F241F'],
    ] },
  'Production': {
    chips: [['Batches', 'الدفعات', '6', '#1F241F'], ['Output at cost', 'الإنتاج بالكلفة', '$742', '#1F241F'], ['Avg yield', 'متوسط الإنتاجية', '96.4%', '#48603A']],
    rows: [
      ['Batches completed', 'دفعات مكتملة', '6', '—', '—', '6', '#1F241F'],
      ['Inputs consumed', 'المدخلات المستهلكة', '$768', '—', '—', '$768', '#1F241F'],
      ['Output produced (at cost)', 'الإنتاج (بالكلفة)', '$742', '—', '—', '$742', '#1F241F'],
      ['Yield vs standard', 'الإنتاجية مقابل المعيار', '96.4%', '—', '—', '96.4%', '#48603A'],
      ['Loss beyond standard', 'الفاقد فوق المعيار', '−$26', '—', '—', '−$26', '#96382E'],
    ] },
  'Waste': {
    chips: [['Waste total', 'إجمالي الهدر', '$26.35', '#8A6D1F'], ['Entries', 'الإدخالات', '9', '#1F241F'], ['% of consumption', '٪ من الاستهلاك', '3.8%', '#96382E']],
    rows: [
      ['Expiry', 'انتهاء صلاحية', '$4.20', '$1.15', '$9.60', '$14.95', '#96382E'],
      ['Prep error', 'خطأ تحضير', '$3.10', '$1.80', '$1.60', '$6.50', '#8A6D1F'],
      ['Spillage / damage', 'انسكاب / تلف', '$2.10', '$1.20', '$1.60', '$4.90', '#8A6D1F'],
      ['Total (photo-evidenced)', 'الإجمالي (موثق بالصور)', '$9.40', '$4.15', '$12.80', '$26.35', '#96382E'],
      ['Pending approval', 'بانتظار الموافقة', '1', '0', '1', '2', '#8A6D1F'],
    ] },
  'Transfers': {
    chips: [['Transfers out', 'تحويلات صادرة', '$486', '#1F241F'], ['In transit', 'قيد النقل', '$208', '#8A6D1F'], ['Confirmed', 'مؤكدة', '5/6', '#48603A']],
    rows: [
      ['Sent (at cost)', 'مرسلة (بالكلفة)', '$486', '—', '—', '$486', '#1F241F'],
      ['Received & confirmed', 'مستلمة ومؤكدة', '—', '$188', '$90', '$278', '#48603A'],
      ['In transit > 4h', 'قيد النقل > ٤ س', '—', '$208', '—', '$208', '#96382E'],
      ['Discrepancies reported', 'فروقات مبلغة', '—', '0', '1', '1', '#8A6D1F'],
    ] },
  'Inventory exceptions': {
    chips: [['Open exceptions', 'استثناءات مفتوحة', '7', '#96382E'], ['Negative stock', 'مخزون سالب', '2', '#96382E'], ['Below reorder', 'تحت حد الطلب', '4', '#8A6D1F']],
    rows: [
      ['Negative stock items', 'أصناف بمخزون سالب', '1', '1', '0', '2', '#96382E'],
      ['Below reorder point', 'تحت حد إعادة الطلب', '2', '1', '1', '4', '#8A6D1F'],
      ['Expiring ≤ 48h', 'تنتهي ≤ ٤٨ س', '1', '0', '0', '1', '#8A6D1F'],
      ['Unmapped POS items', 'أصناف POS غير مربوطة', '—', '2', '0', '2', '#96382E'],
    ] },
  'Alerts': {
    chips: [['Fired today', 'أُطلقت اليوم', '8', '#1F241F'], ['Critical', 'حرجة', '2', '#96382E'], ['Resolved', 'معالجة', '3', '#48603A']],
    rows: [
      ['Critical', 'حرجة', '1', '1', '0', '2', '#96382E'],
      ['Warning', 'تحذير', '2', '1', '1', '4', '#8A6D1F'],
      ['Info', 'معلومة', '1', '—', '1', '2', '#1F241F'],
      ['Median time to action', 'وسيط زمن الاستجابة', '41m', '2h 10m', '—', '1h 12m', '#1F241F'],
    ] },
  'Waste trend': {
    chips: [['This week', 'هذا الأسبوع', '2.6%', '#8A6D1F'], ['4-wk avg', 'متوسط ٤ أسابيع', '2.1%', '#1F241F'], ['Trend', 'الاتجاه', '+0.5pt', '#96382E']],
    rows: [
      ['Waste % of consumption', 'الهدر ٪ من الاستهلاك', '1.9%', '1.4%', '4.1%', '2.6%', '#8A6D1F'],
      ['vs prior week', 'مقابل الأسبوع السابق', '+0.2pt', '−0.1pt', '+1.6pt', '+0.5pt', '#96382E'],
      ['Top driver', 'المسبب الأول', 'Prep error', 'Spillage', 'Expiry (mango)', 'Expiry', '#1F241F'],
      ['Corrective actions open', 'إجراءات تصحيحية مفتوحة', '1', '0', '2', '3', '#8A6D1F'],
    ] },
  'Yield': {
    chips: [['Avg yield', 'متوسط الإنتاجية', '96.8%', '#48603A'], ['Batches', 'الدفعات', '38', '#1F241F'], ['Loss beyond std', 'فاقد فوق المعيار', '−$118', '#96382E']],
    rows: [
      ['Taouk marinade', 'تتبيلة طاووق', '97.9%', '—', '—', '97.9%', '#48603A'],
      ['Grilled chicken (cooked)', 'دجاج مشوي', '94.1%', '—', '—', '94.1%', '#8A6D1F'],
      ['Sauces (all)', 'الصلصات', '98.4%', '—', '—', '98.4%', '#48603A'],
      ['Fries prep', 'تجهيز البطاطا', '95.6%', '—', '—', '95.6%', '#1F241F'],
      ['Loss beyond standard', 'الفاقد فوق المعيار', '−$118', '—', '—', '−$118', '#96382E'],
    ] },
  'Inventory variance': {
    chips: [['Net variance', 'صافي الفرق', '−$118', '#96382E'], ['Items counted', 'أصناف معدودة', '142', '#1F241F'], ['Beyond tolerance', 'خارج السماح', '3', '#96382E']],
    rows: [
      ['Counted within tolerance', 'ضمن السماح', '118', '12', '9', '139', '#48603A'],
      ['Beyond tolerance', 'خارج السماح', '2', '1', '0', '3', '#96382E'],
      ['Net $ variance', 'صافي الفرق $', '−$74', '−$29', '−$15', '−$118', '#96382E'],
      ['Open investigations', 'تحقيقات مفتوحة', '1', '1', '0', '2', '#8A6D1F'],
    ] },
  'Productivity': {
    chips: [['Orders / labor hr', 'طلبات / ساعة عمل', '5.6', '#1F241F'], ['Labor hours', 'ساعات العمل', '412', '#1F241F'], ['Sales / labor hr', 'مبيعات / ساعة', '$41', '#48603A']],
    rows: [
      ['Labor hours', 'ساعات العمل', '96', '182', '134', '412', '#1F241F'],
      ['Orders / labor hour', 'طلبات / ساعة عمل', '—', '6.1', '4.8', '5.6', '#1F241F'],
      ['Sales / labor hour', 'مبيعات / ساعة عمل', '—', '$46', '$35', '$41', '#48603A'],
      ['Batches / labor hour', 'دفعات / ساعة عمل', '0.40', '—', '—', '0.40', '#1F241F'],
    ] },
  'Compliance': {
    chips: [['Tasks done', 'مهام منجزة', '28/31', '#48603A'], ['Overdue', 'متأخرة', '2', '#96382E'], ['Temp logs', 'سجلات الحرارة', '100%', '#48603A']],
    rows: [
      ['Opening/closing checklists', 'قوائم الفتح والإقفال', '12/12', '7/7', '6/8', '25/27', '#8A6D1F'],
      ['Temperature logs', 'سجلات الحرارة', '14/14', '—', '—', '14/14', '#48603A'],
      ['Corrective actions closed', 'إجراءات تصحيحية مغلقة', '1/2', '1/1', '0/1', '2/4', '#96382E'],
      ['Expiry checks', 'فحوص الصلاحية', '7/7', '7/7', '6/7', '20/21', '#8A6D1F'],
    ] },
  'Food cost': {
    chips: [['Food cost %', 'كلفة الطعام ٪', '27.4%', '#48603A'], ['Target', 'الهدف', '≤ 28%', '#1F241F'], ['Worst item', 'الأسوأ', '31.5%', '#96382E']],
    rows: [
      ['Food cost % of sales', 'كلفة الطعام ٪', '—', '26.1%', '29.2%', '27.4%', '#48603A'],
      ['Items over threshold', 'أصناف فوق الحد', '—', '1', '2', '3', '#96382E'],
      ['Biggest mover', 'الأكثر تغيراً', '—', 'Halloumi sandwich', 'Mango smoothie', '—', '#8A6D1F'],
      ['Moving-avg drift (mo)', 'انحراف المتوسط (شهر)', '+1.9%', '+0.8%', '+1.2%', '+1.4%', '#8A6D1F'],
    ] },
  'Purchase variance': {
    chips: [['Price variance', 'فرق الأسعار', '+$217', '#8A6D1F'], ['Invoices', 'الفواتير', '46', '#1F241F'], ['Biggest riser', 'الأكثر ارتفاعاً', 'Oil +2.5%', '#96382E']],
    rows: [
      ['vs first receipt of month', 'مقابل أول استلام', '+$186', '+$22', '+$9', '+$217', '#8A6D1F'],
      ['Invoices with price change', 'فواتير بسعر متغير', '9', '2', '1', '12', '#1F241F'],
      ['Largest increase', 'أكبر ارتفاع', 'Sunflower oil +2.5%', '—', '—', '—', '#96382E'],
      ['Largest decrease', 'أكبر انخفاض', 'Oranges −1.8%', '—', '—', '—', '#48603A'],
    ] },
  'Product profitability': {
    chips: [['Best margin', 'أفضل هامش', 'Fresh juice 78%', '#48603A'], ['Worst', 'الأسوأ', 'Halloumi 61%', '#96382E'], ['Menu avg', 'متوسط القائمة', '69.2%', '#1F241F']],
    rows: [
      ['Taouk sandwich', 'ساندويش طاووق', '—', '71%', '70%', '71%', '#48603A'],
      ['Halloumi sandwich', 'ساندويش حلّوم', '—', '62%', '60%', '61%', '#96382E'],
      ['Fresh orange juice', 'عصير برتقال', '—', '79%', '77%', '78%', '#48603A'],
      ['Fries (side)', 'بطاطا (جانبي)', '—', '74%', '72%', '73%', '#1F241F'],
    ] },
  'Comparison': {
    chips: [['Sales leader', 'الأعلى مبيعاً', 'Rock', '#1F241F'], ['Waste leader', 'الأعلى هدراً', 'Kaddoum', '#96382E'], ['Margin gap', 'فجوة الهامش', '3.7pt', '#8A6D1F']],
    rows: [
      ['Net sales', 'صافي المبيعات', '—', '$41,900', '$26,500', '$68,400', '#1F241F'],
      ['Food cost %', 'كلفة الطعام ٪', '—', '26.1%', '29.2%', '27.4%', '#8A6D1F'],
      ['Waste %', 'الهدر ٪', '—', '1.4%', '4.1%', '2.6%', '#96382E'],
      ['Gross margin', 'الهامش الإجمالي', '—', '70.7%', '67.0%', '69.2%', '#48603A'],
    ] },
};

/** Base monthly figures for Aug 2026 (combined); 2025 = ratio of same-month 2026. [en, ar, aug26, unit, 2025 ratio, higherIsBetter] */
export const CMP_BASE: [string, string, number, Unit, number, boolean][] = [
  ['Net sales', 'صافي المبيعات', 68400, '$', 0.81, true],
  ['Orders', 'الطلبات', 8120, 'n', 0.84, true],
  ['Avg ticket', 'متوسط الفاتورة', 8.42, '$2', 0.965, true],
  ['Food cost %', 'كلفة الطعام ٪', 27.4, '%', 1.065, false],
  ['Waste % of consumption', 'الهدر ٪ من الاستهلاك', 2.6, '%', 1.31, false],
  ['Count variance ($, abs)', 'فرق الجرد ($، مطلق)', 312, '$', 1.42, false],
  ['Gross margin %', 'الهامش الإجمالي ٪', 69.2, '%', 0.955, true],
];

/** Period list for period-vs-period comparison: Jan–Aug 2026 then Jan–Dec 2025. */
export function PERIODS(): { v: string; label: string; f: number }[] {
  const p: { v: string; label: string; f: number }[] = [];
  for (let i = 0; i < 8; i++) p.push({ v: '26-' + i, label: MONTHS[i][0] + ' 2026', f: MFACT[i] });
  const f25 = [0.64, 0.61, 0.68, 0.72, 0.78, 0.87, 0.92, 0.82, 0.74, 0.70, 0.66, 0.71];
  const mn25 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < 12; i++) p.push({ v: '25-' + i, label: mn25[i] + ' 2025', f: f25[i] });
  return p;
}

/** Period-comparable metrics per topic: [en, ar, base value @ Aug 2026, unit, bad-when-up] */
export const PER_ROWS: Record<string, [string, string, number, Unit, boolean][]> = {
  'Comparison': [
    ['Net sales', 'صافي المبيعات', 68400, '$', false],
    ['Orders', 'الطلبات', 8120, 'n', false],
    ['Food cost %', 'كلفة الطعام ٪', 27.4, '%', true],
    ['Waste % of consumption', 'الهدر ٪ من الاستهلاك', 2.6, '%', true],
    ['Gross margin %', 'الهامش الإجمالي ٪', 69.2, '%', false],
  ],
  'Sales': [
    ['Net sales', 'صافي المبيعات', 68400, '$', false],
    ['Orders', 'الطلبات', 8120, 'n', false],
    ['Avg ticket', 'متوسط الفاتورة', 8.42, '$2', false],
    ['Discounts & comps', 'الحسومات والضيافة', 2180, '$', true],
    ['Voids (approved)', 'الإلغاءات', 1460, '$', true],
  ],
  'Production': [
    ['Batches completed', 'دفعات مكتملة', 168, 'n', false],
    ['Output at cost', 'الإنتاج بالكلفة', 20800, '$', false],
    ['Yield vs standard %', 'الإنتاجية مقابل المعيار ٪', 96.4, '%', false],
    ['Loss beyond standard', 'الفاقد فوق المعيار', 720, '$', true],
  ],
  'Waste trend': [
    ['Waste total', 'إجمالي الهدر', 740, '$', true],
    ['Waste % of consumption', 'الهدر ٪ من الاستهلاك', 2.6, '%', true],
    ['Expiry waste', 'هدر انتهاء الصلاحية', 420, '$', true],
    ['Prep-error waste', 'هدر أخطاء التحضير', 182, '$', true],
    ['Waste entries', 'إدخالات الهدر', 252, 'n', true],
  ],
  'Productivity': [
    ['Labor hours', 'ساعات العمل', 11540, 'n', true],
    ['Orders / labor hour', 'طلبات / ساعة عمل', 5.6, 'n', false],
    ['Sales / labor hour', 'مبيعات / ساعة عمل', 41, '$', false],
    ['Batches / labor hour', 'دفعات / ساعة عمل', 0.4, 'n', false],
  ],
  'Food cost': [
    ['Food cost %', 'كلفة الطعام ٪', 27.4, '%', true],
    ['Packaging % of sales', 'التغليف ٪ من المبيعات', 3.4, '%', true],
    ['Purchases (received)', 'المشتريات', 14210, '$', true],
    ['Moving-avg drift %', 'انحراف المتوسط ٪', 1.4, '%', true],
  ],
  'Product profitability': [
    ['Menu avg margin %', 'متوسط هامش القائمة ٪', 69.2, '%', false],
    ['Best item margin %', 'أفضل هامش ٪', 78, '%', false],
    ['Worst item margin %', 'أسوأ هامش ٪', 61, '%', false],
    ['Items under threshold', 'أصناف تحت الحد', 3, 'n', true],
  ],
};

/** Location share of extensive ($/count) values per report/topic; _ = fallback */
export const SHARES: Record<string, Record<LocId, number>> = {
  _: { mk: .33, rock: .37, kad: .30 },
  'Sales': { mk: 0, rock: .5757, kad: .4243 }, 'Comparison': { mk: 0, rock: .61, kad: .39 },
  'Production': { mk: 1, rock: 0, kad: 0 }, 'Yield': { mk: 1, rock: 0, kad: 0 },
  'Waste': { mk: .36, rock: .16, kad: .48 }, 'Waste trend': { mk: .36, rock: .24, kad: .40 },
  'Transfers': { mk: .64, rock: .24, kad: .12 }, 'Inventory exceptions': { mk: .43, rock: .43, kad: .14 },
  'Alerts': { mk: .5, rock: .25, kad: .25 }, 'Daily variance': { mk: .6, rock: .25, kad: .15 },
  'Productivity': { mk: .23, rock: .44, kad: .33 }, 'Compliance': { mk: .45, rock: .3, kad: .25 },
  'Inventory variance': { mk: .63, rock: .24, kad: .13 }, 'Monthly costing': { mk: .4, rock: .35, kad: .25 },
  'Food cost': { mk: 0, rock: .58, kad: .42 }, 'Purchase variance': { mk: .86, rock: .1, kad: .04 },
  'Product profitability': { mk: 0, rock: .58, kad: .42 },
};

/** Comparison-report topics: [en, ar, REP key] */
export const TOPICS: [string, string, string][] = [
  ['Overview', 'نظرة عامة', 'Comparison'], ['Sales', 'المبيعات', 'Sales'], ['Production', 'الإنتاج', 'Production'],
  ['Waste trend', 'اتجاه الهدر', 'Waste trend'], ['Productivity', 'الإنتاجية العمالية', 'Productivity'],
  ['Food cost', 'كلفة الطعام', 'Food cost'], ['Profitability', 'الربحية', 'Product profitability'],
];

/** Report library: 7 daily / 6 weekly / 8 monthly. */
export const REPORTS: Record<Group, [string, string][]> = {
  daily: [['Sales', 'المبيعات'], ['Production', 'الإنتاج'], ['Waste', 'الهدر'], ['Transfers', 'التحويلات'], ['Inventory exceptions', 'استثناءات المخزون'], ['Daily variance', 'الفروقات اليومية'], ['Alerts', 'التنبيهات']],
  weekly: [['Waste trend', 'اتجاه الهدر'], ['Yield', 'الإنتاجية'], ['Production', 'الإنتاج'], ['Inventory variance', 'فروقات المخزون'], ['Productivity', 'الإنتاجية العمالية'], ['Compliance', 'الالتزام']],
  monthly: [['Monthly costing', 'التكاليف الشهرية'], ['Food cost', 'كلفة الطعام'], ['Purchase variance', 'فروقات الشراء'], ['Inventory variance', 'فروقات المخزون'], ['Production', 'الإنتاج'], ['Yield', 'الإنتاجية'], ['Product profitability', 'ربحية المنتجات'], ['Comparison', 'مقارنة']],
};

export interface GenRep { name: string; key: string; group: Group }

/** MGT-RPT-02 rows (itemId links to the shared item world for the Variance drill). */
export const DAILY: { en: string; ar: string; loc: LocId; itemId: string; theo: string; act: string; impact: number; evd: number }[] = [
  { en: 'Chicken breast', ar: 'صدر دجاج', loc: 'rock', itemId: 'RM-001', theo: '52.4 KG', act: '55.7 KG', impact: -15.84, evd: 5 },
  { en: 'Marinated taouk skewer', ar: 'سيخ طاووق متبّل', loc: 'rock', itemId: 'PR-002', theo: '90 PCS', act: '96 PCS', impact: -6.90, evd: 6 },
  { en: 'Sunflower oil', ar: 'زيت دوّار الشمس', loc: 'mk', itemId: 'RM-014', theo: '21.5 L', act: '23.4 L', impact: -5.94, evd: 3 },
  { en: 'Mango pulp', ar: 'لب مانجو', loc: 'kad', itemId: 'RM-068', theo: '11.4 KG', act: '12.2 KG', impact: -2.24, evd: 2 },
  { en: 'Fresh oranges', ar: 'برتقال', loc: 'kad', itemId: 'RM-035', theo: '25.4 KG', act: '26.9 KG', impact: -1.35, evd: 2 },
  { en: 'Akkawi cheese', ar: 'جبنة عكاوي', loc: 'rock', itemId: 'RM-022', theo: '4.1 KG', act: '4.0 KG', impact: 0.72, evd: 1 },
];

/** MGT-RPT-03 — cost movement by category (cat = item category for the Items drill). */
export const CATS: { en: string; ar: string; cat: string; val: string; n: number; up: boolean }[] = [
  { en: 'Poultry', ar: 'دواجن', cat: 'Poultry', val: '+$142', n: 142, up: true },
  { en: 'Dairy', ar: 'ألبان وأجبان', cat: 'Dairy', val: '+$88', n: 88, up: true },
  { en: 'Oils', ar: 'زيوت', cat: 'Oils', val: '+$31', n: 31, up: true },
  { en: 'Packaging', ar: 'تغليف', cat: 'Packaging', val: '+$9', n: 9, up: true },
  { en: 'Produce', ar: 'خضار وفواكه', cat: 'Produce', val: '−$12', n: 12, up: false },
];
export const DRIFT: { en: string; ar: string; recipe?: string; move: string; over: boolean }[] = [
  { en: 'Halloumi sandwich', ar: 'ساندويش حلّوم', recipe: 'MI-103', move: '29.0% → 31.5%', over: true },
  { en: 'Taouk sandwich', ar: 'ساندويش طاووق', recipe: 'MI-101', move: '25.2% → 25.5%', over: false },
  { en: 'Fresh orange juice', ar: 'عصير برتقال', recipe: 'MI-108', move: '14.9% → 14.6%', over: false },
];
export const PROFIT: { en: string; ar: string; recipe?: string; sold: string; rev: string; cost: string; m: number; best?: boolean; worst?: boolean }[] = [
  { en: 'Fresh orange juice', ar: 'عصير برتقال', recipe: 'MI-108', sold: '5,120', rev: '$20,480', cost: '$3,789', m: 81.5, best: true },
  { en: 'Taouk sandwich', ar: 'ساندويش طاووق', recipe: 'MI-101', sold: '3,480', rev: '$22,620', cost: '$6,473', m: 71.4 },
  { en: 'Taouk platter', ar: 'صحن طاووق', sold: '1,140', rev: '$13,680', cost: '$4,104', m: 70.0 },
  { en: 'Taouk combo', ar: 'كومبو طاووق', sold: '2,360', rev: '$18,880', cost: '$5,894', m: 68.8 },
  { en: 'Halloumi sandwich', ar: 'ساندويش حلّوم', recipe: 'MI-103', sold: '1,914', rev: '$15,312', cost: '$5,206', m: 66.0, worst: true },
];

/** MGT-RPT-05 defaults. */
export const TH: { key: string; name: string; nameAr: string; cur: number; food: number; pkg: number }[] = [
  { key: 'taouk', name: 'Taouk sandwich', nameAr: 'ساندويش طاووق', cur: 25.5, food: 28, pkg: 4 },
  { key: 'halloumi', name: 'Halloumi sandwich', nameAr: 'ساندويش حلّوم', cur: 31.5, food: 30, pkg: 4 },
  { key: 'juice', name: 'Fresh orange juice', nameAr: 'عصير برتقال', cur: 14.6, food: 20, pkg: 5 },
];
export const BANDS: { key: string; name: string; nameAr: string; warn: string; crit: string }[] = [
  { key: 'yield', name: 'Yield vs standard', nameAr: 'الإنتاجية مقابل المعيار', warn: '−5%', crit: '−10%' },
  { key: 'invvar', name: 'Inventory variance', nameAr: 'فرق المخزون', warn: '3%', crit: '5%' },
  { key: 'waste', name: 'Waste % of sales', nameAr: 'الهدر ٪ من المبيعات', warn: '2%', crit: '4%' },
  { key: 'ppv', name: 'Purchase price change', nameAr: 'تغير سعر الشراء', warn: '5%', crit: '10%' },
];

export interface ThresholdState { th: Record<string, { food: string; pkg: string }>; bands: Record<string, { warn: string; crit: string }> }
export const THRESHOLD_SEED: ThresholdState = {
  th: Object.fromEntries(TH.map((r) => [r.key, { food: r.food + '%', pkg: r.pkg + '%' }])),
  bands: Object.fromEntries(BANDS.map((b) => [b.key, { warn: b.warn, crit: b.crit }])),
};

/** Alert severity styling: [pill bg, pill fg, dot, border, row bg] */
export const SEV_STYLE: Record<'crit' | 'warn' | 'info', [string, string, string, string, string]> = {
  crit: ['#F0CFC9', '#96382E', '#C0392B', '#DFB3AC', '#FBF6F4'],
  warn: ['#F5E3B3', '#8A6D1F', '#C99A2E', '#E2CD96', '#FDF9EE'],
  info: ['#DCE4EC', '#37536B', '#37536B', '#DCD6C4', '#FBF9F2'],
};
export const SEV_RANK = { crit: 0, warn: 1, info: 2 } as const;

/** Prototype money(): always signed, 2 decimals. */
export const moneyS = (n: number) => (n < 0 ? '−' : '+') + '$' + Math.abs(n).toFixed(2);
