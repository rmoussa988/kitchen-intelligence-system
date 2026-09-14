import type { Alert, Batch, CoreState } from '../../store';

const T = (d: string, hm: string) => `2026-08-${d}T${hm}:00`;

/**
 * Prototype gap rows (MGT-PRD-06 BATCHES: 6 taouk · 2 patties · 1 toum) mapped onto the seed world — Main Kitchen,
 * ≤ 12 Aug 2026, chicken $4.80/KG, beef mince $6.20/KG, garlic $2.40/KG. The shared seed already carries four taouk
 * batches (08–11 Aug) and one patties batch (11 Aug); these rows complete the prototype's table.
 * Merged on mount only if absent (ids stay in the seed's SHW-/PAT-YYYYMMDD-NNN family).
 */
export const EXTRA_BATCHES: Batch[] = [
  // prototype PRD-0809-2 · 16.0 → 17.5 KG · +1.5 KG (+9.4%) · −$7.20 · marinade +0.3 KG · Hassan
  { id: 'SHW-20260806-001', itemId: 'PR-002', loc: 'mk', employee: 'U-05', startedAt: T('06', '08:20'), completedAt: T('06', '11:35'), status: 'approved', plannedQty: 170, unit: 'PCS', inputMode: 'draw', rawItemId: 'RM-001', rawDrawn: 30, rawReturned: 12.5, rawUsed: 17.5, trimWaste: 0.7, marinadeRecommended: 2.9, marinadeUsed: 3.2, outputQty: 160, standardPerUnit: 0.1, gapKg: 1.5, gapPct: 9.4, gapUsd: 7.2, gapStatus: 'accepted', cost: 184, yieldPct: 92 },
  // prototype PRD-0815-2 · 12.0 → 13.1 KG · +1.1 KG (+9.2%) · −$5.28 · marinade +0.2 KG — still awaiting review
  { id: 'SHW-20260807-001', itemId: 'PR-002', loc: 'mk', employee: 'U-04', startedAt: T('07', '08:30'), completedAt: T('07', '11:20'), status: 'approved', plannedQty: 130, unit: 'PCS', inputMode: 'commit', rawItemId: 'RM-001', rawUsed: 13.1, trimWaste: 0.5, marinadeRecommended: 2.15, marinadeUsed: 2.35, outputQty: 120, standardPerUnit: 0.1, gapKg: 1.1, gapPct: 9.2, gapUsd: 5.28, gapStatus: 'open', cost: 138, yieldPct: 93 },
  // prototype PRD-0816-2 · 12.0 → 12.3 KG · +0.3 KG (+2.5%) — still awaiting review
  { id: 'PAT-20260809-001', itemId: 'PR-005', loc: 'mk', employee: 'U-04', startedAt: T('09', '13:10'), completedAt: T('09', '14:15'), status: 'approved', plannedQty: 80, unit: 'PCS', inputMode: 'commit', rawItemId: 'RM-065', rawUsed: 12.3, trimWaste: 0.2, outputQty: 80, standardPerUnit: 0.15, gapKg: 0.3, gapPct: 2.5, gapUsd: 1.86, gapStatus: 'open', cost: 76, yieldPct: 98 },
];

/**
 * Gap fields the shared seed omits on batches it already marks as gap-reviewed. Toum (prototype PRD-0816-3, +4.3%):
 * 4.9 KG out × 0.313 KG garlic standard = 1.53 KG vs 1.6 KG used → +0.07 KG (+4.3%) · 0.07 × $2.40 = −$0.17.
 * Applied field-by-field, only where the field is still undefined.
 */
export const GAP_PATCHES: Record<string, Pick<Batch, 'standardPerUnit' | 'gapKg' | 'gapPct' | 'gapUsd'>> = {
  'TOM-20260812-001': { standardPerUnit: 0.313, gapKg: 0.07, gapPct: 4.3, gapUsd: 0.17 },
};

/** The open ≥ alert-threshold batch above carries the same alert the staff flow raises (cf. seed AL-004); accepting it dismisses this. */
export const EXTRA_ALERTS: Alert[] = [
  { id: 'AL-PG01', ts: T('07', '11:25'), severity: 'amber', type: 'production_gap', en: 'Batch SHW-20260807-001 gap +1.1 KG (+9.2%) vs recipe', ar: 'فجوة الدفعة SHW-20260807-001 +١٫١ كغ (+٩٫٢٪) عن الوصفة', loc: 'mk', moduleId: 'production-gaps' },
];

/** Mount-time merge into the shared store: patches only undefined fields, pushes only absent rows (alerts ride with their batch). */
export function mergeGapSeed(d: CoreState): void {
  for (const [id, p] of Object.entries(GAP_PATCHES)) {
    const b = d.batches.find((x) => x.id === id);
    if (!b) continue;
    if (b.standardPerUnit == null) b.standardPerUnit = p.standardPerUnit;
    if (b.gapKg == null) b.gapKg = p.gapKg;
    if (b.gapPct == null) b.gapPct = p.gapPct;
    if (b.gapUsd == null) b.gapUsd = p.gapUsd;
  }
  for (const x of EXTRA_BATCHES) {
    if (d.batches.some((y) => y.id === x.id)) continue;
    d.batches.push({ ...x });
    for (const a of EXTRA_ALERTS) if (a.en.includes(x.id) && !d.alerts.some((y) => y.id === a.id)) d.alerts.push({ ...a });
  }
}
