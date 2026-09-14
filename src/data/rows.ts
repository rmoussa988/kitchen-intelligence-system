/**
 * rows.ts — the shared row contract for the KIS Supabase (Postgres) backend.
 *
 * This file is the single source of truth for the shape of every table row as it crosses
 * the wire between the app and Postgres, and for how each `CoreState` field (see
 * `../store/types.ts`) maps onto those rows. Both the hydrate (cloud → CoreState) and
 * persist (CoreState → cloud) sides import from here so their reshapes stay in lockstep.
 *
 * Conventions (kept EXACTLY consistent with supabase/migrations/0001_core_schema.sql):
 *   • Field names are the snake_case DB columns, not the camelCase CoreState fields.
 *   • Nullability follows the SQL column, NOT the in-memory entity type. Several columns are
 *     nullable in Postgres even though the matching CoreState field is required (noted inline,
 *     e.g. deliveries.received_by, supplier_invoices.date, fx_rates.set_by,
 *     settings.current_user_id / staff_user_id). Rows read back can therefore hold `null`
 *     there; the hydrate layer supplies fallbacks when building CoreState.
 *   • `numeric` columns are `number`; `timestamptz` / `date` come back as ISO strings.
 *   • `jsonb` columns are typed to the matching value object from types.ts.
 *
 * Types + constants only — no runtime logic lives here.
 */

import type {
  Alert,
  AlertSeverity,
  AuditEntry,
  Batch,
  BatchStage,
  BatchStatus,
  CoreState,
  DeliveryLine,
  DeliveryStatus,
  Expense,
  ExpenseCategory,
  InvoiceStage,
  ItemType,
  LocId,
  Location,
  Movement,
  MovementType,
  PlanStatus,
  POStatus,
  Role,
  Scope,
  ShiftClosing,
  SupplierInvoice,
  TransferLine,
  TransferStatus,
  User,
  WasteStatus,
} from '../store/types';

// ───────────────────────── column-level enum aliases ─────────────────────────
// Derived from the CoreState entity fields so the row types can never drift from the
// app model. Each mirrors a Postgres enum declared in 0001.

/** Postgres enum `credential_type` — mirrors User.credential. */
export type CredentialType = User['credential'];
/** Postgres enum `source_kind` — mirrors Movement.sourceKind (non-null variants). */
export type SourceKind = NonNullable<Movement['sourceKind']>;
/** Postgres enum `line_flag` — mirrors TransferLine.flag (non-null variants). */
export type LineFlag = NonNullable<TransferLine['flag']>;
/** Postgres enum `gap_status` — mirrors Batch.gapStatus (non-null variants). */
export type GapStatus = NonNullable<Batch['gapStatus']>;
/** Batch input mode — mirrors Batch.inputMode (stored as a plain text column). */
export type BatchInputMode = NonNullable<Batch['inputMode']>;
/** Postgres enum `quality_flag` — mirrors DeliveryLine.quality (non-null variants). */
export type QualityFlag = NonNullable<DeliveryLine['quality']>;
/** Postgres enum `currency_code` — 'USD' | 'LBP'. */
export type CurrencyCode = Expense['currency'];
/** Postgres enum `pay_method` — 'cash' | 'card' | 'whish'. */
export type PayMethod = Expense['method'];
/** Postgres enum `closing_status` — mirrors ShiftClosing.status. */
export type ClosingStatus = ShiftClosing['status'];

// ─────────────────────────────── master data ─────────────────────────────────

/** `locations` — maps 1:1 to CoreState.locations (Location[]). */
export interface LocationRow {
  id: LocId;
  en: string;
  ar: string;
  type: Location['type']; // 'production' | 'restaurant' | 'juice'
  sells: boolean;
  responsibilities: string[];
  storage_areas: string[]; // ← Location.storageAreas
  active: boolean;
  updated_at: string;
}

/**
 * `profiles` — the domain user / login accounts. Maps to CoreState.users (User[]).
 * `auth_uid` links to auth.users (wired in 0002); it has no CoreState counterpart.
 */
export interface ProfileRow {
  id: string;
  auth_uid: string | null;
  name: string;
  name_ar: string; // ← User.nameAr
  ini: string;
  role: Role;
  scope: Scope | LocId[]; // jsonb: 'all' | loc_id | loc_id[]
  credential: CredentialType;
  active: boolean;
  last_seen: string | null; // ← User.lastSeen
  updated_at: string;
}

