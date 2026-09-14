/**
 * Per-item detail data (unit roles, conversion rows, live resolution, worked examples,
 * count frequency, cost history) — copied from "KIS Items & UOM.dc.html", keyed by item id.
 * The item record itself (name, type, cost, price, supplier…) is read from the global store.
 */
import type { CoreState, Item, LocId } from '../../store';
import { money, shortDate } from '../../ui';

export type RoleKey = 'base' | 'purchasing' | 'storage' | 'recipe' | 'transfer' | 'count' | 'serving' | 'report';
export type RoleFlag = 'auto' | 'warn';
export type RoleRow = [RoleKey, string] | [RoleKey, string, RoleFlag];
export type ConvKind = 'fixed' | 'density';
export interface ConvRow { rule: string; kind: ConvKind; sub: string | null; resolved: string; eff: string; factor: number; prefix: string; suffix: string }
export type FreqKey = 'daily' | 'weekly' | 'monthly';
export type FreqRow = [LocId, FreqKey, string, boolean];
export type HistRow = [string, string, string, string];

export interface ItemDetail {
  lastReceipt: string;
  posMap?: string;
  roles: RoleRow[];
  conv: ConvRow[];
  resolution: [string, string][];
  stockEx: string | null;
  costEx: string | null;
  freq: FreqRow[];
  hist: HistRow[];
}

