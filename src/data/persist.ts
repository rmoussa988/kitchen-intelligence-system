/**
 * persist.ts — CoreState → Postgres (Supabase) writer.
 *
 * Two entry points, both no-ops in local-only mode only insofar as they throw early via
 * requireSupabase() (the caller decides whether to call them, based on `isCloud`):
 *
 *   • pushCoreState(state)      — full upload to SEED an empty project. Upserts every entity's
 *                                 rows into its table, decomposing the in-memory shape into the
 *                                 relational one (items.onHand → stock rows, *.lines → child
 *                                 line tables, settings → the single settings row, modules →
 *                                 module_state rows, seq → the counters row). Writes are ordered
 *                                 so foreign keys always resolve (masters first, children last).
 *
 *   • syncDiff(prev, next)      — persist only what changed between two CoreState snapshots:
 *                                 upsert rows that are new or whose JSON changed, delete rows
 *                                 whose id disappeared, diff items.onHand into stock, and
 *                                 delete+re-insert a parent's line set when its lines changed.
 *
 * Both reshape CoreState exactly as documented in ./rows.ts — that file is the single source of
 * truth for column names and the CoreState⇄row mapping, and this module stays in lockstep with it.
 *
 * Resilience: every Supabase call is checked; on error we throw an Error carrying the table and
 * operation so the caller can surface a toast. Ids are never allocated here (next_id lives on the
 * server / already exists on the objects), so these functions perform plain table writes only.
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
} from '../store/types';
import type {
  AlertRow,
  AuditRow,
  BatchRow,
  DeliveryLineRow,
  DeliveryRow,
  ExpenseRow,
  FxRateRow,
  ItemRow,
  LocationRow,
  ModuleStateRow,
  MovementRow,
  PoLineRow,
  PoRow,
  ProductionPlanRow,
  ProfileRow,
  SettingsRow,
  ShiftClosingRow,
  StockRow,
  SupplierInvoiceRow,
  SupplierRow,
  TableName,
  TransferLineRow,
  TransferRow,
  WasteRow,
} from './rows';
import { SEQ_COUNTER, SETTINGS_ROW_ID } from './rows';
import { requireSupabase } from './supabase';

// ────────────────────────────── write primitives ─────────────────────────────

/** Rows per batched request. Keeps large tables (movements/audit) under payload limits. */
const CHUNK = 500;

/**
 * Upsert `rows` into `table`, chunked. `onConflict` names the conflict target column(s) for
 * composite / non-`id` primary keys (e.g. 'item_id,loc'); omit it to use the table's own PK.
 * Throws with table context on any Supabase error.
 */
async function upsertRows(table: TableName, rows: readonly unknown[], onConflict?: string): Promise<void> {
  if (rows.length === 0) return;
  const sb = requireSupabase();
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK) as never[];
    const { error } = onConflict
      ? await sb.from(table).upsert(slice, { onConflict })
      : await sb.from(table).upsert(slice);
    if (error) {
      throw new Error(`persist: upsert ${slice.length} row(s) into "${table}" failed — ${error.message}`);
    }
  }
}

/** Delete rows from `table` where `col` is in `keys`, chunked. */
async function deleteKeys(table: TableName, col: string, keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return;
  const sb = requireSupabase();
  for (let i = 0; i < keys.length; i += CHUNK) {
    const slice = keys.slice(i, i + CHUNK) as never[];
    const { error } = await sb.from(table).delete().in(col, slice);
    if (error) {
      throw new Error(`persist: delete from "${table}" (${col} in …) failed — ${error.message}`);
    }
  }
}

/** Delete every child-line row belonging to one parent (used before re-inserting a line set). */
async function clearLines(table: TableName, fk: string, parentId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from(table).delete().eq(fk, parentId as never);
  if (error) {
    throw new Error(`persist: clear "${table}" for ${parentId} failed — ${error.message}`);
  }
}

/** Delete a single (item_id, loc) stock row (an on-hand location that dropped out). */
async function deleteStock(itemId: string, loc: LocId): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('stock').delete().eq('item_id', itemId as never).eq('loc', loc as never);
  if (error) {
    throw new Error(`persist: delete stock ${itemId}/${loc} failed — ${error.message}`);
  }
}

