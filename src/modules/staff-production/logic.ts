import type { Batch, ProductionPlan } from '../../store';
import type { ProductSpec } from './data';

/** Per-plan saved flow state (prototype `state.plans[id]`). */
export interface Flow {
  screen: 'start' | 'stages' | 'output';
  mode: 'commit' | 'draw' | null;
  raw: number | null;      // committed or drawn (kg)
  trim: number | null;     // trimming waste (kg)
  sec: number | null;      // marinade / secondary actually used (kg)
  out: number | null;      // output count
  leftover: number | null; // returned to fridge (draw mode)
  steps: Record<string, boolean>;
  promptDismissed: boolean;
  done: boolean;
  batchId?: string;
}

/** Keypad request (which flow field is being entered). */
export interface PadSpec { title: string; sub: string; unit: string; key: 'raw' | 'trim' | 'sec' | 'out' | 'leftover' }

export const EMPTY_FLOW: Flow ={ screen: 'start', mode: null, raw: null, trim: null, sec: null, out: null, leftover: null, steps: {}, promptDismissed: false, done: false };

/** Flow state for a plan that has no saved state yet — derived from the store (batch in progress / plan done). */
export function initialFlow(plan: ProductionPlan, batch?: Batch): Flow {
  const raw = batch ? (batch.rawDrawn ?? (batch.rawUsed != null ? batch.rawUsed + (batch.trimWaste ?? 0) : null)) : null;
  if (plan.status === 'done' || batch?.status === 'complete' || batch?.status === 'approved') {
    return { ...EMPTY_FLOW, screen: 'output', done: true, mode: batch?.inputMode ?? 'commit', raw, trim: batch?.trimWaste ?? null, sec: batch?.marinadeUsed ?? null, out: batch?.outputQty ?? plan.plannedQty, leftover: batch?.rawReturned ?? null, batchId: batch?.id };
  }
  if (batch) {
    return {
      screen: batch.status === 'output' ? 'output' : 'stages', mode: batch.inputMode ?? 'commit', raw, trim: batch.trimWaste ?? null,
      sec: batch.marinadeUsed ?? null, out: batch.outputQty ?? null, leftover: batch.rawReturned ?? null,
      steps: batch.marinadeUsed != null ? { 0: true } : {}, promptDismissed: false, done: false, batchId: batch.id,
    };
  }
  return { ...EMPTY_FLOW };
}

export interface Derived {
  drawUnresolved: boolean; netInUse: number; planNet: number; guideQty: number; secNeeded: number;
  stdWeight: number | null; gap: number | null; gapPctN: number; gapBig: boolean; gapCostN: number; showReturnPrompt: boolean; secVarN: number | null;
}

/** All the derived numbers of the prototype's renderVals (draw-big bookkeeping never masquerades as variance). */
export function derive(spec: ProductSpec, f: Flow, plannedQty: number, rawCost: number, gapTol: number): Derived {
  const drawUnresolved = f.mode === 'draw' && f.leftover == null;
  const netInUse = f.raw != null ? Math.max(0, f.raw - (f.trim || 0) - (f.mode === 'draw' ? (f.leftover || 0) : 0)) : 0;
  const planNet = plannedQty * spec.perUnit;
  const guideQty = drawUnresolved ? planNet : netInUse;
  const secNeeded = guideQty * spec.secPerKg;
  const stdWeight = f.out != null ? f.out * spec.perUnit : null;
  // Gap is only a real variance when there is an actual raw entry to compare against.
  // A done plan reconstructed from a batch with no raw/out pair must not report a bogus −100% gap.
  const gap = stdWeight != null && f.raw != null ? netInUse - stdWeight : null;
  const gapPctN = stdWeight ? ((gap ?? 0) / stdWeight) * 100 : 0;
  const gapBig = gap != null && Math.abs(gapPctN) > gapTol;
  const gapCostN = gap != null ? gap * rawCost : 0;
  const showReturnPrompt = gapBig && f.mode === 'draw' && f.leftover == null && !f.promptDismissed && f.out != null;
  const secVarN = f.sec != null ? f.sec - secNeeded : null;
  return { drawUnresolved, netInUse, planNet, guideQty, secNeeded, stdWeight, gap, gapPctN, gapBig, gapCostN, showReturnPrompt, secVarN };
}

export const r1 = (n: number) => Math.round(n * 10) / 10;
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Date-based batch id: PREFIX-YYYYMMDD-NNN, NNN = next sequence for that prefix and day. */
export function makeBatchId(prefix: string, ymd: string, batches: { id: string }[]): string {
  const stem = `${prefix}-${ymd.replace(/-/g, '')}-`;
  const n = batches.filter((b) => b.id.startsWith(stem)).length + 1;
  return stem + String(n).padStart(3, '0');
}

export const fmt2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
export const money = (n: number) => '$' + Math.abs(n).toFixed(2);