export const ITEM_DETAILS: Record<string, ItemDetail> = {
  'RM-014': {
    lastReceipt: '10 CAN × $50.00 = $500.00',
    roles: [['base', 'L', 'auto'], ['purchasing', 'CAN'], ['storage', 'L'], ['recipe', 'ML'], ['transfer', 'L'], ['count', 'CAN'], ['serving', '—'], ['report', 'L']],
    conv: [
      { rule: '1 CAN = 16 L', kind: 'fixed', sub: null, resolved: '1 CAN → 16 L', eff: '01 Jan 2026', factor: 16, prefix: '1 CAN =', suffix: 'L' },
      { rule: '1 BOX = 12 CAN', kind: 'fixed', sub: 'chained via CAN', resolved: '1 BOX → 192 L', eff: '01 Jan 2026', factor: 12, prefix: '1 BOX =', suffix: 'CAN' },
      { rule: '1 L = 0.92 KG', kind: 'density', sub: 'inverse auto: 1 KG = 1.087 L', resolved: '1 L → 0.92 KG', eff: '01 Jan 2026', factor: 0.92, prefix: '1 L =', suffix: 'KG' },
    ],
    resolution: [['CAN', '× 16 → L'], ['BOX', '× 12 × 16 → 192 L'], ['ML', '÷ 1000 → L'], ['KG', '÷ 0.92 → 1.087 L']],
    stockEx: '10 CAN → 160 L → view as 160 L · 10 CAN · 147.2 KG',
    costEx: '1 CAN = $50.00 ÷ 16 = $3.125 / L\n250 ML recipe use = 0.25 L = $0.78',
    freq: [['mk', 'daily', 'CAN', true], ['rock', 'daily', 'L', true], ['kad', 'monthly', 'L', false]],
    // Receipts that also exist in the shared ledger (DLV-0421 · 12 Aug) are rendered from the store; only older rows survive the merge.
    hist: [['12 Aug', 'Received 10 CAN × $50.00', '$3.125 / L', '$3.125'], ['19 Jul', 'Received 8 CAN × $49.60', '$3.100 / L', '$3.108'], ['05 Jul', 'Received 10 CAN × $48.80', '$3.050 / L', '$3.071']],
  },
  'RM-001': {
    lastReceipt: '6 BOX × $48.00 = $288.00',
    roles: [['base', 'KG', 'auto'], ['purchasing', 'BOX'], ['storage', 'KG'], ['recipe', 'G'], ['transfer', 'KG'], ['count', 'KG'], ['serving', '—'], ['report', 'KG']],
    conv: [{ rule: '1 BOX = 10 KG', kind: 'fixed', sub: null, resolved: '1 BOX → 10 KG', eff: '01 Jan 2026', factor: 10, prefix: '1 BOX =', suffix: 'KG' }],
    resolution: [['BOX', '× 10 → KG'], ['G', '÷ 1000 → KG']],
    stockEx: '6 BOX → 60 KG', costEx: '1 BOX = $48.00 ÷ 10 = $4.80 / KG',
    freq: [['mk', 'daily', 'KG', true], ['rock', 'daily', 'KG', true]],
    hist: [['11 Aug', 'Received 6 BOX × $48.00', '$4.80 / KG', '$4.80'], ['09 Aug', 'Received 6 BOX × $47.50', '$4.75 / KG', '$4.76']],
  },
  'RM-022': {
    lastReceipt: '12 KG × $7.20 = $86.40',
    roles: [['base', 'KG', 'auto'], ['purchasing', 'KG'], ['storage', 'KG'], ['recipe', 'G'], ['transfer', 'KG'], ['count', 'KG'], ['serving', '—'], ['report', 'KG']],
    conv: [{ rule: '1 KG = 1000 G', kind: 'fixed', sub: 'system default', resolved: '1 KG → 1000 G', eff: '01 Jan 2026', factor: 1000, prefix: '1 KG =', suffix: 'G' }],
    resolution: [['G', '÷ 1000 → KG']], stockEx: null, costEx: null,
    freq: [['mk', 'daily', 'KG', true], ['rock', 'daily', 'KG', true]],
    hist: [['09 Aug', 'Received 12 KG × $7.20', '$7.20 / KG', '$7.20']],
  },
  'RM-035': {
    lastReceipt: '4 CRATE × $13.50 = $54.00',
    roles: [['base', 'KG', 'auto'], ['purchasing', 'CRATE'], ['storage', 'KG'], ['recipe', 'KG'], ['transfer', 'KG'], ['count', 'KG'], ['serving', '—'], ['report', 'KG']],
    conv: [{ rule: '1 CRATE = 15 KG', kind: 'fixed', sub: null, resolved: '1 CRATE → 15 KG', eff: '01 Jan 2026', factor: 15, prefix: '1 CRATE =', suffix: 'KG' }],
    resolution: [['CRATE', '× 15 → KG']], stockEx: '4 CRATE → 60 KG', costEx: '1 CRATE = $13.50 ÷ 15 = $0.90 / KG',
    freq: [['kad', 'daily', 'KG', true]],
    hist: [['12 Aug', 'Received 4 CRATE × $13.50', '$0.90 / KG', '$0.90']],
  },
  'RM-041': {
    lastReceipt: '1 BAG × $35.00 = $35.00',
    roles: [['base', 'KG', 'auto'], ['purchasing', 'BAG'], ['storage', 'KG'], ['recipe', 'G'], ['transfer', 'KG'], ['count', 'BAG'], ['serving', '—'], ['report', 'KG']],
    conv: [{ rule: '1 BAG = 50 KG', kind: 'fixed', sub: null, resolved: '1 BAG → 50 KG', eff: '01 Jan 2026', factor: 50, prefix: '1 BAG =', suffix: 'KG' }],
    resolution: [['BAG', '× 50 → KG'], ['G', '÷ 1000 → KG']], stockEx: null, costEx: null,
    freq: [['mk', 'monthly', 'BAG', false], ['kad', 'monthly', 'KG', false]],
    hist: [['01 Aug', 'Received 1 BAG × $35.00', '$0.70 / KG', '$0.70']],
  },
  'RM-050': {
    lastReceipt: '—',
    roles: [['base', 'KG', 'auto'], ['purchasing', 'BUCKET', 'warn'], ['storage', 'KG'], ['recipe', 'G'], ['transfer', 'KG'], ['count', 'KG'], ['serving', '—'], ['report', 'KG']],
    conv: [], resolution: [], stockEx: null, costEx: null,
    freq: [['mk', 'monthly', 'KG', false], ['rock', 'monthly', 'KG', false]],
    hist: [],
  },
  'SR-003': {
    lastReceipt: 'Production batch 4.2 KG',
    roles: [['base', 'KG', 'auto'], ['purchasing', '—'], ['storage', 'KG'], ['recipe', 'G'], ['transfer', 'KG'], ['count', 'KG'], ['serving', '—'], ['report', 'KG']],
    conv: [{ rule: '1 KG = 1000 G', kind: 'fixed', sub: 'system default', resolved: '1 KG → 1000 G', eff: '01 Jan 2026', factor: 1000, prefix: '1 KG =', suffix: 'G' }],
    resolution: [['G', '÷ 1000 → KG']], stockEx: null, costEx: 'Batch cost $14.28 ÷ 4.2 KG yield = $3.40 / KG',
    freq: [['mk', 'daily', 'KG', true], ['rock', 'daily', 'KG', true]],
    hist: [['11 Aug', 'Production 4.2 KG batch', '$3.40 / KG', '$3.40']],
  },
  'SR-007': {
    lastReceipt: 'Production batch 8 KG',
    roles: [['base', 'KG', 'auto'], ['purchasing', '—'], ['storage', 'KG'], ['recipe', 'G'], ['transfer', '—'], ['count', 'KG'], ['serving', '—'], ['report', 'KG']],
    conv: [{ rule: '1 KG = 1000 G', kind: 'fixed', sub: 'system default', resolved: '1 KG → 1000 G', eff: '01 Jan 2026', factor: 1000, prefix: '1 KG =', suffix: 'G' }],
    resolution: [['G', '÷ 1000 → KG']], stockEx: null, costEx: null,
    freq: [['mk', 'daily', 'KG', true]],
    hist: [['10 Aug', 'Production 8 KG batch', '$2.10 / KG', '$2.10']],
  },
  'PR-002': {
    lastReceipt: 'Production 140 PCS',
    roles: [['base', 'PCS', 'auto'], ['purchasing', '—'], ['storage', 'PCS'], ['recipe', 'PCS'], ['transfer', 'PCS'], ['count', 'PCS'], ['serving', '—'], ['report', 'PCS']],
    conv: [{ rule: '1 PCS = 95 G', kind: 'density', sub: 'avg piece weight — inverse auto', resolved: '1 PCS → 0.095 KG', eff: '01 Mar 2026', factor: 95, prefix: '1 PCS =', suffix: 'G' }],
    resolution: [['G', '÷ 95 → PCS'], ['KG', '× 10.53 → PCS']],
    stockEx: '140 PCS → 13.3 KG equivalent', costEx: 'Built-up: chicken $0.86 + marinade $0.17 + labor share $0.12 = $1.15 / PCS',
    freq: [['mk', 'daily', 'PCS', true], ['rock', 'daily', 'PCS', true]],
    hist: [['12 Aug', 'Production 140 PCS', '$1.15 / PCS', '$1.15'], ['11 Aug', 'Production 120 PCS', '$1.14 / PCS', '$1.14']],
  },
  'PR-005': {
    lastReceipt: 'Production 90 PCS',
    roles: [['base', 'PCS', 'auto'], ['purchasing', '—'], ['storage', 'PCS'], ['recipe', 'PCS'], ['transfer', 'PCS'], ['count', 'PCS'], ['serving', '—'], ['report', 'PCS']],
    conv: [{ rule: '1 PCS = 150 G', kind: 'fixed', sub: null, resolved: '1 PCS → 0.15 KG', eff: '01 Jan 2026', factor: 150, prefix: '1 PCS =', suffix: 'G' }],
    resolution: [['KG', '× 6.67 → PCS']], stockEx: null, costEx: null,
    freq: [['mk', 'daily', 'PCS', true], ['rock', 'daily', 'PCS', true]],
    hist: [['12 Aug', 'Production 90 PCS', '$0.95 / PCS', '$0.95']],
  },
  'MI-101': {
    lastReceipt: '—', posMap: 'TAOUK-SW-REG',
    roles: [['base', 'PCS', 'auto'], ['purchasing', '—'], ['storage', '—'], ['recipe', 'PCS'], ['transfer', '—'], ['count', '—'], ['serving', 'PCS'], ['report', 'PCS']],
    conv: [], resolution: [['PCS', '1 : 1 base']], stockEx: null,
    costEx: 'Skewer $1.15 + pita $0.11 + toum $0.09 + pickles $0.07 + fries $0.24 + wrap $0.04 + cup $0.07 + bag $0.09 = $1.86\nFood cost 27.5% · packaging 3.1% of $6.50',
    freq: [], hist: [],
  },
  'MI-108': {
    lastReceipt: '—', posMap: 'OJ-FRESH-12',
    roles: [['base', 'PCS', 'auto'], ['purchasing', '—'], ['storage', '—'], ['recipe', 'PCS'], ['transfer', '—'], ['count', '—'], ['serving', 'PCS'], ['report', 'PCS']],
    conv: [], resolution: [['PCS', '1 : 1 base']], stockEx: null,
    costEx: 'Oranges 0.65 KG × $0.90 = $0.59 + cup $0.07 + lid+straw $0.08 = $0.74\nFood cost 14.8% · packaging 3.8% of $4.00',
    freq: [], hist: [],
  },
  'PK-201': {
    lastReceipt: '2 CARTON × $40.00',
    roles: [['base', 'PCS', 'auto'], ['purchasing', 'CARTON'], ['storage', 'PACK'], ['recipe', 'PCS'], ['transfer', 'PCS'], ['count', 'PACK'], ['serving', '—'], ['report', 'PCS']],
    conv: [
      { rule: '1 CARTON = 20 PACK', kind: 'fixed', sub: 'chained: 1 PACK = 50 PCS → 1 CARTON = 1000 PCS', resolved: '1 CARTON → 1000 PCS', eff: '01 Jan 2026', factor: 20, prefix: '1 CARTON =', suffix: 'PACK' },
      { rule: '1 PACK = 50 PCS', kind: 'fixed', sub: null, resolved: '1 PACK → 50 PCS', eff: '01 Jan 2026', factor: 50, prefix: '1 PACK =', suffix: 'PCS' },
    ],
    resolution: [['CARTON', '× 20 × 50 → 1000 PCS'], ['PACK', '× 50 → PCS']],
    stockEx: '2 CARTON → 2000 PCS', costEx: '1 CARTON = $40.00 ÷ 1000 = $0.04 / PCS',
    freq: [['mk', 'monthly', 'PACK', false], ['rock', 'monthly', 'PACK', false]],
    hist: [['28 Jul', 'Received 2 CARTON × $40.00', '$0.04 / PCS', '$0.04']],
  },
  'PK-205': {
    lastReceipt: '—',
    roles: [['base', 'PCS', 'auto'], ['purchasing', 'SLEEVE', 'warn'], ['storage', 'SLEEVE'], ['recipe', 'PCS'], ['transfer', 'PCS'], ['count', 'SLEEVE'], ['serving', '—'], ['report', 'PCS']],
    conv: [], resolution: [], stockEx: null, costEx: null,
    freq: [['kad', 'monthly', 'SLEEVE', false]], hist: [],
  },
};