// ──────────────────────── CoreState entity → row mappers ──────────────────────
// Each mapper mirrors ./rows.ts exactly. `updated_at` is intentionally omitted from every
// payload: the DB default/trigger owns it. `auth_uid` is omitted from profiles so cloud auth
// linkage (wired in 0002) is never clobbered by a data push. Optional (`?`) CoreState fields
// are coerced to `null` (never left `undefined`) so an upsert actually clears a cleared column.

function locationRow(l: Location): Omit<LocationRow, 'updated_at'> {
  return {
    id: l.id,
    en: l.en,
    ar: l.ar,
    type: l.type,
    sells: l.sells,
    responsibilities: l.responsibilities,
    storage_areas: l.storageAreas,
    active: l.active,
  };
}

function profileRow(u: User): Omit<ProfileRow, 'updated_at' | 'auth_uid'> {
  return {
    id: u.id,
    name: u.name,
    name_ar: u.nameAr,
    ini: u.ini,
    role: u.role,
    scope: u.scope,
    credential: u.credential,
    active: u.active,
    last_seen: u.lastSeen ?? null,
  };
}

function supplierRow(s: Supplier): Omit<SupplierRow, 'updated_at'> {
  return {
    id: s.id,
    name: s.name,
    name_ar: s.nameAr ?? null,
    contact: s.contact,
    phone: s.phone ?? null,
    terms: s.terms,
    products: s.products,
    spend_month: s.spendMonth ?? null,
    alert: s.alert ?? false,
    active: s.active,
    meta: s.meta ?? null,
  };
}

function itemRow(i: Item): Omit<ItemRow, 'updated_at'> {
  return {
    id: i.id,
    en: i.en,
    ar: i.ar,
    type: i.type,
    cat: i.cat,
    cat_ar: i.catAr ?? null,
    base: i.base,
    purch: i.purch,
    cost: i.cost,
    price: i.price ?? null,
    supplier: i.supplier ?? null,
    stocked: i.stocked,
    is_recipe: i.isRecipe ?? false,
    pos: i.pos ?? false,
    incomplete: i.incomplete ?? false,
    shelf: i.shelf ?? null,
    min_qty: i.min ?? null,
    max_qty: i.max ?? null,
    purch_factor: i.purchFactor ?? null,
    meta: i.meta ?? null,
  };
}

/** Decompose Item.onHand (Partial<Record<LocId, number>>) into one stock row per present loc. */
function stockRows(i: Item): StockRow[] {
  const out: StockRow[] = [];
  for (const loc of Object.keys(i.onHand) as LocId[]) {
    const qty = i.onHand[loc];
    if (qty === undefined) continue;
    out.push({ item_id: i.id, loc, qty });
  }
  return out;
}

function movementRow(m: Movement): MovementRow {
  return {
    id: m.id,
    ts: m.ts,
    item_id: m.itemId,
    loc: m.loc,
    type: m.type,
    qty: m.qty,
    entered_qty: m.enteredQty ?? null,
    entered_unit: m.enteredUnit ?? null,
    value: m.value,
    source: m.source,
    source_kind: m.sourceKind ?? null,
    beyond_tolerance: m.beyondTolerance ?? false,
    note: m.note ?? null,
    user_id: m.user ?? null,
  };
}

function transferRow(t: Transfer): Omit<TransferRow, 'updated_at'> {
  return {
    id: t.id,
    from_loc: t.from,
    to_loc: t.to,
    status: t.status,
    requested_at: t.requestedAt,
    sent_at: t.sentAt ?? null,
    confirmed_at: t.confirmedAt ?? null,
    requested_by: t.requestedBy ?? null,
    sent_by: t.sentBy ?? null,
    confirmed_by: t.confirmedBy ?? null,
    note: t.note ?? null,
  };
}

function transferLineRows(t: Transfer): TransferLineRow[] {
  return t.lines.map((ln, idx) => ({
    transfer_id: t.id,
    line_no: idx,
    item_id: ln.itemId,
    unit: ln.unit,
    cost: ln.cost,
    requested: ln.requested,
    sent: ln.sent ?? null,
    confirmed: ln.confirmed ?? null,
    flag: ln.flag ?? null,
  }));
}

