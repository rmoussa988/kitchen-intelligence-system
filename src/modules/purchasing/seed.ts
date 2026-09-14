import type { PurchaseOrder } from '../../store';

const T = (d: string, hm: string) => `2026-08-${d}T${hm}:00`;

/**
 * Prototype orders (PO-3312..3315) mapped onto the seed world. Merged on mount only if absent.
 * PO-2026-116..119 already exist in the seed (Hawa received, Malak received, Hawa sent, Khoury draft).
 */
export const EXTRA_POS: PurchaseOrder[] = [
  { id: 'PO-2026-114', ts: T('09', '15:00'), supplierId: 'SUP-04', loc: 'mk', status: 'received', total: 61.4, expected: '2026-08-10', createdBy: 'U-02',
    lines: [ { itemId: 'RM-062', qty: 3, unit: 'CRATE', price: 10.6, received: 3 }, { itemId: 'RM-063', qty: 2, unit: 'CRATE', price: 10, received: 2 }, { itemId: 'RM-066', qty: 4, unit: 'KG', price: 2.4, received: 4 } ] },
  { id: 'PO-2026-115', ts: T('10', '16:00'), supplierId: 'SUP-03', loc: 'rock', status: 'closed', total: 94.68, expected: '2026-08-11', createdBy: 'U-02',
    lines: [ { itemId: 'RM-022', qty: 12, unit: 'KG', price: 7.89, received: 14 } ] },
  { id: 'PO-2026-120', ts: T('12', '09:20'), supplierId: 'SUP-01', loc: 'mk', status: 'sent', total: 535, expected: '2026-08-13', createdBy: 'U-02',
    note: 'Check oil cans for dents before accepting; reject any leaking.',
    lines: [ { itemId: 'RM-014', qty: 10, unit: 'CAN', price: 50 }, { itemId: 'RM-041', qty: 1, unit: 'BAG', price: 35 } ] },
];

/** Arabic text for seeded receiver notes (PurchaseOrder.note is a single string). */
export const PO_NOTES_AR: Record<string, string> = {
  'PO-2026-120': 'تحقق من تنك الزيت من الانبعاجات قبل القبول؛ ارفض أي متسرّب.',
};