/** `suppliers` — maps 1:1 to CoreState.suppliers (Supplier[]). */
export interface SupplierRow {
  id: string;
  name: string;
  name_ar: string | null; // ← Supplier.nameAr
  contact: string;
  phone: string | null;
  terms: string;
  products: string[]; // item ids
  spend_month: number | null; // ← Supplier.spendMonth
  alert: boolean;
  active: boolean;
  meta: Record<string, unknown> | null;
  updated_at: string;
}

/**
 * `items` — the item master. Maps to CoreState.items (Item[]) MINUS the per-location
 * on-hand map: Item.onHand is stored separately as `stock` rows (see StockRow).
 * Renames: is_recipe←isRecipe, cat_ar←catAr, min_qty←min, max_qty←max, purch_factor←purchFactor.
 */
export interface ItemRow {
  id: string;
  en: string;
  ar: string;
  type: ItemType;
  cat: string;
  cat_ar: string | null;
  base: string;
  purch: string;
  cost: number;
  price: number | null;
  supplier: string | null;
  stocked: boolean;
  is_recipe: boolean;
  pos: boolean;
  incomplete: boolean;
  shelf: string | null;
  min_qty: number | null;
  max_qty: number | null;
  purch_factor: number | null;
  meta: Record<string, unknown> | null;
  updated_at: string;
}

/**
 * `stock` — per-location on-hand, one row per item × location. Reshape of Item.onHand
 * (`Partial<Record<LocId, number>>`): each present LocId key becomes a row {item_id, loc, qty}.
 */
export interface StockRow {
  item_id: string;
  loc: LocId;
  qty: number; // in base unit
}

// ────────────────────────────── perpetual ledger ─────────────────────────────

/**
 * `movements` — maps 1:1 to CoreState.movements (Movement[]).
 * Renames: item_id←itemId, entered_qty←enteredQty, entered_unit←enteredUnit,
 * source_kind←sourceKind, beyond_tolerance←beyondTolerance, user_id←user.
 */
export interface MovementRow {
  id: string;
  ts: string;
  item_id: string;
  loc: LocId;
  type: MovementType;
  qty: number; // signed, base unit
  entered_qty: number | null;
  entered_unit: string | null;
  value: number; // signed $ at cost
  source: string;
  source_kind: SourceKind | null;
  beyond_tolerance: boolean;
  note: string | null;
  user_id: string | null;
}

// ─────────────────────────────── transfers ───────────────────────────────────

/**
 * `transfers` — header for CoreState.transfers (Transfer[]). Transfer.lines is split into
 * the `transfer_lines` child table (TransferLineRow). Renames: from_loc←from, to_loc←to,
 * requested_at←requestedAt, sent_at←sentAt, confirmed_at←confirmedAt,
 * requested_by←requestedBy, sent_by←sentBy, confirmed_by←confirmedBy.
 */
export interface TransferRow {
  id: string;
  from_loc: LocId;
  to_loc: LocId;
  status: TransferStatus;
  requested_at: string;
  sent_at: string | null;
  confirmed_at: string | null;
  requested_by: string | null;
  sent_by: string | null;
  confirmed_by: string | null;
  note: string | null;
  updated_at: string;
}

/** `transfer_lines` — child of transfers; one row per Transfer.lines[] entry (TransferLine). */
export interface TransferLineRow {
  transfer_id: string;
  line_no: number; // array index, 0-based order preserved
  item_id: string; // ← TransferLine.itemId
  unit: string;
  cost: number;
  requested: number;
  sent: number | null;
  confirmed: number | null;
  flag: LineFlag | null;
}

// ─────────────────────────────────── waste ───────────────────────────────────

/**
 * `waste` — maps 1:1 to CoreState.waste (WasteRecord[]).
 * Renames: item_id←itemId, base_qty←baseQty.
 */
export interface WasteRow {
  id: string;
  ts: string;
  item_id: string;
  loc: LocId;
  qty: number; // entered
  unit: string;
  base_qty: number; // Rule-7 base
  cost: number;
  reason: string;
  employee: string | null;
  status: WasteStatus;
  photo: boolean;
  photo_url: string | null;
  note: string | null;
  updated_at: string;
}

// ───────────────────────────────── production ────────────────────────────────

/**
 * `production_plans` — maps 1:1 to CoreState.plans (ProductionPlan[]).
 * Renames: item_id←itemId, planned_qty←plannedQty, assigned_to←assignedTo,
 * expected_demand←expectedDemand, opening_stock←openingStock, batch_id←batchId, gap_open←gapOpen.
 */