const money3 = (n: number) => money(n, { max: 3 });
const fmtN = (n: number) => String(Math.round(n * 1000) / 1000);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Sortable day key (month × 100 + day) — the demo world lives in a single year. */
const dayKey = (ts: string) => { const d = new Date(ts); return d.getMonth() * 100 + d.getDate(); };
/** Same key for a literal history date such as '19 Jul'; undefined when it does not parse. */
function literalDayKey(s: string): number | undefined {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})$/.exec(s.trim());
  if (!m) return undefined;
  const mo = MONTHS.indexOf(m[2][0].toUpperCase() + m[2].slice(1).toLowerCase());
  return mo < 0 ? undefined : mo * 100 + parseInt(m[1], 10);
}

/**
 * Last receipt + cost history straight from the shared ledger (deliveries for purchased items,
 * completed batches for recipe outputs). Receipt cost is the line's price per base unit; the
 * "new avg" column is the moving average the receipt posted.
 */
function ledgerHistory(item: Item, state: CoreState): { lastReceipt: string; hist: HistRow[]; deliveryHist: HistRow[]; firstDeliveryKey: number | undefined } {
  const base = item.base;
  const dl = state.deliveries
    .flatMap((d) => d.lines.filter((l) => l.itemId === item.id).map((l) => ({ ts: d.ts, l })))
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const bt = state.batches
    .filter((b) => b.itemId === item.id && b.status !== 'started' && b.outputQty)
    .sort((a, b) => ((a.completedAt ?? a.startedAt) < (b.completedAt ?? b.startedAt) ? 1 : -1));
  let lastReceipt = '—';
  if (dl.length) { const { l } = dl[0]; lastReceipt = `${fmtN(l.received)} ${l.unit} × ${money(l.unitPrice)} = ${money(l.received * l.unitPrice)}`; }
  else if (bt.length) { const b = bt[0]; lastReceipt = item.type === 'prep' ? `Production ${fmtN(b.outputQty ?? 0)} ${b.unit}` : `Production batch ${fmtN(b.outputQty ?? 0)} ${b.unit}`; }
  const deliveryHist: HistRow[] = dl.map(({ ts, l }) => {
    const perBase = l.baseQty > 0 ? (l.unitPrice * l.received) / l.baseQty : l.newAvg ?? item.cost;
    return [shortDate(ts), `Received ${fmtN(l.received)} ${l.unit} × ${money(l.unitPrice)}`, `${money3(perBase)} / ${base}`, money3(l.newAvg ?? item.cost)] as HistRow;
  });
  const batchHist: HistRow[] = bt.filter((b) => b.cost && b.outputQty).map((b) => [shortDate(b.completedAt ?? b.startedAt), `Production ${fmtN(b.outputQty ?? 0)} ${b.unit}${item.type === 'sub' ? ' batch' : ''}`, `${money3((b.cost ?? 0) / (b.outputQty ?? 1))} / ${base}`, money3((b.cost ?? 0) / (b.outputQty ?? 1))] as HistRow);
  const firstDeliveryKey = dl.length ? Math.min(...dl.map((x) => dayKey(x.ts))) : undefined;
  return { lastReceipt, hist: [...deliveryHist, ...batchHist], deliveryHist, firstDeliveryKey };
}

