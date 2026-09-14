/** Module-local formatting and cash helpers for Accounting / Financial P&L. */
import type { CoreState, ShiftClosing, LocId } from '../../store';
import { num, money } from '../../ui';
import { CASH_OPENING, CASH_UNCALIBRATED_BILLS } from './data';

/** Short LBP figure like the prototype: 16.2M / 54M; below 1M → full number. */
export function lbpShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1e6) { const m = a / 1e6; return sign + (m >= 100 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '')) + 'M'; }
  return sign + num(a);
}

/** Money with no decimals ($4,812). */
export const money0 = (n: number) => money(n, { min: 0, max: 0 });

const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MON_AR = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
export const MON_FULL_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Wed 12 Aug 2026" / "الأربعاء 12 آب 2026" */
export function longDate(d: string, isAr = false): string {
  const dt = new Date(d.length === 10 ? d + 'T12:00:00' : d);
  const dd = String(dt.getDate()).padStart(2, '0');
  return isAr ? `${DOW_AR[dt.getDay()]} ${dt.getDate()} ${MON_AR[dt.getMonth()]} ${dt.getFullYear()}` : `${DOW_EN[dt.getDay()]} ${dd} ${MON_EN[dt.getMonth()]} ${dt.getFullYear()}`;
}

/** "Aug 2026" / "آب 2026" from 'YYYY-MM'. */
export function monthLabel(ym: string, isAr = false): string {
  const [y, m] = ym.split('-').map(Number);
  return `${isAr ? MON_AR[m - 1] : MON_EN[m - 1]} ${y}`;
}
/** "August" / "آب" from 'YYYY-MM'. */
export function monthName(ym: string, isAr = false): string {
  const m = Number(ym.split('-')[1]);
  return isAr ? MON_AR[m - 1] : MON_FULL_EN[m - 1];
}
/** Next month 'YYYY-MM'. */
export function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
/** Add days to an ISO date/time and return ISO date-time (demo clock). */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/** USD value of a declared drawer: cash USD + cash LBP at the closing's locked rate + Whish + card. */
export function declaredTotal(c: ShiftClosing): number {
  return c.declared.cashUsd + c.declared.cashLbp / c.rate + c.declared.whish + c.declared.card;
}
export function confirmedTotal(c: ShiftClosing): number | null {
  if (!c.confirmed) return null;
  return c.confirmed.cashUsd + c.confirmed.cashLbp / c.rate + c.confirmed.whish + c.confirmed.card;
}

/**
 * Central cash-in-hand by currency = opening (1 Aug) + Σ confirmed closings (cash only — Whish/card go to
 * clearing) − Σ cash-paid supplier bills − Σ cash expenses paid since the opening date.
 */
export function cashInHand(state: CoreState): { usd: number; lbp: number } {
  let usd = CASH_OPENING.usd, lbp = CASH_OPENING.lbp;
  for (const c of state.closings) {
    if (c.confirmed && c.status !== 'in_transit' && c.date >= CASH_OPENING.asOf) { usd += c.confirmed.cashUsd; lbp += c.confirmed.cashLbp; }
  }
  for (const i of state.invoices) {
    if (i.stage === 'paid' && i.paymentMethod === 'cash' && !CASH_UNCALIBRATED_BILLS.has(i.id)) { const a = i.paidAmount ?? i.amount; if (i.currency === 'USD') usd -= a; else lbp -= a; }
  }
  for (const e of state.expenses) {
    if (e.method === 'cash' && e.date >= CASH_OPENING.asOf) { if (e.currency === 'USD') usd -= e.amount; else lbp -= e.amount; }
  }
  return { usd: Math.round(usd * 100) / 100, lbp: Math.round(lbp) };
}

export const LOC_ORDER: LocId[] = ['rock', 'kad', 'mk'];
