/** Module-private (persisted) state of the invoice review screen. */
export interface WorkLine {
  itemId: string;
  unit: string;
  ordered: number | null; // PO qty (or delivery.ordered)
  received: number | null; // accepted at receiving (received − rejected)
  deliveryPrice: number | null; // unit price captured at receiving
  qty: string; // invoiced qty (editable)
  price: string; // invoiced unit price (editable)
  auto: boolean; // pre-filled from the scanned bill / OCR
}

export interface Work {
  inv: string;
  date: string;
  vat: string;
  taxRate: string;
  uploaded: string | null;
  lines: WorkLine[];
}

export interface Posted { subtotal: number; tax: number; total: number; status: 'approved' | 'sent' }

export interface ReviewState {
  selectedId: string | null;
  tab: 'review' | 'summary';
  work: Record<string, Work>;
  posted: Record<string, Posted>;
}
