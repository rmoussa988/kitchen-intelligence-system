/**
 * Receiving / purchasing shared data helpers: price-variance bands, per-item price history,
 * biggest movers, supplier labels. Imported by purchasing, receiving and staff-receiving.
 */
import type { CoreState, Delivery, DeliveryLine, Supplier } from '../../store';
import { DEMO_TODAY } from '../../ui';

/** Prototype per-item price history (MGT-RCV-03 CHARTS) mapped onto seed item ids. Dates ISO. */
export const PRICE_SERIES: Record<string, { supplierId: string; unit: string; base: number; series: [number, string][] }> = {
  'RM-014': { supplierId: 'SUP-01', unit: 'CAN', base: 48.8, series: [[48.8, '2026-07-05'], [48.8, '2026-07-12'], [49.6, '2026-07-19'], [49.6, '2026-07-26'], [50, '2026-08-02'], [50, '2026-08-12']] },
  'RM-071': { supplierId: 'SUP-03', unit: 'KG', base: 12.25, series: [[12.25, '2026-06-01'], [12.25, '2026-06-20'], [12.8, '2026-07-05'], [13.6, '2026-07-18'], [14.75, '2026-07-28'], [14.75, '2026-08-11']] },
  'RM-022': { supplierId: 'SUP-03', unit: 'KG', base: 7.2, series: [[7.2, '2026-07-01'], [7.2, '2026-07-15'], [7.2, '2026-07-25'], [7.35, '2026-08-04'], [7.89, '2026-08-11']] },
};

export type Band = 'green' | 'amber' | 'red';
/** Prototype band(): strictly greater than the threshold. */
export function band(pct: number, amber: number, red: number): Band {
  const a = Math.abs(pct);
  return a > red ? 'red' : a > amber ? 'amber' : 'green';
}
export const BAND_STYLE: Record<Band, [string, string]> = { green: ['#E0E8DA', '#48603A'], amber: ['#F5E3B3', '#8A6D1F'], red: ['#F0CFC9', '#96382E'] };
export const BAND_DOT: Record<Band, string> = { green: '#48603A', amber: '#C99A2E', red: '#C0392B' };

export function pvLabel(pct: number): string {
  const r = Math.round(pct * 10) / 10;
  return r === 0 ? '0%' : (r > 0 ? '+' : '−') + Math.abs(r).toFixed(1) + '%';
}

/** $ with 2 decimals, or 3 when the value needs it (e.g. $3.108 avg cost). */
export function money3(n: number): string {
  const r3 = Math.round(n * 1000) / 1000;
  const dec = Math.abs(r3 * 100 - Math.round(r3 * 100)) > 1e-9 ? 3 : 2;
  return (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: dec });
}

/** All delivery lines for an item (oldest first) with their delivery. */
export function itemReceipts(state: CoreState, itemId: string, filter?: (d: Delivery) => boolean): { d: Delivery; l: DeliveryLine }[] {
  const out: { d: Delivery; l: DeliveryLine }[] = [];
  for (const d of state.deliveries) {
    if (filter && !filter(d)) continue;
    for (const l of d.lines) if (l.itemId === itemId) out.push({ d, l });
  }
  return out.sort((a, b) => a.d.ts.localeCompare(b.d.ts));
}

export interface SeriesInfo { itemId: string; supplierId?: string; unit: string; base: number; points: { v: number; date: string }[] }

/** Price history for an item: prototype series when present, else derived from delivery receipts. */
export function priceSeriesFor(state: CoreState, itemId: string): SeriesInfo {
  const it = state.items.find((i) => i.id === itemId);
  const unit = it && it.purch && it.purch !== '—' ? it.purch : (it?.base ?? '');
  const ps = PRICE_SERIES[itemId];
  if (ps) return { itemId, supplierId: ps.supplierId, unit: ps.unit, base: ps.base, points: ps.series.map(([v, date]) => ({ v, date })) };
  const rec = itemReceipts(state, itemId);
  if (rec.length) {
    const first = rec[0].l;
    return { itemId, supplierId: rec[rec.length - 1].d.supplierId, unit: first.unit, base: first.lastPrice ?? first.unitPrice, points: rec.map((r) => ({ v: r.l.unitPrice, date: r.d.ts })) };
  }
  const base = it ? Math.round(it.cost * (it.purchFactor ?? 1) * 100) / 100 : 0;
  return { itemId, supplierId: typeof it?.supplier === 'string' ? it.supplier : undefined, unit, base, points: [{ v: base, date: DEMO_TODAY }] };
}

/** Last purchase price per purchase unit: latest receipt line, else cost × factor. */
export function lastPriceFor(state: CoreState, itemId: string): number {
  const rec = itemReceipts(state, itemId);
  if (rec.length) return rec[rec.length - 1].l.unitPrice;
  const it = state.items.find((i) => i.id === itemId);
  return it ? Math.round(it.cost * (it.purchFactor ?? 1) * 100) / 100 : 0;
}

