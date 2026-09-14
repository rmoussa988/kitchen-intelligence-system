import type { CoreState } from '../store';

export interface NavItem { id: string; en: string; ar: string; tab?: string; r2?: boolean; badge?: (s: CoreState) => { n: number; red?: boolean } | null }
export interface NavGroup { id: string; en: string; ar: string; items: NavItem[] }

const openAlerts = (s: CoreState) => s.alerts.filter((a) => !a.dismissed);

/** Management sidebar — same groups/order as the Navigation Shell prototype, restricted to the modules in this build. */
export const NAV: NavGroup[] = [
  { id: 'ov', en: 'Overview', ar: 'نظرة عامة', items: [
    { id: 'health', en: 'Kitchen Health', ar: 'صحة المطبخ' },
    { id: 'reports', en: 'Alerts & Reports', ar: 'التنبيهات والتقارير', badge: (s) => { const n = openAlerts(s).filter((a) => a.severity === 'red').length; return n ? { n, red: true } : null; } },
  ] },
  { id: 'inv', en: 'Inventory', ar: 'المخزون', items: [
    { id: 'items', en: 'Items & Units', ar: 'الأصناف والوحدات' },
    { id: 'inventory', en: 'Inventory & Counts', ar: 'المخزون والجرد', badge: (s) => { const n = s.movements.filter((m) => m.type === 'count' && m.beyondTolerance).length; return n ? { n } : null; } },
    { id: 'recipes', en: 'Recipes', ar: 'الوصفات' },
    { id: 'variance', en: 'Variance investigation', ar: 'تحقيق الفروقات', badge: (s) => { const n = openAlerts(s).filter((a) => a.type === 'inv_variance').length; return n ? { n, red: true } : null; } },
    { id: 'master-data', en: 'Suppliers', ar: 'الموردون', tab: 'suppliers' },
  ] },
  { id: 'ops', en: 'Operations', ar: 'العمليات', items: [
    { id: 'purchasing', en: 'Purchasing', ar: 'المشتريات', badge: (s) => { const n = s.purchaseOrders.filter((p) => p.status === 'sent' || p.status === 'partial').length; return n ? { n } : null; } },
    { id: 'receiving', en: 'Receiving', ar: 'الاستلام', badge: (s) => { const n = s.deliveries.filter((d) => (d.worstVariancePct ?? 0) >= s.settings.ppvRedPct).length; return n ? { n, red: true } : null; } },
    { id: 'production', en: 'Production', ar: 'الإنتاج' },
    { id: 'production-gaps', en: 'Production gaps', ar: 'فجوات الإنتاج', badge: (s) => { const n = s.batches.filter((b) => b.gapStatus === 'open' || b.gapStatus === 'flagged').length; return n ? { n } : null; } },
    { id: 'transfers', en: 'Transfers', ar: 'التحويلات', badge: (s) => { const n = s.transfers.filter((t) => t.status === 'sent' || t.status === 'flagged').length; return n ? { n } : null; } },
    { id: 'waste', en: 'Waste', ar: 'الهدر', badge: (s) => { const n = s.waste.filter((w) => w.status === 'pending').length; return n ? { n } : null; } },
  ] },
  { id: 'fin', en: 'Finance', ar: 'المالية', items: [
    { id: 'pnl', en: 'Operational P&L', ar: 'الأرباح والخسائر التشغيلية' },
    { id: 'financial-pnl', en: 'Financial P&L (owner)', ar: 'الأرباح والخسائر المالية (المالك)' },
    { id: 'accounting', en: 'Accounting', ar: 'المحاسبة', badge: (s) => { const n = s.closings.filter((c) => c.status === 'in_transit').length; return n ? { n } : null; } },
    { id: 'invoice-pipeline', en: 'Invoice pipeline', ar: 'خط الفواتير', badge: (s) => { const n = s.invoices.filter((i) => i.stage === 'received' || i.stage === 'entered' || i.stage === 'review').length; return n ? { n } : null; } },
    { id: 'invoice-review', en: 'Invoice review', ar: 'مراجعة الفواتير', badge: (s) => { const n = s.invoices.filter((i) => i.stage === 'review' || i.stage === 'disputed').length; return n ? { n } : null; } },
    { id: 'ledger', en: 'General ledger', ar: 'دفتر الأستاذ', r2: true },
  ] },
  { id: 'adm', en: 'Admin', ar: 'الإدارة', items: [
    { id: 'master-data', en: 'Users & Locations', ar: 'المستخدمون والمواقع', tab: 'users' },
    { id: 'search', en: 'Search & trace', ar: 'البحث والتتبع' },
  ] },
];

/** Staff tablet home tiles — order & glyphs follow the Navigation Shell prototype. */
export const STAFF_TILES: { id: string; en: string; ar: string; subEn: string; subAr: string; glyph: string; badge?: (s: CoreState) => number }[] = [
  { id: 'staff-receiving', en: 'Receiving', ar: 'الاستلام', subEn: 'log delivery', subAr: 'تسجيل التسليم', glyph: '▤' },
  { id: 'staff-production', en: 'Production', ar: 'الإنتاج', subEn: 'assigned plans', subAr: 'الخطط المسندة', glyph: '◍', badge: (s) => s.plans.filter((p) => p.published && p.status !== 'done').length },
  { id: 'staff-tablet', en: 'Counts & transfers', ar: 'الجرد والتحويلات', subEn: 'count · send · receive', subAr: 'جرد · إرسال · استلام', glyph: '⇄', badge: (s) => s.transfers.filter((t) => t.status === 'sent').length },
  { id: 'staff-waste', en: 'Waste', ar: 'الهدر', subEn: '30-second entry', subAr: 'تسجيل ٣٠ ثانية', glyph: '⌫' },
  { id: 'staff-batch', en: 'Batch (classic)', ar: 'دفعة (كلاسيكي)', subEn: 'stage weights & yield', subAr: 'أوزان المراحل والإنتاجية', glyph: '◫' },
  { id: 'search', en: 'Scan QR', ar: 'مسح QR', subEn: 'route to screen', subAr: 'التوجيه للشاشة', glyph: '⌗' },
];
