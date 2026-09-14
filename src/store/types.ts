/**
 * Shared entity types for the KIS store.
 * Modules that need more fields keep them in their own module-local state (see useModuleState)
 * or attach them under `meta` — do NOT change these shapes without updating docs/CONVENTIONS.md.
 */

export type LocId = 'mk' | 'rock' | 'kad';
export type Scope = 'all' | LocId;
export type ItemType = 'raw' | 'sub' | 'prep' | 'menu' | 'pack';

export interface Location {
  id: LocId;
  en: string;
  ar: string;
  type: 'production' | 'restaurant' | 'juice';
  sells: boolean; // MK has no direct sales
  responsibilities: string[];
  storageAreas: string[];
  active: boolean;
}

export interface Item {
  id: string; // RM-014, SR-003, PR-002, MI-101, PK-201
  en: string;
  ar: string;
  type: ItemType;
  cat: string;
  catAr?: string;
  base: string; // base inventory unit
  purch: string; // purchasing unit ('—' for recipe outputs)
  cost: number; // moving-avg cost per base unit (USD)
  price?: number; // selling price (menu items)
  supplier?: string; // supplier id or name
  stocked: boolean;
  isRecipe?: boolean;
  pos?: boolean;
  incomplete?: boolean; // missing base unit / conversion path
  shelf?: string;
  min?: number;
  max?: number;
  onHand: Partial<Record<LocId, number>>; // in base unit
  purchFactor?: number; // 1 purch unit = purchFactor base units
  meta?: Record<string, unknown>;
}

export interface Supplier {
  id: string;
  name: string;
  nameAr?: string;
  contact: string;
  phone?: string;
  terms: string; // e.g. 'Net 15'
  products: string[]; // item ids
  spendMonth?: number;
  alert?: boolean; // price alert dot
  active: boolean;
  meta?: Record<string, unknown>;
}

export type Role = 'superuser' | 'owner' | 'manager' | 'storekeeper' | 'prep' | 'production' | 'service' | 'accountant' | 'invoice' | 'cost';

export interface User {
  id: string;
  name: string;
  nameAr: string;
  ini: string;
  role: Role;
  scope: Scope | LocId[];
  credential: 'pin' | 'password';
  active: boolean;
  lastSeen?: string;
}

export type MovementType =
  | 'receiving' | 'production_in' | 'production_out' | 'transfer_in' | 'transfer_out'
  | 'waste' | 'adjustment' | 'sale' | 'count';

export interface Movement {
  id: string;
  ts: string; // ISO
  itemId: string;
  loc: LocId;
  type: MovementType;
  qty: number; // signed, in BASE unit
  enteredQty?: number; // Rule-7: original entered quantity
  enteredUnit?: string; // Rule-7: original entered unit
  value: number; // signed $ impact at cost
  source: string; // human ref e.g. INV-2211 / SHW-20260808-001 / TRF-1039
  sourceKind?: 'delivery' | 'batch' | 'transfer' | 'waste' | 'count' | 'adjustment' | 'sale';
  beyondTolerance?: boolean;
  note?: string;
  user?: string;
}

export interface TransferLine {
  itemId: string;
  unit: string;
  cost: number; // per unit at time of send
  requested: number;
  sent?: number;
  confirmed?: number;
  flag?: 'short' | 'damaged' | null;
}

export type TransferStatus = 'requested' | 'sent' | 'confirmed' | 'flagged';

export interface Transfer {
  id: string; // REQ-1042 → TRF-1039
  from: LocId;
  to: LocId;
  status: TransferStatus;
  requestedAt: string;
  sentAt?: string;
  confirmedAt?: string;
  requestedBy?: string;
  sentBy?: string;
  confirmedBy?: string;
  lines: TransferLine[];
  note?: string;
}

export type WasteStatus = 'auto' | 'pending' | 'approved' | 'rejected';

export interface WasteRecord {
  id: string;
  ts: string;
  itemId: string;
  loc: LocId;
  qty: number; // entered
  unit: string; // entered unit
  baseQty: number; // Rule-7 base
  cost: number; // $ at cost
  reason: string; // reason key: expired | overproduction | burnt | prep | cooking | damaged | returned | quality | spillage | incorrect | customer | other
  employee: string;
  status: WasteStatus;
  photo?: boolean;
  photoUrl?: string; // uploaded waste photo (cloud storage)
  note?: string;
}

export type PlanStatus = 'not_started' | 'in_progress' | 'paused' | 'done';

export interface ProductionPlan {
  id: string;
  date: string; // YYYY-MM-DD
  loc: LocId;
  itemId: string; // output item
  plannedQty: number;
  unit: string;
  assignedTo?: string; // user id
  expectedDemand?: number;
  openingStock?: number;
  status: PlanStatus;
  published: boolean;
  batchId?: string;
  progress?: number; // 0..1
  gapOpen?: boolean;
}

export type BatchStatus = 'started' | 'marinating' | 'stages' | 'output' | 'complete' | 'approved';

export interface BatchStage {
  key: string; // raw | marinated | prepared | cooked | cut | assembled
  en: string;
  ar: string;
  standardYield?: number; // fraction vs previous
  weight?: number; // entered kg
  waste?: number; // kg
}

