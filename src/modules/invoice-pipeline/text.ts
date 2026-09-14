/** TEXT dictionary — copied verbatim from "KIS Supplier Invoice Pipeline.dc.html", plus the few keys the store port needs. */
const en = {
  title: 'Supplier invoice pipeline', subtitle: 'One flow — the accountant’s step creates the payable (ACC-AP-01)',
  hint: 'Receiver approves the delivery (D1) → invoice employee enters the bill against it → accountant approves for payment or disputes. Each row is one receiving.',
  supplier: 'Supplier · received by', receiving: 'Receiving', amount: 'Amount', invoiceNo: 'Invoice #', stage: 'Pipeline',
  enterInvoice: 'Enter invoice', approvePay: 'Approve → payable', dispute: 'Dispute',
  stages: { s1: 'Received & approved', s2: 'Invoice entered', s3: 'Accountant decision' },
  whos: { s1: 'Receiver (D1)', s2: 'Invoice employee', s3: 'Accountant' },
  stLabels: { s1: 'Awaiting invoice entry', s2: 'Awaiting accountant', s2r: 'Under accountant review', s3p: 'Payable created ✓', s3paid: 'Paid ✓', s3d: 'Disputed — supplier contacted' },
  foot: 'The pipeline never duplicates entry: the receiver’s quantities come from D1; the invoice employee adds the bill; the accountant’s approval is the only step that creates a payable in ACC-AP-01. Every step is audit-logged (E4). LBP bills convert at the day rate.',
  enterTitle: 'Enter invoice', enterBody: 'Enter the supplier’s bill against this receiving. Quantities stay from the receiver — only the commercial side is added here.',
  enterWarn: 'A price different from the receiving’s expected cost flags purchase-price variance (MGT-RCV-03).',
  enterPh1: 'Invoice # — e.g. INV-2245', enterPh2: 'Amount — e.g. $412.00 or 8.4M LBP',
  enterCta: 'Save invoice → to accountant',
  approveTitle: 'Approve for payment', approveBody: 'Creates the payable in Supplier bills (ACC-AP-01) with its due date and currency. Payment later reduces central cash-in-hand.',
  approveWarn: 'This is the step that creates the payable — no second inbox exists.', approveCta: 'Approve — create payable',
  disputeTitle: 'Dispute invoice', disputeBody: 'Flags a mismatch (price, quantity, or quality) back to the supplier and the receiver. No payable is created while disputed.',
  disputeWarn: 'The receiving stays valid — only the bill is on hold.', disputePh1: 'Reason (required)…', disputeCta: 'Dispute — notify supplier',
  cancel: 'Cancel',
  enteredToast: 'Invoice saved — routed to the accountant', approvedToast: 'Payable created — visible in ACC-AP-01', disputedToast: 'Disputed — supplier and receiver notified',
  // ── port additions ──
  payablePill: 'Payable', disputedPill: 'Disputed', paidPill: 'Paid',
  allStages: 'All', openReview: 'Review', noRows: 'No receivings in this stage.',
  storeSuffix: 'store', atRate: 'at day rate',
  stageNames: { received: 'Received', entered: 'Entered', review: 'In review', approved: 'Approved', disputed: 'Disputed', paid: 'Paid' },
  auditEntered: 'Invoice entered', auditApproved: 'Invoice approved — payable created', auditDisputed: 'Invoice disputed',
  alertDisputed: 'disputed —',
};

export type PipelineText = typeof en;

const ar: PipelineText = {
  title: 'خط فواتير الموردين', subtitle: 'تدفق واحد — خطوة المحاسب تنشئ المستحق (ACC-AP-01)',
  hint: 'المستلم يعتمد التسليم (D1) ← موظف الفواتير يدخل الفاتورة عليه ← المحاسب يعتمد الدفع أو يعترض. كل صف استلام واحد.',
  supplier: 'المورد · استلمه', receiving: 'الاستلام', amount: 'المبلغ', invoiceNo: 'رقم الفاتورة', stage: 'الخط',
  enterInvoice: 'إدخال الفاتورة', approvePay: 'اعتماد ← مستحق', dispute: 'اعتراض',
  stages: { s1: 'استُلم واعتُمد', s2: 'أُدخلت الفاتورة', s3: 'قرار المحاسب' },
  whos: { s1: 'المستلم (D1)', s2: 'موظف الفواتير', s3: 'المحاسب' },
  stLabels: { s1: 'بانتظار إدخال الفاتورة', s2: 'بانتظار المحاسب', s2r: 'قيد مراجعة المحاسب', s3p: 'أُنشئ المستحق ✓', s3paid: 'مدفوعة ✓', s3d: 'معترض — تم التواصل مع المورد' },
  foot: 'الخط لا يكرر الإدخال أبداً: كميات المستلم من D1؛ موظف الفواتير يضيف الفاتورة؛ اعتماد المحاسب هو الخطوة الوحيدة التي تنشئ مستحقاً في ACC-AP-01. كل خطوة تُسجل بالتدقيق (E4). فواتير الليرة تُحوَّل بسعر اليوم.',
  enterTitle: 'إدخال الفاتورة', enterBody: 'أدخل فاتورة المورد على هذا الاستلام. الكميات تبقى من المستلم — يُضاف الجانب التجاري فقط هنا.',
  enterWarn: 'سعر مختلف عن كلفة الاستلام المتوقعة يعلّم فرق سعر الشراء (MGT-RCV-03).',
  enterPh1: 'رقم الفاتورة — مثال: INV-2245', enterPh2: 'المبلغ — مثال: $412.00 أو 8.4M LBP',
  enterCta: 'حفظ الفاتورة ← إلى المحاسب',
  approveTitle: 'اعتماد الدفع', approveBody: 'ينشئ المستحق في فواتير الموردين (ACC-AP-01) مع تاريخ الاستحقاق والعملة. الدفع لاحقاً يخفض النقد المركزي.',
  approveWarn: 'هذه الخطوة هي التي تنشئ المستحق — لا صندوق وارد ثانٍ.', approveCta: 'اعتماد — إنشاء المستحق',
  disputeTitle: 'الاعتراض على الفاتورة', disputeBody: 'يعلّم اختلافاً (سعر أو كمية أو جودة) للمورد والمستلم. لا يُنشأ مستحق أثناء الاعتراض.',
  disputeWarn: 'الاستلام يبقى صحيحاً — الفاتورة فقط معلقة.', disputePh1: 'السبب (إلزامي)…', disputeCta: 'اعتراض — إبلاغ المورد',
  cancel: 'إلغاء',
  enteredToast: 'حُفظت الفاتورة — وُجهت إلى المحاسب', approvedToast: 'أُنشئ المستحق — يظهر في ACC-AP-01', disputedToast: 'اعتُرض — أُبلغ المورد والمستلم',
  // ── port additions ──
  payablePill: 'مستحق', disputedPill: 'معترض', paidPill: 'مدفوعة',
  allStages: 'الكل', openReview: 'مراجعة', noRows: 'لا استلامات في هذه المرحلة.',
  storeSuffix: 'مخزن', atRate: 'بسعر اليوم',
  stageNames: { received: 'مستلمة', entered: 'مُدخلة', review: 'قيد المراجعة', approved: 'معتمدة', disputed: 'معترض', paid: 'مدفوعة' },
  auditEntered: 'أُدخلت الفاتورة', auditApproved: 'اعتُمدت الفاتورة — أُنشئ المستحق', auditDisputed: 'اعتُرض على الفاتورة',
  alertDisputed: 'معترض —',
};

export const TEXT = { en, ar };
