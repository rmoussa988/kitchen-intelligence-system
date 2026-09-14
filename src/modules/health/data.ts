import type { LocId, Scope } from '../../store';

/* ───────────── shared ───────────── */

export interface Bi { en: string; ar: string }
export type Tab = 'health' | 'owner' | 'productivity' | 'compliance';

export const TABS: { key: Tab; screenId: string }[] = [
  { key: 'health', screenId: 'MGT-DSH-01' },
  { key: 'owner', screenId: 'OWN-RPT-01' },
  { key: 'productivity', screenId: 'MGT-PRV-01' },
  { key: 'compliance', screenId: 'MGT-CMP-01' },
];
export const isTab = (v: string | null): v is Tab => TABS.some((x) => x.key === v);

/* ───────────── MGT-DSH-01 Kitchen Health ───────────── */

export const SCORES: Record<Scope, number> = { all: 78, mk: 82, rock: 71, kad: 74 };
export const SCORE_TREND = '+3';
export const TREND_COLOR = '#7FA98A';

export const scoreColorFor = (v: number) => (v >= 80 ? '#7FA98A' : v >= 65 ? '#C99A2E' : '#D96C5F');
/** [bg, border, fg] band for a 0–100 component score. */
export const bandFor = (v: number): [string, string, string] =>
  v >= 80 ? ['#F0F3EA', '#B9CDB9', '#48603A'] : v >= 65 ? ['#FDF9EE', '#E2CD96', '#8A6D1F'] : ['#FBF6F4', '#DFB3AC', '#96382E'];

/** The MK taouk batch flagged on the monitoring & yield board (MGT-PRD-05); production's ?batch= deep
 *  link opens that tab with the batch detail — the closest sub-screen for the yield/production drills,
 *  since production/index only reads ?batch= (not a tab param) and lives in another module we may not edit. */
export const PROD_MON_BATCH = 'SHW-20260811-001';

export interface ComponentDef extends Bi {
  key: string;
  scores: Record<Scope, number>;
  delta: number;
  /** Drill target: another module (optionally with query params to open the right sub-view), or a tab of this module. */
  drill: { module: string; params?: Record<string, string>; tab?: undefined } | { tab: Tab; module?: undefined; params?: undefined };
}
export const COMPONENTS: ComponentDef[] = [
  { key: 'inventory', en: 'Inventory', ar: 'المخزون', scores: { all: 82, mk: 86, rock: 74, kad: 80 }, delta: +2, drill: { module: 'inventory' } },
  { key: 'foodcost', en: 'Food cost', ar: 'كلفة الطعام', scores: { all: 72, mk: 80, rock: 64, kad: 76 }, delta: -4, drill: { module: 'pnl', params: { tab: 'compare' } } },
  { key: 'waste', en: 'Waste', ar: 'الهدر', scores: { all: 75, mk: 88, rock: 85, kad: 52 }, delta: -6, drill: { module: 'waste' } },
  { key: 'production', en: 'Production', ar: 'الإنتاج', scores: { all: 84, mk: 84, rock: 0, kad: 0 }, delta: +1, drill: { module: 'production', params: { batch: PROD_MON_BATCH } } },
  { key: 'yield', en: 'Yield', ar: 'الإنتاجية', scores: { all: 76, mk: 76, rock: 0, kad: 0 }, delta: -3, drill: { module: 'production', params: { batch: PROD_MON_BATCH } } },
  { key: 'productivity', en: 'Productivity', ar: 'إنتاجية العمل', scores: { all: 80, mk: 78, rock: 83, kad: 79 }, delta: +2, drill: { tab: 'productivity' } },
  { key: 'compliance', en: 'Compliance', ar: 'الالتزام', scores: { all: 88, mk: 92, rock: 86, kad: 84 }, delta: +3, drill: { tab: 'compliance' } },
];

export type Sev = 'red' | 'amber' | 'info';
/** [bg, border, dot] */
export const SEV_STYLE: Record<Sev, [string, string, string]> = {
  red: ['#FBF6F4', '#DFB3AC', '#C0392B'],
  amber: ['#FDF9EE', '#E2CD96', '#C99A2E'],
  info: ['#F7F4EA', '#DCD6C4', '#9A9C8E'],
};

export interface IssueDef extends Bi { sub: Bi; sev: Sev; loc: LocId; ref: string; module: string; params?: Record<string, string> }
/** Prototype's static issues (the overdue corrective action is derived live from the compliance state).
 *  `params` open the sub-screen named by `ref`: pnl ?tab=compare → MGT-PNL-02, production ?batch= → MGT-PRD-05. */