export interface ProductionPlanRow {
  id: string;
  date: string; // YYYY-MM-DD
  loc: LocId;
  item_id: string;
  planned_qty: number;
  unit: string;
  assigned_to: string | null;
  expected_demand: number | null;
  opening_stock: number | null;
  status: PlanStatus;
  published: boolean;
  batch_id: string | null;
  progress: number | null; // 0..1
  gap_open: boolean;
  updated_at: string;
}

/**
 * `batches` — maps 1:1 to CoreState.batches (Batch[]). Batch.stages (BatchStage[]) is stored
 * as jsonb. Renames: plan_id←planId, item_id←itemId, started_at←startedAt,
 * completed_at←completedAt, planned_qty←plannedQty, input_mode←inputMode, raw_item_id←rawItemId,
 * raw_drawn←rawDrawn, raw_returned←rawReturned, raw_used←rawUsed, trim_waste←trimWaste,
 * marinade_recommended←marinadeRecommended, marinade_used←marinadeUsed, output_qty←outputQty,
 * standard_per_unit←standardPerUnit, gap_kg←gapKg, gap_pct←gapPct, gap_usd←gapUsd,
 * gap_status←gapStatus, yield_pct←yieldPct.
 */
export interface BatchRow {
  id: string;
  plan_id: string | null;
  item_id: string;
  loc: LocId;
  employee: string | null;
  started_at: string;
  completed_at: string | null;
  status: BatchStatus;
  planned_qty: number;
  unit: string;
  input_mode: BatchInputMode | null;
  raw_item_id: string | null;
  raw_drawn: number | null;
  raw_returned: number | null;
  raw_used: number | null;
  trim_waste: number | null;
  marinade_recommended: number | null;
  marinade_used: number | null;
  stages: BatchStage[] | null; // jsonb value object
  output_qty: number | null;
  standard_per_unit: number | null;
  gap_kg: number | null;
  gap_pct: number | null;
  gap_usd: number | null;
  gap_status: GapStatus | null;
  cost: number | null;
  yield_pct: number | null;
  updated_at: string;
}

// ─────────────────────── purchasing & receiving ──────────────────────────────

/**
 * `purchase_orders` — header for CoreState.purchaseOrders (PurchaseOrder[]). The inline
 * PurchaseOrder.lines array is split into the `po_lines` child table (PoLineRow).
 * Renames: supplier_id←supplierId, created_by←createdBy.
 */
export interface PoRow {
  id: string;
  ts: string;
  supplier_id: string;
  loc: LocId;
  status: POStatus;
  total: number;
  expected: string | null; // date
  created_by: string | null;
  note: string | null;
  updated_at: string;
}

/**
 * `po_lines` — child of purchase_orders; one row per PurchaseOrder.lines[] entry
 * ({ itemId, qty, unit, price, received? }). Renames: item_id←itemId.
 */
export interface PoLineRow {
  po_id: string;
  line_no: number; // array index, 0-based order preserved
  item_id: string;
  qty: number;
  unit: string;
  price: number;
  received: number | null;
}

/**
 * `deliveries` — header for CoreState.deliveries (Delivery[]). Delivery.lines is split into
 * the `delivery_lines` child table (DeliveryLineRow). Renames: supplier_id←supplierId,
 * invoice_no←invoiceNo, received_by←receivedBy, worst_variance_pct←worstVariancePct, po_id←poId.
 * Note: received_by is nullable in SQL though Delivery.receivedBy is a required string.
 */
export interface DeliveryRow {
  id: string;
  ts: string;
  supplier_id: string;
  invoice_no: string;
  loc: LocId;
  total: number;
  received_by: string | null;
  status: DeliveryStatus;
  worst_variance_pct: number | null;
  po_id: string | null;
  scan_url: string | null;
  updated_at: string;
}

/**
 * `delivery_lines` — child of deliveries; one row per Delivery.lines[] entry (DeliveryLine).
 * Renames: item_id←itemId, base_qty←baseQty, unit_price←unitPrice, last_price←lastPrice,
 * variance_pct←variancePct, old_avg←oldAvg, new_avg←newAvg.
 */
