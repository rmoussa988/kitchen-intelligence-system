import type { Transfer } from '../../store';

const T = (d: string, hm: string) => `2026-08-${d}T${hm}:00`;

/**
 * Extra transfer from the prototype (TRF-1040, confirmed MK → Kaddoum, milk sent 28 of 30 requested — "± vs request is
 * normal, not flagged"). The prototype's other rows already exist in the seed under their own ids
 * (TRF-1041 ≙ TRF-1039 sent/unreceived, REQ-1044/1045 ≙ REQ-1042/1043). Merged on mount only if absent.
 */
export const EXTRA_TRANSFERS: Transfer[] = [
  { id: 'TRF-1040', from: 'mk', to: 'kad', status: 'confirmed', requestedAt: T('11', '07:10'), sentAt: T('11', '16:05'), confirmedAt: T('11', '16:50'), requestedBy: 'U-07', sentBy: 'U-04', confirmedBy: 'U-07',
    lines: [
      { itemId: 'RM-035', unit: 'KG', cost: 0.9, requested: 40, sent: 40, confirmed: 40 },
      { itemId: 'RM-068', unit: 'KG', cost: 2.8, requested: 12, sent: 12, confirmed: 12 },
      { itemId: 'RM-069', unit: 'L', cost: 0.85, requested: 30, sent: 28, confirmed: 28 },
      { itemId: 'RM-041', unit: 'KG', cost: 0.7, requested: 10, sent: 10, confirmed: 10 },
    ] },
];
