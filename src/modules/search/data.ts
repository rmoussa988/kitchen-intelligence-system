import type { Kind } from './text';

/** Route target of a hop / result: [moduleId, params] or null (toast). */
export type Route = [string, Record<string, string>] | null;

export const TRACE_ID = 'SHW-20260808-001';

/** Prototype demo results that are not derivable from the store (kept as extra entries). */
export interface DemoResult { kind: Kind; title: [string, string]; sub: [string, string]; ref: string; route: Route }
export const DEMO_RESULTS: DemoResult[] = [
  { kind: 'batch', title: ['Batch SHW-20260808-001 — Marinated taouk skewer', 'دفعة SHW-20260808-001 — سيخ طاووق متبّل'], sub: ['Main Kitchen · 08 Aug · yield 80.7%', 'المطبخ الرئيسي · ٨ آب · إنتاجية ٨٠٫٧٪'], ref: 'SHW-20260808-001', route: ['production', { batch: 'SHW-20260808-001' }] },
  { kind: 'item', title: ['Marinated taouk skewer', 'سيخ طاووق متبّل'], sub: ['PR-002 · Prepared · $1.15 / PCS', 'PR-002 · مُحضّر · ١٫١٥$ / قطعة'], ref: 'PR-002', route: ['items', { item: 'PR-002' }] },
  { kind: 'trf', title: ['Transfer TRF-1039 — MK → Rock', 'تحويل TRF-1039 — المطبخ ← روك'], sub: ['110 skewers confirmed · 12 Aug', '١١٠ أسياخ مؤكدة · ١٢ آب'], ref: 'TRF-1039', route: ['transfers', { id: 'TRF-1039' }] },
  { kind: 'recipe', title: ['Taouk sandwich', 'ساندويش طاووق'], sub: ['MI-101 v3 · food cost 25.5%', 'MI-101 v3 · كلفة ٢٥٫٥٪'], ref: 'MI-101', route: ['recipes', { recipe: 'MI-101' }] },
  { kind: 'waste', title: ['Waste WST-119 — 4 skewers, end-of-night', 'هدر WST-119 — ٤ أسياخ نهاية الليل'], sub: ['Rock · 11 Aug · $4.60', 'روك · ١١ آب · ٤٫٦٠$'], ref: 'WST-119', route: ['waste', { id: 'WST-119' }] },
];

export const QUICK_CHIPS = ['SHW-20260808-001', 'TRF-1039', 'Dairy Khoury', 'WST-119'];

/** Full trace of batch SHW-20260808-001 — each hop links to the owning module. */
export interface TraceHop { stage: [string, string]; key: string; glyph: string; when: string; ref: string; title: [string, string]; detail: string; route: Route }
export const TRACE: TraceHop[] = [
  { stage: ['SUPPLIER', 'المورد'], key: 'SUPPLIER', glyph: '🚚', when: '08 Aug 09:15', ref: 'SUP-02',
    title: ['Hawa Chicken — 6 BOX chicken breast', 'هوا تشيكن — ٦ صناديق صدر دجاج'], detail: 'INV-2201 · $47.50/BOX · avg $4.78 → $4.75/KG', route: ['master-data', { tab: 'suppliers', id: 'SUP-02' }] },
  { stage: ['RECEIVING', 'الاستلام'], key: 'RECEIVING', glyph: '📥', when: '08 Aug 09:24', ref: 'INV-2201',
    title: ['Received at Main Kitchen — Ziad', 'استُلم في المطبخ الرئيسي — زياد'], detail: '6 BOX = 60 KG · batch HW-0808 · exp 11 Aug', route: ['receiving', { id: 'DLV-0417' }] },
  { stage: ['MARINATION', 'التتبيل'], key: 'MARINATION', glyph: '🥣', when: '08 Aug 11:30', ref: 'SR-007',
    title: ['Taouk marinade batch — 11.2 KG used', 'دفعة تتبيلة الطاووق — استُخدم ١١٫٢ كغ'], detail: 'Marinade v1 · $2.10/KG built-up', route: ['items', { item: 'SR-007' }] },
  { stage: ['PRODUCTION', 'الإنتاج'], key: 'PRODUCTION', glyph: '⚙️', when: '08 Aug 14:05', ref: 'SHW-20260808-001',
    title: ['Batch SHW-20260808-001 — 138 skewers', 'الدفعة SHW-20260808-001 — ١٣٨ سيخاً'], detail: '27.5 KG raw → yield 80.7% · $1.14/PCS · approved by Karim', route: ['production', { batch: 'SHW-20260808-001' }] },
  { stage: ['TRANSFER', 'التحويل'], key: 'TRANSFER', glyph: '🔁', when: '08 Aug 17:20', ref: 'TRF-1031',
    title: ['MK → Rock — 100 sent, 100 confirmed', 'المطبخ ← روك — أُرسل ١٠٠ وتأكد ١٠٠'], detail: 'value moved $114.00 at cost', route: ['transfers', { id: 'TRF-1031' }] },
  { stage: ['DESTINATION', 'الوجهة'], key: 'DESTINATION', glyph: '🏪', when: '08 Aug 17:41', ref: 'MGT-INV-02',
    title: ['Entered Rock stock — confirmed by Maya', 'دخل مخزون روك — أكدته مايا'], detail: 'on-hand 42 → 142 PCS', route: ['inventory', { item: 'PR-002', loc: 'rock' }] },
  { stage: ['SALE', 'البيع'], key: 'SALE', glyph: '🧾', when: '08–09 Aug', ref: 'POS 09 Aug',
    title: ['Consumed by 96 sandwiches + 14 platters', 'استهلكته ٩٦ ساندويشاً و١٤ صحناً'], detail: 'theoretical 124 PCS · actual 126 PCS · variance −2', route: null },
  { stage: ['WASTE', 'الهدر'], key: 'WASTE', glyph: '🗑', when: '09 Aug 21:50', ref: 'WST-104',
    title: ['2 skewers discarded end-of-night', 'أُتلف سيخان نهاية الليل'], detail: '−$2.28 at cost · auto-approved', route: ['waste', { id: 'WST-104' }] },
];

