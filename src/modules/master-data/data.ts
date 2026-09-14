import type { LocId, Role } from '../../store';

/** Prototype role keys ↔ store roles. */
export type RoleKey = 'super' | 'owner' | 'mgr' | 'store' | 'prep' | 'prod' | 'serve' | 'acct' | 'inv' | 'cost';
export const ROLE_KEY: Record<Role, RoleKey> = { superuser: 'super', owner: 'owner', manager: 'mgr', storekeeper: 'store', prep: 'prep', production: 'prod', service: 'serve', accountant: 'acct', invoice: 'inv', cost: 'cost' };
export const ROLE_ORDER: Role[] = ['superuser', 'owner', 'manager', 'storekeeper', 'prep', 'production', 'service', 'accountant', 'invoice', 'cost'];
/** Avatar tints (prototype per-user colours, keyed by role). */
export const ROLE_COLOR: Record<Role, string> = { superuser: '#C9C2D8', owner: '#D8C8A8', manager: '#C4CDB9', storekeeper: '#BFCBD3', prep: '#D3C0C9', production: '#C4CDB9', service: '#D8CBB4', accountant: '#BFC8BE', invoice: '#D3C0C9', cost: '#C9C2D8' };
/** Role-derived permission preview (MGT-AUTH-03). */
export const ROLE_PERMS: Record<Role, { en: string; ar: string }[]> = {
  superuser: [{ en: 'Items & UOM', ar: 'الأصناف والوحدات' }, { en: 'Recipes', ar: 'الوصفات' }, { en: 'Approvals', ar: 'الموافقات' }, { en: 'Thresholds', ar: 'الحدود' }, { en: 'Users', ar: 'المستخدمون' }, { en: 'P&L', ar: 'الأرباح والخسائر' }],
  owner: [{ en: 'P&L', ar: 'الأرباح والخسائر' }, { en: 'Reports', ar: 'التقارير' }, { en: 'Kitchen Health', ar: 'صحة المطبخ' }, { en: 'Owner report', ar: 'تقرير المالك' }],
  manager: [{ en: 'Production', ar: 'الإنتاج' }, { en: 'Counts', ar: 'الجرد' }, { en: 'Waste approval', ar: 'اعتماد الهدر' }, { en: 'Transfers', ar: 'التحويلات' }, { en: 'Reports', ar: 'التقارير' }],
  storekeeper: [{ en: 'Receiving', ar: 'الاستلام' }, { en: 'Counts', ar: 'الجرد' }, { en: 'Transfers', ar: 'التحويلات' }],
  prep: [{ en: 'Production batches', ar: 'دفعات الإنتاج' }, { en: 'Waste', ar: 'الهدر' }],
  production: [{ en: 'Production batches', ar: 'دفعات الإنتاج' }, { en: 'Waste', ar: 'الهدر' }],
  service: [{ en: 'Counts', ar: 'الجرد' }, { en: 'Order requests', ar: 'طلبات التوريد' }, { en: 'Confirm receipt', ar: 'تأكيد الاستلام' }, { en: 'Waste', ar: 'الهدر' }],
  accountant: [{ en: 'Supplier bills', ar: 'فواتير الموردين' }, { en: 'Closings', ar: 'الإقفالات' }, { en: 'FX rate', ar: 'سعر الصرف' }, { en: 'Expenses', ar: 'المصاريف' }, { en: 'P&L', ar: 'الأرباح والخسائر' }],
  invoice: [{ en: 'Invoice entry', ar: 'إدخال الفواتير' }, { en: 'Receiving (view)', ar: 'الاستلام (عرض)' }],
  cost: [{ en: 'Recipes', ar: 'الوصفات' }, { en: 'Price variance', ar: 'فروقات الأسعار' }, { en: 'Reports', ar: 'التقارير' }],
};
/** Demo "last active" per seed user (the store keeps no session log). */
export const LAST_SEEN: Record<string, string> = {
  'U-01': '12 Aug 09:15', 'U-02': '12 Aug 08:05', 'U-03': '12 Aug 07:45', 'U-04': '12 Aug 08:30', 'U-05': '12 Aug 07:10', 'U-06': '12 Aug 08:35',
  'U-07': '12 Aug 08:00', 'U-08': '12 Aug 09:00', 'U-09': '11 Aug 16:40', 'U-10': '11 Aug 15:20', 'U-11': '28 Jul 14:10',
};

