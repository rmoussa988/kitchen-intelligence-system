/** MGT-WST-02 — demo series that are not part of the global store. */

/** 13-day daily waste $ trend (the two spikes > $15 are highlighted in amber). */
export const TREND = [6.2, 4.8, 5.5, 9.4, 5.1, 4.2, 6.8, 22.4, 7.2, 5.9, 4.4, 24.3, 8.1];

/** Waste % of sales target (prototype `wasteTarget` prop). */
export const WASTE_TARGET_PCT = 2.0;

/** Waste % of sales per scope — sales are not in the store, so these stay as demo values. */
export const PCT_BY_SCOPE: Record<'all' | 'mk' | 'rock' | 'kad', number> = { all: 2.3, mk: 1.0, rock: 0.9, kad: 4.1 };

/** Period label shown in the header. */
export const PERIOD_LABEL = '1–13 Aug 2026';
