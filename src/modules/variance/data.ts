import type { LocId } from '../../store';

export type EvidenceStatus = 'found' | 'none' | 'normal';
export interface Evidence { q: string; qAr: string; a: string; aAr: string; status: EvidenceStatus; ref?: string; nav?: { module: string; params: Record<string, string> } }
export interface ReconRow { op: string; en: string; qty: string; ref: string }
export interface SheetLine { en: string; ar: string; qty: string; focus?: boolean }

export interface VarCase {
  id: string;
  itemId: string;
  alertId: string; // seed alert this case resolves
  loc: LocId;
  date: string;
  source: string; // fallback when no count movement is found in the ledger
  qty: number; unit: string; cost: number; // fallback headline
  recon: ReconRow[];
  reconAr: string[];
  evidence: Evidence[];
  causes: { en: string; ar: string }[];
  seedNote: { en: string; ar: string; who: string } | null;
  sheet: { counter: string; counterAr: string; time: string; lines: SheetLine[] };
}

/** The two open cases — matched to seed alerts AL-002 / AL-003 and count movements MV-0013 / MV-0014 (Rock). */
export const CASES: VarCase[] = [
  {
    id: 'chicken', itemId: 'RM-001', alertId: 'AL-002', loc: 'mk', date: '12 Aug', source: 'CNT-0812-MK',
    qty: -3.3, unit: 'KG', cost: -15.84,
    recon: [
      { op: '', en: 'Opening (11 Aug close)', qty: '35.7 KG', ref: '' },
      { op: '+', en: 'Received — 6 BOX', qty: '60.0 KG', ref: 'INV-2211' },
      { op: '−', en: 'Used in production', qty: '54.2 KG', ref: 'SHW-20260811-001' },
      { op: '−', en: 'Waste recorded', qty: '0.0 KG', ref: '—' },
      { op: '±', en: 'Transfers', qty: '0.0 KG', ref: '—' },
      { op: '=', en: 'Expected closing', qty: '41.5 KG', ref: '' },
      { op: '', en: 'Physical count', qty: '38.2 KG', ref: 'CNT-0812-MK' }, // count movement seeded in seed.ts (MV-0020)
    ],
    reconAr: ['الافتتاحي (إقفال ١١ آب)', 'استلام — ٦ صناديق', 'استخدام في الإنتاج', 'هدر مسجل', 'تحويلات', 'الإقفال المتوقع', 'الجرد الفعلي'],
    evidence: [
      { q: 'Waste recorded?', qAr: 'هل سُجل هدر؟', a: 'No waste records for this item today.', aAr: 'لا سجلات هدر لهذا الصنف اليوم.', status: 'none' },
      { q: 'Transfers?', qAr: 'تحويلات؟', a: 'No transfers touched this item.', aAr: 'لا تحويلات مست هذا الصنف.', status: 'none' },
      { q: 'Extra production?', qAr: 'إنتاج إضافي؟', a: 'One batch — 140 skewers consumed 27.5 KG, within standard.', aAr: 'دفعة واحدة — ١٤٠ سيخاً استهلكت ٢٧٫٥ كغ، ضمن المعيار.', status: 'found', ref: 'SHW-20260811-001', nav: { module: 'production', params: { batch: 'SHW-20260811-001' } } },
      { q: 'Inventory adjustments?', qAr: 'تسويات مخزون؟', a: 'None this week.', aAr: 'لا شيء هذا الأسبوع.', status: 'none' },
      { q: 'Recipe changed?', qAr: 'هل تغيرت الوصفة؟', a: 'Skewer v4 today — cost update only, quantities unchanged.', aAr: 'إصدار السيخ v4 اليوم — تحديث كلفة فقط، الكميات لم تتغير.', status: 'found', ref: 'PR-002 v4', nav: { module: 'recipes', params: { recipe: 'PR-002' } } },
      { q: 'Previous count issue?', qAr: 'مشكلة جرد سابقة؟', a: '8 Aug count reconciled clean.', aAr: 'جرد ٨ آب طابق بلا فرق.', status: 'normal', ref: 'CNT-0808-MK', nav: { module: 'inventory', params: { item: 'RM-001', loc: 'mk' } } },
      { q: 'Unusual sales?', qAr: 'مبيعات غير اعتيادية؟', a: '412 taouk items sold — within the 14-day range.', aAr: '٤١٢ صنف طاووق مبيع — ضمن نطاق ١٤ يوماً.', status: 'normal', ref: 'POS 12 Aug' },
      { q: 'Used in another recipe?', qAr: 'مستخدم في وصفة أخرى؟', a: 'Only the marinated skewer consumes this item.', aAr: 'السيخ المتبّل فقط يستهلك هذا الصنف.', status: 'normal' },
    ],
    causes: [
      { en: 'Portioning drift — skewers cut heavier than the 180 g spec would consume ~2.8 KG extra per 140 PCS.', ar: 'انحراف الحصص — تقطيع أثقل من معيار ١٨٠ غ يستهلك نحو ٢٫٨ كغ إضافية لكل ١٤٠ قطعة.' },
      { en: 'Unrecorded trim waste during skewering.', ar: 'هدر تشذيب غير مسجل أثناء التسييخ.' },
      { en: 'Receiving under-weight — 6 BOX accepted at nominal 10 KG without scale check.', ar: 'نقص وزن عند الاستلام — قُبلت ٦ صناديق بوزن اسمي ١٠ كغ دون ميزان.' },
    ],
    seedNote: { en: 'Asked morning shift to weigh 10 random skewers tomorrow.', ar: 'طُلب من وردية الصباح وزن ١٠ أسياخ عشوائية غداً.', who: 'Nadim · 12 Aug 09:10' },
    sheet: {
      counter: 'Ziad · Store', counterAr: 'زياد · مخزن', time: '12 Aug 07:42', lines: [
        { en: 'Chicken breast', ar: 'صدر دجاج', qty: '38.2 KG', focus: true },
        { en: 'Marinated taouk skewer', ar: 'سيخ طاووق متبّل', qty: '140 PCS' },
        { en: 'Sunflower oil', ar: 'زيت دوّار الشمس', qty: '3 CAN' },
        { en: 'Akkawi cheese', ar: 'جبنة عكاوي', qty: '6 KG' },
        { en: 'Beef patty 150 g', ar: 'قرص لحم ١٥٠ غ', qty: '60 PCS' },
        { en: 'Toum (garlic paste)', ar: 'ثوم مدقوق', qty: '4 KG' },
      ],
    },
  },
  {
    id: 'taouk', itemId: 'PR-002', alertId: 'AL-003', loc: 'rock', date: '12 Aug', source: 'CNT-0812-RK',
    qty: -6, unit: 'PCS', cost: -6.9,
    recon: [
      { op: '', en: 'Opening (11 Aug close)', qty: '42 PCS', ref: '' },
      { op: '+', en: 'Transfers in — sent, not yet confirmed', qty: '110 PCS', ref: 'TRF-1039' },
      { op: '−', en: 'Sold via recipes', qty: '96 PCS', ref: 'POS 12 Aug' },
      { op: '−', en: 'Waste recorded', qty: '4 PCS', ref: 'WST-0214' },
      { op: '±', en: 'Adjustments', qty: '0', ref: '' },
      { op: '=', en: 'Expected closing', qty: '52 PCS', ref: '' },
      { op: '', en: 'Physical count', qty: '46 PCS', ref: 'CNT-0812-RK' },
    ],
    reconAr: ['الافتتاحي (إقفال ١١ آب)', 'تحويلات واردة — مُرسلة، لم تُؤكد بعد', 'مبيع عبر الوصفات', 'هدر مسجل', 'تسويات', 'الإقفال المتوقع', 'الجرد الفعلي'],
    evidence: [
      { q: 'Waste recorded?', qAr: 'هل سُجل هدر؟', a: '4 PCS end-of-night discard logged.', aAr: 'سُجل إتلاف ٤ قطع نهاية الليل.', status: 'found', ref: 'WST-0214', nav: { module: 'waste', params: { id: 'WST-0214' } } },
      { q: 'Transfer variance?', qAr: 'فرق تحويل؟', a: 'TRF-1038 (10 Aug) confirmed 8 PCS short — still open.', aAr: 'TRF-1038 (١٠ آب) تأكد ناقصاً ٨ قطع — لا يزال مفتوحاً.', status: 'found', ref: 'TRF-1038', nav: { module: 'transfers', params: { id: 'TRF-1038' } } },
      { q: 'Extra production?', qAr: 'إنتاج إضافي؟', a: 'Rock does not produce this item.', aAr: 'روك لا ينتج هذا الصنف.', status: 'normal' },
      { q: 'Recipe changed?', qAr: 'هل تغيرت الوصفة؟', a: 'Sandwich recipe unchanged since v3.', aAr: 'وصفة الساندويش لم تتغير منذ v3.', status: 'normal', ref: 'MI-101 v3', nav: { module: 'recipes', params: { recipe: 'MI-101' } } },
      { q: 'Unusual sales?', qAr: 'مبيعات غير اعتيادية؟', a: '41 sandwiches + 12 platters — normal Tuesday volume.', aAr: '٤١ ساندويشاً و١٢ صحناً — حجم ثلاثاء طبيعي.', status: 'normal', ref: 'POS 12 Aug' },
      { q: 'Used in another recipe?', qAr: 'مستخدم في وصفة أخرى؟', a: 'Sandwich + platter both consume it; both mapped.', aAr: 'الساندويش والصحن يستهلكانه؛ كلاهما مربوط.', status: 'normal' },
    ],
    causes: [
      { en: 'Skewers given free with platter upsizes and not rung into POS.', ar: 'أسياخ قُدمت مجاناً مع تكبير الصحون دون تسجيلها في POS.' },
      { en: 'Line waste (dropped/burnt) not logged during rush.', ar: 'هدر الخط (سقوط/احتراق) لم يُسجل وقت الذروة.' },
    ],
    seedNote: null,
    sheet: {
      counter: 'Maya · Rock', counterAr: 'مايا · روك', time: '12 Aug 22:05', lines: [
        { en: 'Marinated taouk skewer', ar: 'سيخ طاووق متبّل', qty: '46 PCS', focus: true },
        { en: 'Beef patty 150 g', ar: 'قرص لحم ١٥٠ غ', qty: '52 PCS' },
        { en: 'Toum (garlic paste)', ar: 'ثوم مدقوق', qty: '3.5 KG' },
        { en: 'Garlic sauce', ar: 'صوص الثوم', qty: '2 KG' },
        { en: 'Pita bread', ar: 'خبز عربي', qty: '22 PACK' },
      ],
    },
  },
];

