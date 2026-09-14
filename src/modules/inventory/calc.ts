import type { Item, LocId, Movement } from '../../store';
import type { VarStatus } from './data';

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Chronological sort (ts, then id) — 'desc' for newest first. */
export function sortMoves(ms: Movement[], dir: 'asc' | 'desc' = 'asc'): Movement[] {
  const s = [...ms].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return dir === 'asc' ? s : s.reverse();
}

/** On-hand balance after each movement (per item+location), anchored on the current on-hand and walked backwards. */
export function balanceMap(items: Item[], movements: Movement[]): Map<string, number> {
  const byKey = new Map<string, Movement[]>();
  for (const m of movements) {
    const k = m.itemId + '|' + m.loc;
    const list = byKey.get(k);
    if (list) list.push(m); else byKey.set(k, [m]);
  }
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const out = new Map<string, number>();
  for (const [k, list] of byKey) {
    const [itemId, loc] = k.split('|') as [string, LocId];
    const it = itemMap.get(itemId);
    if (!it || !it.stocked) continue;
    let bal = it.onHand[loc] ?? 0;
    for (const m of sortMoves(list, 'desc')) { out.set(m.id, r3(bal)); bal -= m.qty; }
  }
  return out;
}

export type StmtKey = 'received' | 'prodIn' | 'used' | 'sold' | 'waste' | 'transfers' | 'adjustments';
export interface StmtRow { key: StmtKey; op: string; value: number; refs: string[]; signed: boolean; detail?: string }

export interface CardCalc {
  onHand: number; opening: number; expected: number; physical: number;
  countAdj: number; countValue: number; countRefs: string[]; countBeyond: boolean;
  status: VarStatus; low: boolean;
  rows: StmtRow[];
  moves: Movement[]; // newest first
  spark: number[]; // 14 daily closing balances, oldest first
}

/** Opening → closing statement for one item at one location, computed from the ledger. */
export function calcCard(item: Item, loc: LocId, movements: Movement[], tolPct: number, today: string): CardCalc {
  const asc = sortMoves(movements.filter((m) => m.itemId === item.id && m.loc === loc), 'asc');
  const pick = (f: (m: Movement) => boolean) => asc.filter(f);
  const sum = (ms: Movement[]) => r3(ms.reduce((a, m) => a + m.qty, 0));
  const refs = (ms: Movement[]) => Array.from(new Set(ms.map((m) => m.source)));

  const rcv = pick((m) => m.type === 'receiving');
  const pin = pick((m) => m.type === 'production_in');
  const pout = pick((m) => m.type === 'production_out');
  const sale = pick((m) => m.type === 'sale');
  const wst = pick((m) => m.type === 'waste');
  const trf = pick((m) => m.type === 'transfer_in' || m.type === 'transfer_out');
  const adj = pick((m) => m.type === 'adjustment');
  const cnt = pick((m) => m.type === 'count');

  const onHand = item.onHand[loc] ?? 0;
  const total = sum(asc);
  const countAdj = sum(cnt);
  const countValue = r2(cnt.reduce((a, m) => a + m.value, 0));
  const opening = r3(onHand - total);
  const expected = r3(onHand - countAdj);
  const physical = r3(expected + countAdj);
  const countBeyond = cnt.some((m) => !!m.beyondTolerance);
  const pct = expected > 0 ? (Math.abs(countAdj) / expected) * 100 : 0;
  const status: VarStatus = countAdj > 0 ? 'fav' : countAdj < 0 && (countBeyond || pct > tolPct) ? 'unfav' : 'within';

  const transfers = sum(trf);
  const rcvDetail = rcv.length === 1 && rcv[0].enteredUnit && rcv[0].enteredUnit !== item.base
    ? `${fmtQ(rcv[0].enteredQty ?? Math.abs(rcv[0].qty))} ${rcv[0].enteredUnit} · ${rcv[0].source}` : undefined;
  const canReceive = !item.isRecipe;
  const isProducer = item.type === 'raw' || item.type === 'sub';

  // Inflows first, then outflows (net transfers sit with whichever side they fall on), adjustments last.
  const trfRow: StmtRow = { key: 'transfers', op: '±', value: transfers, refs: refs(trf), signed: true };
  const candidates: { row: StmtRow; show: boolean }[] = [
    { row: { key: 'received', op: '+', value: sum(rcv), refs: refs(rcv), signed: false, detail: rcvDetail }, show: canReceive || rcv.length > 0 },
    { row: { key: 'prodIn', op: '+', value: sum(pin), refs: refs(pin), signed: false }, show: pin.length > 0 },
    { row: trfRow, show: transfers > 0 },
    { row: { key: 'used', op: '−', value: Math.abs(sum(pout)), refs: refs(pout), signed: false }, show: isProducer || pout.length > 0 },
    { row: { key: 'sold', op: '−', value: Math.abs(sum(sale)), refs: refs(sale), signed: false }, show: sale.length > 0 },
    { row: { key: 'waste', op: '−', value: Math.abs(sum(wst)), refs: refs(wst), signed: false }, show: true },
    { row: trfRow, show: transfers <= 0 },
    { row: { key: 'adjustments', op: '±', value: sum(adj), refs: refs(adj), signed: true }, show: adj.length > 0 },
  ];
  const rows: StmtRow[] = candidates.filter((c) => c.show).map((c) => c.row);

  // 14-day closing balances (walk back from today's on-hand)
  const base = new Date(today);
  const spark: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const endIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T23:59:59`;
    const after = asc.filter((m) => m.ts > endIso).reduce((a, m) => a + m.qty, 0);
    spark.push(r3(onHand - after));
  }

  return {
    onHand, opening, expected, physical, countAdj, countValue, countRefs: refs(cnt), countBeyond, status,
    low: item.min != null && onHand < item.min,
    rows, moves: [...asc].reverse(), spark,
  };
}

function fmtQ(n: number): string {
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString('en-US', { minimumFractionDigits: r % 1 ? 1 : 0, maximumFractionDigits: 2 });
}