/** Latest delivery date (ISO ts) for an item, or null. */
export function lastDeliveryFor(state: CoreState, itemId: string): string | null {
  const rec = itemReceipts(state, itemId);
  return rec.length ? rec[rec.length - 1].d.ts : null;
}

/** Average purchase price per purchase unit across receipts (falls back to cost × factor). */
export function avgPriceFor(state: CoreState, itemId: string): number {
  const rec = itemReceipts(state, itemId);
  if (rec.length) return Math.round((rec.reduce((a, r) => a + r.l.unitPrice, 0) / rec.length) * 100) / 100;
  return lastPriceFor(state, itemId);
}

/** 90-day trend %: prototype series (base → last) when present, else latest receipt variance. */
export function trendFor(state: CoreState, itemId: string): number {
  const ps = PRICE_SERIES[itemId];
  if (ps) { const last = ps.series[ps.series.length - 1][0]; return Math.round(((last - ps.base) / ps.base) * 1000) / 10; }
  const rec = itemReceipts(state, itemId);
  if (rec.length) {
    const l = rec[rec.length - 1].l;
    if (l.variancePct != null) return l.variancePct;
    if (l.lastPrice) return Math.round(((l.unitPrice - l.lastPrice) / l.lastPrice) * 1000) / 10;
  }
  return 0;
}

export interface Mover { itemId: string; supplierId?: string; from: number; to: number; pv: number }

/** Biggest movers: prototype series items + every item seen on (in-scope) delivery lines, sorted by |variance|. */
export function computeMovers(state: CoreState, inScope: (loc: Delivery['loc']) => boolean): Mover[] {
  const seen = new Map<string, Mover>();
  for (const [id, ps] of Object.entries(PRICE_SERIES)) {
    if (!state.items.some((i) => i.id === id)) continue;
    const last = ps.series[ps.series.length - 1][0];
    seen.set(id, { itemId: id, supplierId: ps.supplierId, from: ps.base, to: last, pv: Math.round(((last - ps.base) / ps.base) * 1000) / 10 });
  }
  const sorted = state.deliveries.filter((d) => inScope(d.loc)).slice().sort((a, b) => b.ts.localeCompare(a.ts));
  for (const d of sorted) for (const l of d.lines) {
    if (seen.has(l.itemId)) continue;
    const from = l.lastPrice ?? l.unitPrice;
    const pv = l.variancePct ?? (from ? Math.round(((l.unitPrice - from) / from) * 1000) / 10 : 0);
    seen.set(l.itemId, { itemId: l.itemId, supplierId: d.supplierId, from, to: l.unitPrice, pv });
  }
  return [...seen.values()].sort((a, b) => Math.abs(b.pv) - Math.abs(a.pv));
}

/* ── Supplier labels ── */

export const SUPPLIER_CATS: Record<string, [string, string]> = {
  'SUP-01': ['Oils & dry goods', 'زيوت ومواد جافة'],
  'SUP-02': ['Poultry', 'دواجن'],
  'SUP-03': ['Dairy', 'ألبان وأجبان'],
  'SUP-04': ['Produce', 'خضار وفواكه'],
  'SUP-05': ['Preserves & tobacco', 'مخللات وتبغ'],
  'SUP-06': ['Bakery', 'مخبوزات'],
  'SUP-07': ['Packaging', 'تغليف'],
};

export function supplierCat(state: CoreState, sup: Supplier, isAr: boolean): string {
  const m = sup.meta?.cat;
  if (typeof m === 'string') return m;
  if (m && typeof m === 'object') { const o = m as { en?: string; ar?: string }; return (isAr ? o.ar : o.en) ?? o.en ?? ''; }
  const c = SUPPLIER_CATS[sup.id];
  if (c) return c[isAr ? 1 : 0];
  const it = state.items.find((i) => i.id === sup.products[0]);
  return it ? (isAr ? (it.catAr ?? it.cat) : it.cat) : (isAr ? 'عام' : 'General');
}

export function termsLabel(terms: string, isAr: boolean): string {
  if (!isAr) return terms;
  const m: Record<string, string> = { 'Net 15': '١٥ يوماً', 'Net 30': '٣٠ يوماً', 'Net 7': '٧ أيام', COD: 'نقداً عند التسليم', Weekly: 'أسبوعياً' };
  return m[terms] ?? terms;
}

export function supName(sup: Supplier | undefined, isAr: boolean): string {
  return sup ? (isAr && sup.nameAr ? sup.nameAr : sup.name) : '—';
}

/** Whether an ISO ts falls on the demo day. */
export function isToday(ts: string): boolean { return ts.slice(0, 10) === DEMO_TODAY.slice(0, 10); }

/** "12 Aug 09:24" style date-time label. */
export function dateTime(ts: string, isAr: boolean): string {
  const d = new Date(ts);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONA = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${String(d.getDate()).padStart(2, '0')} ${(isAr ? MONA : MON)[d.getMonth()]} ${hm}`;
}
