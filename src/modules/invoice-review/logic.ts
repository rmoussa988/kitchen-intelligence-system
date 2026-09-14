import type { CoreState, Delivery, PurchaseOrder, SupplierInvoice } from '../../store';
import { money, fmt, pct } from '../../ui';
import { SCAN_INFO, SUPPLIER_VAT, type PrintedLine, type ScanInfo } from './data';
import type { Work, WorkLine } from './types';
import type { ReviewText } from './text';

export const num = (v: string): number => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
export const amountUsd = (inv: SupplierInvoice, fx: number): number => (inv.currency === 'LBP' ? inv.amount / fx : inv.amount);
export const scanInfo = (inv: SupplierInvoice): ScanInfo => SCAN_INFO[inv.id] ?? { scanned: true, printedRate: 0 };
export const deliveryOf = (inv: SupplierInvoice, st: CoreState): Delivery | undefined => (inv.deliveryId ? st.deliveries.find((d) => d.id === inv.deliveryId) : undefined);
export const poOf = (inv: SupplierInvoice, st: CoreState): PurchaseOrder | undefined => (inv.poId ? st.purchaseOrders.find((p) => p.id === inv.poId) : undefined);

/** The supplier's printed bill: explicit prototype lines, else the delivery lines. */
export function printedLines(inv: SupplierInvoice, st: CoreState): PrintedLine[] {
  const info = scanInfo(inv);
  if (info.printedLines) return info.printedLines;
  const dlv = deliveryOf(inv, st);
  if (dlv) return dlv.lines.map((l) => ({ itemId: l.itemId, qty: l.received, unit: l.unit, price: l.unitPrice }));
  return [];
}

export function toWorkLine(pl: PrintedLine, dlv: Delivery | undefined, po: PurchaseOrder | undefined, auto: boolean): WorkLine {
  const dl = dlv?.lines.find((l) => l.itemId === pl.itemId);
  const pol = po?.lines.find((l) => l.itemId === pl.itemId);
  const accepted = dl ? dl.received - (dl.rejected ?? 0) : pl.received ?? null;
  return {
    itemId: pl.itemId, unit: pl.unit,
    ordered: pol ? pol.qty : dl?.ordered ?? pl.ordered ?? null,
    received: accepted,
    deliveryPrice: dl ? dl.unitPrice : null,
    qty: String(pl.qty), price: pl.price.toFixed(2), auto,
  };
}

/** Lines the OCR "reads" from an attached manual invoice. */
export function ocrLines(inv: SupplierInvoice, st: CoreState): WorkLine[] {
  const dlv = deliveryOf(inv, st), po = poOf(inv, st);
  return printedLines(inv, st).map((pl) => toWorkLine(pl, dlv, po, true));
}

export function buildWork(inv: SupplierInvoice, st: CoreState): Work {
  const info = scanInfo(inv);
  return {
    inv: inv.invoiceNo, date: inv.date, vat: SUPPLIER_VAT[inv.supplierId] ?? '', taxRate: String(info.printedRate), uploaded: null,
    lines: info.scanned ? ocrLines(inv, st) : [],
  };
}

export interface Calc {
  subtotal: number; taxAmount: number; total: number;
  printedSub: number; printedRate: number; printedTax: number; printedTotal: number;
  matched: boolean; matchDiff: number;
  checks: string[];
}

/** 3-way match: entered bill vs delivery (accepted qty + price) vs PO (ordered qty), plus total vs the scanned bill. */
export function computeReview(w: Work, inv: SupplierInvoice, st: CoreState, fx: number, t: ReviewText, nameOf: (id: string) => string): Calc {
  const dlv = deliveryOf(inv, st);
  const info = scanInfo(inv);
  const printed = printedLines(inv, st);
  const subtotal = w.lines.reduce((a, ln) => a + num(ln.qty) * num(ln.price), 0);
  const rate = num(w.taxRate);
  const taxAmount = (subtotal * rate) / 100;
  const total = subtotal + taxAmount;
  const printedSub = printed.reduce((a, l) => a + l.qty * l.price, 0);
  const printedRate = info.printedRate;
  const printedTax = (printedSub * printedRate) / 100;
  const printedTotal = printed.length ? printedSub + printedTax : amountUsd(inv, fx);
  const matchDiff = total - printedTotal;
  const matched = Math.abs(matchDiff) < 0.005;

  const checks: string[] = [];
  w.lines.forEach((ln) => {
    const name = nameOf(ln.itemId);
    const qn = num(ln.qty), pn = num(ln.price);
    if (ln.ordered != null && qn !== ln.ordered) {
      const d = qn - ln.ordered;
      checks.push(`${name} ${d > 0 ? '+' : '−'}${fmt(Math.abs(d))} ${ln.unit} ${t.vsOrdered}`);
    }
    if (ln.received != null && qn !== ln.received) {
      checks.push(`${name}: ${fmt(qn)} ${ln.unit} ${t.invoiced} ≠ ${fmt(ln.received)} ${t.acceptedAtReceiving}`);
    }
    if (ln.deliveryPrice != null && Math.abs(pn - ln.deliveryPrice) >= 0.005) {
      const p = ((pn - ln.deliveryPrice) / ln.deliveryPrice) * 100;
      checks.push(`${name}: ${money(pn)} ${t.vsReceivedPrice} ${money(ln.deliveryPrice)} (${pct(p, 1, true)})`);
    }
  });
  // Delivery value = Σ accepted (received − rejected) × unit price. Not dlv.total: on a partially rejected
  // delivery that can still carry the full billed value, which would contradict the per-line 'accepted at receiving' check.
  if (dlv && w.lines.length) {
    const acceptedValue = dlv.lines.reduce((a, l) => a + (l.received - (l.rejected ?? 0)) * l.unitPrice, 0);
    if (Math.abs(subtotal - acceptedValue) >= 0.005) checks.push(`${t.enteredTotal} ${money(subtotal)} ≠ ${t.deliveryTotal} ${money(acceptedValue)}`);
  }

  return { subtotal, taxAmount, total, printedSub, printedRate, printedTax, printedTotal, matched, matchDiff, checks };
}
