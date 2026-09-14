/**
 * P&L demo data (from the prototype) + live overlay from the shared store.
 *
 * The prototype's statement figures are the BASELINE per location (the reconciled 12-Aug snapshot). What
 * the user does at runtime in other modules (approve waste, confirm a transfer, receive a delivery, accept a
 * count) is applied as a DELTA on top of that baseline, so the statement keeps adding up:
 *   beginning + purchases + transfers in − transfers out − consumption − waste (± count adj) = expected ending
 * and the physical value follows the same runtime activity.
 *
 * The delta is derived ONLY from movements posted AFTER the demo snapshot (`RUNTIME_CUTOFF`). Everything at
 * or before the cutoff is the seed / demo world and is already contained in BASE. This matters because other
 * modules merge demo records into the store on mount (receiving pushes halloumi + extra deliveries,
 * invoice-pipeline / transfers / search push their own rows, and two of them even collide on an id) — those
 * merges push records/items but never post movements, so a movement-based delta ignores them entirely and the
 * headline reconciliation no longer depends on which modules the user happened to visit.
 */
import type { CoreState, LocId } from '../../store';
import { DEMO_TODAY } from '../../ui';

export const LOCS: LocId[] = ['mk', 'rock', 'kad'];

/** Records at/before the demo snapshot are seed/demo (already in BASE); later ones are runtime activity. */
const RUNTIME_CUTOFF = DEMO_TODAY; // '2026-08-12T09:30:00' — seed movements end 09:05, store.now() starts 09:33

export interface BaseFig {
  sales: number | null; beg: number; purch: number; trfIn: number; trfOut: number; cons: number; waste: number;
  end: number; phys: number; foodPct: number | null; wastePct: number; contrib: number | null;
}

/** Prototype DATA — verbatim. */
export const BASE: Record<LocId, BaseFig> = {
  mk: { sales: null, beg: 10104, purch: 8900, trfIn: 0, trfOut: 6368, cons: 0, waste: 186, end: 12450, phys: 12434, foodPct: null, wastePct: 1.0, contrib: null },
  rock: { sales: 18240, beg: 2980, purch: 310, trfIn: 5128, trfOut: 0, cons: 5120, waste: 118, end: 3180, phys: 3157, foodPct: 28.1, wastePct: 0.6, contrib: 13120 },
  kad: { sales: 4160, beg: 1650, purch: 240, trfIn: 1240, trfOut: 0, cons: 1118, waste: 92, end: 1920, phys: 1920, foodPct: 26.9, wastePct: 2.2, contrib: 3042 },
};

/** Runtime delta per location, at cost. All zero on a fresh seed and after any seed-merge on mount. */
export interface LiveSums { stock: number; waste: number; trfIn: number; trfOut: number; purch: number; count: number }

const zero = (): Record<LocId, LiveSums> => ({
  mk: { stock: 0, waste: 0, trfIn: 0, trfOut: 0, purch: 0, count: 0 },
  rock: { stock: 0, waste: 0, trfIn: 0, trfOut: 0, purch: 0, count: 0 },
  kad: { stock: 0, waste: 0, trfIn: 0, trfOut: 0, purch: 0, count: 0 },
});

/**
 * Runtime activity since the demo snapshot, from post-cutoff movements only.
 * `value` is the signed $ impact at cost, so it drives both the physical valuation (`stock`, every movement)
 * and the matching statement line (purchases / waste / transfers in-out / count adjustment) — the two move in
 * lockstep, keeping every runtime action reconciled instead of opening a phantom variance.
 */
export function liveDeltas(state: CoreState): Record<LocId, LiveSums> {
  const out = zero();
  for (const mv of state.movements) {
    if (mv.ts <= RUNTIME_CUTOFF) continue; // seed / demo record → already in BASE, no delta
    const s = out[mv.loc];
    if (!s) continue;
    s.stock += mv.value; // physical valuation follows every runtime movement
    switch (mv.type) {
      case 'receiving': s.purch += mv.value; break; // value > 0
      case 'waste': s.waste += -mv.value; break; // value < 0 → positive waste $
      case 'transfer_in': s.trfIn += mv.value; break; // value > 0
      case 'transfer_out': s.trfOut += -mv.value; break; // value < 0 → positive transfers-out $
      case 'count': s.count += mv.value; break; // signed book adjustment (reconciles the count)
      default: break; // adjustment / production / sale → physical only
    }
  }
  return out;
}

export interface Figures {
  sales: number | null; beg: number; purch: number; trfIn: number; trfOut: number; cons: number; waste: number;
  end: number; phys: number; wastePct: number | null; contrib: number | null;
}

/** Baseline + runtime delta for one location. */
export function figuresFor(loc: LocId, dl: LiveSums): Figures {
  const b = BASE[loc];
  const purch = b.purch + dl.purch, trfIn = b.trfIn + dl.trfIn, trfOut = b.trfOut + dl.trfOut, waste = b.waste + dl.waste;
  // A count acceptance posts a `count` movement: it lowers physical onHand (via dl.stock) AND trues the book
  // down by the same amount here (dl.count), so accepting a count reconciles it instead of widening the variance.
  const end = b.beg + purch + trfIn - trfOut - b.cons - waste + dl.count;
  const phys = b.phys + dl.stock;
  return {
    sales: b.sales, beg: b.beg, purch, trfIn, trfOut, cons: b.cons, waste, end, phys,
    wastePct: b.sales ? (waste / b.sales) * 100 : b.wastePct,
    contrib: b.sales ? b.sales - b.cons : null,
  };
}

/**
 * Combined roll-up: transfers net to zero in a balanced world (the same skewer's cost sits in MK's output and
 * Rock's input). But if a transfer is confirmed at runtime while its send belongs to a prior period, the two
 * legs no longer cancel — so surface the in-transit NET (Σ in − Σ out) as the transfer row instead of forcing
 * both to 0. The ending stock stays the sum of per-location ends, and the statement keeps adding up.
 */
export function combined(per: Record<LocId, Figures>): Figures {
  const sum = (f: (x: Figures) => number) => LOCS.reduce((a, k) => a + f(per[k]), 0);
  const sales = sum((x) => x.sales ?? 0);
  const net = sum((x) => x.trfIn) - sum((x) => x.trfOut); // 0 when balanced → prototype's netted 0/0 view
  return {
    sales, beg: sum((x) => x.beg), purch: sum((x) => x.purch),
    trfIn: net > 0 ? net : 0, trfOut: net < 0 ? -net : 0,
    cons: sum((x) => x.cons), waste: sum((x) => x.waste),
    end: sum((x) => x.end), phys: sum((x) => x.phys),
    wastePct: sales ? (sum((x) => x.waste) / sales) * 100 : null,
    contrib: sum((x) => x.contrib ?? 0),
  };
}

/** Prototype `m()` — whole dollars, thousands separators, no sign. */
export const m = (n: number) => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');

/** Prototype `fmtRange()` — "1–12 Aug 2026" / "28 Jul – 12 Aug 2026". */
export function fmtRange(from: string, to: string, mon: readonly string[]): string {
  const pf = from.split('-').map(Number), pt = to.split('-').map(Number);
  const df = pf[2], mf = pf[1] - 1, yf = pf[0], dt = pt[2], mt = pt[1] - 1, yt = pt[0];
  if (yf === yt && mf === mt) return `${df}–${dt} ${mon[mf]} ${yf}`;
  if (yf === yt) return `${df} ${mon[mf]} – ${dt} ${mon[mt]} ${yf}`;
  return `${df} ${mon[mf]} ${yf} – ${dt} ${mon[mt]} ${yt}`;
}
