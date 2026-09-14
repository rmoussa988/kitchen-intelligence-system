/** Builds the financial statement rows: categorized revenue − COGS − opex = net, value + % of sales. */
import type { Expense, LocId, Scope } from '../../store';
import { SALES_DATES, ZERO_SALES, addSales, monthSales } from '../accounting/data';
import { money0, monthName, nextMonth } from '../accounting/helpers';
import { COGS_MK_MONTH, COGS_RATIO, CURRENT_MONTH, ELEC_EST, PRIOR_SCALE, RENT_EST, SALARIES } from './data';
import type { PnlText } from './text';

export type Drill = 'sales' | 'cogs' | 'expenses' | 'payroll';
export interface Line { key: string; label: string; v: number; display: string; p: string; bold: boolean; band: boolean; sub: boolean; color?: string; pending: boolean; drill: Drill }
export interface WaitingRow { key: string; name: string; sub: string; est: string }
export interface PnlResult { lines: Line[]; revTotal: number; cogs: number; opex: number; net: number; waiting: WaitingRow[] }

const ALL: LocId[] = ['rock', 'kad', 'mk'];

export function buildPnl(args: { scope: Scope; month: string; expenses: Expense[]; rate: number; provisional: boolean; t: PnlText; isAr: boolean; locNames: Record<LocId, string> }): PnlResult {
  const { scope, month, expenses, rate, provisional, t, isAr, locNames } = args;
  const L = t.lines;
  const locs: LocId[] = scope === 'all' ? ALL : [scope];
  const scale = month === CURRENT_MONTH ? 1 : PRIOR_SCALE;

  // Revenue — categorized daily sales from the POS day-close (accounting/data).
  const rev = locs.reduce((a, l) => addSales(a, monthSales(l, month)), { ...ZERO_SALES });
  const revTotal = rev.total;
  const pct = (v: number) => (revTotal ? ((v / revTotal) * 100).toFixed(1) + '%' : '—');

  // COGS (food) from the operational P&L — ratio of each selling location's revenue; MK flat, prorated by days closed.
  const [yy, mm] = month.split('-').map(Number);
  const daysClosed = SALES_DATES.filter((d) => d.startsWith(month)).length || 1;
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const cogs = locs.reduce((a, l) => a + (l === 'mk' ? (COGS_MK_MONTH * daysClosed) / daysInMonth : monthSales(l, month).total * COGS_RATIO[l]), 0);

  // Operating expenses by accrual month; one location or ÷3 split; LBP at the day rate.
  const cat: Record<string, number> = {};
  const has: Record<LocId, Set<string>> = { rock: new Set(), kad: new Set(), mk: new Set() };
  for (const e of expenses) {
    if (e.accrualMonth !== month) continue;
    const usd = e.currency === 'USD' ? e.amount : e.amount / rate;
    for (const l of locs) {
      const share = e.allocation === 'split' ? usd / 3 : e.allocation === l ? usd : 0;
      if (share) { cat[e.category] = (cat[e.category] || 0) + share; has[l].add(e.category); }
    }
  }
  const missing = (c: string) => locs.filter((l) => !has[l].has(c));

  const salariesActual = cat.salaries || 0;
  const salariesMissing = missing('salaries');
  const salaries = salariesActual + salariesMissing.reduce((a, l) => a + SALARIES[l], 0) * scale;
  const salariesPending = provisional && salariesMissing.length > 0;

  // Late-cost estimates fill the statement whether the month is Provisional or Final (as salaries do above),
  // so the net does not jump when the owner marks the month Final; only the PENDING chip is gated on Provisional.
  const rentMissing = missing('rent');
  const rent = (cat.rent || 0) + rentMissing.reduce((a, l) => a + RENT_EST[l], 0) * scale;
  const rentPending = provisional && rentMissing.length > 0;

  const elecMissing = missing('electricity').filter((l) => ELEC_EST[l] > 0);
  const utilities = (cat.gas || 0) + (cat.electricity || 0) + elecMissing.reduce((a, l) => a + ELEC_EST[l], 0) * scale;
  const utilPending = provisional && elecMissing.length > 0;

  const marketing = cat.marketing || 0, maintenance = cat.maintenance || 0, uniforms = cat.uniforms || 0, taxPaid = cat.tax || 0, other = cat.other || 0;
  const opex = salaries + rent + utilities + marketing + maintenance + uniforms + taxPaid + other;
  const gross = revTotal - cogs;
  const net = gross - opex;

  const lines: Line[] = [];
  // `neg` forces a minus on subtraction lines (COGS, opex, each expense) and shows the % as a magnitude;
  // value lines (revenue, gross, net) sign themselves — a loss prints its own '−' and a signed %.
  const push = (key: string, label: string, v: number, o: { bold?: boolean; band?: boolean; sub?: boolean; color?: string; pending?: boolean; neg?: boolean; drill: Drill }) => lines.push({
    key, label, v, display: (o.neg || v < 0 ? '−' : '') + money0(Math.abs(v)), p: o.neg ? pct(Math.abs(v)) : pct(v), bold: !!o.bold, band: !!o.band, sub: !!o.sub, color: o.color, pending: !!o.pending, drill: o.drill,
  });
  push('rev', L.revenueByCat, revTotal, { bold: true, band: true, drill: 'sales' });
  push('food', L.food, rev.food, { sub: true, drill: 'sales' });
  push('beverage', L.beverage, rev.beverage, { sub: true, drill: 'sales' });
  push('tobacco', L.tobacco, rev.tobacco, { sub: true, drill: 'sales' });
  push('tax', L.taxCollected, rev.tax, { sub: true, drill: 'sales' });
  push('cogs', L.cogs, cogs, { bold: true, neg: true, drill: 'cogs' });
  push('gross', L.grossMargin, gross, { bold: true, band: true, drill: 'cogs' });
  push('opex', L.opex, opex, { bold: true, neg: true, drill: 'expenses' });
  const sub3 = scope === 'all' ? '' : ' ' + t.split3;
  // Any per-location line whose expense is a ÷3 split gets the '(÷3)' suffix — Marketing AND Uniforms, not Marketing only.
  const splitCats = new Set<string>(expenses.filter((e) => e.accrualMonth === month && e.allocation === 'split').map((e) => e.category));
  const splitSuffix = (cat: string) => (splitCats.has(cat) ? sub3 : '');
  const exp = (key: string, label: string, v: number, pending: boolean, drill: Drill = 'expenses') => { if (v > 0) push(key, label, v, { sub: true, neg: true, pending, drill }); };
  exp('salaries', L.salaries, salaries, salariesPending, 'payroll');
  exp('rent', L.rent, rent, rentPending);
  exp('utilities', L.utilities, utilities, utilPending);
  exp('marketing', L.marketing + splitSuffix('marketing'), marketing, false);
  exp('maintenance', L.maintenance, maintenance, false);
  exp('uniforms', L.uniforms + splitSuffix('uniforms'), uniforms, false);
  exp('taxPaid', L.taxPaid, taxPaid, false);
  exp('other', L.other, other, false);
  push('net', L.netProfit, net, { bold: true, band: true, color: net >= 0 ? '#48603A' : '#96382E', drill: 'expenses' });

  const waiting: WaitingRow[] = [];
  if (provisional) {
    const nm = monthName(nextMonth(month), isAr).slice(0, isAr ? undefined : 3);
    if (salariesMissing.length) waiting.push({ key: 'salaries', name: t.waitSalaries.replace('{m}', monthName(month, isAr)), sub: t.waitSalariesSub.replace('{m}', nm), est: money0(salariesMissing.reduce((a, l) => a + SALARIES[l], 0) * scale) });
    if (rentMissing.length) waiting.push({ key: 'rent', name: t.waitRent.replace('{locs}', rentMissing.map((l) => locNames[l]).join(isAr ? ' و' : ' + ')), sub: t.waitRentSub.replace('{m}', nm), est: money0(rentMissing.reduce((a, l) => a + RENT_EST[l], 0) * scale) });
    if (elecMissing.length) waiting.push({ key: 'electricity', name: t.waitElec, sub: t.waitElecSub.replace('{m}', nm), est: '~' + money0(elecMissing.reduce((a, l) => a + ELEC_EST[l], 0) * scale) });
  }

  return { lines, revTotal, cogs, opex, net, waiting };
}