function wasteRow(w: WasteRecord): Omit<WasteRow, 'updated_at'> {
  return {
    id: w.id,
    ts: w.ts,
    item_id: w.itemId,
    loc: w.loc,
    qty: w.qty,
    unit: w.unit,
    base_qty: w.baseQty,
    cost: w.cost,
    reason: w.reason,
    employee: w.employee ?? null,
    status: w.status,
    photo: w.photo ?? false,
    photo_url: w.photoUrl ?? null,
    note: w.note ?? null,
  };
}

function planRow(p: ProductionPlan): Omit<ProductionPlanRow, 'updated_at'> {
  return {
    id: p.id,
    date: p.date,
    loc: p.loc,
    item_id: p.itemId,
    planned_qty: p.plannedQty,
    unit: p.unit,
    assigned_to: p.assignedTo ?? null,
    expected_demand: p.expectedDemand ?? null,
    opening_stock: p.openingStock ?? null,
    status: p.status,
    published: p.published,
    batch_id: p.batchId ?? null,
    progress: p.progress ?? null,
    gap_open: p.gapOpen ?? false,
  };
}

function batchRow(b: Batch): Omit<BatchRow, 'updated_at'> {
  return {
    id: b.id,
    plan_id: b.planId ?? null,
    item_id: b.itemId,
    loc: b.loc,
    employee: b.employee ?? null,
    started_at: b.startedAt,
    completed_at: b.completedAt ?? null,
    status: b.status,
    planned_qty: b.plannedQty,
    unit: b.unit,
    input_mode: b.inputMode ?? null,
    raw_item_id: b.rawItemId ?? null,
    raw_drawn: b.rawDrawn ?? null,
    raw_returned: b.rawReturned ?? null,
    raw_used: b.rawUsed ?? null,
    trim_waste: b.trimWaste ?? null,
    marinade_recommended: b.marinadeRecommended ?? null,
    marinade_used: b.marinadeUsed ?? null,
    stages: b.stages ?? null,
    output_qty: b.outputQty ?? null,
    standard_per_unit: b.standardPerUnit ?? null,
    gap_kg: b.gapKg ?? null,
    gap_pct: b.gapPct ?? null,
    gap_usd: b.gapUsd ?? null,
    gap_status: b.gapStatus ?? null,
    cost: b.cost ?? null,
    yield_pct: b.yieldPct ?? null,
  };
}

function poRow(po: PurchaseOrder): Omit<PoRow, 'updated_at'> {
  return {
    id: po.id,
    ts: po.ts,
    supplier_id: po.supplierId,
    loc: po.loc,
    status: po.status,
    total: po.total,
    expected: po.expected ?? null,
    created_by: po.createdBy ?? null,
    note: po.note ?? null,
  };
}

function poLineRows(po: PurchaseOrder): PoLineRow[] {
  return po.lines.map((ln, idx) => ({
    po_id: po.id,
    line_no: idx,
    item_id: ln.itemId,
    qty: ln.qty,
    unit: ln.unit,
    price: ln.price,
    received: ln.received ?? null,
  }));
}

function deliveryRow(d: Delivery): Omit<DeliveryRow, 'updated_at'> {
  return {
    id: d.id,
    ts: d.ts,
    supplier_id: d.supplierId,
    invoice_no: d.invoiceNo,
    loc: d.loc,
    total: d.total,
    received_by: d.receivedBy ?? null,
    status: d.status,
    worst_variance_pct: d.worstVariancePct ?? null,
    po_id: d.poId ?? null,
    scan_url: d.scanUrl ?? null,
  };
}

