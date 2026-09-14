import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { D, KeypadSheet, ConfirmSheet, useToast, DEMO_TODAY } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import type { Batch, LocId, ProductionPlan } from '../../store';
import { useModuleNav } from '../../shell/DesktopShell';
import { TEXT } from './text';
import { specFor, unitLabel } from './data';
import { EMPTY_FLOW, derive, initialFlow, makeBatchId, money, r1, r2, r3, fmt2, type Flow, type PadSpec } from './logic';
import Hub from './views/Hub';
import Start from './views/Start';
import Stages from './views/Stages';
import Output from './views/Output';
import Done from './views/Done';

const TODAY = DEMO_TODAY.slice(0, 10);
const STATION: LocId = 'mk';

interface ModState { plans: Record<string, Flow> }
const SEED: ModState = { plans: {} };

/** Screen-id pill (dark). */
export function DId({ id }: { id: string }) {
  return <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: D.headerBorder, color: D.muted, whiteSpace: 'nowrap' }}>{id}</span>;
}

/** STF-PRD-00 plans hub → STF-PRD-02 start → STF-PRD-03 marination & stages → STF-PRD-04 output, leftover & reconcile. */
export default function StaffProduction() {
  const { lang, isAr, backGlyph } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [ms, setMs] = useModuleState<ModState>('staff-production', SEED);
  const [sp] = useSearchParams();
  // Accept both ?plan=<planId> and ?batch=<batchId> (a scanned batch label resolves to its plan).
  const [planId, setPlanId] = useState<string | null>(() => {
    const p = sp.get('plan');
    if (p) return p;
    const b = sp.get('batch');
    if (!b) return null;
    const bt = store.state.batches.find((x) => x.id === b);
    if (!bt) return null;
    if (bt.planId) return bt.planId;
    const match = store.state.plans.find((pl) => pl.itemId === bt.itemId && pl.loc === bt.loc && pl.date === bt.startedAt.slice(0, 10));
    return match?.id ?? null;
  });
  const [pad, setPad] = useState<PadSpec | null>(null);
  const [padVal, setPadVal] = useState('');
  const [confirm, setConfirm] = useState(false);

  const { settings, batches } = store.state;
  const gapTol = settings.productionGapAlertPct;
  const staffUser = settings.staffUser;
  const staff = store.state.users.find((u) => u.id === staffUser);
  const userLine = staff ? `${isAr ? staff.nameAr : staff.name} · ${t.roles[staff.role] ?? staff.role}` : t.user;

  const plans = store.state.plans.filter((p) => p.published && p.date === TODAY && p.loc === STATION);
  const batchOf = (p: ProductionPlan): Batch | undefined =>
    (p.batchId ? batches.find((b) => b.id === p.batchId) : undefined)
    ?? batches.find((b) => b.planId === p.id)
    // Fall back to an unlinked batch for the same item/location/day (seed pairs left without ids).
    ?? batches.find((b) => !b.planId && b.itemId === p.itemId && b.loc === p.loc && b.startedAt.slice(0, 10) === p.date);
  const flowOf = (p: ProductionPlan): Flow => ms.plans[p.id] ?? initialFlow(p, batchOf(p));

  const plan = planId ? plans.find((p) => p.id === planId) : undefined;
  const flow = plan ? flowOf(plan) : EMPTY_FLOW;
  const spec = plan ? specFor(plan.itemId) : specFor('');
  const rawCost = (spec.rawItemId ? store.item(spec.rawItemId)?.cost : undefined) ?? spec.costFallback;
  const dv = derive(spec, flow, plan?.plannedQty ?? 0, rawCost, gapTol);
  const name = plan ? store.itemName(plan.itemId, isAr) : '';
  const outU = plan ? unitLabel(plan.unit, isAr) : '';
  const inU = isAr ? 'كغ' : 'KG';
  const screen: 'hub' | 'start' | 'stages' | 'output' | 'done' = !plan ? 'hub' : flow.done ? 'done' : flow.screen;

  const setFlow = (patch: Partial<Flow>) => { if (!plan) return; const cur = flow; setMs((d) => { d.plans[plan.id] = { ...cur, ...patch }; }); };
  const openPad = (title: string, sub: string, unit: string, initial: number | null, key: PadSpec['key']) => { setPad({ title, sub, unit, key }); setPadVal(initial != null ? String(initial) : ''); };
  const padDone = () => {
    const v = parseFloat(padVal);
    if (pad && !isNaN(v) && v >= 0) {
      const patch: Partial<Flow> = { [pad.key]: v };
      if (pad.key === 'leftover') patch.promptDismissed = false;
      setFlow(patch);
      // keep the live batch in step with the flow
      if (plan && flow.batchId) {
        const id = flow.batchId;
        store.update((d) => { const b = d.batches.find((x) => x.id === id); if (!b) return; if (pad.key === 'sec') { b.marinadeUsed = v; if (b.status === 'started') b.status = 'marinating'; } if (pad.key === 'out') b.outputQty = v; if (pad.key === 'leftover') b.rawReturned = v; });
      }
    }
    setPad(null); setPadVal('');
  };

  const goHub = () => setPlanId(null);
  const openPlan = (p: ProductionPlan) => {
    if (p.status === 'paused') store.update((d) => { const x = d.plans.find((y) => y.id === p.id); if (x) x.status = 'in_progress'; });
    setPlanId(p.id);
  };
  const pauseSwitch = () => {
    if (plan && flow.batchId) {
      store.update((d) => { const x = d.plans.find((y) => y.id === plan.id); if (x && x.status === 'in_progress') x.status = 'paused'; });
      toast(t.savedToast, { dark: true });
    }
    goHub();
  };

  const startBatch = () => {
    if (!plan || !(flow.mode && flow.raw != null)) return;
    const existing = batchOf(plan);
    const id = existing?.id ?? makeBatchId(spec.prefix, TODAY, batches);
    const now = store.now();
    const raw = flow.raw, trim = flow.trim ?? 0, mode = flow.mode;
    store.update((d) => {
      const p = d.plans.find((x) => x.id === plan.id);
      if (p) { p.status = 'in_progress'; p.batchId = id; p.progress = 0.25; }
      const patch: Partial<Batch> = {
        inputMode: mode, rawItemId: spec.rawItemId, rawDrawn: mode === 'draw' ? raw : undefined, rawUsed: mode === 'commit' ? r2(Math.max(0, raw - trim)) : undefined,
        trimWaste: flow.trim ?? undefined, marinadeRecommended: r2(dv.planNet * spec.secPerKg), standardPerUnit: spec.perUnit, status: 'started',
      };
      const b = d.batches.find((x) => x.id === id);
      if (b) Object.assign(b, patch);
      else d.batches.push({ id, planId: plan.id, itemId: plan.itemId, loc: plan.loc, employee: staffUser, startedAt: now, status: 'started', plannedQty: plan.plannedQty, unit: plan.unit, ...patch });
    });
    store.logAudit({ action: 'Batch started', entity: `${id} · ${store.itemName(plan.itemId, false)} ${plan.plannedQty} ${plan.unit}`, newValue: `${mode === 'draw' ? 'drawn' : 'committed'} ${fmt2(raw)} KG`, moduleId: 'staff-production', user: staffUser });
    setFlow({ screen: 'stages', batchId: id });
    toast(`${t.startedToast} ${id}`, { dark: true });
  };

  const toggleStep = (idx: number, on: boolean) => {
    setFlow({ steps: { ...flow.steps, [idx]: !on } });
    if (flow.batchId) { const id = flow.batchId; store.update((d) => { const b = d.batches.find((x) => x.id === id); if (b && (b.status === 'started' || b.status === 'marinating')) b.status = 'stages'; }); }
  };
  const toOutput = () => {
    if (!plan || flow.sec == null) return;
    if (flow.batchId) { const id = flow.batchId; store.update((d) => { const b = d.batches.find((x) => x.id === id); if (b) b.status = 'output'; const p = d.plans.find((x) => x.id === plan.id); if (p) p.progress = 0.75; }); }
    setFlow({ screen: 'output' });
  };
  const stageWaste = () => { if (plan) go('staff-waste', { params: { item: spec.rawItemId ?? plan.itemId, ref: flow.batchId ?? plan.id } }); };

  const completeBatch = () => {
    if (!plan || flow.out == null) return;
    const out = flow.out, net = r2(dv.netInUse), trim = flow.trim ?? 0, sec = flow.sec ?? 0;
    const loc = plan.loc;
    const secCost = (spec.secItemId ? store.item(spec.secItemId)?.cost : undefined) ?? 0;
    const std = out * spec.perUnit;
    const gapKg = r2(net - std);
    const gapPct = std ? r1((gapKg / std) * 100) : 0;
    const gapUsd = r2(gapKg * rawCost);
    const cost = r2(net * rawCost + sec * secCost);
    const now = store.now();
    const id = flow.batchId ?? batchOf(plan)?.id ?? makeBatchId(spec.prefix, TODAY, batches);
    const nameEn = store.itemName(plan.itemId, false);

    // ledger: raw + secondary out, output in at built-up cost
    if (spec.rawItemId && net > 0) store.postMovement({ itemId: spec.rawItemId, loc, type: 'production_out', qty: -net, enteredQty: net, enteredUnit: 'KG', value: -r2(net * rawCost), source: id, sourceKind: 'batch', user: staffUser, ts: now });
    if (spec.secItemId && sec > 0) store.postMovement({ itemId: spec.secItemId, loc, type: 'production_out', qty: -sec, enteredQty: sec, enteredUnit: 'KG', value: -r2(sec * secCost), source: id, sourceKind: 'batch', user: staffUser, ts: now });
    const outItem = store.item(plan.itemId);
    if (outItem && out > 0) {
      store.postMovement({ itemId: plan.itemId, loc, type: 'production_in', qty: out, enteredQty: out, enteredUnit: plan.unit, value: cost, source: id, sourceKind: 'batch', user: staffUser, ts: now });
      const oh = Math.max(0, outItem.onHand[loc] ?? 0);
      store.setItemCost(plan.itemId, r3(oh + out > 0 ? (oh * outItem.cost + cost) / (oh + out) : outItem.cost));
    }
    // trimming waste → Waste (D3): same auto-approve threshold as staff-waste.
    // Below threshold → auto-approved + stock movement; at/above → pending approval + manager alert, no movement.
    if (spec.rawItemId && trim > 0) {
      const wid = store.nextId('WST');
      const rawId = spec.rawItemId;
      const wasteCost = r2(trim * rawCost);
      const wStatus = wasteCost <= settings.wasteAutoApproveUsd ? 'auto' : 'pending';
      const rawEn = store.itemName(rawId, false);
      const rawAr = store.itemName(rawId, true);
      store.update((d) => { d.waste.push({ id: wid, ts: now, itemId: rawId, loc, qty: trim, unit: 'KG', baseQty: trim, cost: wasteCost, reason: 'prep', employee: staffUser, status: wStatus, note: `Trimming waste — ${id}` }); });
      if (wStatus === 'auto') {
        store.postMovement({ itemId: rawId, loc, type: 'waste', qty: -trim, enteredQty: trim, enteredUnit: 'KG', value: -wasteCost, source: wid, sourceKind: 'waste', user: staffUser, ts: now });
      } else {
        store.addAlert({ ts: now, severity: 'amber', type: 'waste_pending', loc, moduleId: 'waste',
          en: `Waste ${wid} awaiting approval (${money(wasteCost)}) — ${rawEn} ${fmt2(trim)} KG`,
          ar: `هدر ${wid} بانتظار الموافقة (${money(wasteCost)}) — ${rawAr} ${fmt2(trim)} كغ` });
      }
      store.logAudit({ action: wStatus === 'auto' ? 'Waste auto-approved' : 'Waste submitted for approval', entity: `${wid} · ${rawEn} ${fmt2(trim)} KG`, newValue: `${wStatus === 'auto' ? '−' : ''}${money(wasteCost)} at cost`, moduleId: 'staff-production', user: staffUser, ts: now });
    }
    const gapOpen = Math.abs(gapPct) > 0.5;
    const secNeeded = r2(dv.secNeeded);
    store.update((d) => {
      const patch: Partial<Batch> = {
        status: 'complete', completedAt: now, inputMode: flow.mode ?? 'commit', rawItemId: spec.rawItemId,
        rawDrawn: flow.mode === 'draw' ? flow.raw ?? undefined : undefined, rawReturned: flow.mode === 'draw' ? flow.leftover ?? 0 : undefined, rawUsed: net,
        trimWaste: trim || undefined, marinadeRecommended: secNeeded, marinadeUsed: flow.sec ?? undefined, outputQty: out, standardPerUnit: spec.perUnit,
        gapKg, gapPct, gapUsd, gapStatus: gapOpen ? 'open' : 'accepted', cost, yieldPct: plan.plannedQty ? r1((out / plan.plannedQty) * 100) : undefined,
      };
      const b = d.batches.find((x) => x.id === id);
      if (b) Object.assign(b, patch);
      else d.batches.push({ id, planId: plan.id, itemId: plan.itemId, loc, employee: staffUser, startedAt: now, plannedQty: plan.plannedQty, unit: plan.unit, status: 'complete', ...patch });
      const p = d.plans.find((x) => x.id === plan.id);
      if (p) { p.status = 'done'; p.progress = 1; p.batchId = id; p.gapOpen = gapOpen; }
    });
    const sgn = (n: number) => (n >= 0 ? '+' : '−') + fmt2(Math.abs(n));
    if (gapPct >= gapTol) {
      store.addAlert({ severity: 'amber', type: 'production_gap', en: `Batch ${id} gap ${sgn(gapKg)} KG (${sgn(gapPct)}%) vs recipe`, ar: `فجوة الدفعة ${id} ${sgn(gapKg)} كغ (${sgn(gapPct)}٪) عن الوصفة`, loc, moduleId: 'production-gaps', ts: now });
    }
    store.logAudit({ action: 'Batch completed', entity: `${id} · ${nameEn} ${fmt2(out)} ${plan.unit}`, oldValue: `raw ${fmt2(net)} KG · std ${fmt2(std)} KG`, newValue: `gap ${sgn(gapKg)} KG (${sgn(gapPct)}%) · cost $${cost.toFixed(2)}`, moduleId: 'staff-production', user: staffUser, ts: now });
    setConfirm(false);
    setFlow({ done: true, batchId: id });
  };

  const titleMap = { hub: t.hubTitle, start: `${t.startTitle} — ${name}`, stages: name, output: `${t.outputTitle} — ${name}`, done: '' };
  const idMap = { hub: 'STF-PRD-00', start: 'STF-PRD-02', stages: 'STF-PRD-03', output: 'STF-PRD-04', done: 'STF-PRD-04' };

  return (
    <div className="dark" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, color: D.text }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px', borderBottom: `1px solid ${D.headerBorder}`, flexWrap: 'wrap' }}>
        {screen !== 'hub' && (
          <button onClick={goHub} style={{ height: 46, padding: '0 16px', borderRadius: 13, border: `1px solid ${D.border3}`, background: D.card, color: D.text, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{backGlyph} {t.plansHub}</button>
        )}
        <div style={{ fontSize: 18, fontWeight: 600 }}>{titleMap[screen]}</div>
        <DId id={idMap[screen]} />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 999, border: `1px solid ${D.border3}`, background: D.card, fontSize: 14, color: D.text2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.greenDot, display: 'inline-block' }} />{t.mk}
        </div>
        <div style={{ fontSize: 14, color: D.muted }}>{userLine}</div>
      </div>

      {screen === 'hub' && <Hub t={t} isAr={isAr} plans={plans} flowOf={flowOf} batchOf={batchOf} onOpen={openPlan} />}
      {plan && screen === 'start' && <Start t={t} isAr={isAr} plan={plan} spec={spec} flow={flow} dv={dv} name={name} outU={outU} inU={inU} batchLabel={flow.batchId ?? batchOf(plan)?.id ?? plan.id} setFlow={setFlow} openPad={openPad} onBack={goHub} onStart={startBatch} />}
      {plan && screen === 'stages' && <Stages t={t} isAr={isAr} spec={spec} flow={flow} dv={dv} inU={inU} openPad={openPad} toggleStep={toggleStep} onPause={pauseSwitch} onNext={toOutput} onWaste={stageWaste} />}
      {plan && screen === 'output' && <Output t={t} isAr={isAr} spec={spec} flow={flow} dv={dv} name={name} outU={outU} inU={inU} setFlow={setFlow} openPad={openPad} onPause={pauseSwitch} onComplete={() => setConfirm(true)} />}
      {plan && screen === 'done' && <Done t={t} isAr={isAr} flow={flow} dv={dv} name={name} outU={outU} inU={inU} onBack={goHub} />}

      <KeypadSheet open={!!pad} title={pad?.title ?? ''} sub={pad?.sub} unit={pad?.unit} value={padVal} onChange={setPadVal} onDone={padDone} onCancel={() => { setPad(null); setPadVal(''); }} cancelLabel={t.cancel} doneLabel={t.done} />
      <ConfirmSheet open={confirm} onCancel={() => setConfirm(false)} onConfirm={completeBatch} title={`${t.completeBatch} — ${name}`} cta={t.completeBatch} cancelLabel={t.cancel}
        body={<span style={{ display: 'block' }}>{flow.out != null ? (<>
          <span dir="ltr">{fmt2(flow.out)} {outU}</span>{' · '}{t.actualUsed}{' '}<span dir="ltr">{fmt2(dv.netInUse)} {inU}</span>
          {dv.gap != null && (<>{' · '}{t.gapWord}<span dir="ltr">{dv.gap >= 0 ? '+' : '−'}{fmt2(Math.abs(dv.gap))} {inU} ({dv.gap >= 0 ? '+' : '−'}{Math.abs(dv.gapPctN).toFixed(1)}%)</span></>)}
        </>) : ''}</span>}>
        <div style={{ fontSize: 15, color: D.muted, lineHeight: 1.5 }}>{t.confirmBody}</div>
      </ConfirmSheet>
    </div>
  );
}
