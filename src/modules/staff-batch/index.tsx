import { useEffect, useState } from 'react';
import { D, KeypadSheet, useToast, DEMO_TODAY } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import type { Batch, LocId, ProductionPlan } from '../../store';
import { TEXT } from './text';
import { RECIPES, TASKS, fmtN, moneyN, recipeByKey, type Ingredient, type Recipe } from './data';
import { mergeStaffBatchSeed } from './seed';
import Pick from './views/Pick';
import Produce from './views/Produce';
import Summary from './views/Summary';
import { AdhocSheet, WasteSheet } from './views/Sheets';

const TODAY = DEMO_TODAY.slice(0, 10);
const STATION: LocId = 'mk';

export interface LogEntry { prefix: string; en: string; ar: string; batchId: string; produced: number | null; unit: string; unitAr: string; cost: number; yieldPct: number | null; stdYield: number; stocked: boolean }
export interface ModState {
  step: 'pick' | 'produce' | 'summary' | 'done'; recipeKey: string | null; batchId: string | null; startedAt: string | null; planned: number | null;
  used: Record<string, number>; waste: Record<string, number>; produced: number | null;
  progress: Record<string, boolean>; finished: Record<string, boolean>; log: LogEntry[];
}
const SEED: ModState = { step: 'pick', recipeKey: null, batchId: null, startedAt: null, planned: null, used: {}, waste: {}, produced: null, progress: {}, finished: {}, log: [] };
export type PadField = 'planned' | 'produced' | `used:${number}` | `waste:${number}`;
export interface Pad { field: PadField; title: string; unit: string }

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Screen-id pill (dark). */
function DId({ id }: { id: string }) {
  return <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: D.headerBorder, color: D.muted, whiteSpace: 'nowrap' }}>{id}</span>;
}