function deliveryLineRows(d: Delivery): DeliveryLineRow[] {
  return d.lines.map((ln, idx) => ({
    delivery_id: d.id,
    line_no: idx,
    item_id: ln.itemId,
    ordered: ln.ordered ?? null,
    received: ln.received,
    unit: ln.unit,
    base_qty: ln.baseQty,
    unit_price: ln.unitPrice,
    last_price: ln.lastPrice ?? null,
    variance_pct: ln.variancePct ?? null,
    expiry: ln.expiry ?? null,
    batch: ln.batch ?? null,
    temp: ln.temp ?? null,
    quality: ln.quality ?? null,
    rejected: ln.rejected ?? null,
    old_avg: ln.oldAvg ?? null,
    new_avg: ln.newAvg ?? null,
  }));
}

function invoiceRow(inv: SupplierInvoice): Omit<SupplierInvoiceRow, 'updated_at'> {
  return {
    id: inv.id,
    supplier_id: inv.supplierId,
    invoice_no: inv.invoiceNo,
    date: inv.date ?? null,
    due: inv.due ?? null,
    amount: inv.amount,
    currency: inv.currency,
    stage: inv.stage,
    delivery_id: inv.deliveryId ?? null,
    po_id: inv.poId ?? null,
    loc: inv.loc,
    entered_by: inv.enteredBy ?? null,
    reviewed_by: inv.reviewedBy ?? null,
    match_issues: inv.matchIssues ?? null,
    paid_amount: inv.paidAmount ?? null,
    payment_method: inv.paymentMethod ?? null,
    scan_url: inv.scanUrl ?? null,
    note: inv.note ?? null,
  };
}

function expenseRow(e: Expense): Omit<ExpenseRow, 'updated_at'> {
  return {
    id: e.id,
    date: e.date,
    accrual_month: e.accrualMonth,
    category: e.category,
    amount: e.amount,
    currency: e.currency,
    method: e.method,
    allocation: e.allocation,
    vendor: e.vendor ?? null,
    note: e.note ?? null,
    receipt: e.receipt ?? false,
    recurring: e.recurring ?? false,
  };
}

function closingRow(c: ShiftClosing): Omit<ShiftClosingRow, 'updated_at'> {
  return {
    id: c.id,
    loc: c.loc,
    date: c.date,
    shift: c.shift,
    expected: c.expected,
    declared: c.declared,
    confirmed: c.confirmed ?? null,
    rate: c.rate,
    status: c.status,
    over_short: c.overShort ?? null,
    submitted_by: c.submittedBy ?? null,
  };
}

function fxRateRow(f: FxRate): FxRateRow {
  return {
    date: f.date,
    rate: f.rate,
    set_by: f.setBy ?? null,
    closings: f.closings,
  };
}

function alertRow(a: Alert): AlertRow {
  return {
    id: a.id,
    ts: a.ts,
    severity: a.severity,
    type: a.type,
    en: a.en,
    ar: a.ar,
    loc: a.loc ?? null,
    module_id: a.moduleId ?? null,
    dismissed: a.dismissed ?? false,
    assigned_to: a.assignedTo ?? null,
  };
}

function auditRow(a: AuditEntry): AuditRow {
  return {
    id: a.id,
    ts: a.ts,
    user_id: a.user ?? null,
    action: a.action,
    entity: a.entity,
    old_value: a.oldValue ?? null,
    new_value: a.newValue ?? null,
    module_id: a.moduleId ?? null,
  };
}

function settingsRow(s: Settings): Omit<SettingsRow, 'updated_at'> {
  return {
    id: SETTINGS_ROW_ID,
    fx_rate: s.fxRate,
    variance_tolerance_pct: s.varianceTolerancePct,
    waste_auto_approve_usd: s.wasteAutoApproveUsd,
    ppv_amber_pct: s.ppvAmberPct,
    ppv_red_pct: s.ppvRedPct,
    production_gap_alert_pct: s.productionGapAlertPct,
    cash_tolerance: s.cashTolerance,
    current_user_id: s.currentUser ?? null,
    staff_user_id: s.staffUser ?? null,
    period: s.period,
  };
}

/** Decompose CoreState.modules (Record<string, unknown>) into one module_state row per key. */
function moduleStateRows(modules: Record<string, unknown>): Omit<ModuleStateRow, 'updated_at'>[] {
  return Object.entries(modules).map(([module_id, data]) => ({
    module_id,
    data: data ?? {},
  }));
}

