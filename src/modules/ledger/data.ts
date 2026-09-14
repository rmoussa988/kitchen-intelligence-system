/** General Ledger proposal — the prototype's own chart of accounts, journal entries and opening balances. */
export type Group = 'assets' | 'liab' | 'equity' | 'rev' | 'exp';
export type Src = 'POS' | 'AP' | 'WASTE' | 'CASH' | 'HR' | 'BANK' | 'MANUAL';
export interface Acct { en: string; ar: string; g: Group }
/** [code, debit, credit] */
export type JLine = [string, number, number];
export interface JE { ref: string; date: string; src: Src; memoEn: string; memoAr: string; lines: JLine[] }

export const ACCTS: Record<string, Acct> = {
  '1010': { en: 'Cash on hand — Achrafieh', ar: 'نقد بالصندوق — الأشرفية', g: 'assets' },
  '1011': { en: 'Cash on hand — Rock', ar: 'نقد بالصندوق — روك', g: 'assets' },
  '1020': { en: 'Cash — central (accounting)', ar: 'نقد مركزي (المحاسبة)', g: 'assets' },
  '1030': { en: 'Bank — BLOM current', ar: 'بنك — BLOM جارٍ', g: 'assets' },
  '1040': { en: 'Card clearing', ar: 'تسوية البطاقات', g: 'assets' },
  '1045': { en: 'Whish clearing', ar: 'تسوية Whish', g: 'assets' },
  '1100': { en: 'Inventory — food & packaging', ar: 'مخزون — غذاء وتغليف', g: 'assets' },
  '2010': { en: 'Accounts payable — suppliers', ar: 'ذمم موردين', g: 'liab' },
  '2020': { en: 'Accrued payroll', ar: 'رواتب مستحقة', g: 'liab' },
  '2030': { en: 'VAT payable', ar: 'ضريبة مستحقة', g: 'liab' },
  '3010': { en: 'Owner equity', ar: 'حقوق المالك', g: 'equity' },
  '4010': { en: 'Revenue — food', ar: 'إيراد — غذاء', g: 'rev' },
  '4020': { en: 'Revenue — beverage', ar: 'إيراد — مشروبات', g: 'rev' },
  '4030': { en: 'Revenue — tobacco', ar: 'إيراد — تبغ', g: 'rev' },
  '5010': { en: 'COGS — consumption', ar: 'كلفة المبيعات — استهلاك', g: 'exp' },
  '5020': { en: 'Waste expense', ar: 'مصروف الهدر', g: 'exp' },
  '6010': { en: 'Salaries & wages', ar: 'رواتب وأجور', g: 'exp' },
  '6300': { en: 'Other operating expenses', ar: 'مصاريف تشغيلية أخرى', g: 'exp' },
};
export const ACCT_CODES = Object.keys(ACCTS);

export const JES: JE[] = [
  { ref: 'JE-0031', date: '26 Aug', src: 'POS', memoEn: 'Day close — Achrafieh (POS-08)', memoAr: 'إقفال اليوم — الأشرفية', lines: [['1010', 1240, 0], ['1040', 480, 0], ['1045', 122, 0], ['4010', 0, 1412], ['4020', 0, 262], ['2030', 0, 168]] },
  { ref: 'JE-0030', date: '26 Aug', src: 'AP', memoEn: 'Invoice approved — Malak Foods #4471', memoAr: 'اعتماد فاتورة — ملاك فودز', lines: [['1100', 486.5, 0], ['2010', 0, 486.5]] },
  { ref: 'JE-0029', date: '26 Aug', src: 'WASTE', memoEn: 'Waste approved — 4 records (MGT-WST-02)', memoAr: 'اعتماد هدر — ٤ سجلات', lines: [['5020', 38.2, 0], ['1100', 0, 38.2]] },
  { ref: 'JE-0028', date: '25 Aug', src: 'CASH', memoEn: 'Cash handover Rock → central (ACC-CLS-02)', memoAr: 'تسليم نقد روك ← المركز', lines: [['1020', 1105, 0], ['1011', 0, 1105]] },
  { ref: 'JE-0027', date: '25 Aug', src: 'HR', memoEn: 'Payroll accrual — Aug period close (HR-PAY-01)', memoAr: 'استحقاق رواتب — إقفال آب', lines: [['6010', 9420, 0], ['2020', 0, 9420]] },
  { ref: 'JE-0026', date: '25 Aug', src: 'BANK', memoEn: 'Supplier payment — Kassatly #4402', memoAr: 'دفعة مورد — قصاطلي', lines: [['2010', 612, 0], ['1030', 0, 612]] },
];

export const SRC_TONE: Record<Src, { bg: string; fg: string }> = {
  POS: { bg: '#DDE8DA', fg: '#3E6B45' }, AP: { bg: '#F3E6C3', fg: '#8A6116' }, WASTE: { bg: '#F2DCD6', fg: '#8C3A32' }, CASH: { bg: '#E4DFCE', fg: '#4A5348' },
  HR: { bg: '#DCE5EC', fg: '#37536B' }, BANK: { bg: '#E4DFCE', fg: '#4A5348' }, MANUAL: { bg: '#2E3A2E', fg: '#F7F4EA' },
};
export const SRC_FILTERS: ('all' | Src)[] = ['all', 'POS', 'AP', 'WASTE', 'CASH', 'HR', 'BANK'];

/** Opening balances (debit-positive) before the listed journal entries. */
export const SEED_BAL: Record<string, number> = { '1010': 3120, '1011': 1870, '1020': 8240, '1030': 14650, '1040': 2210, '1045': 590, '1100': 11480, '2010': -6240, '2020': 0, '2030': -1830, '3010': -24600, '4010': -16480, '4020': -3140, '4030': -1980, '5010': 9860, '5020': 412, '6010': 0, '6300': 1838 };

export const GROUPS: { g: Group; range: string }[] = [
  { g: 'assets', range: '1000–1999' }, { g: 'liab', range: '2000–2999' }, { g: 'equity', range: '3000–3999' }, { g: 'rev', range: '4000–4999' }, { g: 'exp', range: '5000–6999' },
];

export const NOTES: Record<string, { en: string; ar: string }> = {
  '1010': { en: 'fed by shift closings', ar: 'يُغذى من إقفال الورديات' },
  '1020': { en: 'after reconciled handover', ar: 'بعد التسليم المطابَق' },
  '1100': { en: 'perpetual stock movements', ar: 'حركات المخزون الدائمة' },
  '2010': { en: 'from invoice pipeline', ar: 'من خط الفواتير' },
  '2020': { en: 'from HR-PAY-01 close', ar: 'من إقفال HR-PAY-01' },
  '4010': { en: 'from POS day close', ar: 'من إقفال POS اليومي' },
  '5010': { en: 'recipes × sales', ar: 'وصفات × مبيعات' },
  '5020': { en: 'approved waste only', ar: 'الهدر المعتمد فقط' },
};

/** Balances after all entries (manual first), debit-positive. */
export function balances(all: JE[]): Record<string, number> {
  const bal: Record<string, number> = {};
  all.forEach((j) => j.lines.forEach(([code, d, c]) => { bal[code] = (bal[code] || 0) + d - c; }));
  Object.keys(SEED_BAL).forEach((k) => { bal[k] = (bal[k] || 0) + SEED_BAL[k]; });
  return bal;
}

/** Prototype fmt: 2 decimals, empty for zero. */
export function fmt2(n: number): string { return n ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''; }