/** [iconBg, iconFg, glyph] per evidence status — prototype iconMap. */
export const EVIDENCE_ICON: Record<EvidenceStatus, [string, string, string]> = {
  found: ['#DCE4EC', '#37536B', '●'], none: ['#F5E3B3', '#8A6D1F', '—'], normal: ['#E0E8DA', '#48603A', '✓'],
};

export const numOf = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''));

/** Maps a reconciliation/evidence reference to the module that owns it. */
export function refNav(ref: string, c: VarCase, deliveryIdFor: (inv: string) => string | undefined): { module: string; params: Record<string, string> } | null {
  if (!ref || ref === '—') return null;
  if (/^(INV|DLV|FB)-/.test(ref)) return { module: 'receiving', params: { id: deliveryIdFor(ref) ?? ref } };
  if (/^(PRD|SHW|PAT|TOM|GAR|JUC)-/.test(ref)) return { module: 'production', params: { batch: ref } };
  if (/^WST-/.test(ref)) return { module: 'waste', params: { id: ref } };
  if (/^TRF-|^REQ-/.test(ref)) return { module: 'transfers', params: { id: ref } };
  if (/^CNT-/.test(ref)) return { module: 'inventory', params: { item: c.itemId, loc: c.loc } };
  if (/^(PR|MI|SR)-\d+/.test(ref)) return { module: 'recipes', params: { recipe: ref.split(' ')[0] } };
  return null;
}