/** Location ledger cards. */
export const LOC_DESC: Record<LocId, { en: string; ar: string }> = {
  mk: { en: 'Produces and supplies Rock & Kaddoum. Most receiving happens here.', ar: 'ينتج ويزوّد روك وقدّوم. معظم الاستلام يتم هنا.' },
  rock: { en: 'Cooks Main-Kitchen-prepared components fresh on its line. Shares seating with Kaddoum; separate ledger.', ar: 'يطهو مكونات المطبخ الرئيسي طازجة على خطه. يشارك قدّوم الجلوس؛ دفتر مستقل.' },
  kad: { en: 'Makes juices and ice-cream items. Receives produce directly.', ar: 'يحضّر العصائر والبوظة. يستلم الخضار والفواكه مباشرة.' },
};
export const RESP_LABEL: Record<string, { en: string; ar: string }> = {
  receiving: { en: 'Receiving', ar: 'استلام' }, production: { en: 'Production', ar: 'إنتاج' }, 'transfers-out': { en: 'Transfers out', ar: 'تحويلات صادرة' },
  'transfers-in': { en: 'Transfers in', ar: 'تحويلات واردة' }, service: { en: 'Service', ar: 'خدمة' }, counts: { en: 'Counts', ar: 'جرد' },
  'receiving (bread)': { en: 'Receiving (bread)', ar: 'استلام (خبز)' }, 'receiving (produce)': { en: 'Receiving (produce)', ar: 'استلام (خضار)' },
  'line cooking': { en: 'Line cooking', ar: 'طهي مباشر' }, 'fresh production': { en: 'Fresh production', ar: 'إنتاج طازج' },
};
export const AREA_INFO: Record<string, { ar: string; note: { en: string; ar: string } }> = {
  'Store room': { ar: 'غرفة المخزن', note: { en: 'dry + cans', ar: 'جاف + معلبات' } },
  'Walk-in fridge': { ar: 'غرفة التبريد', note: { en: 'proteins, dairy', ar: 'بروتينات وألبان' } },
  'Cold room': { ar: 'غرفة التبريد', note: { en: 'proteins, dairy', ar: 'بروتينات وألبان' } },
  Freezer: { ar: 'الفريزر', note: { en: 'frozen, ice cream', ar: 'مجمدات وبوظة' } },
  'Dry store': { ar: 'المخزن الجاف', note: { en: 'flour, sugar, rice', ar: 'طحين وسكر وأرز' } },
  'Kitchen storage': { ar: 'تخزين المطبخ', note: { en: 'in-use items', ar: 'أصناف قيد الاستخدام' } },
  'Line fridge': { ar: 'براد الخط', note: { en: 'daily stock', ar: 'مخزون يومي' } },
  'Back store': { ar: 'التخزين الخلفي', note: { en: 'packaging', ar: 'تغليف' } },
  'Back storage': { ar: 'التخزين الخلفي', note: { en: 'packaging', ar: 'تغليف' } },
  'Juice bar fridge': { ar: 'براد العصير', note: { en: 'fruit, milk', ar: 'فواكه وحليب' } },
  'Juice fridge': { ar: 'براد العصير', note: { en: 'fruit, milk', ar: 'فواكه وحليب' } },
  'Dry shelf': { ar: 'الرف الجاف', note: { en: 'sugar, cups', ar: 'سكر وأكواب' } },
};

/** Supplier categories + AR payment terms. */
export const SUP_CAT: Record<string, { en: string; ar: string }> = {
  'SUP-01': { en: 'Oils & dry goods', ar: 'زيوت ومواد جافة' }, 'SUP-02': { en: 'Poultry', ar: 'دواجن' }, 'SUP-03': { en: 'Dairy', ar: 'ألبان وأجبان' },
  'SUP-04': { en: 'Produce', ar: 'خضار وفواكه' }, 'SUP-05': { en: 'Preserves & tobacco', ar: 'مخللات وتبغ' }, 'SUP-06': { en: 'Bakery', ar: 'مخبوزات' }, 'SUP-07': { en: 'Packaging', ar: 'تغليف' },
};
export const TERMS_AR: Record<string, string> = { 'Net 7': '٧ أيام', 'Net 15': '١٥ يوماً', 'Net 30': '٣٠ يوماً', COD: 'نقداً عند التسليم', Weekly: 'أسبوعياً' };
export const TERMS_OPTIONS = ['COD', 'Net 7', 'Net 15', 'Net 30', 'Weekly'];

