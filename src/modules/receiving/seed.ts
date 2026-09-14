import type { Delivery, Item, SupplierInvoice, StoreApi } from '../../store';
import { EXTRA_POS } from '../purchasing/seed';

const T = (d: string, hm: string) => `2026-08-${d}T${hm}:00`;

/** Halloumi (the PPV prototype's biggest mover) is not in the base seed. */
export const EXTRA_ITEMS: Item[] = [
  { id: 'RM-071', en: 'Halloumi', ar: 'حلوم', type: 'raw', cat: 'Dairy', catAr: 'ألبان وأجبان', base: 'KG', purch: 'KG', purchFactor: 1, cost: 14.75, supplier: 'SUP-03', stocked: true, shelf: '30 d', min: 3, max: 15, onHand: { mk: 6.5, rock: 3 } },
];

/** Prototype deliveries (MGT-RCV-02) that the base seed lacks, shifted into the seed's 12-Aug world. */
export const EXTRA_DELIVERIES: Delivery[] = [
  { id: 'DLV-0415', ts: T('11', '16:10'), supplierId: 'SUP-04', invoiceNo: 'BF-3310', loc: 'kad', receivedBy: 'U-07', status: 'invoiced', total: 63, worstVariancePct: -4,
    lines: [
      { itemId: 'RM-035', ordered: 4, received: 4, unit: 'CRATE', baseQty: 60, unitPrice: 13.5, lastPrice: 14.06, variancePct: -4, expiry: '2026-08-18', batch: 'BK-0811', quality: 'ok', oldAvg: 0.94, newAvg: 0.9 },
      { itemId: 'RM-067', ordered: 5, received: 5, unit: 'L', baseQty: 5, unitPrice: 1.8, lastPrice: 1.8, variancePct: 0, expiry: '2026-08-18', batch: 'BK-0811', quality: 'ok', oldAvg: 1.8, newAvg: 1.8 },
    ] },
  { id: 'DLV-0416', ts: T('05', '09:15'), supplierId: 'SUP-02', invoiceNo: 'INV-2201', loc: 'mk', receivedBy: 'U-03', status: 'invoiced', total: 288, worstVariancePct: 1.1,
    lines: [ { itemId: 'RM-001', ordered: 6, received: 6, unit: 'BOX', baseQty: 60, unitPrice: 48, lastPrice: 47.5, variancePct: 1.1, expiry: '2026-08-08', batch: 'HW-0805', temp: '3.0°C', quality: 'ok', oldAvg: 4.75, newAvg: 4.78 } ] },
  { id: 'DLV-0417', ts: T('11', '10:40'), supplierId: 'SUP-03', invoiceNo: 'INV-2213', loc: 'rock', receivedBy: 'U-02', status: 'approved', total: 110.46, worstVariancePct: 9.6, poId: 'PO-2026-115',
    lines: [ { itemId: 'RM-022', ordered: 12, received: 14, unit: 'KG', baseQty: 14, unitPrice: 7.89, lastPrice: 7.2, variancePct: 9.6, expiry: '2026-09-02', batch: 'DK-0811', temp: '4.1°C', quality: 'issue', rejected: 2, oldAvg: 7.2, newAvg: 7.61 } ] },
];

export const EXTRA_INVOICES: SupplierInvoice[] = [
  { id: 'SI-3012', supplierId: 'SUP-02', invoiceNo: 'INV-2201', date: '2026-08-05', due: '2026-08-12', amount: 288, currency: 'USD', stage: 'paid', deliveryId: 'DLV-0416', loc: 'mk', enteredBy: 'U-09', reviewedBy: 'U-08', paidAmount: 288, paymentMethod: 'cash' },
  { id: 'SI-3014', supplierId: 'SUP-04', invoiceNo: 'BF-3310', date: '2026-08-11', due: '2026-08-18', amount: 63, currency: 'USD', stage: 'approved', deliveryId: 'DLV-0415', loc: 'kad', enteredBy: 'U-09', reviewedBy: 'U-08' },
  { id: 'SI-3015', supplierId: 'SUP-03', invoiceNo: 'INV-2213', date: '2026-08-11', due: '2026-08-11', amount: 110.46, currency: 'USD', stage: 'approved', deliveryId: 'DLV-0417', poId: 'PO-2026-115', loc: 'rock', enteredBy: 'U-09', reviewedBy: 'U-08', matchIssues: ['2 KG Akkawi rejected (quality) — credit note pending'] },
];

/** Merge every purchasing/receiving extra into the store, only where absent. Safe to call on each mount. */
export function ensureSeed(store: StoreApi): void {
  store.update((d) => {
    for (const x of EXTRA_ITEMS) if (!d.items.some((y) => y.id === x.id)) d.items.push(x);
    const s3 = d.suppliers.find((s) => s.id === 'SUP-03');
    if (s3 && !s3.products.includes('RM-071')) s3.products.push('RM-071');
    for (const x of EXTRA_DELIVERIES) if (!d.deliveries.some((y) => y.id === x.id)) d.deliveries.push(x);
    for (const x of EXTRA_INVOICES) if (!d.invoices.some((y) => y.id === x.id)) d.invoices.push(x);
    for (const x of EXTRA_POS) if (!d.purchaseOrders.some((y) => y.id === x.id)) d.purchaseOrders.push(x);
  });
}
