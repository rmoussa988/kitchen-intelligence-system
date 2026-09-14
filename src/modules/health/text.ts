import type { LocId } from '../../store';

/** TEXT dictionary — copied verbatim from the prototype; keys after the `── additions` marker
 *  are needed for the live store integration (auto-created corrective actions, overdue alerts, compare mode). */
const EN = {
  health: 'Kitchen Health', owner: 'Owner report', prod: 'Productivity', comp: 'Compliance', release2: 'Release 2',
  healthScore: 'Kitchen Health', needsAttention: 'What needs attention', act: 'Act',
  calmNote: 'Calm when green — issues surface by severity and location.',
  good: 'Healthy', watch: 'Needs watching', poor: 'At risk',
  ownerTitle: 'Monthly owner report', ownerSub: 'Auto-generated executive summary',
  compare: 'Compare months', exportShare: 'Export / share',
  biggestProblems: 'Biggest problems', biggestImprovements: 'Biggest improvements', recommendedActions: 'Recommended actions',
  ownerNote: 'Generated from B1–B8 verified data on the 1st of each month. Per-location detail in the P&L (B8).',
  prodHint: 'Department-level labour productivity. Attendance is manual/imported in this release; individual metrics come later.',
  prodNote: 'Labour hours source: manual entry / weekly import. Per-person productivity activates once attendance integration lands.',
  checklists: 'Digital checklists · today', correctiveActions: 'Corrective actions',
  issue: 'Issue', owner2: 'Owner', severity: 'Sev.', deadline: 'Due', status: 'Status',
  compNote: 'A failed checklist item auto-creates a corrective action. Overdue turns red and feeds the alert center (B7). Tap status to advance it.',
  actToast: 'Opening —', exportToast: 'Owner report queued — PDF', compareToast: 'Jun vs Jul comparison — demo',
  st: { open: 'Open', progress: 'In progress', done: 'Completed', overdue: 'Overdue', closed: 'Closed' },
  locs: { mk: 'Main Kitchen', rock: 'Rock', kad: 'Kaddoum' } as Record<LocId, string>, all: 'Combined',
  vsLastMonth: 'vs last month',
  // ── additions (live data chain) ──
  caOverdue: 'Corrective action overdue', due: 'due', yesterday: 'yesterday',
  caCreated: 'Corrective action created', tapItem: 'Tap to toggle pass / fail', tapStatus: 'Tap to advance',
  inJun: 'in Jun', noAttention: 'Nothing needs attention in this scope.',
};

export type Text = typeof EN;

const AR: Text = {
  health: 'صحة المطبخ', owner: 'تقرير المالك', prod: 'الإنتاجية العمالية', comp: 'الالتزام', release2: 'الإصدار ٢',
  healthScore: 'صحة المطبخ', needsAttention: 'ما يحتاج انتباهاً', act: 'تصرّف',
  calmNote: 'هادئة عند الأخضر — المشاكل تظهر حسب الخطورة والموقع.',
  good: 'سليم', watch: 'يحتاج مراقبة', poor: 'في خطر',
  ownerTitle: 'تقرير المالك الشهري', ownerSub: 'ملخص تنفيذي مولّد تلقائياً',
  compare: 'مقارنة الأشهر', exportShare: 'تصدير / مشاركة',
  biggestProblems: 'أكبر المشاكل', biggestImprovements: 'أكبر التحسينات', recommendedActions: 'إجراءات موصى بها',
  ownerNote: 'يولَّد من بيانات B1–B8 الموثقة في أول كل شهر. التفاصيل لكل موقع في الأرباح والخسائر (B8).',
  prodHint: 'إنتاجية العمل على مستوى الأقسام. الحضور يدوي/مستورد في هذا الإصدار؛ المقاييس الفردية لاحقاً.',
  prodNote: 'مصدر ساعات العمل: إدخال يدوي / استيراد أسبوعي. الإنتاجية الفردية تُفعّل مع تكامل الحضور.',
  checklists: 'قوائم التحقق الرقمية · اليوم', correctiveActions: 'الإجراءات التصحيحية',
  issue: 'المشكلة', owner2: 'المسؤول', severity: 'الخطورة', deadline: 'الموعد', status: 'الحالة',
  compNote: 'فشل بند في القائمة ينشئ إجراءً تصحيحياً تلقائياً. المتأخر يصبح أحمر ويغذي مركز التنبيهات (B7). انقر الحالة لتقديمها.',
  actToast: 'فتح —', exportToast: 'تقرير المالك في الطابور — PDF', compareToast: 'مقارنة حزيران وتموز — تجريبي',
  st: { open: 'مفتوح', progress: 'قيد التنفيذ', done: 'مكتمل', overdue: 'متأخر', closed: 'مغلق' },
  locs: { mk: 'المطبخ الرئيسي', rock: 'روك', kad: 'قدّوم' }, all: 'مجمّع',
  vsLastMonth: 'عن الشهر الماضي',
  // ── additions (live data chain) ──
  caOverdue: 'إجراء تصحيحي متأخر', due: 'مستحق', yesterday: 'أمس',
  caCreated: 'أُنشئ إجراء تصحيحي', tapItem: 'انقر للتبديل بين ناجح / فاشل', tapStatus: 'انقر للتقديم',
  inJun: 'في حزيران', noAttention: 'لا شيء يحتاج انتباهاً في هذا النطاق.',
};

export const TEXT: { en: Text; ar: Text } = { en: EN, ar: AR };
