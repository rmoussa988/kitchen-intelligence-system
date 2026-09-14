/**
 * Prototype alert examples that are NOT already represented in the shared seed (AL-001..011).
 * Skipped as duplicates by type/text: Halloumi food cost (AL-006), Chicken breast count variance (AL-002),
 * transfer not received (AL-009), purchase price +% (AL-001).
 * Merged on mount only if absent, so Dismiss / Assign go through the store like every other alert.
 */
import type { Alert } from '../../store';

const T = (hm: string) => `2026-08-12T${hm}:00`;

export const EXTRA_ALERTS: Alert[] = [
  { id: 'AL-R01', ts: T('08:40'), severity: 'amber', type: 'pos_unmapped', en: '2 unmapped POS items — consumption blocked', ar: 'صنفا POS غير مربوطين — الاستهلاك محجوب', moduleId: 'items' },
  { id: 'AL-R02', ts: T('07:30'), severity: 'amber', type: 'waste_target', en: 'Waste above target at Kaddoum — 4.1% vs 2.0%', ar: 'هدر فوق الهدف في قدّوم — ٤٫١٪ مقابل ٢٫٠٪', loc: 'kad', moduleId: 'waste' },
  { id: 'AL-R03', ts: T('06:10'), severity: 'info', type: 'count_due', en: 'Monthly count due — pickles, cleaning supplies', ar: 'جرد شهري مستحق — الكبيس ومواد التنظيف', loc: 'rock', moduleId: 'inventory' },
  { id: 'AL-R04', ts: T('06:05'), severity: 'info', type: 'corrective_overdue', en: 'Corrective action overdue — skewer weighing check', ar: 'إجراء تصحيحي متأخر — فحص وزن الأسياخ', loc: 'mk', moduleId: 'variance' },
];

/** Second line for the prototype's own alert examples (the shared Alert type has no sub-line). */
export const ALERT_SUBS: Record<string, [string, string]> = {
  'AL-R01': ['Taouk Platter XL · Mango Smoothie', 'صحن طاووق XL · سموذي مانجو'],
  'AL-R02': ['Mango pulp expiry drove the spike', 'انتهاء صلاحية لب المانجو سبب الارتفاع'],
  'AL-R03': ['Scheduled window closes 15 Aug', 'تنتهي النافذة ١٥ آب'],
  'AL-R04': ['Assigned 12 Aug · morning shift', 'أُسند ١٢ آب · وردية الصباح'],
};