/**
 * Sensible generated defaults for store items that have no hand-written detail entry
 * (e.g. RM-060 pita, PK-210 paper bag, or items created from the "New item" form).
 * Conversions come from item.purchFactor; cost history / last receipt from the ledger.
 */
export function defaultDetail(item: Item, state: CoreState): ItemDetail {
  const base = item.base;
  const isMenu = item.type === 'menu';
  const hasPurch = !!item.purch && item.purch !== '—';
  const recipeUnit = base === 'KG' ? 'G' : base === 'L' ? 'ML' : base;
  const purchRow: RoleRow = item.incomplete ? ['purchasing', hasPurch ? item.purch : '—', 'warn'] : ['purchasing', hasPurch ? item.purch : '—'];
  const roles: RoleRow[] = [
    ['base', base, 'auto'], purchRow,
    ['storage', isMenu ? '—' : base], ['recipe', recipeUnit], ['transfer', isMenu ? '—' : base],
    ['count', isMenu ? '—' : base], ['serving', isMenu ? 'PCS' : '—'], ['report', base],
  ];
  const f = item.purchFactor;
  const purchConv = hasPurch && item.purch !== base && !!f && f > 0;
  const conv: ConvRow[] = [];
  const resolution: [string, string][] = [];
  if (!item.incomplete) {
    if (purchConv) {
      conv.push({ rule: `1 ${item.purch} = ${fmtN(f)} ${base}`, kind: 'fixed', sub: null, resolved: `1 ${item.purch} → ${fmtN(f)} ${base}`, eff: '01 Jan 2026', factor: f, prefix: `1 ${item.purch} =`, suffix: base });
      resolution.push([item.purch, `× ${fmtN(f)} → ${base}`]);
    }
    if (base === 'KG') {
      if (!purchConv) conv.push({ rule: '1 KG = 1000 G', kind: 'fixed', sub: 'system default', resolved: '1 KG → 1000 G', eff: '01 Jan 2026', factor: 1000, prefix: '1 KG =', suffix: 'G' });
      resolution.push(['G', '÷ 1000 → KG']);
    } else if (base === 'L') {
      if (!purchConv) conv.push({ rule: '1 L = 1000 ML', kind: 'fixed', sub: 'system default', resolved: '1 L → 1000 ML', eff: '01 Jan 2026', factor: 1000, prefix: '1 L =', suffix: 'ML' });
      resolution.push(['ML', '÷ 1000 → L']);
    }
    // Complete item that is bought, stored and counted in its base unit (menu items, RM-060 pita in PACK,
    // catalog items created by Purchasing): nothing to convert — the base resolves 1 : 1, like MI-101 in the prototype.
    if (conv.length === 0) resolution.push([base, '1 : 1 base']);
  }

  const { lastReceipt, hist } = ledgerHistory(item, state);

  const locs = (Object.keys(item.onHand) as LocId[]).filter((k) => item.onHand[k] != null);
  const daily = item.type !== 'pack' && !(item.shelf && /mo/.test(item.shelf));
  const freq: FreqRow[] = isMenu ? [] : locs.map((loc) => [loc, daily ? 'daily' : 'monthly', base, daily]);

  return {
    lastReceipt,
    posMap: isMenu ? `POS-${item.id}` : undefined,
    roles, conv, resolution,
    stockEx: purchConv ? `1 ${item.purch} → ${fmtN(f)} ${base}` : null,
    costEx: purchConv && item.cost > 0 ? `1 ${item.purch} = ${money(item.cost * f)} ÷ ${fmtN(f)} = ${money3(item.cost)} / ${base}` : null,
    freq, hist,
  };
}

