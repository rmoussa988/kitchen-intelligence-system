import type { CoreState, Item } from '../../store';

/**
 * Store entities the classic batch flow needs but the shared seed lacks:
 *  1. the four SAVED recipe outputs (ids = recipe prefixes HMS/TAB/SMR/FLF, as the batch flow references them),
 *  2. the four batch ingredients the shared seed never carried (Wooden skewers, Salt, Seasoning mix, Breadcrumbs).
 * Without them the flow recorded batches whose output never entered stock and Monitoring/search rendered a bare
 * prefix as the product name. Item costs match the recipe-book costs so the on-screen batch cost is unchanged;
 * production_in then recomputes the moving average. Merged on mount only when absent (idempotent, per CONVENTIONS).
 */
export const EXTRA_ITEMS: Item[] = [
  // ── SAVED recipe outputs (isRecipe, id = recipe prefix) ──
  { id: 'HMS', en: 'Hummus', ar: 'حمّص', type: 'prep', cat: 'Mezze', catAr: 'مقبّلات', base: 'KG', purch: '—', cost: 2.07, stocked: true, isRecipe: true, shelf: '3 d', min: 3, max: 20, onHand: { mk: 6 } },
  { id: 'TAB', en: 'Tabbouleh mix', ar: 'خلطة تبولة', type: 'prep', cat: 'Mezze', catAr: 'مقبّلات', base: 'KG', purch: '—', cost: 2.50, stocked: true, isRecipe: true, shelf: '2 d', min: 2, max: 15, onHand: { mk: 5 } },
  { id: 'SMR', en: 'Shawarma marinade', ar: 'تتبيلة شاورما', type: 'sub', cat: 'Sauces', catAr: 'صلصات', base: 'KG', purch: '—', cost: 2.65, stocked: true, isRecipe: true, shelf: '3 d', min: 2, max: 12, onHand: { mk: 3 } },
  { id: 'FLF', en: 'Falafel mix', ar: 'خلطة فلافل', type: 'prep', cat: 'Proteins', catAr: 'بروتينات', base: 'KG', purch: '—', cost: 1.91, stocked: true, isRecipe: true, shelf: '2 d', min: 4, max: 24, onHand: { mk: 8 } },
  // ── unmapped batch ingredients ──
  { id: 'PK-215', en: 'Wooden skewers', ar: 'أسياخ خشبية', type: 'pack', cat: 'Packaging', catAr: 'تغليف', base: 'PCS', purch: 'BOX', purchFactor: 1000, cost: 0.02, supplier: 'SUP-07', stocked: true, min: 500, max: 5000, onHand: { mk: 3000 } },
  { id: 'RM-071', en: 'Salt', ar: 'ملح', type: 'raw', cat: 'Dry goods', catAr: 'مواد جافة', base: 'KG', purch: 'BAG', purchFactor: 25, cost: 0.50, supplier: 'SUP-01', stocked: true, shelf: '24 mo', min: 5, max: 40, onHand: { mk: 18 } },
  { id: 'SR-011', en: 'Seasoning mix', ar: 'خلطة بهارات', type: 'sub', cat: 'Spices', catAr: 'بهارات', base: 'KG', purch: '—', cost: 4.00, stocked: true, isRecipe: true, shelf: '6 mo', min: 1, max: 8, onHand: { mk: 3 } },
  { id: 'RM-072', en: 'Breadcrumbs', ar: 'بقسماط', type: 'raw', cat: 'Bakery', catAr: 'مخبوزات', base: 'KG', purch: 'BAG', purchFactor: 10, cost: 1.20, supplier: 'SUP-06', stocked: true, shelf: '3 mo', min: 2, max: 15, onHand: { mk: 6 } },
];

/** Mount-time merge into the shared store: pushes only absent items. */
export function mergeStaffBatchSeed(d: CoreState): void {
  for (const x of EXTRA_ITEMS) if (!d.items.some((y) => y.id === x.id)) d.items.push({ ...x });
}