// ─────────────────────────────── full seed push ──────────────────────────────

/**
 * Full upload used to SEED an empty project from an in-memory CoreState. Every entity is
 * upserted (so re-running is idempotent) in foreign-key-safe order: master data (locations,
 * profiles, suppliers, items) first, then stock, then the ledger and documents, with child
 * line tables written right after their parents.
 */
export async function pushCoreState(state: CoreState): Promise<void> {
  requireSupabase(); // fail fast in local-only mode

  // ── master data ──
  await upsertRows('locations', state.locations.map(locationRow));
  await upsertRows('profiles', state.users.map(profileRow));
  await upsertRows('suppliers', state.suppliers.map(supplierRow));
  await upsertRows('items', state.items.map(itemRow));
  await upsertRows('stock', state.items.flatMap(stockRows), 'item_id,loc');

  // ── perpetual ledger ──
  await upsertRows('movements', state.movements.map(movementRow));

  // ── transfers + lines ──
  await upsertRows('transfers', state.transfers.map(transferRow));
  await upsertRows('transfer_lines', state.transfers.flatMap(transferLineRows), 'transfer_id,line_no');

  // ── waste ──
  await upsertRows('waste', state.waste.map(wasteRow));

  // ── production ──
  await upsertRows('production_plans', state.plans.map(planRow));
  await upsertRows('batches', state.batches.map(batchRow));

  // ── purchasing & receiving (POs before deliveries before invoices) ──
  await upsertRows('purchase_orders', state.purchaseOrders.map(poRow));
  await upsertRows('po_lines', state.purchaseOrders.flatMap(poLineRows), 'po_id,line_no');
  await upsertRows('deliveries', state.deliveries.map(deliveryRow));
  await upsertRows('delivery_lines', state.deliveries.flatMap(deliveryLineRows), 'delivery_id,line_no');
  await upsertRows('supplier_invoices', state.invoices.map(invoiceRow));

  // ── accounting & finance ──
  await upsertRows('expenses', state.expenses.map(expenseRow));
  await upsertRows('shift_closings', state.closings.map(closingRow));
  await upsertRows('fx_rates', state.fxHistory.map(fxRateRow), 'date');

  // ── alerts & audit ──
  await upsertRows('alerts', state.alerts.map(alertRow));
  await upsertRows('audit', state.audit.map(auditRow));

  // ── settings, module state ──
  await upsertRows('settings', [settingsRow(state.settings)], 'id');
  await upsertRows('module_state', moduleStateRows(state.modules), 'module_id');
  // NB: the `counters` row is owned by the server (reserve_ids / next_id) and must never be written
  // from the client — doing so would drag the sequence back below ids other devices already hold.
}

// ──────────────────────────────── diff helpers ───────────────────────────────

interface EntityDiff<E> {
  /** New rows + rows whose JSON changed. */
  changed: E[];
  /** Keys (id or other PK) present in `prev` but gone from `next`. */
  removedKeys: string[];
}

/**
 * Diff two keyed entity arrays. Uses reference identity (immer keeps unchanged nodes stable) as a
 * fast path, then a JSON compare, to decide whether a row must be re-written. A false positive
 * only ever costs a harmless idempotent upsert.
 */
function diffEntities<E>(prev: readonly E[], next: readonly E[], key: (e: E) => string): EntityDiff<E> {
  const prevByKey = new Map<string, E>();
  for (const e of prev) prevByKey.set(key(e), e);

  const nextKeys = new Set<string>();
  const changed: E[] = [];
  for (const e of next) {
    const k = key(e);
    nextKeys.add(k);
    const before = prevByKey.get(k);
    if (before === undefined) {
      changed.push(e);
    } else if (before !== e && JSON.stringify(before) !== JSON.stringify(e)) {
      changed.push(e);
    }
  }

  const removedKeys: string[] = [];
  for (const e of prev) {
    const k = key(e);
    if (!nextKeys.has(k)) removedKeys.push(k);
  }

  return { changed, removedKeys };
}