export const ISSUES: IssueDef[] = [
  { en: 'Rock food cost 28.1% — highest of the three', ar: 'كلفة روك ٢٨٫١٪ — الأعلى بين الثلاثة', sub: { en: 'open count variance −$23', ar: 'فرق جرد مفتوح −٢٣$' }, sev: 'red', loc: 'rock', ref: 'MGT-PNL-02', module: 'pnl', params: { tab: 'compare' } },
  { en: 'Kaddoum waste 4.1% vs 2.0% target', ar: 'هدر قدّوم ٤٫١٪ مقابل هدف ٢٫٠٪', sub: { en: 'mango-pulp expiry drove the spike', ar: 'انتهاء لب المانجو سبب الارتفاع' }, sev: 'amber', loc: 'kad', ref: 'MGT-WST-02', module: 'waste' },
  { en: 'Taouk yield 78.4% vs 81% standard', ar: 'إنتاجية الطاووق ٧٨٫٤٪ مقابل معيار ٨١٪', sub: { en: 'weighing check assigned to morning shift', ar: 'فحص الوزن مسند لوردية الصباح' }, sev: 'amber', loc: 'mk', ref: 'MGT-PRD-05', module: 'production', params: { batch: PROD_MON_BATCH } },
];

export interface KpiDef { name: Bi; v: Record<Scope, string>; target?: string; bad?: Partial<Record<Scope, boolean>> }
export interface KpiGroupDef { title: Bi; kpis: KpiDef[] }
/** `all` values are the prototype's; per-location values follow the same story (Rock food cost, Kaddoum waste, MK yield). */
export const KPI_GROUPS: KpiGroupDef[] = [
  { title: { en: 'Financial', ar: 'مالي' }, kpis: [
    { name: { en: 'Sales · month', ar: 'المبيعات · الشهر' }, v: { all: '$22,400', mk: '—', rock: '$15,900', kad: '$6,500' } },
    { name: { en: 'Food cost %', ar: 'كلفة الطعام ٪' }, v: { all: '27.4%', mk: '26.2%', rock: '28.1%', kad: '26.9%' }, target: '≤ 28%', bad: { rock: true } },
    { name: { en: 'Waste $', ar: 'الهدر $' }, v: { all: '$187', mk: '$52', rock: '$46', kad: '$89' } },
    { name: { en: 'Net variance', ar: 'صافي الفرق' }, v: { all: '−$31', mk: '−$4', rock: '−$23', kad: '−$4' }, bad: { all: true, rock: true } },
  ] },
  { title: { en: 'Operational', ar: 'تشغيلي' }, kpis: [
    { name: { en: 'Count accuracy', ar: 'دقة الجرد' }, v: { all: '96.8%', mk: '98.1%', rock: '95.4%', kad: '96.9%' }, target: '≥ 97%', bad: { all: true, rock: true, kad: true } },
    { name: { en: 'Transfers confirmed < 4h', ar: 'تحويلات مؤكدة < ٤س' }, v: { all: '92%', mk: '92%', rock: '90%', kad: '95%' } },
    { name: { en: 'Avg yield vs std', ar: 'الإنتاجية مقابل المعيار' }, v: { all: '−1.4pt', mk: '−1.4pt', rock: '—', kad: '—' }, bad: { all: true, mk: true } },
    { name: { en: 'Overproduction', ar: 'إنتاج زائد' }, v: { all: '+6%', mk: '+6%', rock: '+4%', kad: '+9%' } },
  ] },
  { title: { en: 'Productivity & compliance', ar: 'إنتاجية والتزام' }, kpis: [
    { name: { en: 'Prep kg / labour-hr', ar: 'كغ تحضير / ساعة' }, v: { all: '9.4', mk: '9.4', rock: '—', kad: '—' } },
    { name: { en: 'Orders / labour-hr', ar: 'طلبات / ساعة' }, v: { all: '11.2', mk: '—', rock: '11.8', kad: '10.1' } },
    { name: { en: 'Checklist score', ar: 'نتيجة القوائم' }, v: { all: '92 / 100', mk: '97 / 100', rock: '88 / 100', kad: '90 / 100' } },
    { name: { en: 'Open corrective actions', ar: 'إجراءات مفتوحة' }, v: { all: '3', mk: '1', rock: '2', kad: '1' } },
  ] },
];

/* ───────────── OWN-RPT-01 Owner report ───────────── */

export const REPORT_MONTH = 'Jul 2026';
export const PREV_MONTH = 'Jun 2026';