export interface DeliveryLineRow {
  delivery_id: string;
  line_no: number; // array index, 0-based order preserved
  item_id: string;
  ordered: number | null;
  received: number;
  unit: string;
  base_qty: number;
  unit_price: number;
  last_price: number | null;
  variance_pct: number | null;
  expiry: string | null; // date
  batch: string | null;
  temp: string | null;
  quality: QualityFlag | null;
  rejected: number | null;
  old_avg: number | null;
  new_avg: number | null;
}

/**
 * `supplier_invoices` — maps 1:1 to CoreState.invoices (SupplierInvoice[]). match_issues
 * (string[]) is stored as jsonb. Renames: supplier_id←supplierId, invoice_no←invoiceNo,
 * delivery_id←deliveryId, po_id←poId, entered_by←enteredBy, reviewed_by←reviewedBy,
 * match_issues←matchIssues, paid_amount←paidAmount, payment_method←paymentMethod.
 * Note: date is nullable in SQL though SupplierInvoice.date is a required string.
 */
export interface SupplierInvoiceRow {
  id: string;
  supplier_id: string;
  invoice_no: string;
  date: string | null; // date
  due: string | null; // date
  amount: number;
  currency: CurrencyCode;
  stage: InvoiceStage;
  delivery_id: string | null;
  po_id: string | null;
  loc: LocId;
  entered_by: string | null;
  reviewed_by: string | null;
  match_issues: string[] | null; // jsonb
  paid_amount: number | null;
  payment_method: PayMethod | null;
  scan_url: string | null;
  note: string | null;
  updated_at: string;
}

// ──────────────────────── accounting & finance ───────────────────────────────

/**
 * `expenses` — maps 1:1 to CoreState.expenses (Expense[]). Renames: accrual_month←accrualMonth.
 * Note: receipt & recurring are NOT NULL (default false) in SQL though optional on Expense.
 */
export interface ExpenseRow {
  id: string;
  date: string; // pay date
  accrual_month: string; // 'YYYY-MM'
  category: ExpenseCategory;
  amount: number;
  currency: CurrencyCode;
  method: PayMethod;
  allocation: LocId | 'split';
  vendor: string | null;
  note: string | null;
  receipt: boolean;
  recurring: boolean;
  updated_at: string;
}

/**
 * `shift_closings` — maps 1:1 to CoreState.closings (ShiftClosing[]). The declared / confirmed
 * value objects are stored as jsonb. Renames: over_short←overShort, submitted_by←submittedBy.
 */
export interface ShiftClosingRow {
  id: string;
  loc: LocId;
  date: string;
  shift: string;
  expected: number; // POS expected USD
  declared: ShiftClosing['declared']; // jsonb {cashUsd,cashLbp,whish,card,expenses}
  confirmed: NonNullable<ShiftClosing['confirmed']> | null; // jsonb {cashUsd,cashLbp,whish,card}
  rate: number; // day rate locked
  status: ClosingStatus;
  over_short: number | null;
  submitted_by: string | null;
  updated_at: string;
}

/**
 * `fx_rates` — maps 1:1 to CoreState.fxHistory (FxRate[]). Renames: set_by←setBy.
 * Note: set_by is nullable in SQL though FxRate.setBy is a required string.
 */
export interface FxRateRow {
  date: string; // primary key
  rate: number;
  set_by: string | null;
  closings: number;
}

// ─────────────────────────── alerts & audit ──────────────────────────────────

/**
 * `alerts` — maps 1:1 to CoreState.alerts (Alert[]).
 * Renames: module_id←moduleId, assigned_to←assignedTo.
 */
export interface AlertRow {
  id: string;
  ts: string;
  severity: AlertSeverity;
  type: string;
  en: string;
  ar: string;
  loc: LocId | null;
  module_id: string | null;
  dismissed: boolean;
  assigned_to: string | null;
}

/**
 * `audit` — append-only; maps 1:1 to CoreState.audit (AuditEntry[]).
 * Renames: user_id←user, old_value←oldValue, new_value←newValue, module_id←moduleId.
 */
export interface AuditRow {
  id: string;
  ts: string;
  user_id: string | null;
  action: string;
  entity: string;
  old_value: string | null;
  new_value: string | null;
  module_id: string | null;
}

// ─────────────────── settings, module state, counters ────────────────────────