/** Diff one item's on-hand map (prev may be absent for a brand-new item). */
function stockDiffFor(prev: Item | undefined, next: Item): { upserts: StockRow[]; removed: LocId[] } {
  const upserts: StockRow[] = [];
  const removed: LocId[] = [];
  const prevOn = prev?.onHand ?? {};
  const nextOn = next.onHand;
  for (const loc of Object.keys(nextOn) as LocId[]) {
    const qty = nextOn[loc];
    if (qty === undefined) continue;
    if (prevOn[loc] !== qty) upserts.push({ item_id: next.id, loc, qty });
  }
  for (const loc of Object.keys(prevOn) as LocId[]) {
    if (prevOn[loc] === undefined) continue;
    if (nextOn[loc] === undefined) removed.push(loc);
  }
  return { upserts, removed };
}

/** Diff CoreState.modules → module_state upserts + removed module ids. */
function moduleDiff(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): { upserts: Omit<ModuleStateRow, 'updated_at'>[]; removed: string[] } {
  const upserts: Omit<ModuleStateRow, 'updated_at'>[] = [];
  for (const [k, v] of Object.entries(next)) {
    if (!(k in prev) || JSON.stringify(prev[k]) !== JSON.stringify(v)) {
      upserts.push({ module_id: k, data: v ?? {} });
    }
  }
  const removed: string[] = [];
  for (const k of Object.keys(prev)) {
    if (!(k in next)) removed.push(k);
  }
  return { upserts, removed };
}

// ────────────────────────────── incremental sync ─────────────────────────────

/**
 * Persist just the delta between two CoreState snapshots. Upserts run masters-first so foreign
 * keys resolve; deletes run children-first so they never orphan a referenced row. A parent's line
 * set is delete+re-inserted only when its `lines` array actually changed. movements / audit /
 * alerts are effectively append-only, so a plain upsert-by-id (plus delete of any vanished id) is
 * enough. Throws with context on the first Supabase error so the caller can toast and retry.
 */
