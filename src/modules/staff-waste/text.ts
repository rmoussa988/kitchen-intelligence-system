/** STF-WST-01 — TEXT dictionary (verbatim from the prototype). */
export type ReasonDef = [key: string, label: string, glyph: string];

export const TEXT = {
  en: {
    title: 'Waste', loc: 'Rock', user: 'Maya · Service',
    pickProduct: 'What is being wasted? Tap the product.',
    wasting: 'Wasting', qty: 'Quantity', next: 'Next', back: 'Back', changeProduct: 'Change product',
    whyWasted: 'Why?', addPhoto: 'Add photo', photoAdded: 'Photo added ✓', uploading: 'Uploading…', uploadError: 'Upload failed — try again', submit: 'Submit',
    doneAuto: 'Waste recorded', donePending: 'Sent for manager approval',
    another: 'Record another',
    autoBody: 'Low-value waste auto-approves. Stock reduced at cost — feeds variance and P&L waste %.',
    pendingBody: 'High-value waste holds for manager approval before stock moves.',
    atCost: 'at cost',
    reasons: [['expired', 'Expired', '⏳'], ['overproduction', 'Overproduction', '📦'], ['burnt', 'Burnt', '🔥'], ['prep', 'Prep waste', '🔪'], ['cooking', 'Cooking loss', '♨️'], ['damaged', 'Damaged', '📉'], ['returned', 'Supplier return', '↩️'], ['quality', 'Quality', '⚠️'], ['spillage', 'Spillage', '💧'], ['incorrect', 'Incorrect prep', '✖️'], ['customer', 'Customer return', '🍽️'], ['other', 'Other', '…']] as ReasonDef[],
  },
  ar: {
    title: 'الهدر', loc: 'روك', user: 'مايا · خدمة',
    pickProduct: 'ما الذي يُهدر؟ انقر الصنف.',
    wasting: 'إهدار', qty: 'الكمية', next: 'التالي', back: 'رجوع', changeProduct: 'تغيير الصنف',
    whyWasted: 'لماذا؟', addPhoto: 'إضافة صورة', photoAdded: 'أُضيفت صورة ✓', uploading: 'جارٍ الرفع…', uploadError: 'فشل الرفع — أعد المحاولة', submit: 'إرسال',
    doneAuto: 'سُجل الهدر', donePending: 'أُرسل لموافقة المدير',
    another: 'تسجيل آخر',
    autoBody: 'الهدر منخفض القيمة يُعتمد تلقائياً. خُفض المخزون بالتكلفة — يغذي الفروقات ونسبة الهدر في الأرباح والخسائر.',
    pendingBody: 'الهدر مرتفع القيمة ينتظر موافقة المدير قبل تحريك المخزون.',
    atCost: 'بالتكلفة',
    reasons: [['expired', 'منتهي الصلاحية', '⏳'], ['overproduction', 'إنتاج زائد', '📦'], ['burnt', 'محترق', '🔥'], ['prep', 'هدر تحضير', '🔪'], ['cooking', 'فاقد طهي', '♨️'], ['damaged', 'تالف', '📉'], ['returned', 'مرتجع مورد', '↩️'], ['quality', 'جودة', '⚠️'], ['spillage', 'انسكاب', '💧'], ['incorrect', 'تحضير خاطئ', '✖️'], ['customer', 'مرتجع زبون', '🍽️'], ['other', 'آخر', '…']] as ReasonDef[],
  },
};

/** Role → short label shown next to the staff name (prototype: "Maya · Service"). */
export const ROLE_LABELS: Record<string, [string, string]> = {
  storekeeper: ['Store', 'مخزن'], production: ['Production', 'إنتاج'], prep: ['Prep', 'تحضير'], service: ['Service', 'خدمة'],
  manager: ['Manager', 'مدير'], owner: ['Owner', 'مالك'], superuser: ['Superuser', 'مشرف'], accountant: ['Accountant', 'محاسب'],
  invoice: ['Invoices', 'فواتير'], cost: ['Cost control', 'مراقبة التكاليف'],
};