/**
 * `settings` — single row (id fixed to 1). Maps to CoreState.settings (Settings).
 * Renames: fx_rate←fxRate, variance_tolerance_pct←varianceTolerancePct,
 * waste_auto_approve_usd←wasteAutoApproveUsd, ppv_amber_pct←ppvAmberPct, ppv_red_pct←ppvRedPct,
 * production_gap_alert_pct←productionGapAlertPct, cash_tolerance←cashTolerance,
 * current_user_id←currentUser, staff_user_id←staffUser.
 * Note: current_user_id / staff_user_id are nullable in SQL though required on Settings.
 */
export interface SettingsRow {
  id: number; // always 1
  fx_rate: number;
  variance_tolerance_pct: number;
  waste_auto_approve_usd: number;
  ppv_amber_pct: number;
  ppv_red_pct: number;
  production_gap_alert_pct: number;
  cash_tolerance: number;
  current_user_id: string | null;
  staff_user_id: string | null;
  period: string; // 'YYYY-MM'
  updated_at: string;
}

/**
 * `module_state` — one row per module id. Maps to CoreState.modules
 * (`Record<string, unknown>`): each key becomes a row {module_id, data}.
 */
export interface ModuleStateRow {
  module_id: string;
  data: unknown; // jsonb; opaque module-private state
  updated_at: string;
}

/**
 * `counters` — monotonic id counters. CoreState.seq maps to the single row with
 * name = 'seq' (column `value`); next_id() (0003) increments it server-side.
 */
export interface CounterRow {
  name: string;
  value: number; // bigint; stays within JS safe-integer range
}

// ─────────────────────────────── table registry ──────────────────────────────

/** Every physical table in 0001, in dependency-friendly order. */
export const TABLES = [
  'locations',
  'profiles',
  'suppliers',
  'items',
  'stock',
  'movements',
  'transfers',
  'transfer_lines',
  'waste',
  'production_plans',
  'batches',
  'purchase_orders',
  'po_lines',
  'deliveries',
  'delivery_lines',
  'supplier_invoices',
  'expenses',
  'shift_closings',
  'fx_rates',
  'alerts',
  'audit',
  'settings',
  'module_state',
  'counters',
] as const;

/** Union of the physical table names. */
export type TableName = (typeof TABLES)[number];

/** Fixed primary-key value of the single-row `settings` table. */
export const SETTINGS_ROW_ID = 1 as const;

/** Name of the `counters` row that backs CoreState.seq / next_id(). */
export const SEQ_COUNTER = 'seq' as const;

/** Maps a physical table name to its row type. Reference for hydrate/persist generics. */
export interface RowByTable {
  locations: LocationRow;
  profiles: ProfileRow;
  suppliers: SupplierRow;
  items: ItemRow;
  stock: StockRow;
  movements: MovementRow;
  transfers: TransferRow;
  transfer_lines: TransferLineRow;
  waste: WasteRow;
  production_plans: ProductionPlanRow;
  batches: BatchRow;
  purchase_orders: PoRow;
  po_lines: PoLineRow;
  deliveries: DeliveryRow;
  delivery_lines: DeliveryLineRow;
  supplier_invoices: SupplierInvoiceRow;
  expenses: ExpenseRow;
  shift_closings: ShiftClosingRow;
  fx_rates: FxRateRow;
  alerts: AlertRow;
  audit: AuditRow;
  settings: SettingsRow;
  module_state: ModuleStateRow;
  counters: CounterRow;
}

// ───────────────────── CoreState ⇄ table mapping (documented) ─────────────────

/** One CoreState field's mapping onto physical tables. */
export interface CoreStateMapping {
  /** Table(s) that back this field. Empty = client-only, never persisted to cloud. */
  readonly tables: readonly TableName[];
  /** Row type name(s) involved, for cross-reference. */
  readonly rows: readonly string[];
  /** Reshape notes: renames, array→child-table splits, map→row splits, etc. */
  readonly note: string;
}

/**
 * Per-CoreState-field mapping. The authoritative description of how the in-memory
 * `CoreState` (types.ts) is decomposed into / reassembled from the tables above.
 * Keyed by every field of CoreState so completeness is compiler-checked.
 */
