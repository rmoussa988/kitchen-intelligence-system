/** STF-PRD-02/03/04 (classic) — TEXT dictionary, prototype strings verbatim + inline strings lifted into keys. */
const EN = {
  title: 'Production', mk: 'Main Kitchen', user: 'Rami · Production',
  pickHint: 'Today’s production plan — pick a batch to start.',
  adhocBatch: 'Ad-hoc batch (with note)', planned: 'planned', assigned: 'Assigned to you',
  statusProgress: 'In progress', statusDone: 'Finished', savedTag: 'Saved recipe',
  workDone: 'Work done today', finishedWord: 'finished', inProgressWord: 'in progress',
  adhocTitle: 'Ad-hoc batch', adhocPick: 'Select the production item', adhocSearchPh: 'Search items…', adhocNone: 'No matching item.', adhocNoteLabel: 'Note for management (why off-plan)', adhocNotePh: 'e.g. extra prep for a large catering order…', adhocStart: 'Start batch', space: 'space',
  batch: 'Batch', plannedQty: 'Planned', back: 'Back', review: 'Review batch',
  recipeHeader: 'System recipe — enter what you used', recipeSub: 'The recipe below is what the system expects. Weigh each item and enter the amount you actually used.',
  colIngredient: 'Ingredient', colNeeds: 'Needs', colUsed: 'Used',
  typeInventory: 'Inventory item', typeSub: 'Sub-recipe', typeRecipe: 'Recipe',
  wasteSection: 'Waste', wasteHint: 'By item — trim, spoilage, drops', producedSection: 'Quantity produced', producedHint: 'Finished units from this batch',
  wasteWhich: 'Which item was wasted?', wasteBreakdown: 'Waste by item', noWaste: 'No waste', items: 'items',
  summaryFor: 'review before finishing', usedTitle: 'What you used',
  overallYield: 'Yield', batchCost: 'Batch cost', batchIdLabel: 'Batch ID', trackNote: 'For tracking & traceability', destination: 'Destination', destVal: 'Finished inventory · Main Kitchen',
  productionDone: 'Production done', doneTitle: 'Batch completed', backTasks: 'Back to tasks',
  cancel: 'Cancel', done: 'Done', yieldOk: 'Within standard', yieldLow: 'Below standard',
  // ── inline strings from the prototype logic ──
  ingredients: 'ingredients', none: 'none', enterOne: 'Enter at least one used amount',
  doneBody: (cost: string, yieldPct: string | null, low: boolean, stocked: boolean) => `${stocked ? `Output entered stock at computed cost (${cost}).` : `Batch recorded at computed cost (${cost}).`} ${yieldPct !== null ? 'Yield ' + yieldPct + '%' + (low ? ' — below standard; management gets the flag.' : ' — within standard.') : ''}`,
  roles: { storekeeper: 'Storekeeper', prep: 'Prep', production: 'Production', service: 'Service', manager: 'Manager', owner: 'Owner' } as Record<string, string>,
};

export type Text = typeof EN;

export const TEXT: Record<'en' | 'ar', Text> = {
  en: EN,
  ar: {
    title: 'الإنتاج', mk: 'المطبخ الرئيسي', user: 'رامي · إنتاج',
    pickHint: 'خطة إنتاج اليوم — اختر دفعة للبدء.',
    adhocBatch: 'دفعة خارج الخطة (مع ملاحظة)', planned: 'مخطط', assigned: 'مسند إليك',
    statusProgress: 'قيد التنفيذ', statusDone: 'مكتمل', savedTag: 'وصفة محفوظة',
    workDone: 'إنجاز اليوم', finishedWord: 'مكتملة', inProgressWord: 'قيد التنفيذ',
    adhocTitle: 'دفعة خارج الخطة', adhocPick: 'اختر صنف الإنتاج', adhocSearchPh: 'ابحث عن صنف…', adhocNone: 'لا صنف مطابق.', adhocNoteLabel: 'ملاحظة للإدارة (سبب الخروج عن الخطة)', adhocNotePh: 'مثال: تحضير إضافي لطلب ضيافة كبير…', adhocStart: 'بدء الدفعة', space: 'مسافة',
    batch: 'الدفعة', plannedQty: 'المخطط', back: 'رجوع', review: 'مراجعة الدفعة',
    recipeHeader: 'وصفة النظام — أدخل ما استخدمته', recipeSub: 'الوصفة أدناه هي ما يتوقعه النظام. زِن كل صنف وأدخل الكمية التي استخدمتها فعلاً.',
    colIngredient: 'المكوّن', colNeeds: 'مطلوب', colUsed: 'مُستخدم',
    typeInventory: 'صنف مخزون', typeSub: 'وصفة فرعية', typeRecipe: 'وصفة',
    wasteSection: 'الهدر', wasteHint: 'حسب الصنف — تشذيب، تلف، سقوط', producedSection: 'الكمية المنتجة', producedHint: 'الوحدات الجاهزة من الدفعة',
    wasteWhich: 'أي صنف هُدر؟', wasteBreakdown: 'الهدر حسب الصنف', noWaste: 'لا هدر', items: 'أصناف',
    summaryFor: 'راجع قبل الإنهاء', usedTitle: 'ما استخدمته',
    overallYield: 'الإنتاجية', batchCost: 'كلفة الدفعة', batchIdLabel: 'رقم الدفعة', trackNote: 'للتتبّع والتتبعية', destination: 'الوجهة', destVal: 'مخزون جاهز · المطبخ الرئيسي',
    productionDone: 'اكتمل الإنتاج', doneTitle: 'أُنهيت الدفعة', backTasks: 'عودة إلى المهام',
    cancel: 'إلغاء', done: 'تم', yieldOk: 'ضمن المعيار', yieldLow: 'دون المعيار',
    ingredients: 'مكوّنات', none: 'لا هدر', enterOne: 'أدخل كمية صنف واحد على الأقل',
    doneBody: (cost: string, yieldPct: string | null, low: boolean, stocked: boolean) => `${stocked ? `دخل الناتج المخزون بالكلفة المحسوبة (${cost}).` : `سُجّلت الدفعة بالكلفة المحسوبة (${cost}).`} ${yieldPct !== null ? 'الإنتاجية ' + yieldPct + '٪' + (low ? ' — دون المعيار؛ ستصل الإدارة إشارة.' : ' — ضمن المعيار.') : ''}`,
    roles: { storekeeper: 'أمين مستودع', prep: 'تحضير', production: 'إنتاج', service: 'خدمة', manager: 'مدير', owner: 'مالك' },
  },
};
