import type { Batch, BatchStatus, ProductionPlan } from '../../store';

/** Overproduction flag threshold (prototype: > 25 % over expected demand → amber). */
export const OVER_FLAG_PCT = 25;
/** A batch is "low yield" when its yield is more than this many points under the standard (prototype rule). */
export const LOW_YIELD_PT = 3;

/** Standard yield vs plan (%) per output item — used for the board pills, flags and the weekly yield panel. */
export const STANDARD_YIELD: Record<string, number> = { 'PR-002': 95, 'PR-005': 97, 'SR-003': 96, 'SR-009': 96, 'SR-007': 98, 'MI-108': 90 };
export const DEFAULT_STD = 95;
export const stdFor = (itemId: string) => STANDARD_YIELD[itemId] ?? DEFAULT_STD;

/** Number of process stages per output item (drives the stage bar). */
export const STAGES_TOTAL: Record<string, number> = { 'PR-002': 4, 'PR-005': 3, 'SR-003': 2, 'SR-009': 3, 'SR-007': 2, 'MI-108': 2 };
export const stagesTotalFor = (itemId: string) => STAGES_TOTAL[itemId] ?? 3;

const STATUS_FRAC: Record<BatchStatus, number> = { started: 0.25, marinating: 0.5, stages: 0.6, output: 0.8, complete: 1, approved: 1 };
export const stagesDoneFor = (b: Batch, total: number) => Math.max(b.status === 'started' ? 1 : 0, Math.round(STATUS_FRAC[b.status] * total));
export const stagesDoneForPlan = (p: ProductionPlan, total: number) => p.status === 'done' ? total : p.status === 'not_started' ? 0 : Math.max(1, Math.round((p.progress ?? 0) * total));

/** Unpublished edit to a plan line (prototype keeps qty / assignee local until "Publish plan"). */
export interface PlanDraft { qty?: number; assignedTo?: string }

/** Persisted module-private state (`useModuleState('production')`). Optional fields tolerate older persisted shapes. */
export interface ModState {
  tab: 'plan' | 'mon';
  /** Draft edits per plan id — applied to the store only when the plan is published. */
  drafts?: Record<string, PlanDraft>;
  /** Batches approved in-app — they stay on the live board (prototype relabels the card instead of dropping it). */
  approvedIds?: string[];
}
export const MOD_SEED: ModState = { tab: 'plan', drafts: {}, approvedIds: [] };

/** Board status colours (prototype stStyle). */
export const ST_STYLE: Record<'planned' | 'progress' | 'pending' | 'done', [string, string]> = {
  planned: ['#E6E2DA', '#6E6A5E'], progress: ['#DCE4EC', '#37536B'], pending: ['#F5E3B3', '#8A6D1F'], done: ['#E0E8DA', '#48603A'],
};

export const WEEK_START = '2026-08-06';