/**
 * Hand-written detail when one exists, otherwise generated defaults. Costing history is always
 * reconciled with the shared ledger: receipts that live in `state.deliveries` are rendered from
 * the store (same dates and moving averages as Receiving / Stock card, and new receipts posted in
 * Receiving show up here), and only literal rows older than the first store delivery are kept.
 */
export function detailFor(item: Item, state: CoreState): ItemDetail {
  const literal = ITEM_DETAILS[item.id];
  if (!literal) return defaultDetail(item, state);
  const { lastReceipt, deliveryHist, firstDeliveryKey } = ledgerHistory(item, state);
  if (firstDeliveryKey === undefined) return literal;
  const older = literal.hist.filter((h) => { const k = literalDayKey(h[0]); return k !== undefined && k < firstDeliveryKey; });
  return { ...literal, lastReceipt, hist: [...deliveryHist, ...older] };
}

/**
 * Follow `1 X = f Y` rules forward from the purchasing unit to the base unit and return the product of
 * the factors along the shortest path (RM-001: BOX → KG = 10; PK-201: CARTON → PACK → PCS = 20 × 50).
 * Undefined when the item has no purchasing unit, buys in its base unit, or no path exists.
 */
export function resolvePurchFactor(purch: string, base: string, rows: Pick<ConvRow, 'prefix' | 'suffix' | 'factor'>[]): number | undefined {
  if (!purch || purch === '—' || purch === base) return undefined;
  const edges = rows.flatMap((r) => {
    const m = /^1\s+(.+?)\s*=$/.exec(r.prefix.trim());
    return m && r.factor > 0 ? [{ from: m[1].toUpperCase(), to: r.suffix.trim().toUpperCase(), f: r.factor }] : [];
  });
  const target = base.toUpperCase();
  const queue: { unit: string; f: number }[] = [{ unit: purch.toUpperCase(), f: 1 }];
  const seen = new Set<string>([purch.toUpperCase()]);
  while (queue.length) {
    const cur = queue.shift();
    if (!cur) break;
    for (const e of edges) {
      if (e.from !== cur.unit || seen.has(e.to)) continue;
      const f = cur.f * e.f;
      if (e.to === target) return Math.round(f * 1e6) / 1e6;
      seen.add(e.to);
      queue.push({ unit: e.to, f });
    }
  }
  return undefined;
}

/** Module-private persisted state for the Items module. */
export interface ItemsState {
  /** Versioned factor overrides, keyed `${itemId}:${convIndex}` — applies from today. */
  factors: Record<string, number>;
  /** Conversions added through the "Add conversion" form, per item. */
  extraConv: Record<string, ConvRow[]>;
}
export const ITEMS_SEED: ItemsState = { factors: {}, extraConv: {} };
