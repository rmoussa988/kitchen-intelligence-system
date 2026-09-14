/** Shared number/money formatting — identical to the prototypes' helpers. */
export function money(n: number, opts?: { max?: number; min?: number; sign?: boolean }): string {
  const min = opts?.min ?? 2, max = opts?.max ?? 2;
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
  if (opts?.sign) return (n < 0 ? '−' : n > 0 ? '+' : '') + '$' + abs;
  return (n < 0 ? '−' : '') + '$' + abs;
}

/** Whole numbers without decimals, fractions with up to 2 (prototype `fmt`). */
export function fmt(n: number, max = 2): string {
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString('en-US', { minimumFractionDigits: r % 1 ? Math.min(2, max) : 0, maximumFractionDigits: max });
}

export function num(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function pct(n: number, digits = 1, sign = false): string {
  const s = n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return (sign && n > 0 ? '+' : '') + s + '%';
}

export function signed(n: number, unit = '', digits = 2): string {
  return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), digits) + (unit ? ' ' + unit : '');
}

/** LBP amounts (no decimals, thousands separators). */
export function lbp(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' LL';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_AR = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];

/** Parse an ISO string as *local* time. A date-only form ('2026-08-12') is parsed by the runtime as
 *  UTC midnight, so getDate() shifts back a day west of UTC; append 'T00:00:00' to read it as local. */
function toLocalDate(d: string | Date): Date {
  if (typeof d !== 'string') return d;
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T00:00:00' : d);
}

/** "12 Aug" / "١٢ آب" from an ISO date or Date. */
export function shortDate(d: string | Date, ar = false): string {
  const dt = toLocalDate(d);
  const day = dt.getDate(), m = dt.getMonth();
  return ar ? `${day} ${MONTHS_AR[m]}` : `${String(day).padStart(2, '0')} ${MONTHS[m]}`;
}

export function timeHM(d: string | Date): string {
  const dt = toLocalDate(d);
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

/** Sequential ids: nextId('WST', 1042) → 'WST-1042' */
export function nextId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

/** Today in the demo world (period fixed to Aug 2026 like the prototypes). */
export const DEMO_TODAY = '2026-08-12T09:30:00';