export interface Batch {
  id: string; // SHW-20260812-001
  planId?: string;
  itemId: string;
  loc: LocId;
  employee: string;
  startedAt: string;
  completedAt?: string;
  status: BatchStatus;
  plannedQty: number;
  unit: string;
  // revised D2 fields
  inputMode?: 'commit' | 'draw';
  rawItemId?: string;
  rawDrawn?: number; // kg
  rawReturned?: number; // kg
  rawUsed?: number; // kg (derived or committed)
  trimWaste?: number; // kg
  marinadeRecommended?: number; // kg
  marinadeUsed?: number; // kg
  stages?: BatchStage[];
  outputQty?: number; // count (skewers) or kg
  standardPerUnit?: number; // kg net per output unit (0.1)
  gapKg?: number;
  gapPct?: number;
  gapUsd?: number;
  gapStatus?: 'open' | 'accepted' | 'flagged';
  cost?: number; // built-up batch cost
  yieldPct?: number;
}

export interface DeliveryLine {
  itemId: string;
  ordered?: number;
  received: number;
  unit: string; // entered unit
  baseQty: number;
  unitPrice: number; // per entered unit
  lastPrice?: number;
  variancePct?: number;
  expiry?: string;
  batch?: string;
  temp?: string;
  quality?: 'ok' | 'issue';
  rejected?: number;
  oldAvg?: number;
  newAvg?: number;
}

export type DeliveryStatus = 'draft' | 'received' | 'approved' | 'invoiced' | 'adjusted';

export interface Delivery {
  id: string; // DLV-0421
  ts: string;
  supplierId: string;
  invoiceNo: string;
  loc: LocId;
  lines: DeliveryLine[];
  total: number;
  receivedBy: string;
  status: DeliveryStatus;
  worstVariancePct?: number;
  poId?: string;
  scanUrl?: string; // uploaded delivery/invoice scan (cloud storage)
}

export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'closed' | 'cancelled';

export interface PurchaseOrder {
  id: string; // PO-2026-118
  ts: string;
  supplierId: string;
  loc: LocId;
  status: POStatus;
  lines: { itemId: string; qty: number; unit: string; price: number; received?: number }[];
  total: number;
  expected?: string;
  createdBy?: string;
  note?: string;
}

/** Three-role supplier invoice pipeline: receiver → invoice employee → accountant */
export type InvoiceStage = 'received' | 'entered' | 'review' | 'approved' | 'disputed' | 'paid';

export interface SupplierInvoice {
  id: string; // SI-3021
  supplierId: string;
  invoiceNo: string;
  date: string;
  due?: string;
  amount: number;
  currency: 'USD' | 'LBP';
  stage: InvoiceStage;
  deliveryId?: string;
  poId?: string;
  loc: LocId;
  enteredBy?: string;
  reviewedBy?: string;
  matchIssues?: string[];
  paidAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'whish';
  scanUrl?: string; // uploaded invoice scan (cloud storage)
  note?: string;
}

export type ExpenseCategory = 'rent' | 'gas' | 'electricity' | 'maintenance' | 'uniforms' | 'marketing' | 'salaries' | 'tax' | 'other';

export interface Expense {
  id: string;
  date: string; // pay date
  accrualMonth: string; // YYYY-MM
  category: ExpenseCategory;
  amount: number;
  currency: 'USD' | 'LBP';
  method: 'cash' | 'card' | 'whish';
  allocation: LocId | 'split';
  vendor?: string;
  note?: string;
  receipt?: boolean;
  recurring?: boolean;
}

export interface ShiftClosing {
  id: string;
  loc: LocId;
  date: string;
  shift: string;
  expected: number; // POS expected USD
  declared: { cashUsd: number; cashLbp: number; whish: number; card: number; expenses: number };
  confirmed?: { cashUsd: number; cashLbp: number; whish: number; card: number };
  rate: number; // day rate locked
  status: 'in_transit' | 'confirmed' | 'gap';
  overShort?: number;
  submittedBy?: string;
}

export interface FxRate { date: string; rate: number; setBy: string; closings: number }

export type AlertSeverity = 'red' | 'amber' | 'info';

export interface Alert {
  id: string;
  ts: string;
  severity: AlertSeverity;
  type: string; // recipe_cost | price_up | yield_low | food_cost | inv_variance | waste_target | missing_count | transfer_unreceived | corrective_overdue | production_gap | invoice_mismatch | cash_gap
  en: string;
  ar: string;
  loc?: LocId;
  moduleId?: string; // deep-link target module
  dismissed?: boolean;
  assignedTo?: string;
}

export interface AuditEntry {
  id: string;
  ts: string;
  user: string;
  action: string;
  entity: string; // e.g. 'item RM-014 · conversion'
  oldValue?: string;
  newValue?: string;
  moduleId?: string;
}

export interface Settings {
  fxRate: number; // USD→LBP today
  varianceTolerancePct: number;
  wasteAutoApproveUsd: number;
  ppvAmberPct: number;
  ppvRedPct: number;
  productionGapAlertPct: number;
  cashTolerance: number; // $ over/short flag
  currentUser: string; // user id
  staffUser: string; // user id for tablet
  period: string; // 'YYYY-MM' fixed demo period
}

export interface CoreState {
  version: number;
  scope: Scope; // global location selector
  settings: Settings;
  locations: Location[];
  items: Item[];
  suppliers: Supplier[];
  users: User[];
  movements: Movement[];
  transfers: Transfer[];
  waste: WasteRecord[];
  plans: ProductionPlan[];
  batches: Batch[];
  deliveries: Delivery[];
  purchaseOrders: PurchaseOrder[];
  invoices: SupplierInvoice[];
  expenses: Expense[];
  closings: ShiftClosing[];
  fxHistory: FxRate[];
  alerts: Alert[];
  audit: AuditEntry[];
  /** Module-private persisted state, keyed by module id. */
  modules: Record<string, unknown>;
  /** Monotonic counter for generated ids. */
  seq: number;
}
