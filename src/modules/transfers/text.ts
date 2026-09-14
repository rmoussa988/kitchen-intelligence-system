/** TEXT dictionary — copied verbatim from "KIS Transfers.dc.html". */
const EN = {
  title: 'Transfer oversight', valueMoved: 'Value transferred', thisWeek: 'This week', atCost: 'at cost',
  openVar: 'Open variances', unreceived: 'Unreceived transfers', openRequests: 'Open requests',
  hint: 'Request → send → confirm. The sent-vs-confirmed gap is the control point — ± vs request is normal and recorded, not flagged.',
  export: 'Export', transfer: 'Transfer', route: 'Route', reqSentConf: 'Req → Sent → Conf', value: 'Value', status: 'Status',
  variance: 'Sent vs confirmed', lines: 'lines', item: 'Item', requested: 'Requested', sent: 'Sent', confirmed: 'Confirmed',
  lineVariance: 'Line variance', investigate: 'Investigate variance', chase: 'Chase — not received', stockCards: 'Stock cards',
  empty: 'No transfers for this scope.', all: 'All',
  footNote: 'Value moves at moving-average cost: it leaves the sender’s stock value on send and enters the receiver’s on confirmation. Confirmed is the official stock number.',
  investigateToast: 'Opening variance investigation (B6) —', chaseToast: 'Reminder sent to', stockToast: 'Stock cards open in Inventory (B2)',
  exportToast: 'Export queued — transfers.xlsx',
  st: { requested: 'Requested', pending: 'Sent — pending receipt', confirmed: 'Confirmed', flagged: 'Variance flagged' },
  locs: { mk: 'Main Kitchen', rock: 'Rock', kad: 'Kaddoum' },
  chaseAlert: (id: string, loc: string) => `Reminder sent to ${loc}: ${id} still awaiting confirmation`,
};

export type TrfText = typeof EN;

export const TEXT: Record<'en' | 'ar', TrfText> = {
  en: EN,
  ar: {
    title: 'مراقبة التحويلات', valueMoved: 'القيمة المحوّلة', thisWeek: 'هذا الأسبوع', atCost: 'بالتكلفة',
    openVar: 'فروقات مفتوحة', unreceived: 'تحويلات غير مستلمة', openRequests: 'طلبات مفتوحة',
    hint: 'طلب ← إرسال ← تأكيد. الفجوة بين المرسل والمؤكد هي نقطة الرقابة — الفرق عن المطلوب طبيعي ويُسجل دون تنبيه.',
    export: 'تصدير', transfer: 'التحويل', route: 'المسار', reqSentConf: 'مطلوب ← مرسل ← مؤكد', value: 'القيمة', status: 'الحالة',
    variance: 'المرسل مقابل المؤكد', lines: 'بنود', item: 'الصنف', requested: 'المطلوب', sent: 'المرسل', confirmed: 'المؤكد',
    lineVariance: 'فرق السطر', investigate: 'تحقيق في الفرق', chase: 'متابعة — غير مستلم', stockCards: 'بطاقات المخزون',
    empty: 'لا تحويلات لهذا النطاق.', all: 'الكل',
    footNote: 'القيمة تتحرك بمتوسط الكلفة: تخرج من مخزون المرسل عند الإرسال وتدخل مخزون المستلم عند التأكيد. المؤكد هو رقم المخزون الرسمي.',
    investigateToast: 'فتح تحقيق الفرق (B6) —', chaseToast: 'أُرسل تذكير إلى', stockToast: 'بطاقات المخزون تُفتح في المخزون (B2)',
    exportToast: 'وُضع التصدير في الطابور — transfers.xlsx',
    st: { requested: 'مطلوب', pending: 'مرسل — بانتظار الاستلام', confirmed: 'مؤكد', flagged: 'فرق مُعلَّم' },
    locs: { mk: 'المطبخ الرئيسي', rock: 'روك', kad: 'قدّوم' },
    chaseAlert: (id, loc) => `أُرسل تذكير إلى ${loc}: ${id} لا يزال بانتظار التأكيد`,
  },
};
