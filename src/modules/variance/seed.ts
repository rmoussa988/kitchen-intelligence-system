import type { Movement } from '../../store';

/**
 * Seed extension for the variance investigations (CONVENTIONS "Extending seed data").
 *
 * The two open cases reconcile against the 12 Aug physical counts (CNT-0812-MK / CNT-0812-RK),
 * but the base seed only carried the 11 Aug counts (MV-0013 / MV-0014, source CNT-11Aug-Rock).
 * These records make the 12 Aug count refs real so the reconciliation last-row link (CNT-…),
 * the header source/date and the stock-card history all describe the same count.
 *
 * Merged on mount only when absent — ids are unique and consistent with the seed's world
 * (Main Kitchen / Rock, USD, Aug 2026, items RM-/PR-).
 */
export const EXTRA_MOVEMENTS: Movement[] = [
  // Chicken breast @ Main Kitchen — 38.2 KG physical vs 41.5 KG expected → −3.3 KG (−$15.84)
  { id: 'MV-0020', ts: '2026-08-12T07:42:00', itemId: 'RM-001', loc: 'mk', type: 'count', qty: -3.3, enteredQty: 3.3, enteredUnit: 'KG', value: -15.84, source: 'CNT-0812-MK', sourceKind: 'count', beyondTolerance: true, user: 'U-03', note: 'Physical count 38.2 KG vs expected 41.5 KG' },
  // Marinated taouk skewer @ Rock — 46 PCS physical vs 52 PCS expected → −6 PCS (−$6.90)
  { id: 'MV-0021', ts: '2026-08-12T22:05:00', itemId: 'PR-002', loc: 'rock', type: 'count', qty: -6, enteredQty: 6, enteredUnit: 'PCS', value: -6.9, source: 'CNT-0812-RK', sourceKind: 'count', beyondTolerance: true, user: 'U-06', note: 'Physical count 46 PCS vs expected 52 PCS' },
];
