/**
 * hydrate.ts — cloud → CoreState.
 *
 * Reads every table from the Supabase (Postgres) backend and reassembles a complete
 * in-memory `CoreState`, shaped exactly as `buildInitialState()` (src/store/seed.ts) would
 * produce it, so the rest of the app never sees the difference between local-only and cloud.
 *
 * The row shapes and the CoreState⇄row mapping are governed by the contract in ./rows.ts —
 * this file is the read side of that contract and must stay in lockstep with it:
 *   • camelCase CoreState fields ← snake_case columns (renames per rows.ts);
 *   • Item.onHand is rebuilt by merging the separate `stock` rows;
 *   • Transfer/Delivery/PurchaseOrder `lines` are rebuilt from their child tables (ordered by line_no);
 *   • `modules` is rebuilt from module_state rows; `seq` from the counters 'seq' row;
 *   • timestamptz / date columns are normalised to the naive ISO string shape the app uses
 *     ('YYYY-MM-DDTHH:mm:ss' for timestamps, 'YYYY-MM-DD' for dates);
 *   • numeric columns stay numbers; several columns nullable in SQL but required on the
 *     entity get a fallback ('' for the required-string cases called out in rows.ts).
 */

import type {
  Alert,
  AuditEntry,
  Batch,
  CoreState,
  Delivery,
  Expense,
  FxRate,
  Item,
  Recipe,
  LocId,
  Location,
  Movement,
  ProductionPlan,
  PurchaseOrder,
  Settings,
  ShiftClosing,
  Supplier,
  SupplierInvoice,
  Transfer,
  User,
  WasteRecord,
} from '../store';
import { STORE_VERSION } from '../store/seed';
import { requireSupabase } from './supabase';
import { SEQ_COUNTER, type RowByTable, type TableName } from './rows';

// ─────────────────────────────── helpers ─────────────────────────────────────

/**
 * Fetch every row of a table, paginating in case a table is larger than PostgREST's
 * per-request cap. Typed by the table name via RowByTable so callers get the right row[].
 */
async function fetchAll<K extends TableName>(table: K): Promise<RowByTable[K][]> {
  const sb = requireSupabase();
  const PAGE = 1000;
  const rows: RowByTable[K][] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`KIS hydrate: failed to load "${table}": ${error.message}`);
    const batch = (data ?? []) as RowByTable[K][];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

/** Like fetchAll, but a missing/failed table yields [] instead of failing the whole hydrate.
 *  Used for tables added by a later migration (e.g. recipes) so the app is safe if it loads
 *  before that migration has been applied. */
async function fetchOptional<K extends TableName>(table: K): Promise<RowByTable[K][]> {
  try { return await fetchAll(table); }
  catch (e) { console.warn(`KIS hydrate: "${table}" unavailable, treating as empty —`, e); return []; }
}

/** timestamptz column → naive 'YYYY-MM-DDTHH:mm:ss' (drops offset / milliseconds). */
function tsToIso(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toISOString().slice(0, 19);
}

/** Nullable timestamptz → naive ISO string, or undefined. */
function tsToIsoN(v: string | null): string | undefined {
  return v == null ? undefined : tsToIso(v);
}

/** date column → 'YYYY-MM-DD'. */
function dateToIso(v: string): string {
  return v.length >= 10 ? v.slice(0, 10) : v;
}

/** Nullable date → 'YYYY-MM-DD', or undefined. */
function dateToIsoN(v: string | null): string | undefined {
  return v == null ? undefined : dateToIso(v);
}

/** Group child-line rows by their parent id and order each group by line_no. */
function groupLines<R extends { line_no: number }>(rows: R[], parentKey: keyof R): Map<string, R[]> {
  const map = new Map<string, R[]>();
  for (const r of rows) {
    const k = String(r[parentKey]);
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.line_no - b.line_no);
  return map;
}

// ─────────────────────────────── load ────────────────────────────────────────

/**
 * Read the whole backend and assemble a complete CoreState. Throws (via requireSupabase)
 * in local-only mode, or if a load fails / the singleton settings row is missing.
 */
