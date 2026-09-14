import type { Delivery, Transfer, WasteRecord } from '../../store';

/**
 * Records referenced by the SHW-20260808-001 trace that the base seed lacks. Merged on mount only if absent,
 * so every hop of the timeline links to a real record in the owning module.
 */
export const EXTRA_DELIVERIES: Delivery[] = [
  { id: 'DLV-0417', ts: '2026-08-08T09:24:00', supplierId: 'SUP-02', invoiceNo: 'INV-2201', loc: 'mk', receivedBy: 'U-03', status: 'invoiced', total: 285, worstVariancePct: -1,
    lines: [{ itemId: 'RM-001', ordered: 6, received: 6, unit: 'BOX', baseQty: 60, unitPrice: 47.5, lastPrice: 48, variancePct: -1, expiry: '2026-08-11', batch: 'HW-0808', temp: '3.0°C', quality: 'ok', oldAvg: 4.78, newAvg: 4.75 }] },
];

export const EXTRA_TRANSFERS: Transfer[] = [
  { id: 'TRF-1031', from: 'mk', to: 'rock', status: 'confirmed', requestedAt: '2026-08-08T06:30:00', sentAt: '2026-08-08T17:20:00', confirmedAt: '2026-08-08T17:41:00', requestedBy: 'U-06', sentBy: 'U-04', confirmedBy: 'U-02',
    lines: [{ itemId: 'PR-002', unit: 'PCS', cost: 1.14, requested: 100, sent: 100, confirmed: 100 }] },
];

export const EXTRA_WASTE: WasteRecord[] = [
  { id: 'WST-104', ts: '2026-08-09T21:50:00', itemId: 'PR-002', loc: 'rock', qty: 2, unit: 'PCS', baseQty: 2, cost: 2.28, reason: 'overproduction', employee: 'U-06', status: 'auto', note: 'End-of-night' },
  { id: 'WST-119', ts: '2026-08-11T21:50:00', itemId: 'PR-002', loc: 'rock', qty: 4, unit: 'PCS', baseQty: 4, cost: 4.6, reason: 'overproduction', employee: 'U-06', status: 'auto', note: 'End-of-night' },
];