export const CORE_STATE_MAP: Record<keyof CoreState, CoreStateMapping> = {
  version: {
    tables: [],
    rows: [],
    note: 'Client-only STORE_VERSION guard; not persisted to the cloud backend.',
  },
  scope: {
    tables: [],
    rows: [],
    note: 'Client-only global location selector (UI state); not persisted.',
  },
  settings: {
    tables: ['settings'],
    rows: ['SettingsRow'],
    note: 'Single row (id=1). Renames current_user_id←currentUser, staff_user_id←staffUser, min/max/pct fields to snake_case (see SettingsRow).',
  },
  locations: {
    tables: ['locations'],
    rows: ['LocationRow'],
    note: '1:1. storage_areas←storageAreas.',
  },
  items: {
    tables: ['items', 'stock'],
    rows: ['ItemRow', 'StockRow'],
    note: 'Item core → items; Item.onHand (Partial<Record<LocId,number>>) → one stock row per present LocId. Renames is_recipe/cat_ar/min_qty/max_qty/purch_factor.',
  },
  suppliers: {
    tables: ['suppliers'],
    rows: ['SupplierRow'],
    note: '1:1. name_ar←nameAr, spend_month←spendMonth.',
  },
  users: {
    tables: ['profiles'],
    rows: ['ProfileRow'],
    note: 'CoreState.users → profiles. name_ar←nameAr, last_seen←lastSeen; profiles.auth_uid has no CoreState counterpart.',
  },
  movements: {
    tables: ['movements'],
    rows: ['MovementRow'],
    note: '1:1. item_id←itemId, entered_qty/entered_unit, source_kind, beyond_tolerance, user_id←user.',
  },
  transfers: {
    tables: ['transfers', 'transfer_lines'],
    rows: ['TransferRow', 'TransferLineRow'],
    note: 'Header → transfers; Transfer.lines[] → transfer_lines (line_no = array index). from_loc←from, to_loc←to.',
  },
  waste: {
    tables: ['waste'],
    rows: ['WasteRow'],
    note: '1:1. item_id←itemId, base_qty←baseQty.',
  },
  plans: {
    tables: ['production_plans'],
    rows: ['ProductionPlanRow'],
    note: 'CoreState.plans → production_plans. planned_qty/assigned_to/expected_demand/opening_stock/batch_id/gap_open renames.',
  },
  batches: {
    tables: ['batches'],
    rows: ['BatchRow'],
    note: '1:1. Batch.stages (BatchStage[]) stored as jsonb; many camelCase→snake_case renames (see BatchRow).',
  },
  deliveries: {
    tables: ['deliveries', 'delivery_lines'],
    rows: ['DeliveryRow', 'DeliveryLineRow'],
    note: 'Header → deliveries; Delivery.lines[] → delivery_lines (line_no = array index). supplier_id/invoice_no/received_by/worst_variance_pct/po_id renames.',
  },
  purchaseOrders: {
    tables: ['purchase_orders', 'po_lines'],
    rows: ['PoRow', 'PoLineRow'],
    note: 'CoreState.purchaseOrders → purchase_orders; PurchaseOrder.lines[] → po_lines (line_no = array index). supplier_id/created_by renames.',
  },
  invoices: {
    tables: ['supplier_invoices'],
    rows: ['SupplierInvoiceRow'],
    note: 'CoreState.invoices → supplier_invoices. match_issues (string[]) as jsonb; supplier_id/invoice_no/delivery_id/po_id/entered_by/reviewed_by/paid_amount/payment_method renames.',
  },
  expenses: {
    tables: ['expenses'],
    rows: ['ExpenseRow'],
    note: '1:1. accrual_month←accrualMonth; receipt/recurring are NOT NULL (default false) server-side.',
  },
  closings: {
    tables: ['shift_closings'],
    rows: ['ShiftClosingRow'],
    note: 'CoreState.closings → shift_closings. declared/confirmed value objects as jsonb; over_short←overShort, submitted_by←submittedBy.',
  },
  fxHistory: {
    tables: ['fx_rates'],
    rows: ['FxRateRow'],
    note: 'CoreState.fxHistory → fx_rates (date is PK). set_by←setBy.',
  },
  alerts: {
    tables: ['alerts'],
    rows: ['AlertRow'],
    note: '1:1. module_id←moduleId, assigned_to←assignedTo.',
  },
  audit: {
    tables: ['audit'],
    rows: ['AuditRow'],
    note: '1:1, append-only. user_id←user, old_value←oldValue, new_value←newValue, module_id←moduleId.',
  },
  modules: {
    tables: ['module_state'],
    rows: ['ModuleStateRow'],
    note: 'Record<string,unknown> → one module_state row per key (module_id = key, data = value jsonb).',
  },
  seq: {
    tables: ['counters'],
    rows: ['CounterRow'],
    note: "Scalar → the counters row name='seq' (column value). Server-incremented by next_id() (0003).",
  },
};
