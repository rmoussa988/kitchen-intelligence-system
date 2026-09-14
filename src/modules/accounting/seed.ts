/**
 * Extra seed rows for the accounting world (merged on mount only if absent):
 * July expenses (so the prior month's P&L has rent / utilities / tax) and the August tax lines from the
 * financial P&L prototype. Ids stay in the seed's EXP-07xx / EXP-08xx families.
 */
import type { Expense } from '../../store';

export const EXTRA_EXPENSES: Expense[] = [
  { id: 'EXP-0701', date: '2026-07-01', accrualMonth: '2026-07', category: 'rent', amount: 3500, currency: 'USD', method: 'cash', allocation: 'rock', vendor: 'Landlord — Rock', recurring: true },
  { id: 'EXP-0702', date: '2026-07-01', accrualMonth: '2026-07', category: 'rent', amount: 1200, currency: 'USD', method: 'cash', allocation: 'kad', vendor: 'Landlord — Kaddoum', recurring: true },
  { id: 'EXP-0703', date: '2026-07-01', accrualMonth: '2026-07', category: 'rent', amount: 1800, currency: 'USD', method: 'cash', allocation: 'mk', vendor: 'Landlord — MK', recurring: true },
  { id: 'EXP-0704', date: '2026-07-05', accrualMonth: '2026-07', category: 'gas', amount: 610, currency: 'USD', method: 'cash', allocation: 'mk', vendor: 'Gaz Liban' },
  { id: 'EXP-0705', date: '2026-07-06', accrualMonth: '2026-07', category: 'marketing', amount: 450, currency: 'USD', method: 'card', allocation: 'split', vendor: 'Meta Ads', note: 'Split evenly ÷3' },
  { id: 'EXP-0706', date: '2026-07-14', accrualMonth: '2026-07', category: 'maintenance', amount: 9000000, currency: 'LBP', method: 'cash', allocation: 'kad', vendor: 'Juicer service' },
  { id: 'EXP-0707', date: '2026-07-10', accrualMonth: '2026-07', category: 'tax', amount: 610, currency: 'USD', method: 'card', allocation: 'rock', vendor: 'Municipality / VAT' },
  { id: 'EXP-0708', date: '2026-07-10', accrualMonth: '2026-07', category: 'tax', amount: 190, currency: 'USD', method: 'card', allocation: 'kad', vendor: 'Municipality / VAT' },
  { id: 'EXP-0709', date: '2026-07-10', accrualMonth: '2026-07', category: 'tax', amount: 130, currency: 'USD', method: 'card', allocation: 'mk', vendor: 'Municipality / VAT' },
  { id: 'EXP-0810', date: '2026-08-09', accrualMonth: '2026-08', category: 'tax', amount: 640, currency: 'USD', method: 'card', allocation: 'rock', vendor: 'Municipality / VAT' },
  { id: 'EXP-0811', date: '2026-08-09', accrualMonth: '2026-08', category: 'tax', amount: 200, currency: 'USD', method: 'card', allocation: 'kad', vendor: 'Municipality / VAT' },
  { id: 'EXP-0812', date: '2026-08-09', accrualMonth: '2026-08', category: 'tax', amount: 140, currency: 'USD', method: 'card', allocation: 'mk', vendor: 'Municipality / VAT' },
];