export interface OwnerKpi { name: Bi; v: string; sub: Bi; prev: string; tone: 'ink' | 'default' | 'amber' | 'red' }
export const OWNER_KPIS: OwnerKpi[] = [
  { name: { en: 'Overall score', ar: 'النتيجة الكلية' }, v: '78 / 100', sub: { en: '+3 vs Jun', ar: '+٣ عن حزيران' }, prev: '75 / 100', tone: 'ink' },
  { name: { en: 'Food cost %', ar: 'كلفة الطعام ٪' }, v: '27.4%', sub: { en: 'theoretical 26.1%', ar: 'نظري ٢٦٫١٪' }, prev: '26.8%', tone: 'default' },
  { name: { en: 'Waste $', ar: 'الهدر $' }, v: '$187', sub: { en: '2.3% of sales', ar: '٢٫٣٪ من المبيعات' }, prev: '$142', tone: 'amber' },
  { name: { en: 'Inventory variance $', ar: 'فرق المخزون $' }, v: '−$31', sub: { en: '2 open cases', ar: 'فرقان مفتوحان' }, prev: '−$48', tone: 'red' },
];

export const PROBLEMS: { head: Bi; body: Bi }[] = [
  { head: { en: 'Halloumi +20%', ar: 'حلوم +٢٠٪' }, body: { en: 'pushed the Halloumi burger over threshold (31.5% vs 30%). Supplier change under review.', ar: 'دفع برغر الحلوم فوق حده (٣١٫٥٪ مقابل ٣٠٪). تغيير المورد قيد الدرس.' } },
  { head: { en: 'Kaddoum waste', ar: 'هدر قدّوم' }, body: { en: '4.1% of sales after the mango-pulp expiry — double the target.', ar: '٤٫١٪ من المبيعات بعد انتهاء لب المانجو — ضعف الهدف.' } },
  { head: { en: 'Taouk yield', ar: 'إنتاجية الطاووق' }, body: { en: '78.4% vs 81% standard — skewer weighing check in progress.', ar: '٧٨٫٤٪ مقابل معيار ٨١٪ — فحص وزن الأسياخ جارٍ.' } },
];
export const IMPROVEMENTS: { head: Bi; body: Bi }[] = [
  { head: { en: 'Count accuracy', ar: 'دقة الجرد' }, body: { en: '96.8% (+1.2pt) since daily counts on critical items.', ar: '٩٦٫٨٪ (+١٫٢ نقطة) بعد اعتماد الجرد اليومي للأصناف الحرجة.' } },
  { head: { en: 'Transfers', ar: 'التحويلات' }, body: { en: '92% confirmed within 4h — was 71% in May.', ar: '٩٢٪ تؤكد خلال ٤ ساعات — كانت ٧١٪ في أيار.' } },
  { head: { en: 'Waste logging', ar: 'تسجيل الهدر' }, body: { en: 'average entry time 24s — near-full adoption.', ar: 'متوسط زمن التسجيل ٢٤ ثانية — الالتزام شبه كامل.' } },
];
export const RECOMMENDED: Bi[] = [
  { en: 'Close the halloumi supplier change before 20 Aug (brings the burger back under 30%).', ar: 'إقفال تغيير مورد الحلوم قبل ٢٠ آب (يعيد البرغر تحت ٣٠٪).' },
  { en: 'Cut mango-pulp orders 25% and tie fresh production to the Thursday forecast.', ar: 'خفض طلبيات لب المانجو ٢٥٪ وربط الإنتاج الطازج بتوقع الخميس.' },
  { en: 'Finish the skewer weighing check; update the yield standard if the drift is confirmed.', ar: 'إنهاء فحص وزن الأسياخ وتحديث معيار الإنتاجية إن ثبت الانحراف.' },
];

/* ───────────── MGT-PRV-01 Productivity ───────────── */

