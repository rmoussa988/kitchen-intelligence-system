import type { Movement } from '../../store';

const T = (d: string, hm: string) => `2026-08-${d}T${hm}:00`;

/**
 * Extra ledger rows from the prototype's LEDGER (only items that exist in the seed, no duplicates of seed rows,
 * nothing that contradicts the seed's transfer states). Merged on mount when absent — ids MV-01xx.
 * Consumption rows keep every item+location opening balance non-negative against the seed on-hand.
 */
export const EXTRA_MOVEMENTS: Movement[] = [
  { id: 'MV-0101', ts: T('12', '12:40'), itemId: 'MI-101', loc: 'rock', type: 'sale', qty: -41, enteredQty: 41, enteredUnit: 'PCS', value: -76.26, source: 'POS 12 Aug', sourceKind: 'sale' },
  // 'PRD-0812-2' is an illustrative production run with no batch record in the store — keep the ref inert (no sourceKind) as in the prototype, rather than navigating to a batch that doesn't exist.
  { id: 'MV-0102', ts: T('12', '11:58'), itemId: 'RM-001', loc: 'mk', type: 'production_out', qty: -27.5, enteredQty: 27.5, enteredUnit: 'KG', value: -132, source: 'PRD-0812-2', user: 'U-04' },
  { id: 'MV-0103', ts: T('12', '10:15'), itemId: 'RM-035', loc: 'kad', type: 'sale', qty: -26, enteredQty: 26, enteredUnit: 'KG', value: -23.4, source: 'POS 12 Aug', sourceKind: 'sale', note: 'juice recipes' },
  { id: 'MV-0104', ts: T('12', '09:30'), itemId: 'RM-014', loc: 'mk', type: 'waste', qty: -6, enteredQty: 6, enteredUnit: 'L', value: -18.75, source: 'WST-118', sourceKind: 'waste', note: 'Spill', user: 'U-05' },
  { id: 'MV-0105', ts: T('12', '08:05'), itemId: 'RM-014', loc: 'mk', type: 'production_out', qty: -66, enteredQty: 66, enteredUnit: 'L', value: -206.25, source: 'PRD-0812-2', note: 'marinade + frying', user: 'U-04' },
  { id: 'MV-0106', ts: T('11', '17:44'), itemId: 'RM-050', loc: 'rock', type: 'adjustment', qty: -0.8, enteredQty: 0.8, enteredUnit: 'KG', value: -1.52, source: 'ADJ-077', sourceKind: 'adjustment', user: 'U-02' },
  { id: 'MV-0107', ts: T('11', '15:02'), itemId: 'RM-068', loc: 'kad', type: 'waste', qty: -1.5, enteredQty: 1.5, enteredUnit: 'KG', value: -4.2, source: 'WST-117', sourceKind: 'waste', note: 'expired batch', user: 'U-07' },
];