/** Classic production batch: STF-PRD-02 pick → STF-PRD-03 recipe & used amounts → STF-PRD-04 review & done. */
export default function StaffBatch() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const [ms, setMs] = useModuleState<ModState>('staff-batch', SEED);
  const [pad, setPad] = useState<Pad | null>(null);
  const [padVal, setPadVal] = useState('');
  const [adhocOpen, setAdhocOpen] = useState(false);
  const [wasteOpen, setWasteOpen] = useState(false);

  // Register the SAVED recipe outputs + the four unmapped ingredients so batches post real movements
  // and Monitoring/search resolve product names instead of a bare prefix (CONVENTIONS: merge on mount).
  useEffect(() => { store.update(mergeStaffBatchSeed); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const staffUser = store.state.settings.staffUser;
  const staff = store.state.users.find((u) => u.id === staffUser);
  const userLine = staff ? `${isAr ? staff.nameAr : staff.name} · ${t.roles[staff.role] ?? staff.role}` : t.user;
  const plans = store.state.plans;
  const planFor = (rec: Recipe): ProductionPlan | undefined => rec.itemId ? plans.find((p) => p.date === TODAY && p.loc === STATION && p.published && p.itemId === rec.itemId) : undefined;
  const planQty = (rec: Recipe) => planFor(rec)?.plannedQty ?? rec.plan;
  const costOf = (ig: Ingredient) => (ig.itemId ? store.item(ig.itemId)?.cost : undefined) ?? ig.cost;
  // Session work wins: a re-started plan shows 'In progress' even if its store plan is already done;
  // a store-done plan (with no session activity) still surfaces as 'done'.
  const statusOf = (rec: Recipe): 'none' | 'progress' | 'done' => ms.finished[rec.prefix] ? 'done' : ms.progress[rec.prefix] ? 'progress' : planFor(rec)?.status === 'done' ? 'done' : 'none';

  const recipe = recipeByKey(ms.recipeKey);
  const task = recipe ?? TASKS[0];
  const planned = ms.planned ?? planQty(task);
  const un = isAr ? task.unitAr : task.unit;
  const factor = planned / task.plan;
  const cost = task.recipe.reduce((a, ig, i) => a + (ms.used[i] || 0) * costOf(ig), 0);
  const yieldPct = planned && ms.produced != null ? (ms.produced / planned) * 100 : null;
  const yieldLow = yieldPct !== null && yieldPct < task.stdYield - 3;
  const wasteCount = Object.keys(ms.waste).filter((k) => ms.waste[k]).length;

  const makeBatchId = (prefix: string) => {
    const stem = `${prefix}-${TODAY.replace(/-/g, '')}-`;
    // Count only store.batches for the day/prefix — a completed batch is recorded in d.batches AND ms.log,
    // so adding the log term double-counts and leaves gaps in the traceability sequence.
    const n = store.state.batches.filter((b) => b.id.startsWith(stem)).length + 1;
    return stem + String(n).padStart(3, '0');
  };
  const startTask = (rec: Recipe, note?: string) => {
    const id = makeBatchId(rec.prefix);
    const plan = planFor(rec);
    if (plan && plan.status === 'not_started') store.update((d) => { const p = d.plans.find((x) => x.id === plan.id); if (p) { p.status = 'in_progress'; p.progress = 0.3; } });
    if (!plan) store.logAudit({ action: 'Ad-hoc batch started', entity: `${id} · ${rec.en}`, newValue: note?.trim() || undefined, moduleId: 'staff-batch', user: staffUser });
    setMs((d) => { d.step = 'produce'; d.recipeKey = rec.prefix; d.batchId = id; d.startedAt = store.now(); d.planned = planQty(rec); d.used = {}; d.waste = {}; d.produced = null; if (!d.finished[rec.prefix]) d.progress[rec.prefix] = true; });
  };

  const openPad = (field: PadField, title: string, unit: string, initial: number | null) => { setPad({ field, title, unit }); setPadVal(initial != null ? String(initial) : ''); };
  const padDone = () => {
    const v = parseFloat(padVal);
    if (pad && !isNaN(v) && v >= 0) {
      const f = pad.field;
      setMs((d) => {
        if (f === 'planned') d.planned = v;
        else if (f === 'produced') d.produced = v;
        else if (f.startsWith('waste:')) d.waste[f.split(':')[1]] = v;
        else if (f.startsWith('used:')) d.used[f.split(':')[1]] = v;
      });
    }
    setPad(null); setPadVal('');
  };

  const productionDone = () => {
    const rec = recipe;
    if (!rec) { setMs((d) => { d.step = 'done'; }); return; }
    const now = store.now();
    const id = ms.batchId ?? makeBatchId(rec.prefix);
    const loc = STATION;
    let c = 0;
    rec.recipe.forEach((ig, i) => {
      const used = ms.used[i] || 0, unitCost = costOf(ig);
      c += used * unitCost;
      const stocked = !!ig.itemId && !!store.item(ig.itemId);
      if (used > 0 && stocked) store.postMovement({ itemId: ig.itemId!, loc, type: 'production_out', qty: -used, enteredQty: used, enteredUnit: ig.unit, value: -r2(used * unitCost), source: id, sourceKind: 'batch', user: staffUser, ts: now });
      const w = ms.waste[i] || 0;
      if (w > 0 && stocked) {
        const wid = store.nextId('WST');
        const itemId = ig.itemId!;
        store.update((d) => { d.waste.push({ id: wid, ts: now, itemId, loc, qty: w, unit: ig.unit, baseQty: w, cost: r2(w * unitCost), reason: 'prep', employee: staffUser, status: 'auto', note: `Stage waste — ${id}` }); });
        store.postMovement({ itemId, loc, type: 'waste', qty: -w, enteredQty: w, enteredUnit: ig.unit, value: -r2(w * unitCost), source: wid, sourceKind: 'waste', user: staffUser, ts: now });
      }
    });
    c = r2(c);
    const produced = ms.produced;
    const yp = planned && produced != null ? (produced / planned) * 100 : null;
    const outItem = rec.itemId ? store.item(rec.itemId) : undefined;
    // Stock is only entered when the output resolves to a real item AND a quantity was produced.
    const stocked = !!outItem && produced != null && produced > 0;
    if (stocked && outItem) {
      store.postMovement({ itemId: outItem.id, loc, type: 'production_in', qty: produced!, enteredQty: produced!, enteredUnit: rec.unit, value: c, source: id, sourceKind: 'batch', user: staffUser, ts: now });
      const oh = Math.max(0, outItem.onHand[loc] ?? 0);
      store.setItemCost(outItem.id, r3(oh + produced! > 0 ? (oh * outItem.cost + c) / (oh + produced!) : outItem.cost));
    }
    const plan = planFor(rec);
    const rawIng = rec.recipe.find((x) => x.type === 'inventory' && x.itemId);
    const rawIdx = rawIng ? rec.recipe.indexOf(rawIng) : -1;
    const startedAt = ms.startedAt ?? now;
    // trimWaste is a KG raw-trim figure — use only the raw ingredient's waste, not a mixed-unit sum across ingredients.
    const trimWaste = rawIdx >= 0 ? (ms.waste[rawIdx] || 0) : 0;
    // Only record a Batch when the output item resolves; otherwise the row would carry a bare prefix as itemId
    // and Monitoring/search would render it as the product name.
    if (outItem) {
      store.update((d) => {
        const b: Batch = {
          id, planId: plan?.id, itemId: outItem.id, loc, employee: staffUser, startedAt, completedAt: now, status: 'complete', plannedQty: planned, unit: rec.unit,
          inputMode: 'commit', rawItemId: rawIng?.itemId, rawUsed: rawIdx >= 0 ? ms.used[rawIdx] : undefined, trimWaste: trimWaste || undefined,
          outputQty: produced ?? undefined, cost: c, yieldPct: yp != null ? r1(yp) : undefined,
        };
        const existing = d.batches.find((x) => x.id === id);
        if (existing) Object.assign(existing, b); else d.batches.push(b);
        const p = plan ? d.plans.find((x) => x.id === plan.id) : undefined;
        if (p) { p.status = 'done'; p.progress = 1; p.batchId = id; }
      });
    }
    if (yp != null && yp < rec.stdYield - 3) {
      store.addAlert({ severity: 'amber', type: 'yield_low', en: `Batch ${id} yield ${yp.toFixed(0)}% below standard ${rec.stdYield}%`, ar: `إنتاجية الدفعة ${id} ${yp.toFixed(0)}٪ دون المعيار ${rec.stdYield}٪`, loc, moduleId: 'production', ts: now });
    }
    store.logAudit({ action: 'Batch completed', entity: `${id} · ${rec.en} ${produced != null ? fmtN(produced) : '—'} ${rec.unit}`, newValue: `${moneyN(c)} at cost${yp != null ? ` · yield ${yp.toFixed(0)}%` : ''}`, moduleId: 'staff-batch', user: staffUser, ts: now });
    const entry: LogEntry = { prefix: rec.prefix, en: rec.en, ar: rec.ar, batchId: id, produced, unit: rec.unit, unitAr: rec.unitAr, cost: c, yieldPct: yp, stdYield: rec.stdYield, stocked };
    setMs((d) => { d.step = 'done'; d.finished[rec.prefix] = true; delete d.progress[rec.prefix]; d.log = [entry, ...d.log.filter((e) => e.prefix !== rec.prefix)]; });
  };

  const screenId = ms.step === 'pick' ? 'STF-PRD-02' : ms.step === 'produce' ? 'STF-PRD-03' : 'STF-PRD-04';
  const batchId = recipe ? ms.batchId : null;

  return (
    <div className="dark" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, color: D.text }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: `1px solid ${D.headerBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontSize: 19, fontWeight: 600 }}>{t.title}</div>
          <DId id={screenId} />
        </div>
        <div style={{ flex: 1 }} />
        {batchId && <span style={{ fontSize: 14, padding: '7px 14px', borderRadius: 999, border: `1px solid ${D.border3}`, background: D.card, color: D.text2 }} dir="ltr">{batchId}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: `1px solid ${D.border3}`, background: D.card, fontSize: 15, color: D.text2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.greenDot, display: 'inline-block' }} />{t.mk}
        </div>
        <div style={{ fontSize: 15, color: D.muted }}>{userLine}</div>
      </div>

      {ms.step === 'pick' && <Pick t={t} isAr={isAr} statusOf={statusOf} planQty={planQty} log={ms.log} finished={ms.finished} progress={ms.progress} onPick={startTask} onAdhoc={() => setAdhocOpen(true)} />}
      {ms.step === 'produce' && (
        <Produce t={t} isAr={isAr} task={task} planned={planned} un={un} factor={factor} used={ms.used} wasteCount={wasteCount} produced={ms.produced} costOf={costOf}
          openPad={openPad} onWaste={() => setWasteOpen(true)} onBack={() => setMs((d) => { d.step = 'pick'; d.recipeKey = null; d.batchId = null; })}
          onReview={() => { if (Object.keys(ms.used).length) setMs((d) => { d.step = 'summary'; }); else toast(t.enterOne, { dark: true }); }} />
      )}
      {ms.step === 'summary' && (
        <Summary t={t} isAr={isAr} task={task} batchId={batchId ?? ''} used={ms.used} wasteCount={wasteCount} produced={ms.produced} un={un} yieldPct={yieldPct} yieldLow={yieldLow} cost={cost}
          onBack={() => setMs((d) => { d.step = 'produce'; })} onDone={productionDone} />
      )}
      {ms.step === 'done' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 40 }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: D.greenBg, border: `1px solid ${D.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={D.greenFg} strokeWidth="2.4"><path d="M4 12.5l5 5L20 6.5" /></svg>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, textAlign: 'center' }}>{t.doneTitle}</div>
          <div style={{ fontSize: 18, color: D.muted, textAlign: 'center', maxWidth: 560, lineHeight: 1.5 }}>{t.doneBody(moneyN(ms.log[0]?.cost ?? cost), yieldPct !== null ? yieldPct.toFixed(0) : null, yieldLow, ms.log[0]?.stocked ?? false)}</div>
          <button onClick={() => setMs((d) => { d.step = 'pick'; d.recipeKey = null; d.batchId = null; d.planned = null; d.used = {}; d.waste = {}; d.produced = null; })} style={{ marginTop: 10, height: 60, padding: '0 32px', borderRadius: 16, border: `1px solid ${D.border3}`, background: D.card, color: D.text, fontSize: 19, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.backTasks}</button>
        </div>
      )}

      <AdhocSheet open={adhocOpen} t={t} isAr={isAr} lang={lang} recipes={RECIPES} onPlanCount={TASKS.length} planQty={planQty} onCancel={() => setAdhocOpen(false)} onStart={(rec, note) => { setAdhocOpen(false); startTask(rec, note); }} />
      <WasteSheet open={wasteOpen} t={t} isAr={isAr} task={task} waste={ms.waste} onClose={() => setWasteOpen(false)} openPad={openPad} />
      <KeypadSheet open={!!pad} title={pad?.title ?? ''} unit={pad?.unit} value={padVal} onChange={setPadVal} onDone={padDone} onCancel={() => { setPad(null); setPadVal(''); }} cancelLabel={t.cancel} doneLabel={t.done} />
    </div>
  );
}