export async function syncDiff(prev: CoreState, next: CoreState): Promise<void> {
  requireSupabase(); // fail fast in local-only mode

  if (prev === next) return; // identical snapshot — nothing to do

  // ── compute all diffs up front ──
  const locD = diffEntities(prev.locations, next.locations, (e) => e.id);
  const userD = diffEntities(prev.users, next.users, (e) => e.id);
  const supD = diffEntities(prev.suppliers, next.suppliers, (e) => e.id);
  const itemD = diffEntities(prev.items, next.items, (e) => e.id);
  const movD = diffEntities(prev.movements, next.movements, (e) => e.id);
  const trD = diffEntities(prev.transfers, next.transfers, (e) => e.id);
  const wasteD = diffEntities(prev.waste, next.waste, (e) => e.id);
  const planD = diffEntities(prev.plans, next.plans, (e) => e.id);
  const batchD = diffEntities(prev.batches, next.batches, (e) => e.id);
  const poD = diffEntities(prev.purchaseOrders, next.purchaseOrders, (e) => e.id);
  const delD = diffEntities(prev.deliveries, next.deliveries, (e) => e.id);
  const invD = diffEntities(prev.invoices, next.invoices, (e) => e.id);
  const expD = diffEntities(prev.expenses, next.expenses, (e) => e.id);
  const closeD = diffEntities(prev.closings, next.closings, (e) => e.id);
  const fxD = diffEntities(prev.fxHistory, next.fxHistory, (e) => e.date);
  const alertD = diffEntities(prev.alerts, next.alerts, (e) => e.id);
  const auditD = diffEntities(prev.audit, next.audit, (e) => e.id);

  const prevItems = new Map(prev.items.map((i) => [i.id, i]));
  const prevTransfers = new Map(prev.transfers.map((t) => [t.id, t]));
  const prevPos = new Map(prev.purchaseOrders.map((p) => [p.id, p]));
  const prevDeliveries = new Map(prev.deliveries.map((d) => [d.id, d]));

  // ═══════════════ PHASE 1 — upserts (masters → children) ═══════════════

  await upsertRows('locations', locD.changed.map(locationRow));
  await upsertRows('profiles', userD.changed.map(profileRow));
  await upsertRows('suppliers', supD.changed.map(supplierRow));
  await upsertRows('items', itemD.changed.map(itemRow));

  // NB: `movements` and `stock` are NOT written here. In cloud mode every stock change goes through
  // the store's postMovement → post_movement() RPC, which inserts the movement and applies the stock
  // delta atomically on the server (concurrency-safe). Writing them here too would double-apply the
  // delta or overwrite a concurrent device's value. (pushCoreState still bulk-loads them for seeding.)

  await upsertRows('transfers', trD.changed.map(transferRow));
  for (const t of trD.changed) {
    const before = prevTransfers.get(t.id);
    if (!before || JSON.stringify(before.lines) !== JSON.stringify(t.lines)) {
      await clearLines('transfer_lines', 'transfer_id', t.id);
      await upsertRows('transfer_lines', transferLineRows(t), 'transfer_id,line_no');
    }
  }

  await upsertRows('waste', wasteD.changed.map(wasteRow));
  await upsertRows('production_plans', planD.changed.map(planRow));
  await upsertRows('batches', batchD.changed.map(batchRow));

  await upsertRows('purchase_orders', poD.changed.map(poRow));
  for (const po of poD.changed) {
    const before = prevPos.get(po.id);
    if (!before || JSON.stringify(before.lines) !== JSON.stringify(po.lines)) {
      await clearLines('po_lines', 'po_id', po.id);
      await upsertRows('po_lines', poLineRows(po), 'po_id,line_no');
    }
  }

  await upsertRows('deliveries', delD.changed.map(deliveryRow));
  for (const d of delD.changed) {
    const before = prevDeliveries.get(d.id);
    if (!before || JSON.stringify(before.lines) !== JSON.stringify(d.lines)) {
      await clearLines('delivery_lines', 'delivery_id', d.id);
      await upsertRows('delivery_lines', deliveryLineRows(d), 'delivery_id,line_no');
    }
  }

  await upsertRows('supplier_invoices', invD.changed.map(invoiceRow));
  await upsertRows('expenses', expD.changed.map(expenseRow));
  await upsertRows('shift_closings', closeD.changed.map(closingRow));
  await upsertRows('fx_rates', fxD.changed.map(fxRateRow), 'date');
  await upsertRows('alerts', alertD.changed.map(alertRow));
  await upsertRows('audit', auditD.changed.map(auditRow));

  // singletons
  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    await upsertRows('settings', [settingsRow(next.settings)], 'id');
  }
  const modD = moduleDiff(prev.modules, next.modules);
  await upsertRows('module_state', modD.upserts, 'module_id');
  // The `counters` row is server-owned (reserve_ids); never sync state.seq back — see pushCoreState.

  // ═══════════════ PHASE 2 — deletes (children → masters) ═══════════════
  // Child line tables (transfer_lines, po_lines, delivery_lines) and stock cascade when their
  // parent row is deleted, so removed parents are deleted directly.

  await deleteKeys('module_state', 'module_id', modD.removed);

  await deleteKeys('audit', 'id', auditD.removedKeys);
  await deleteKeys('alerts', 'id', alertD.removedKeys);
  await deleteKeys('fx_rates', 'date', fxD.removedKeys);
  await deleteKeys('shift_closings', 'id', closeD.removedKeys);
  await deleteKeys('expenses', 'id', expD.removedKeys);
  await deleteKeys('supplier_invoices', 'id', invD.removedKeys);
  await deleteKeys('deliveries', 'id', delD.removedKeys);
  await deleteKeys('purchase_orders', 'id', poD.removedKeys);
  await deleteKeys('batches', 'id', batchD.removedKeys);
  await deleteKeys('production_plans', 'id', planD.removedKeys);
  await deleteKeys('waste', 'id', wasteD.removedKeys);
  await deleteKeys('transfers', 'id', trD.removedKeys);
  // movements/stock are server-owned via post_movement() — not deleted from the client.
  await deleteKeys('items', 'id', itemD.removedKeys);
  await deleteKeys('suppliers', 'id', supD.removedKeys);
  await deleteKeys('profiles', 'id', userD.removedKeys);
  await deleteKeys('locations', 'id', locD.removedKeys);
}