export async function loadCoreState(): Promise<CoreState> {
  const [
    locationRows,
    profileRows,
    supplierRows,
    itemRows,
    recipeRows,
    stockRows,
    movementRows,
    transferRows,
    transferLineRows,
    wasteRows,
    planRows,
    batchRows,
    poRows,
    poLineRows,
    deliveryRows,
    deliveryLineRows,
    invoiceRows,
    expenseRows,
    closingRows,
    fxRows,
    alertRows,
    auditRows,
    settingsRows,
    moduleStateRows,
    counterRows,
  ] = await Promise.all([
    fetchAll('locations'),
    fetchAll('profiles'),
    fetchAll('suppliers'),
    fetchAll('items'),
    fetchOptional('recipes'),
    fetchAll('stock'),
    fetchAll('movements'),
    fetchAll('transfers'),
    fetchAll('transfer_lines'),
    fetchAll('waste'),
    fetchAll('production_plans'),
    fetchAll('batches'),
    fetchAll('purchase_orders'),
    fetchAll('po_lines'),
    fetchAll('deliveries'),
    fetchAll('delivery_lines'),
    fetchAll('supplier_invoices'),
    fetchAll('expenses'),
    fetchAll('shift_closings'),
    fetchAll('fx_rates'),
    fetchAll('alerts'),
    fetchAll('audit'),
    fetchAll('settings'),
    fetchAll('module_state'),
    fetchAll('counters'),
  ]);

  // ── locations ──
  const locations: Location[] = locationRows.map((r) => ({
    id: r.id,
    en: r.en,
    ar: r.ar,
    type: r.type,
    sells: r.sells,
    responsibilities: r.responsibilities,
    storageAreas: r.storage_areas,
    active: r.active,
  }));

  // ── users (profiles) ──
  const users: User[] = profileRows.map((r) => ({
    id: r.id,
    name: r.name,
    nameAr: r.name_ar,
    ini: r.ini,
    role: r.role,
    scope: r.scope,
    credential: r.credential,
    active: r.active,
    lastSeen: tsToIsoN(r.last_seen),
  }));

  // ── suppliers ──
  const suppliers: Supplier[] = supplierRows.map((r) => ({
    id: r.id,
    name: r.name,
    nameAr: r.name_ar ?? undefined,
    contact: r.contact,
    phone: r.phone ?? undefined,
    terms: r.terms,
    products: r.products,
    spendMonth: r.spend_month ?? undefined,
    alert: r.alert,
    active: r.active,
    meta: r.meta ?? undefined,
  }));

  // ── items (+ merge stock rows into onHand) ──
  const onHandByItem = new Map<string, Partial<Record<LocId, number>>>();
  for (const s of stockRows) {
    const m = onHandByItem.get(s.item_id);
    if (m) m[s.loc] = s.qty;
    else onHandByItem.set(s.item_id, { [s.loc]: s.qty });
  }
  const items: Item[] = itemRows.map((r) => ({
    id: r.id,
    en: r.en,
    ar: r.ar,
    type: r.type,
    cat: r.cat,
    catAr: r.cat_ar ?? undefined,
    base: r.base,
    purch: r.purch,
    cost: r.cost,
    price: r.price ?? undefined,
    supplier: r.supplier ?? undefined,
    stocked: r.stocked,
    isRecipe: r.is_recipe,
    pos: r.pos,
    incomplete: r.incomplete,
    shelf: r.shelf ?? undefined,
    min: r.min_qty ?? undefined,
    max: r.max_qty ?? undefined,
    onHand: onHandByItem.get(r.id) ?? {},
    purchFactor: r.purch_factor ?? undefined,
    meta: r.meta ?? undefined,
  }));

  // ── recipes (food/pkg/versions are jsonb, passed through) ──
  const recipes: Recipe[] = recipeRows.map((r) => ({
    id: r.id,
    en: r.en,
    ar: r.ar,
    type: r.type,
    yield: r.yield,
    price: r.price ?? undefined,
    threshold: r.threshold ?? undefined,
    prevCost: r.prev_cost,
    food: r.food ?? [],
    pkg: r.pkg ?? [],
    versions: r.versions ?? [],
  }));

  // ── movements ──
  const movements: Movement[] = movementRows.map((r) => ({
    id: r.id,
    ts: tsToIso(r.ts),
    itemId: r.item_id,
    loc: r.loc,
    type: r.type,
    qty: r.qty,
    enteredQty: r.entered_qty ?? undefined,
    enteredUnit: r.entered_unit ?? undefined,
    value: r.value,
    source: r.source,
    sourceKind: r.source_kind ?? undefined,
    beyondTolerance: r.beyond_tolerance,
    note: r.note ?? undefined,
    user: r.user_id ?? undefined,
  }));

  // ── transfers (+ transfer_lines) ──
  const transferLines = groupLines(transferLineRows, 'transfer_id');
  const transfers: Transfer[] = transferRows.map((r) => ({
    id: r.id,
    from: r.from_loc,
    to: r.to_loc,
    status: r.status,
    requestedAt: tsToIso(r.requested_at),
    sentAt: tsToIsoN(r.sent_at),
    confirmedAt: tsToIsoN(r.confirmed_at),
    requestedBy: r.requested_by ?? undefined,
    sentBy: r.sent_by ?? undefined,
    confirmedBy: r.confirmed_by ?? undefined,
    lines: (transferLines.get(r.id) ?? []).map((l) => ({
      itemId: l.item_id,
      unit: l.unit,
      cost: l.cost,
      requested: l.requested,
      sent: l.sent ?? undefined,
      confirmed: l.confirmed ?? undefined,
      flag: l.flag ?? undefined,
    })),
    note: r.note ?? undefined,
  }));

  // ── waste ──
  const waste: WasteRecord[] = wasteRows.map((r) => ({
    id: r.id,
    ts: tsToIso(r.ts),
    itemId: r.item_id,
    loc: r.loc,
    qty: r.qty,
    unit: r.unit,
    baseQty: r.base_qty,
    cost: r.cost,
    reason: r.reason,
    employee: r.employee ?? '',
    status: r.status,
    photo: r.photo,
    photoUrl: r.photo_url ?? undefined,
    note: r.note ?? undefined,
  }));

  // ── production plans ──
  const plans: ProductionPlan[] = planRows.map((r) => ({
    id: r.id,
    date: dateToIso(r.date),
    loc: r.loc,
    itemId: r.item_id,
    plannedQty: r.planned_qty,
    unit: r.unit,
    assignedTo: r.assigned_to ?? undefined,
    expectedDemand: r.expected_demand ?? undefined,
    openingStock: r.opening_stock ?? undefined,
    status: r.status,
    published: r.published,
    batchId: r.batch_id ?? undefined,
    progress: r.progress ?? undefined,
    gapOpen: r.gap_open,
  }));

  // ── batches ──
  const batches: Batch[] = batchRows.map((r) => ({
    id: r.id,
    planId: r.plan_id ?? undefined,
    itemId: r.item_id,
    loc: r.loc,
    employee: r.employee ?? '',
    startedAt: tsToIso(r.started_at),
    completedAt: tsToIsoN(r.completed_at),
    status: r.status,
    plannedQty: r.planned_qty,
    unit: r.unit,
    inputMode: r.input_mode ?? undefined,
    rawItemId: r.raw_item_id ?? undefined,
    rawDrawn: r.raw_drawn ?? undefined,
    rawReturned: r.raw_returned ?? undefined,
    rawUsed: r.raw_used ?? undefined,
    trimWaste: r.trim_waste ?? undefined,
    marinadeRecommended: r.marinade_recommended ?? undefined,
    marinadeUsed: r.marinade_used ?? undefined,
    stages: r.stages ?? undefined,
    outputQty: r.output_qty ?? undefined,
    standardPerUnit: r.standard_per_unit ?? undefined,
    gapKg: r.gap_kg ?? undefined,
    gapPct: r.gap_pct ?? undefined,
    gapUsd: r.gap_usd ?? undefined,
    gapStatus: r.gap_status ?? undefined,
    cost: r.cost ?? undefined,
    yieldPct: r.yield_pct ?? undefined,
  }));

  // ── purchase orders (+ po_lines) ──
  const poLines = groupLines(poLineRows, 'po_id');
  const purchaseOrders: PurchaseOrder[] = poRows.map((r) => ({
    id: r.id,
    ts: tsToIso(r.ts),
    supplierId: r.supplier_id,
    loc: r.loc,
    status: r.status,
    lines: (poLines.get(r.id) ?? []).map((l) => ({
      itemId: l.item_id,
      qty: l.qty,
      unit: l.unit,
      price: l.price,
      received: l.received ?? undefined,
    })),
    total: r.total,
    expected: dateToIsoN(r.expected),
    createdBy: r.created_by ?? undefined,
    note: r.note ?? undefined,
  }));

  // ── deliveries (+ delivery_lines) ──
  const deliveryLines = groupLines(deliveryLineRows, 'delivery_id');
  const deliveries: Delivery[] = deliveryRows.map((r) => ({
    id: r.id,
    ts: tsToIso(r.ts),
    supplierId: r.supplier_id,
    invoiceNo: r.invoice_no,
    loc: r.loc,
    lines: (deliveryLines.get(r.id) ?? []).map((l) => ({
      itemId: l.item_id,
      ordered: l.ordered ?? undefined,
      received: l.received,
      unit: l.unit,
      baseQty: l.base_qty,
      unitPrice: l.unit_price,
      lastPrice: l.last_price ?? undefined,
      variancePct: l.variance_pct ?? undefined,
      expiry: dateToIsoN(l.expiry),
      batch: l.batch ?? undefined,
      temp: l.temp ?? undefined,
      quality: l.quality ?? undefined,
      rejected: l.rejected ?? undefined,
      oldAvg: l.old_avg ?? undefined,
      newAvg: l.new_avg ?? undefined,
    })),
    total: r.total,
    receivedBy: r.received_by ?? '',
    status: r.status,
    worstVariancePct: r.worst_variance_pct ?? undefined,
    poId: r.po_id ?? undefined,
    scanUrl: r.scan_url ?? undefined,
  }));

  // ── supplier invoices ──
  const invoices: SupplierInvoice[] = invoiceRows.map((r) => ({
    id: r.id,
    supplierId: r.supplier_id,
    invoiceNo: r.invoice_no,
    date: dateToIsoN(r.date) ?? '',
    due: dateToIsoN(r.due),
    amount: r.amount,
    currency: r.currency,
    stage: r.stage,
    deliveryId: r.delivery_id ?? undefined,
    poId: r.po_id ?? undefined,
    loc: r.loc,
    enteredBy: r.entered_by ?? undefined,
    reviewedBy: r.reviewed_by ?? undefined,
    matchIssues: r.match_issues ?? undefined,
    paidAmount: r.paid_amount ?? undefined,
    paymentMethod: r.payment_method ?? undefined,
    scanUrl: r.scan_url ?? undefined,
    note: r.note ?? undefined,
  }));

  // ── expenses ──
  const expenses: Expense[] = expenseRows.map((r) => ({
    id: r.id,
    date: dateToIso(r.date),
    accrualMonth: r.accrual_month,
    category: r.category,
    amount: r.amount,
    currency: r.currency,
    method: r.method,
    allocation: r.allocation,
    vendor: r.vendor ?? undefined,
    note: r.note ?? undefined,
    receipt: r.receipt,
    recurring: r.recurring,
  }));

  // ── shift closings ──
  const closings: ShiftClosing[] = closingRows.map((r) => ({
    id: r.id,
    loc: r.loc,
    date: dateToIso(r.date),
    shift: r.shift,
    expected: r.expected,
    declared: r.declared,
    confirmed: r.confirmed ?? undefined,
    rate: r.rate,
    status: r.status,
    overShort: r.over_short ?? undefined,
    submittedBy: r.submitted_by ?? undefined,
  }));

  // ── fx history ──
  const fxHistory: FxRate[] = fxRows.map((r) => ({
    date: dateToIso(r.date),
    rate: r.rate,
    setBy: r.set_by ?? '',
    closings: r.closings,
  }));

  // ── alerts ──
  const alerts: Alert[] = alertRows.map((r) => ({
    id: r.id,
    ts: tsToIso(r.ts),
    severity: r.severity,
    type: r.type,
    en: r.en,
    ar: r.ar,
    loc: r.loc ?? undefined,
    moduleId: r.module_id ?? undefined,
    dismissed: r.dismissed,
    assignedTo: r.assigned_to ?? undefined,
  }));

  // ── audit ──
  const audit: AuditEntry[] = auditRows.map((r) => ({
    id: r.id,
    ts: tsToIso(r.ts),
    user: r.user_id ?? '',
    action: r.action,
    entity: r.entity,
    oldValue: r.old_value ?? undefined,
    newValue: r.new_value ?? undefined,
    moduleId: r.module_id ?? undefined,
  }));

  // ── settings (single row, id = 1) ──
  const s = settingsRows[0];
  if (!s) throw new Error('KIS hydrate: settings row (id=1) not found');
  const settings: Settings = {
    fxRate: s.fx_rate,
    varianceTolerancePct: s.variance_tolerance_pct,
    wasteAutoApproveUsd: s.waste_auto_approve_usd,
    ppvAmberPct: s.ppv_amber_pct,
    ppvRedPct: s.ppv_red_pct,
    productionGapAlertPct: s.production_gap_alert_pct,
    cashTolerance: s.cash_tolerance,
    currentUser: s.current_user_id ?? '',
    staffUser: s.staff_user_id ?? '',
    period: s.period,
  };

  // ── module-private state ──
  const modules: Record<string, unknown> = {};
  for (const m of moduleStateRows) modules[m.module_id] = m.data;

  // ── seq counter ──
  const seqRow = counterRows.find((c) => c.name === SEQ_COUNTER);
  const seq = seqRow ? seqRow.value : 1000;

  return {
    version: STORE_VERSION,
    scope: 'all',
    settings,
    locations,
    items,
    recipes,
    suppliers,
    users,
    movements,
    transfers,
    waste,
    plans,
    batches,
    deliveries,
    purchaseOrders,
    invoices,
    expenses,
    closings,
    fxHistory,
    alerts,
    audit,
    modules,
    seq,
  };
}
