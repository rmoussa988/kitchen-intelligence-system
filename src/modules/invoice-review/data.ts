/**
 * Prototype demo data mapped onto the shared invoice world: which invoices have a scanned bill,
 * the printed (supplier-stated) lines where they differ from the delivery, and the receiver's flag.
 * Invoices not listed here are treated as scanned, with the delivery lines as the printed bill.
 */
export interface PrintedLine { itemId: string; qty: number; unit: string; price: number; ordered?: number; received?: number }
export interface ScanInfo { scanned: boolean; printedRate: number; issue?: { en: string; ar: string }; printedLines?: PrintedLine[] }

export const SCAN_INFO: Record<string, ScanInfo> = {
  'SI-3019': {
    scanned: true, printedRate: 0,
    issue: { en: 'Fries 9 mm came in at $3.90/bag (+8.7% vs last $3.59) — the supplier bill shows $4.21/bag. Invoice total $626.30 ≠ received $617.00.', ar: 'وصلت البطاطا ٩ مم بسعر ٣٫٩٠$ للكيس (+٨٫٧٪ عن آخر سعر ٣٫٥٩$) — فاتورة المورد تُظهر ٤٫٢١$ للكيس. إجمالي الفاتورة ٦٢٦٫٣٠$ ≠ المستلم ٦١٧٫٠٠$.' },
    printedLines: [ { itemId: 'RM-014', qty: 10, unit: 'CAN', price: 50 }, { itemId: 'RM-061', qty: 30, unit: 'BAG', price: 4.21 } ],
  },
  'SI-3022': {
    scanned: false, printedRate: 0,
    issue: { en: 'Driver had no printed invoice — enter manually from the WhatsApp photo.', ar: 'لم يكن مع السائق فاتورة مطبوعة — أدخلها يدوياً من صورة واتساب.' },
  },
  'SI-3024': {
    scanned: true, printedRate: 0,
    issue: { en: 'One box rejected at receiving (damaged seal) — the invoice still bills 3 boxes.', ar: 'رُفض صندوق واحد عند الاستلام (ختم متضرر) — الفاتورة ما زالت تحتسب ٣ صناديق.' },
  },
  'SI-3008': {
    scanned: true, printedRate: 0,
    issue: { en: '2 cartons short vs delivery — 8 billed, 6 received.', ar: 'نقص كرتونتين عن التسليم — فُوترت ٨ واستُلمت ٦.' },
    printedLines: [ { itemId: 'PK-201', qty: 8, unit: 'CARTON', price: 41.25, ordered: 8, received: 6 } ],
  },
};

/** Supplier VAT registration numbers (prototype header field). */
export const SUPPLIER_VAT: Record<string, string> = {
  'SUP-01': 'VAT-220914', 'SUP-02': 'VAT-104882', 'SUP-03': 'VAT-118330', 'SUP-04': 'VAT-305511', 'SUP-05': 'VAT-141902', 'SUP-06': '', 'SUP-07': 'VAT-277640',
};