/** 90-day price trend (% vs 90 days ago) per item, in purchase units. */
export const PRICE_TREND: Record<string, number> = {
  'RM-001': 1.1, 'RM-065': -1.4, 'RM-014': 2.5, 'RM-041': 0, 'RM-061': 8.7, 'RM-068': 0,
  'RM-022': 9.6, 'RM-064': 0, 'RM-069': 0, 'RM-035': 0, 'RM-062': 3.9, 'RM-063': 4.2, 'RM-066': 0, 'RM-067': 0,
  'RM-050': 0, 'RM-070': 0, 'RM-060': 0, 'PK-201': 0, 'PK-205': 0, 'PK-210': 1.5,
};
/** Monthly price history per item (purchase unit), May → Aug 2026. */
export const PRICE_HISTORY: Record<string, { base: number; series: [number, string][] }> = {
  'RM-001': { base: 47.5, series: [[47.0, 'May'], [47.5, 'Jun'], [47.5, 'Jul'], [48.0, 'Aug']] },
  'RM-065': { base: 6.29, series: [[6.29, 'May'], [6.35, 'Jun'], [6.2, 'Jul'], [6.2, 'Aug']] },
  'RM-014': { base: 48.8, series: [[48.8, 'May'], [48.8, 'Jun'], [49.6, 'Jul'], [50.0, 'Aug']] },
  'RM-041': { base: 35, series: [[35, 'May'], [35, 'Jun'], [35, 'Jul'], [35, 'Aug']] },
  'RM-061': { base: 3.59, series: [[3.55, 'May'], [3.59, 'Jun'], [3.59, 'Jul'], [3.9, 'Aug']] },
  'RM-068': { base: 2.8, series: [[2.8, 'May'], [2.8, 'Jun'], [2.8, 'Jul'], [2.8, 'Aug']] },
  'RM-022': { base: 6.57, series: [[6.57, 'May'], [6.75, 'Jun'], [6.95, 'Jul'], [7.2, 'Aug']] },
  'RM-064': { base: 1.35, series: [[1.35, 'May'], [1.35, 'Jun'], [1.35, 'Jul'], [1.35, 'Aug']] },
  'RM-069': { base: 0.85, series: [[0.85, 'May'], [0.85, 'Jun'], [0.85, 'Jul'], [0.85, 'Aug']] },
  'RM-035': { base: 13.5, series: [[13.5, 'May'], [13.8, 'Jun'], [13.2, 'Jul'], [13.5, 'Aug']] },
  'RM-062': { base: 10.2, series: [[10.2, 'May'], [10.2, 'Jun'], [10.2, 'Jul'], [10.6, 'Aug']] },
  'RM-063': { base: 9.6, series: [[9.6, 'May'], [9.6, 'Jun'], [9.6, 'Jul'], [10.0, 'Aug']] },
  'RM-066': { base: 2.4, series: [[2.4, 'May'], [2.4, 'Jun'], [2.4, 'Jul'], [2.4, 'Aug']] },
  'RM-067': { base: 1.8, series: [[1.8, 'May'], [1.8, 'Jun'], [1.8, 'Jul'], [1.8, 'Aug']] },
  'RM-050': { base: 1.9, series: [[1.9, 'May'], [1.9, 'Jun'], [1.9, 'Jul'], [1.9, 'Aug']] },
  'RM-070': { base: 18, series: [[18, 'May'], [18, 'Jun'], [18, 'Jul'], [18, 'Aug']] },
  'RM-060': { base: 1.1, series: [[1.1, 'May'], [1.1, 'Jun'], [1.1, 'Jul'], [1.1, 'Aug']] },
  'PK-201': { base: 40, series: [[40, 'May'], [40, 'Jun'], [40, 'Jul'], [40, 'Aug']] },
  'PK-205': { base: 0.07, series: [[0.07, 'May'], [0.07, 'Jun'], [0.07, 'Jul'], [0.07, 'Aug']] },
  'PK-210': { base: 44.3, series: [[44.3, 'May'], [44.3, 'Jun'], [45, 'Jul'], [45, 'Aug']] },
};