export interface MetricDef { name: Bi; v: string; delta: string; bad?: boolean }
export interface DeptPanel { title: Bi; src: Bi; metrics: MetricDef[] }
export const DEPT_PANELS: DeptPanel[] = [
  { title: { en: 'Prep · Main Kitchen', ar: 'التحضير · المطبخ الرئيسي' }, src: { en: 'manual hours', ar: 'ساعات يدوية' }, metrics: [
    { name: { en: 'KG processed · week', ar: 'كغ معالجة · أسبوع' }, v: '412 KG', delta: '+3%' },
    { name: { en: 'Batches completed', ar: 'دفعات منجزة' }, v: '38', delta: '+2' },
    { name: { en: 'KG / labour-hr', ar: 'كغ / ساعة عمل' }, v: '9.4', delta: '+0.4' },
    { name: { en: 'Yield vs standard', ar: 'الإنتاجية مقابل المعيار' }, v: '−1.4pt', delta: '−0.6', bad: true },
    { name: { en: 'Rework', ar: 'إعادة تصنيع' }, v: '2 batches', delta: '' },
    { name: { en: 'Overtime', ar: 'عمل إضافي' }, v: '6.5 h', delta: '−1.5' },
  ] },
  { title: { en: 'Service · Rock + Kaddoum', ar: 'الخدمة · روك + قدّوم' }, src: { en: 'weekly import', ar: 'استيراد أسبوعي' }, metrics: [
    { name: { en: 'Orders served · week', ar: 'طلبات مقدمة · أسبوع' }, v: '1,842', delta: '+5%' },
    { name: { en: 'Orders / labour-hr', ar: 'طلبات / ساعة عمل' }, v: '11.2', delta: '+0.8' },
    { name: { en: 'Peak-hour productivity', ar: 'إنتاجية الذروة' }, v: '16.4 /hr', delta: '+1.1' },
    { name: { en: 'Avg ticket time', ar: 'متوسط زمن الطلب' }, v: '7.2 min', delta: '−0.4' },
    { name: { en: 'Overtime', ar: 'عمل إضافي' }, v: '4.0 h', delta: '+1.0', bad: true },
    { name: { en: 'No-waste shifts', ar: 'ورديات بلا هدر' }, v: '9 / 14', delta: '' },
  ] },
];

/* ───────────── MGT-CMP-01 Compliance (persisted in useModuleState('health')) ───────────── */

export interface ChecklistItem { id: string; name: Bi; note?: Bi; weight: number; pass: boolean }
export interface ChecklistRun { id: string; name: Bi; loc: LocId; ts: string; items: ChecklistItem[] }

export type CaStatus = 'open' | 'progress' | 'done' | 'overdue' | 'closed';
export type CaSev = 'high' | 'med' | 'low';
export interface CorrectiveAction {
  id: string;
  issue: Bi;
  loc: LocId;
  src: Bi; // checklist name or screen id
  owner: string;
  sev: CaSev;
  deadline: string; // YYYY-MM-DD
  status: CaStatus;
  itemId?: string; // checklist item that created it
  alertId?: string; // store alert raised when overdue (once)
  createdAt?: string;
}
export interface HealthState { version: number; checklists: ChecklistRun[]; actions: CorrectiveAction[] }

const sid = (s: string): Bi => ({ en: s, ar: s });

