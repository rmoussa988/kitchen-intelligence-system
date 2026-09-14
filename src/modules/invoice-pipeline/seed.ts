import { useEffect } from 'react';
import type { Delivery, SupplierInvoice, StoreApi } from '../../store';

/**
 * Extra receivings from the "Supplier Invoice Pipeline" prototype that the shared seed lacks
 * (Dairy Khoury entered, PackPro payable, Adonis disputed). Merged on mount only if absent —
 * both invoice modules call `useInvoiceSeedMerge`.
 */
export const EXTRA_DELIVERIES: Delivery[] = [
  { id: 'DLV-0441', ts: '2026-08-11T08:40:00', supplierId: 'SUP-03', invoiceNo: 'DK-2228', loc: 'mk', receivedBy: 'U-05', status: 'received', total: 86.4, worstVariancePct: 0,
    lines: [ { itemId: 'RM-022', ordered: 12, received: 12, unit: 'KG', baseQty: 12, unitPrice: 7.2, lastPrice: 7.2, variancePct: 0, expiry: '2026-09-01', batch: 'DK-1108', temp: '4.1°C', quality: 'ok', oldAvg: 7.2, newAvg: 7.2 } ] },
  { id: 'DLV-0442', ts: '2026-08-10T15:30:00', supplierId: 'SUP-07', invoiceNo: 'PP-2199', loc: 'mk', receivedBy: 'U-03', status: 'invoiced', total: 80, worstVariancePct: 0,
    lines: [ { itemId: 'PK-201', ordered: 2, received: 2, unit: 'CARTON', baseQty: 2000, unitPrice: 40, lastPrice: 40, variancePct: 0, quality: 'ok', oldAvg: 0.04, newAvg: 0.04 } ] },
  { id: 'DLV-0443', ts: '2026-08-10T11:15:00', supplierId: 'SUP-05', invoiceNo: 'AD-2196', loc: 'rock', receivedBy: 'U-06', status: 'received', total: 54, worstVariancePct: 0,
    lines: [ { itemId: 'RM-070', ordered: 3, received: 3, unit: 'BOX', baseQty: 3, unitPrice: 18, lastPrice: 18, variancePct: 0, quality: 'issue', rejected: 1, oldAvg: 18, newAvg: 18 } ] },
];

export const EXTRA_INVOICES: SupplierInvoice[] = [
  { id: 'SI-3022', supplierId: 'SUP-03', invoiceNo: 'DK-2228', date: '2026-08-11', due: '2026-08-11', amount: 86.4, currency: 'USD', stage: 'entered', deliveryId: 'DLV-0441', loc: 'mk', enteredBy: 'U-09' },
  { id: 'SI-3023', supplierId: 'SUP-07', invoiceNo: 'PP-2199', date: '2026-08-10', due: '2026-09-09', amount: 80, currency: 'USD', stage: 'approved', deliveryId: 'DLV-0442', loc: 'mk', enteredBy: 'U-09', reviewedBy: 'U-08' },
  { id: 'SI-3024', supplierId: 'SUP-05', invoiceNo: 'AD-2196', date: '2026-08-10', due: '2026-09-09', amount: 54, currency: 'USD', stage: 'disputed', deliveryId: 'DLV-0443', loc: 'rock', enteredBy: 'U-09', matchIssues: ['1 box rejected at receiving (damaged seal) — invoice still bills 3'] },
];

/** Merge the prototype's extra rows into the shared store, only where the id is absent. */
export function useInvoiceSeedMerge(store: StoreApi) {
  useEffect(() => {
    store.update((d) => {
      for (const x of EXTRA_DELIVERIES) if (!d.deliveries.some((y) => y.id === x.id)) d.deliveries.push(x);
      for (const x of EXTRA_INVOICES) if (!d.invoices.some((y) => y.id === x.id)) d.invoices.push(x);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
