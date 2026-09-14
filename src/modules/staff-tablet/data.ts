import type { LocId } from '../../store';

/** Station of the tablet user (prototype: Rock counts / orders / receives; fulfillment happens at Main Kitchen). */
export const STATION: LocId = 'rock';
export const KITCHEN: LocId = 'mk';

export const UNIT_AR: Record<string, string> = {
  PCS: 'قطعة', KG: 'كغ', L: 'لتر', PACK: 'ربطة', CAN: 'تنكة', BOX: 'صندوق', BAG: 'كيس', CRATE: 'صندوق', BUCKET: 'دلو', CARTON: 'كرتونة', SLEEVE: 'كم', G: 'غ',
};
export const unitAr = (u: string) => UNIT_AR[u] ?? u;

/** Guided count list (prototype COUNT_ITEMS mapped to seed ids). `factor` = base units per count unit. */
export interface CountDef { id: string; unit: string; unitAr: string; ini: string; factor: number; note?: string }

export const COUNT_ITEMS: CountDef[] = [
  { id: 'RM-001', unit: 'KG', unitAr: 'كغ', ini: 'CB', factor: 1 },
  { id: 'PR-002', unit: 'PCS', unitAr: 'قطعة', ini: 'TS', factor: 1 },
  { id: 'RM-014', unit: 'CAN', unitAr: 'تنكة', ini: 'SO', factor: 16, note: '1 CAN = 16 L' },
  { id: 'RM-022', unit: 'KG', unitAr: 'كغ', ini: 'AK', factor: 1 },
  { id: 'PR-005', unit: 'PCS', unitAr: 'قطعة', ini: 'BP', factor: 1 },
  { id: 'SR-003', unit: 'KG', unitAr: 'كغ', ini: 'TM', factor: 1 },
  { id: 'RM-060', unit: 'PACK', unitAr: 'ربطة', ini: 'PB', factor: 1, note: '1 PACK = 10 PCS' },
  { id: 'RM-050', unit: 'KG', unitAr: 'كغ', ini: 'PK', factor: 1 },
  { id: 'RM-061', unit: 'KG', unitAr: 'كغ', ini: 'FR', factor: 1 },
  { id: 'RM-062', unit: 'KG', unitAr: 'كغ', ini: 'TO', factor: 1 },
  { id: 'RM-063', unit: 'KG', unitAr: 'كغ', ini: 'LE', factor: 1 },
  { id: 'RM-064', unit: 'L', unitAr: 'لتر', ini: 'LA', factor: 1 },
];

export const COUNT_SOURCE = 'CNT-12Aug-Rock';

/** Order request catalogue (prototype ORDER_ITEMS mapped to seed ids). */
export interface OrderDef { id: string; unit: string; unitAr: string }

export const ORDER_ITEMS: OrderDef[] = [
  { id: 'PR-002', unit: 'PCS', unitAr: 'قطعة' },
  { id: 'PR-005', unit: 'PCS', unitAr: 'قطعة' },
  { id: 'SR-003', unit: 'KG', unitAr: 'كغ' },
  { id: 'SR-009', unit: 'KG', unitAr: 'كغ' },
  { id: 'RM-060', unit: 'PACK', unitAr: 'ربطة' },
  { id: 'RM-061', unit: 'KG', unitAr: 'كغ' },
  { id: 'RM-050', unit: 'KG', unitAr: 'كغ' },
  { id: 'RM-022', unit: 'KG', unitAr: 'كغ' },
];

/** Persisted module state (count sessions submitted from the tablet). */
export interface CountLine { itemId: string; entered?: number; unit: string; physical?: number; expected: number; diff: number; skip?: string }
export interface CountSession { id: string; ts: string; loc: LocId; by: string; source: string; lines: CountLine[] }
export interface TabletState { countSessions: CountSession[] }

export const TABLET_SEED: TabletState = { countSessions: [] };

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round3 = (n: number) => Math.round(n * 1000) / 1000;