export const SEED_STATE: HealthState = {
  version: 1,
  checklists: [
    { id: 'CL-01', name: { en: 'Opening checklist', ar: 'قائمة الافتتاح' }, loc: 'mk', ts: '2026-08-12T07:10:00', items: [
      { id: 'CL-01-1', name: { en: 'Cold room temp', ar: 'حرارة غرفة التبريد' }, note: sid('4.2°C'), weight: 20, pass: true },
      { id: 'CL-01-2', name: { en: 'Handwash stations stocked', ar: 'محطات غسل اليدين مجهزة' }, weight: 10, pass: true },
      { id: 'CL-01-3', name: { en: 'Thaw log complete', ar: 'سجل الإذابة مكتمل' }, weight: 15, pass: true },
      { id: 'CL-01-4', name: { en: 'Grill temp log', ar: 'سجل حرارة الشواية' }, note: { en: 'missing', ar: 'ناقص' }, weight: 5, pass: false },
    ] },
    { id: 'CL-02', name: { en: 'Production checklist', ar: 'قائمة الإنتاج' }, loc: 'mk', ts: '2026-08-12T11:30:00', items: [
      { id: 'CL-02-1', name: { en: 'Batch labels applied', ar: 'ملصقات الدفعات موضوعة' }, weight: 15, pass: true },
      { id: 'CL-02-2', name: { en: 'Marination temp check', ar: 'فحص حرارة التتبيل' }, note: sid('2.8°C'), weight: 20, pass: true },
      { id: 'CL-02-3', name: { en: 'Stage weights recorded', ar: 'أوزان المراحل مسجلة' }, weight: 15, pass: true },
    ] },
    { id: 'CL-03', name: { en: 'Closing checklist', ar: 'قائمة الإقفال' }, loc: 'rock', ts: '2026-08-11T23:40:00', items: [
      { id: 'CL-03-1', name: { en: 'Line fridge sealed', ar: 'براد الخط مغلق' }, note: sid('3.9°C'), weight: 20, pass: true },
      { id: 'CL-03-2', name: { en: 'End-of-night waste logged', ar: 'هدر نهاية الليل مسجل' }, note: { en: 'logged late', ar: 'سُجل متأخراً' }, weight: 12, pass: false },
      { id: 'CL-03-3', name: { en: 'Surfaces sanitised', ar: 'الأسطح معقمة' }, weight: 10, pass: true },
    ] },
  ],
  actions: [
    { id: 'CA-01', issue: { en: 'Grill temp log missing', ar: 'سجل حرارة الشواية ناقص' }, loc: 'rock', src: { en: 'Opening checklist', ar: 'قائمة الافتتاح' }, owner: 'Maya', sev: 'high', deadline: '2026-08-12', status: 'overdue', itemId: 'CL-01-4' },
    { id: 'CA-02', issue: { en: 'Skewer weighing check', ar: 'فحص وزن الأسياخ' }, loc: 'mk', src: sid('MGT-VAR-01'), owner: 'Rami', sev: 'high', deadline: '2026-08-14', status: 'progress' },
    { id: 'CA-03', issue: { en: 'Night waste-logging training', ar: 'تدريب تسجيل الهدر ليلاً' }, loc: 'rock', src: { en: 'Closing checklist', ar: 'قائمة الإقفال' }, owner: 'Karim', sev: 'med', deadline: '2026-08-18', status: 'open', itemId: 'CL-03-2' },
    { id: 'CA-04', issue: { en: 'Mango-pulp ordering review', ar: 'مراجعة طلبيات لب المانجو' }, loc: 'kad', src: sid('MGT-WST-02'), owner: 'Karim', sev: 'med', deadline: '2026-08-20', status: 'progress' },
    { id: 'CA-05', issue: { en: 'Prep-date labels rollout', ar: 'ملصقات مواعيد التحضير' }, loc: 'mk', src: { en: 'Audit', ar: 'تدقيق' }, owner: 'Layal', sev: 'low', deadline: '2026-08-25', status: 'done' },
  ],
};

export const ST_CYCLE: CaStatus[] = ['open', 'progress', 'done', 'closed'];
/** overdue → in progress; otherwise open → in progress → completed → closed → open */
export const nextStatus = (cur: CaStatus): CaStatus => (cur === 'overdue' ? 'progress' : ST_CYCLE[(ST_CYCLE.indexOf(cur) + 1) % ST_CYCLE.length]);
/** [bg, border, fg] */
export const ST_STYLE: Record<CaStatus, [string, string, string]> = {
  open: ['#FFFFFF', '#CFC9B6', '#4A5348'],
  progress: ['#DCE4EC', '#B7C6D4', '#37536B'],
  done: ['#E0E8DA', '#B9CDB9', '#48603A'],
  overdue: ['#F0CFC9', '#DFB3AC', '#96382E'],
  closed: ['#E6E2DA', '#CFC9B6', '#9A9C8E'],
};
/** [bg, fg, label] */
export const SEV_MAP: Record<CaSev, [string, string, Bi]> = {
  high: ['#F0CFC9', '#96382E', { en: 'High', ar: 'عالية' }],
  med: ['#F5E3B3', '#8A6D1F', { en: 'Med', ar: 'متوسطة' }],
  low: ['#E6E2DA', '#6E6A5E', { en: 'Low', ar: 'منخفضة' }],
};
export const isOpenStatus = (s: CaStatus) => s === 'open' || s === 'progress' || s === 'overdue';
export const sevForWeight = (w: number): CaSev => (w >= 20 ? 'high' : w >= 10 ? 'med' : 'low');

/** Weighted score: weights are penalty points out of 100 (matches the prototype's 95 / 100 / 88). */
export const checklistScore = (c: ChecklistRun) => Math.max(0, 100 - c.items.filter((i) => !i.pass).reduce((s, i) => s + i.weight, 0));
/** [bg, fg] for the score pill */
export const scorePillStyle = (score: number): [string, string] => (score >= 90 ? ['#E0E8DA', '#48603A'] : score >= 65 ? ['#F5E3B3', '#8A6D1F'] : ['#F0CFC9', '#96382E']);

export const addDays = (isoDate: string, n: number): string => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Date-only deadlines ('YYYY-MM-DD') parse as UTC midnight, which reads back as the previous day west of
 *  UTC. Pin them to local midnight before formatting so 'Due' shows the stored day everywhere. */
export const atLocalMidnight = (isoDate: string): string => (isoDate.length === 10 ? isoDate + 'T00:00:00' : isoDate);
