/**
 * Financial P&L — numbers that are not store entities (COGS from the operational P&L, the payroll
 * placeholder, late-cost estimates) and the persisted module state (month states + access grants).
 */
import type { LocId } from '../../store';
import { CURRENT_MONTH, PRIOR_MONTH } from '../accounting/data';

/**
 * COGS (food) from the operational P&L. The prototype's absolute figures (Rock 6,520 on 24,355 revenue,
 * Kaddoum 1,180 on 4,540) are kept as the implied food-cost ratio so month-to-date and full months stay
 * comparable; Main Kitchen (no direct sales) carries a flat monthly figure prorated by days closed.
 */
export const COGS_RATIO: Record<'rock' | 'kad', number> = { rock: 0.268, kad: 0.26 };
export const COGS_MK_MONTH = 1240;
/** Salaries placeholder — flows from payroll (Part H), not from ACC-EXP-01. */
export const SALARIES: Record<LocId, number> = { rock: 3400, kad: 1400, mk: 1600 };
/** Expected late costs used while a month is Provisional and the actual has not landed. */
export const RENT_EST: Record<LocId, number> = { rock: 3500, kad: 1200, mk: 1800 };
export const ELEC_EST: Record<LocId, number> = { rock: 920, kad: 380, mk: 0 };
/** Prototype scales the prior month's placeholders by 0.94. */
export const PRIOR_SCALE = 0.94;

export const MONTHS = [CURRENT_MONTH, PRIOR_MONTH];
export { CURRENT_MONTH, PRIOR_MONTH };

export type Win = 'recon' | '7d' | '48h';
export const WINS: Win[] = ['recon', '7d', '48h'];

export interface Grant {
  id: string;
  userId: string;
  month: string; // YYYY-MM scope
  win: Win;
  grantedAt: string; // ISO
  expiresAt?: string; // ISO — 48h / 7d windows
  endedAt?: string; // ISO — when expired or revoked
  status: 'active' | 'expired' | 'revoked';
  descEn?: string; // seeded history wording (prototype)
  descAr?: string;
}

export interface PnlState {
  /** `${scope}:${month}` → Final (locked). Absent = Provisional. */
  finalMonths: Record<string, boolean>;
  grants: Grant[];
}

export const SEED_STATE: PnlState = {
  finalMonths: { [`all:${PRIOR_MONTH}`]: true, [`rock:${PRIOR_MONTH}`]: true, [`kad:${PRIOR_MONTH}`]: true, [`mk:${PRIOR_MONTH}`]: true },
  grants: [
    { id: 'GR-0003', userId: 'U-10', month: '2026-07', win: 'recon', grantedAt: '2026-08-01T09:00:00', endedAt: '2026-08-04T18:00:00', status: 'expired', descEn: 'July reconciliation (scope: Jul)', descAr: 'تسوية تموز (نطاق: تموز)' },
    { id: 'GR-0002', userId: 'U-10', month: '2026-06', win: 'recon', grantedAt: '2026-06-30T09:00:00', endedAt: '2026-07-03T18:00:00', status: 'expired', descEn: 'June reconciliation', descAr: 'تسوية حزيران' },
    { id: 'GR-0001', userId: 'U-10', month: '2026-05', win: '48h', grantedAt: '2026-06-02T09:00:00', endedAt: '2026-06-02T15:00:00', status: 'revoked', descEn: '48h access (May review)', descAr: 'وصول ٤٨ ساعة (مراجعة أيار)' },
  ],
};

export const monthKey = (scope: string, month: string) => `${scope}:${month}`;
