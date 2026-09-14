import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type ModuleKind = 'mgmt' | 'staff';

export interface ModuleDef {
  id: string;
  kind: ModuleKind;
  en: string;
  ar: string;
  screenIds: string[];
  /** Source prototype file in the handoff bundle */
  file: string;
  component: LazyExoticComponent<ComponentType<Record<string, never>>> | null;
}

/**
 * Every module that is part of this build. `component: null` renders the "not yet ported" placeholder.
 * Module agents: set `component` to lazy(() => import('./<folder>/index')) when the port is done.
 */
export const MODULES: ModuleDef[] = [
  // ── Inventory & Production ──
  { id: 'items', kind: 'mgmt', en: 'Items & Units', ar: 'الأصناف والوحدات', screenIds: ['MGT-ITM-01', 'MGT-ITM-02', 'MGT-ITM-03'], file: 'KIS Items & UOM.dc.html', component: lazy(() => import('./items/index')) },
  { id: 'inventory', kind: 'mgmt', en: 'Inventory & Counts', ar: 'المخزون والجرد', screenIds: ['MGT-INV-01', 'MGT-INV-02', 'MGT-INV-03', 'MGT-INV-05'], file: 'KIS Inventory & Counts.dc.html', component: lazy(() => import('./inventory/index')) },
  { id: 'recipes', kind: 'mgmt', en: 'Recipes', ar: 'الوصفات', screenIds: ['MGT-RCP-01', 'MGT-RCP-02', 'MGT-RCP-03'], file: 'KIS Recipes.dc.html', component: lazy(() => import('./recipes/index')) },
  { id: 'production', kind: 'mgmt', en: 'Production', ar: 'الإنتاج', screenIds: ['MGT-PRD-01', 'MGT-PRD-05'], file: 'KIS Production Management.dc.html', component: lazy(() => import('./production/index')) },
  { id: 'production-gaps', kind: 'mgmt', en: 'Production gaps', ar: 'فجوات الإنتاج', screenIds: ['MGT-PRD-06'], file: 'KIS Production Gap Review.dc.html', component: lazy(() => import('./production-gaps/index')) },
  { id: 'transfers', kind: 'mgmt', en: 'Transfers', ar: 'التحويلات', screenIds: ['MGT-TRF-04'], file: 'KIS Transfers.dc.html', component: lazy(() => import('./transfers/index')) },
  { id: 'waste', kind: 'mgmt', en: 'Waste', ar: 'الهدر', screenIds: ['MGT-WST-02'], file: 'KIS Waste Management.dc.html', component: lazy(() => import('./waste/index')) },
  { id: 'variance', kind: 'mgmt', en: 'Variance investigation', ar: 'تحقيق الفروقات', screenIds: ['MGT-VAR-01'], file: 'KIS Variance Investigation.dc.html', component: lazy(() => import('./variance/index')) },
  { id: 'search', kind: 'mgmt', en: 'Search & trace', ar: 'البحث والتتبع', screenIds: ['MGT-SRCH-01', 'STF-QR-01'], file: 'KIS Search, Trace & QR.dc.html', component: lazy(() => import('./search/index')) },
  // ── Purchasing & Receiving ──
  { id: 'purchasing', kind: 'mgmt', en: 'Purchasing', ar: 'المشتريات', screenIds: ['MGT-PUR-01'], file: 'KIS Purchasing.dc.html', component: lazy(() => import('./purchasing/index')) },
  { id: 'receiving', kind: 'mgmt', en: 'Receiving', ar: 'الاستلام', screenIds: ['MGT-RCV-02', 'MGT-RCV-03'], file: 'KIS Receiving Oversight.dc.html', component: lazy(() => import('./receiving/index')) },
  { id: 'invoice-pipeline', kind: 'mgmt', en: 'Invoice pipeline', ar: 'خط الفواتير', screenIds: ['ACC-INV-01'], file: 'KIS Supplier Invoice Pipeline.dc.html', component: lazy(() => import('./invoice-pipeline/index')) },
  { id: 'invoice-review', kind: 'mgmt', en: 'Invoice review', ar: 'مراجعة الفواتير', screenIds: ['INV-REV-01'], file: 'KIS-Invoice-Review.dc.html', component: lazy(() => import('./invoice-review/index')) },
  { id: 'master-data', kind: 'mgmt', en: 'Users, Locations & Suppliers', ar: 'المستخدمون والمواقع والموردون', screenIds: ['MGT-USR-01', 'MGT-LOC-01', 'MGT-SUP-01'], file: 'KIS Users, Locations & Suppliers.dc.html', component: lazy(() => import('./master-data/index')) },
  // ── Accounting & Finance ──
  { id: 'accounting', kind: 'mgmt', en: 'Accounting', ar: 'المحاسبة', screenIds: ['ACC-CLS-02', 'ACC-FX-01', 'ACC-SAL-01', 'ACC-AP-01', 'ACC-EXP-01'], file: 'KIS Accounting.dc.html', component: lazy(() => import('./accounting/index')) },
  { id: 'ledger', kind: 'mgmt', en: 'General ledger', ar: 'دفتر الأستاذ', screenIds: ['ACC-GL-01'], file: 'KIS General Ledger.dc.html', component: lazy(() => import('./ledger/index')) },
  { id: 'pnl', kind: 'mgmt', en: 'Operational P&L', ar: 'الأرباح والخسائر التشغيلية', screenIds: ['MGT-PNL-01', 'MGT-PNL-02'], file: 'KIS P&L.dc.html', component: lazy(() => import('./pnl/index')) },
  { id: 'financial-pnl', kind: 'mgmt', en: 'Financial P&L (owner)', ar: 'الأرباح والخسائر المالية (المالك)', screenIds: ['MGT-PNL-03', 'PNL-ACC-01'], file: 'KIS Financial P&L (owner).dc.html', component: lazy(() => import('./financial-pnl/index')) },
  { id: 'reports', kind: 'mgmt', en: 'Alerts & Reports', ar: 'التنبيهات والتقارير', screenIds: ['MGT-RPT-01', 'MGT-RPT-02', 'MGT-RPT-03', 'MGT-RPT-04', 'MGT-RPT-05'], file: 'KIS Reports & Alerts.dc.html', component: lazy(() => import('./reports/index')) },
  { id: 'health', kind: 'mgmt', en: 'Kitchen Health', ar: 'صحة المطبخ', screenIds: ['MGT-DSH-01', 'OWN-RPT-01', 'MGT-PRV-01', 'MGT-CMP-01'], file: 'KIS Health, Owner Report & Compliance.dc.html', component: lazy(() => import('./health/index')) },
  // ── Staff tablet ──
  { id: 'staff-tablet', kind: 'staff', en: 'Counts & transfers', ar: 'الجرد والتحويلات', screenIds: ['STF-INV-04', 'STF-TRF-01', 'STF-TRF-02', 'STF-TRF-03'], file: 'KIS Staff Tablet.dc.html', component: lazy(() => import('./staff-tablet/index')) },
  { id: 'staff-receiving', kind: 'staff', en: 'Receiving', ar: 'الاستلام', screenIds: ['STF-RCV-01'], file: 'KIS Receiving Entry (staff).dc.html', component: lazy(() => import('./staff-receiving/index')) },
  { id: 'staff-production', kind: 'staff', en: 'Production', ar: 'الإنتاج', screenIds: ['STF-PRD-00', 'STF-PRD-02', 'STF-PRD-03', 'STF-PRD-04'], file: 'KIS Production Tablet v2 (staff).dc.html', component: lazy(() => import('./staff-production/index')) },
  { id: 'staff-batch', kind: 'staff', en: 'Production batch (classic)', ar: 'دفعة إنتاج (كلاسيكي)', screenIds: ['STF-PRD-02', 'STF-PRD-03', 'STF-PRD-04'], file: 'KIS Production Batch (staff).dc.html', component: lazy(() => import('./staff-batch/index')) },
  { id: 'staff-waste', kind: 'staff', en: 'Waste', ar: 'الهدر', screenIds: ['STF-WST-01'], file: 'KIS Waste (staff).dc.html', component: lazy(() => import('./staff-waste/index')) },
];

export const MODULE_MAP: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.id, m]));
