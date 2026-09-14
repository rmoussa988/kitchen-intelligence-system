/** MGT-SRCH-01 / STF-QR-01 — TEXT dictionary (verbatim from the prototype + labels for store-derived rows). */
export const TEXT = {
  en: {
    title: 'Search, trace & QR',
    searchTab: 'Global search & traceability', qrTab: 'QR / barcode',
    searchPh: 'Search product, recipe, batch, transfer, waste, invoice, supplier, employee, date…',
    results: 'Results', exportTrace: 'Export trace',
    traceNote: 'Read-only history — every hop links to its immutable record.',
    traceSub: 'Full chain: supplier → invoice → batch → marination → production → transfer → destination → sale',
    staffScan: 'Staff scan', scanHint: 'A scan routes straight to the right screen.',
    recognised: 'Recognised', fallbackNote: 'Unrecognised code → falls back to global search.',
    assignTitle: 'Generate & assign codes (management)', printSelected: 'Print selected',
    entity: 'Entity', kind: 'Kind', code: 'Code', status: 'Status', printed: 'Assigned', generate: 'Generate',
    qrNote: 'Codes go on products, storage areas, batches, and equipment. Scans tie into audit and traceability.',
    exportToast: 'Trace export queued — PDF', printToast: 'Label print job sent', genToast: 'Code generated & assigned',
    openToast: 'Opening —', noResults: 'No matches — try an id, a name or a date.', matches: 'matches', openTrace: 'Open full trace',
    kinds: { item: 'Item', batch: 'Batch', trf: 'Transfer', waste: 'Waste', inv: 'Invoice', sup: 'Supplier', emp: 'Employee', recipe: 'Recipe', storage: 'Storage', equip: 'Equipment', delivery: 'Delivery' },
    types: { raw: 'Raw', sub: 'Sub-recipe', prep: 'Prepared', menu: 'Menu', pack: 'Packaging' },
    trfStatus: { requested: 'requested', sent: 'sent', confirmed: 'confirmed', flagged: 'flagged' },
    stages: { received: 'received', entered: 'entered', review: 'in review', approved: 'approved', disputed: 'disputed', paid: 'paid' },
    wasteStatus: { auto: 'auto-approved', pending: 'pending approval', approved: 'approved', rejected: 'rejected' },
    lines: 'lines', yield: 'yield', delivery: 'Delivery', invoice: 'Invoice', batch: 'Batch', transfer: 'Transfer', waste: 'Waste',
    locs: { mk: 'Main Kitchen', rock: 'Rock', kad: 'Kaddoum' },
    roles: { superuser: 'Superuser', owner: 'Owner', manager: 'Manager', storekeeper: 'Storekeeper', prep: 'Prep', production: 'Production', service: 'Service', accountant: 'Accountant', invoice: 'Invoice employee', cost: 'Cost controller' } as Record<string, string>,
  },
  ar: {
    title: 'البحث والتتبع وQR',
    searchTab: 'البحث الشامل والتتبع', qrTab: 'QR / باركود',
    searchPh: 'ابحث عن صنف، وصفة، دفعة، تحويل، هدر، فاتورة، مورد، موظف، تاريخ…',
    results: 'النتائج', exportTrace: 'تصدير التتبع',
    traceNote: 'تاريخ للقراءة فقط — كل خطوة ترتبط بسجلها غير القابل للتعديل.',
    traceSub: 'التتبع الكامل: المورد ← الفاتورة ← الدفعة ← التتبيل ← الإنتاج ← التحويل ← الوجهة ← البيع',
    staffScan: 'مسح الموظفين', scanHint: 'المسح ينقل مباشرة إلى الشاشة الصحيحة.',
    recognised: 'تم التعرف', fallbackNote: 'رمز غير معروف ← يتحول إلى البحث الشامل.',
    assignTitle: 'إنشاء وإسناد الرموز (إدارة)', printSelected: 'طباعة المحدد',
    entity: 'الكيان', kind: 'النوع', code: 'الرمز', status: 'الحالة', printed: 'مسند', generate: 'إنشاء',
    qrNote: 'الرموز توضع على الأصناف ومناطق التخزين والدفعات والمعدات. المسح يرتبط بالتدقيق والتتبع.',
    exportToast: 'تصدير التتبع في الطابور — PDF', printToast: 'أُرسلت مهمة طباعة الملصقات', genToast: 'أُنشئ الرمز وأُسند',
    openToast: 'فتح —', noResults: 'لا نتائج — جرّب رقماً أو اسماً أو تاريخاً.', matches: 'نتيجة', openTrace: 'فتح التتبع الكامل',
    kinds: { item: 'صنف', batch: 'دفعة', trf: 'تحويل', waste: 'هدر', inv: 'فاتورة', sup: 'مورد', emp: 'موظف', recipe: 'وصفة', storage: 'تخزين', equip: 'معدات', delivery: 'تسليم' },
    types: { raw: 'خام', sub: 'وصفة فرعية', prep: 'مُحضّر', menu: 'قائمة', pack: 'تغليف' },
    trfStatus: { requested: 'مطلوب', sent: 'مُرسل', confirmed: 'مؤكد', flagged: 'مُبلّغ' },
    stages: { received: 'مستلمة', entered: 'مُدخلة', review: 'قيد المراجعة', approved: 'معتمدة', disputed: 'متنازع عليها', paid: 'مدفوعة' },
    wasteStatus: { auto: 'معتمد تلقائياً', pending: 'بانتظار الموافقة', approved: 'معتمد', rejected: 'مرفوض' },
    lines: 'بنود', yield: 'إنتاجية', delivery: 'تسليم', invoice: 'فاتورة', batch: 'دفعة', transfer: 'تحويل', waste: 'هدر',
    locs: { mk: 'المطبخ الرئيسي', rock: 'روك', kad: 'قدّوم' },
    roles: { superuser: 'مستخدم متميز', owner: 'مالك', manager: 'مدير', storekeeper: 'أمين مستودع', prep: 'تحضير', production: 'إنتاج', service: 'خدمة', accountant: 'محاسب', invoice: 'موظف الفواتير', cost: 'مراقب التكاليف' } as Record<string, string>,
  },
};

export type SearchText = typeof TEXT.en;
export type Kind = keyof typeof TEXT.en.kinds;

/** Kind → [bg, fg] tag colours (verbatim). */
export const TAG_STYLE: Record<Kind, [string, string]> = {
  item: ['#DCE4EC', '#37536B'], batch: ['#E4E0EE', '#5B5378'], trf: ['#DCE8E6', '#33625C'], waste: ['#EADFD3', '#7A5A32'],
  inv: ['#E0E8DA', '#48603A'], sup: ['#E6E2DA', '#6E6A5E'], emp: ['#E6E2DA', '#6E6A5E'], recipe: ['#E0E8DA', '#48603A'],
  storage: ['#DCE4EC', '#37536B'], equip: ['#E6E2DA', '#6E6A5E'], delivery: ['#DCE8E6', '#33625C'],
};
