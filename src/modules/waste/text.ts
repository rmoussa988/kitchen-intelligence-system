/** MGT-WST-02 — TEXT dictionary (verbatim from the prototype) + reason labels. */
export const TEXT = {
  en: {
    title: 'Waste — approval & dashboard', period: 'Period', approvalQueue: 'Pending approval',
    approve: 'Approve', reject: 'Reject', photoAttached: 'photo', viewPhoto: 'View photo', closePhoto: 'Close',
    totalWaste: 'Total waste', wastePct: 'Waste % of sales', wasteKg: 'Waste weight', trend: 'Daily trend · 13 days',
    target: 'target', byCut: 'Waste by', top10: 'Top wasted items',
    records: 'Waste records', export: 'Export', configure: 'Reasons & thresholds (B7)',
    when: 'When', product: 'Product', location: 'Location', reason: 'Reason', by: 'By', qtyCol: 'Qty', cost: 'Cost', status: 'Status',
    approved: 'Approved', pending: 'Pending', auto: 'Auto', rejected: 'Rejected',
    note: 'Waste reduces stock at moving-average cost and feeds variance (B6) and the P&L waste % (B8).',
    approveToast: 'Approved — stock reduced at cost', rejectToast: 'Rejected — staff notified, no stock movement',
    exportToast: 'Export queued', configToast: 'Opening reasons & approval thresholds (B7)',
    drillToast: 'Opening records —',
    approveTitle: 'Approve this waste record?', approveBody: 'Stock will be reduced at moving-average cost and the movement posted to the ledger.',
    rejectTitle: 'Reject this waste record?', rejectBody: 'No stock movement. The employee will be notified.',
    clearFilter: 'Clear', noRecords: 'No waste records in this scope.',
    cuts: { reason: 'Reason', location: 'Location', employee: 'Employee', product: 'Product' },
    locs: { mk: 'Main Kitchen', rock: 'Rock', kad: 'Kaddoum' }, all: 'All',
  },
  ar: {
    title: 'الهدر — الموافقات واللوحة', period: 'الفترة', approvalQueue: 'بانتظار الموافقة',
    approve: 'موافقة', reject: 'رفض', photoAttached: 'صورة', viewPhoto: 'عرض الصورة', closePhoto: 'إغلاق',
    totalWaste: 'إجمالي الهدر', wastePct: 'الهدر ٪ من المبيعات', wasteKg: 'وزن الهدر', trend: 'الاتجاه اليومي · ١٣ يوماً',
    target: 'الهدف', byCut: 'الهدر حسب', top10: 'أكثر الأصناف هدراً',
    records: 'سجلات الهدر', export: 'تصدير', configure: 'الأسباب والحدود (B7)',
    when: 'متى', product: 'الصنف', location: 'الموقع', reason: 'السبب', by: 'بواسطة', qtyCol: 'الكمية', cost: 'الكلفة', status: 'الحالة',
    approved: 'معتمد', pending: 'معلق', auto: 'تلقائي', rejected: 'مرفوض',
    note: 'الهدر يخفض المخزون بمتوسط الكلفة ويغذي الفروقات (B6) ونسبة الهدر في الأرباح والخسائر (B8).',
    approveToast: 'اعتُمد — خُفض المخزون بالتكلفة', rejectToast: 'رُفض — أُبلغ الموظف، لا حركة مخزون',
    exportToast: 'التصدير في الطابور', configToast: 'فتح الأسباب وحدود الموافقة (B7)',
    drillToast: 'فتح السجلات —',
    approveTitle: 'اعتماد سجل الهدر هذا؟', approveBody: 'سيُخفض المخزون بمتوسط الكلفة وتُسجل الحركة في دفتر الأستاذ.',
    rejectTitle: 'رفض سجل الهدر هذا؟', rejectBody: 'لا حركة مخزون. سيُبلغ الموظف.',
    clearFilter: 'مسح', noRecords: 'لا سجلات هدر في هذا النطاق.',
    cuts: { reason: 'السبب', location: 'الموقع', employee: 'الموظف', product: 'الصنف' },
    locs: { mk: 'المطبخ الرئيسي', rock: 'روك', kad: 'قدّوم' }, all: 'الكل',
  },
};

/** Reason key → [en, ar] (same list as the staff waste entry screen). */
export const REASONS: Record<string, [string, string]> = {
  expired: ['Expired', 'منتهي الصلاحية'],
  overproduction: ['Overproduction', 'إنتاج زائد'],
  burnt: ['Burnt', 'محترق'],
  prep: ['Prep waste', 'هدر تحضير'],
  cooking: ['Cooking loss', 'فاقد طهي'],
  damaged: ['Damaged', 'تالف'],
  returned: ['Supplier return', 'مرتجع مورد'],
  quality: ['Quality', 'جودة'],
  spillage: ['Spillage', 'انسكاب'],
  incorrect: ['Incorrect prep', 'تحضير خاطئ'],
  customer: ['Customer return', 'مرتجع زبون'],
  other: ['Other', 'آخر'],
};

export function reasonLabel(key: string, isAr: boolean): string {
  const r = REASONS[key];
  return r ? r[isAr ? 1 : 0] : key;
}
