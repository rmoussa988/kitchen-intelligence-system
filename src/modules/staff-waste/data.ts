import type { Item, LocId, User } from '../../store';

/**
 * The prototype's tile set, mapped to seed item ids. `factor` converts the entered unit to the item's
 * base unit (Rule-7), `base` is the note shown under the quantity.
 */
export interface TileDef { id: string; unit: string; unitAr: string; factor: number; base: string }

export const TILES: TileDef[] = [
  { id: 'PR-002', unit: 'PCS', unitAr: 'قطعة', factor: 1, base: 'PCS base' },
  { id: 'RM-060', unit: 'PCS', unitAr: 'قطعة', factor: 0.1, base: '10 PCS = 1 PACK' },
  { id: 'RM-061', unit: 'KG', unitAr: 'كغ', factor: 1, base: 'KG base' },
  { id: 'RM-062', unit: 'KG', unitAr: 'كغ', factor: 1, base: 'KG base' },
  { id: 'RM-063', unit: 'KG', unitAr: 'كغ', factor: 1, base: 'KG base' },
  { id: 'RM-022', unit: 'KG', unitAr: 'كغ', factor: 1, base: 'KG base' },
  { id: 'SR-003', unit: 'KG', unitAr: 'كغ', factor: 1, base: 'KG base' },
  { id: 'PR-005', unit: 'PCS', unitAr: 'قطعة', factor: 1, base: '1 PCS = 150 G' },
  { id: 'SR-009', unit: 'KG', unitAr: 'كغ', factor: 1, base: 'KG base' },
  { id: 'RM-064', unit: 'L', unitAr: 'لتر', factor: 1, base: 'L base' },
  { id: 'RM-050', unit: 'KG', unitAr: 'كغ', factor: 1, base: 'KG base' },
  { id: 'RM-014', unit: 'L', unitAr: 'لتر', factor: 1, base: '16 L = 1 CAN' },
];

export const UNIT_AR: Record<string, string> = {
  PCS: 'قطعة', KG: 'كغ', L: 'لتر', PACK: 'ربطة', CAN: 'تنكة', BOX: 'صندوق', BAG: 'كيس', CRATE: 'صندوق', BUCKET: 'دلو', CARTON: 'كرتونة', SLEEVE: 'كم', G: 'غ',
};

export interface Product { item: Item; unit: string; unitAr: string; factor: number; base: string; cost: number }

/** Prototype tiles first (those present in the store), then every other stocked item held at the station. */
export function buildProducts(items: Item[], loc: LocId): Product[] {
  const out: Product[] = [];
  for (const td of TILES) {
    const it = items.find((i) => i.id === td.id);
    if (it && it.stocked) out.push({ item: it, unit: td.unit, unitAr: td.unitAr, factor: td.factor, base: td.base, cost: it.cost * td.factor });
  }
  for (const it of items) {
    if (!it.stocked || out.some((p) => p.item.id === it.id)) continue;
    if (it.onHand[loc] === undefined) continue;
    out.push({ item: it, unit: it.base, unitAr: UNIT_AR[it.base] ?? it.base, factor: 1, base: `${it.base} base`, cost: it.cost });
  }
  return out;
}

/** Station location of the tablet user: Main Kitchen for MK-scoped staff (Karim / Ziad), else their first location. */
export function stationLoc(user: User | undefined): LocId {
  if (!user || user.scope === 'all') return 'mk';
  if (typeof user.scope === 'string') return user.scope;
  if (user.scope.includes('mk')) return 'mk';
  return user.scope[0] ?? 'mk';
}