export const STAGE_COLORS: Record<string, string> = { SUPPLIER: '#6E6A5E', RECEIVING: '#37536B', MARINATION: '#5B5378', PRODUCTION: '#5B5378', TRANSFER: '#33625C', DESTINATION: '#48603A', SALE: '#7A5A32', WASTE: '#96382E' };

/** Scan demos (STF-QR-01) — a tap "scans" the code, the action line routes to the owning screen. */
export interface ScanDemo { code: string; hintEn: string; hintAr: string; title: [string, string]; facts: [string, string][]; action: [string, string]; route: Route }
export const SCANS: ScanDemo[] = [
  { code: 'SHW-20260813-001', hintEn: 'Batch label', hintAr: 'ملصق دفعة',
    title: ['Batch — Marinated taouk skewer', 'دفعة — سيخ طاووق متبّل'],
    facts: [['Qty', '148 PCS'], ['Date', '13 Aug 2026'], ['Yield', '80.7% / 81%'], ['Expiry', '15 Aug'], ['Destination', 'Rock']],
    action: ['→ Opens batch detail (STF-PRD-04)', '← يفتح تفاصيل الدفعة (STF-PRD-04)'], route: ['staff-production', { plan: 'PLN-0812-01' }] },
  { code: 'QR-RM-014', hintEn: 'Item label — Sunflower oil', hintAr: 'ملصق صنف — زيت',
    title: ['Item — Sunflower oil', 'صنف — زيت دوّار الشمس'],
    facts: [['On-hand', '38 L = 2.4 CAN'], ['Avg cost', '$3.125 / L'], ['Count unit', 'CAN']],
    action: ['→ Opens count entry for this item (STF-INV-04)', '← يفتح جرد هذا الصنف (STF-INV-04)'], route: ['staff-tablet', { screen: 'count', item: 'RM-014' }] },
  { code: 'LOC-MK-COLD', hintEn: 'Storage area — Cold room', hintAr: 'منطقة تخزين — غرفة التبريد',
    title: ['Storage — Cold room · Main Kitchen', 'تخزين — غرفة التبريد · المطبخ الرئيسي'],
    facts: [['Items stored', '14'], ['Next count', 'Daily 08:00'], ['Temp log', '4.2°C ✓']],
    action: ['→ Opens area count list (STF-INV-04)', '← يفتح قائمة جرد المنطقة (STF-INV-04)'], route: ['staff-tablet', { screen: 'count', view: 'list' }] },
  { code: 'TRF-1041', hintEn: 'Transfer document', hintAr: 'مستند تحويل',
    title: ['Transfer — MK → Rock, pending', 'تحويل — المطبخ ← روك، معلق'],
    facts: [['Lines', '3'], ['Sent', '12 Aug 09:40'], ['Value', '$207.75']],
    action: ['→ Opens confirm receipt (STF-TRF-03)', '← يفتح تأكيد الاستلام (STF-TRF-03)'], route: ['staff-tablet', { screen: 'rd', id: 'TRF-1039' }] },
];

/** Generate & assign codes table. `genCode` = code produced when Generate is tapped. */
export interface AssignRow { name: [string, string]; sub: string; kind: Kind; code: string; assigned: boolean; genCode?: string }
export const ASSIGN: AssignRow[] = [
  { name: ['Sunflower oil', 'زيت دوّار الشمس'], sub: 'RM-014', kind: 'item', code: 'QR-RM-014', assigned: true },
  { name: ['Chicken breast', 'صدر دجاج'], sub: 'RM-001', kind: 'item', code: 'QR-RM-001', assigned: true },
  { name: ['Cold room · MK', 'غرفة التبريد · المطبخ'], sub: 'Main Kitchen', kind: 'storage', code: 'LOC-MK-COLD', assigned: true },
  { name: ['Store room · MK', 'غرفة المخزن · المطبخ'], sub: 'Main Kitchen', kind: 'storage', code: 'LOC-MK-STORE', assigned: true },
  { name: ['Batch SHW-20260813-001', 'دفعة SHW-20260813-001'], sub: '13 Aug', kind: 'batch', code: 'SHW-20260813-001', assigned: true },
  { name: ['Pickles (mixed)', 'كبيس مشكّل'], sub: 'RM-050', kind: 'item', code: '—', assigned: false, genCode: 'QR-RM-050' },
  { name: ['Grill station 2', 'محطة الشوي ٢'], sub: 'Rock', kind: 'equip', code: '—', assigned: false, genCode: 'EQP-RK-GRILL2' },
];

/** Persisted module state: generated codes by assign-row index. */
export interface SearchState { generated: Record<string, string> }
export const SEARCH_SEED: SearchState = { generated: {} };
