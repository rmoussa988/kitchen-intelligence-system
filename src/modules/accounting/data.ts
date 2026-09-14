/**
 * Accounting demo data that is NOT a store entity: categorized daily sales from the POS day-close
 * (Part G) and the central cash opening position. Shared with the financial P&L module.
 */
import type { LocId } from '../../store';

export type SalesCat = 'food' | 'beverage' | 'tobacco' | 'tax';
export const SALES_CATS: SalesCat[] = ['food', 'beverage', 'tobacco', 'tax'];
/** Prototype mix colours: food / beverage / tobacco / tax. */
export const MIX_COLORS = ['#4A5348', '#37536B', '#7A5A32', '#9A9C8E'];

export interface SalesDay { date: string; loc: LocId; food: number; beverage: number; tobacco: number; tax: number; total: number }
export interface SalesTotals { food: number; beverage: number; tobacco: number; tax: number; total: number }
export const ZERO_SALES: SalesTotals = { food: 0, beverage: 0, tobacco: 0, tax: 0, total: 0 };

/**
 * Central cash-in-hand opening position at 1 Aug 2026 (before the seeded August events).
 * Opening + Σ confirmed closings − Σ cash-paid bills − Σ cash expenses (Aug pay dates) reconciles to the
 * prototype's displayed position of $4,812 and 126,450,000 LL at seed state.
 */
export const CASH_OPENING = { asOf: '2026-08-01', usd: 12653.4, lbp: 81450000 };

/**
 * Cash-paid supplier invoices that OTHER modules' seeds merge lazily (e.g. receiving's `ensureSeed`)
 * only once their module is first opened — so they were NOT part of the central-cash opening
 * calibration above. `cashInHand` excludes these so the headline figure stays at $4,812 no matter
 * which modules the user has already visited. (SI-3012 — $288 cash, merged on the first visit to
 * Receiving — would otherwise pull the figure down to $4,524.) Invoices genuinely paid in-session
 * through Accounting (BillsView) are not in this set and still reduce cash-in-hand.
 */
export const CASH_UNCALIBRATED_BILLS: ReadonlySet<string> = new Set(['SI-3012']);

export const CURRENT_MONTH = '2026-08';
export const PRIOR_MONTH = '2026-07';
/** Last POS day-close in the demo world (today is 12 Aug 09:30 — no close yet). */
export const LAST_CLOSE_DATE = '2026-08-11';

// Category mix per selling location (from the prototype's sample day: Rock 893/214/96/81, Kaddoum 58/302/0/52).
const SHARE: Record<'rock' | 'kad', number[]> = { rock: [0.695, 0.167, 0.075], kad: [0.14, 0.733, 0] };
const BASE: Record<'rock' | 'kad', number> = { rock: 1850, kad: 630 };
// Day totals that must match the seeded shift closings (POS expected).
const FIXED: Record<string, number> = { '2026-08-10:rock': 1842, '2026-08-11:rock': 1910, '2026-08-10:kad': 612, '2026-08-11:kad': 648 };

const pad = (n: number) => String(n).padStart(2, '0');
function noise(i: number) { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

function build(): SalesDay[] {
  const out: SalesDay[] = [];
  let i = 0;
  const month = (ym: string, days: number) => {
    for (let d = 1; d <= days; d++) {
      const date = `${ym}-${pad(d)}`;
      const dow = new Date(date + 'T12:00:00').getDay();
      for (const loc of ['rock', 'kad'] as const) {
        i++;
        const wk = dow === 5 || dow === 6 ? 1.12 : dow === 1 ? 0.92 : 1;
        const total = FIXED[`${date}:${loc}`] ?? Math.round(BASE[loc] * wk * (0.9 + 0.2 * noise(i)));
        const [f, b, tb] = SHARE[loc];
        const food = Math.round(total * f), beverage = Math.round(total * b), tobacco = Math.round(total * tb);
        out.push({ date, loc, food, beverage, tobacco, tax: total - food - beverage - tobacco, total });
      }
    }
  };
  month(PRIOR_MONTH, 31);
  month(CURRENT_MONTH, 11);
  return out;
}

export const SALES_DAYS: SalesDay[] = build();
export const SALES_DATES: string[] = Array.from(new Set(SALES_DAYS.map((s) => s.date))).sort();

export function sumSales(rows: SalesDay[]): SalesTotals {
  return rows.reduce((a, r) => ({ food: a.food + r.food, beverage: a.beverage + r.beverage, tobacco: a.tobacco + r.tobacco, tax: a.tax + r.tax, total: a.total + r.total }), { ...ZERO_SALES });
}
export function addSales(a: SalesTotals, b: SalesTotals): SalesTotals {
  return { food: a.food + b.food, beverage: a.beverage + b.beverage, tobacco: a.tobacco + b.tobacco, tax: a.tax + b.tax, total: a.total + b.total };
}
/** One location, one day (Main Kitchen → zero: no direct sales). */
export function salesFor(loc: LocId, date: string): SalesTotals {
  return sumSales(SALES_DAYS.filter((s) => s.loc === loc && s.date === date));
}
/** One location, one month (optionally up to a date, inclusive). */
export function monthSales(loc: LocId, ym: string, upTo?: string): SalesTotals {
  return sumSales(SALES_DAYS.filter((s) => s.loc === loc && s.date.startsWith(ym) && (!upTo || s.date <= upTo)));
}
