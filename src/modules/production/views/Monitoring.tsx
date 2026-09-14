import { useMemo, useState } from 'react';
import { P, KpiCard, ConfirmModal, useToast, fmt, DEMO_TODAY } from '../../../ui';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { Batch, LocId, ProductionPlan } from '../../../store';
import { useModuleNav } from '../../../shell/DesktopShell';
import type { Text } from '../text';
import { LOW_YIELD_PT, OVER_FLAG_PCT, ST_STYLE, WEEK_START, stagesDoneFor, stagesDoneForPlan, stagesTotalFor, stdFor } from '../data';
import BatchDetail from './BatchDetail';

const TODAY = DEMO_TODAY.slice(0, 10);
type BoardStatus = 'planned' | 'progress' | 'pending' | 'done';
const ORDER: Record<BoardStatus, number> = { pending: 0, progress: 1, planned: 2, done: 3 };

export interface BoardRow {
  key: string; id: string; itemId: string; loc: LocId; status: BoardStatus;
  plan: string; actual: string; yieldPct: number | null; std: number; stagesDone: number; stagesTotal: number; low: boolean;
  batch?: Batch; planRef?: ProductionPlan; ts: string;
}

/** Builds the live board: today's batches + batches awaiting approval + today's plan lines that have no batch yet. */
export function useBoard(approvedIds: string[]): BoardRow[] {
  const store = useStore();
  const { batches, plans } = store.state;
  const scope = store.scope;
  return useMemo(() => {
    const rows: BoardRow[] = [];
    const inScope = (loc: LocId) => scope === 'all' || scope === loc;
    for (const b of batches) {
      if (!inScope(b.loc)) continue;
      const today = b.startedAt.slice(0, 10) === TODAY;
      // Keep today's batches, anything completed today, and batches approved in-app this session
      // (the prototype relabels the approved card instead of dropping it). Seed batches that were
      // already 'approved' before the session (Aug 8/9/10) stay off the board.
      if (!(today || b.status === 'complete' || approvedIds.includes(b.id))) continue;
      const status: BoardStatus = b.status === 'complete' ? 'pending' : b.status === 'approved' ? 'done' : 'progress';
      const std = stdFor(b.itemId);
      const y = b.yieldPct ?? null;
      const total = stagesTotalFor(b.itemId);
      rows.push({ key: 'b:' + b.id, id: b.id, itemId: b.itemId, loc: b.loc, status, plan: `${fmt(b.plannedQty)} ${b.unit}`, actual: b.outputQty != null ? `${fmt(b.outputQty)} ${b.unit}` : '—', yieldPct: y, std, stagesDone: stagesDoneFor(b, total), stagesTotal: total, low: y != null && y < std - LOW_YIELD_PT, batch: b, ts: b.startedAt });
    }
    for (const p of plans) {
      if (p.date !== TODAY || !inScope(p.loc)) continue;
      const covered = batches.some((b) => b.planId === p.id || (b.itemId === p.itemId && b.loc === p.loc && b.startedAt.slice(0, 10) === p.date));
      if (covered) continue;
      const status: BoardStatus = p.status === 'not_started' ? 'planned' : p.status === 'done' ? 'done' : 'progress';
      const total = stagesTotalFor(p.itemId);
      rows.push({ key: 'p:' + p.id, id: p.id, itemId: p.itemId, loc: p.loc, status, plan: `${fmt(p.plannedQty)} ${p.unit}`, actual: '—', yieldPct: null, std: stdFor(p.itemId), stagesDone: stagesDoneForPlan(p, total), stagesTotal: total, low: false, planRef: p, ts: p.date + 'T00:00:00' });
    }
    return rows.sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.ts.localeCompare(a.ts));
  }, [batches, plans, scope, approvedIds]);
}

/** MGT-PRD-05 — KPIs, live batch board, weekly yield panel, overproduction panel. */
export default function Monitoring({ t, openBatch, setOpenBatch, approvedIds, onApproved }: { t: Text; openBatch: string | null; setOpenBatch: (id: string | null) => void; approvedIds: string[]; onApproved: (id: string) => void }) {
  const { isAr, lang } = useLang();
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const rows = useBoard(approvedIds);
  const [confirmBatch, setConfirmBatch] = useState<Batch | null>(null);

  const weekBatches = store.state.batches.filter((b) => store.inScope(b.loc) && b.yieldPct != null && b.startedAt.slice(0, 10) >= WEEK_START);
  const hasYield = weekBatches.length > 0;
  const avgDelta = hasYield ? weekBatches.reduce((a, b) => a + ((b.yieldPct ?? 0) - stdFor(b.itemId)), 0) / weekBatches.length : 0;
  // Keep the number LTR and the unit in its own span (Arabic 'نقطة' must not glue onto the digits inside an LTR run).
  const kYield = hasYield
    ? <><span dir="ltr">{(avgDelta < 0 ? '−' : '+') + Math.abs(avgDelta).toFixed(1)}</span> <span dir={isAr ? 'rtl' : 'ltr'}>{t.pt}</span></>
    : '—';
  const kFlags = rows.filter((r) => r.low).length;

  const plansToday = store.state.plans.filter((p) => p.date === TODAY && store.inScope(p.loc) && p.expectedDemand);
  const overRows = plansToday.map((p) => {
    const dem = p.expectedDemand ?? 0;
    const pct = dem ? Math.round(((p.plannedQty - dem) / dem) * 100) : 0;
    return { p, pct, bad: pct > OVER_FLAG_PCT };
  }).filter((o) => o.pct > 0).sort((a, b) => b.pct - a.pct);
  const kOver = overRows.length ? '+' + overRows[0].pct + '%' : '0%';

  // weekly yield panel: avg yield per output item vs its standard
  const yieldRows = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const b of weekBatches) { const arr = m.get(b.itemId) ?? []; arr.push(b.yieldPct ?? 0); m.set(b.itemId, arr); }
    return [...m.entries()].map(([itemId, arr]) => ({ name: store.itemName(itemId, isAr), actual: arr.reduce((a, v) => a + v, 0) / arr.length, std: stdFor(itemId) }));
  }, [weekBatches, isAr, store]);

  // Post the completion movements a completed batch should carry, if none were posted at completion
  // (seed omission for TOM-20260812-001) — so the "output posted to stock" toast is truthful.
  const postCompletion = (b: Batch) => {
    if (store.state.movements.some((m) => m.source === b.id)) return;
    if (b.rawItemId && b.rawUsed != null) {
      const rawCost = store.item(b.rawItemId)?.cost ?? 0;
      store.postMovement({ itemId: b.rawItemId, loc: b.loc, type: 'production_out', qty: -b.rawUsed, enteredQty: b.rawUsed, enteredUnit: 'KG', value: -(Math.round(b.rawUsed * rawCost * 100) / 100), source: b.id, sourceKind: 'batch', user: b.employee });
    }
    if (b.outputQty != null) {
      store.postMovement({ itemId: b.itemId, loc: b.loc, type: 'production_in', qty: b.outputQty, enteredQty: b.outputQty, enteredUnit: b.unit, value: b.cost ?? 0, source: b.id, sourceKind: 'batch', user: b.employee });
    }
  };
  const doApprove = (b: Batch) => {
    postCompletion(b);
    store.update((d) => { const x = d.batches.find((y) => y.id === b.id); if (x) x.status = 'approved'; });
    onApproved(b.id); // keep the approved card on the board (prototype relabels it instead of dropping it)
    store.logAudit({ action: 'Batch approved', entity: `${b.id} · ${store.itemName(b.itemId, false)} ${b.outputQty != null ? fmt(b.outputQty) + ' ' + b.unit : ''}`, newValue: b.cost != null ? `$${b.cost.toFixed(2)} to stock` : undefined, moduleId: 'production' });
    toast(t.approveToast);
  };
  // Approval is irreversible in the UI → gate behind the shared ConfirmModal (CONVENTIONS §approval-gated).
  const requestApprove = (b: Batch) => setConfirmBatch(b);
  const investigate = (r: BoardRow) => {
    if (r.batch) go('production-gaps', { params: { batch: r.batch.id } });
    else toast(`${t.invToast} ${r.id}`);
  };
  const trace = (r: BoardRow) => go('search', { params: { q: r.id } });

  const openDetail = openBatch ? store.state.batches.find((b) => b.id === openBatch) : undefined;

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <KpiCard label={t.batchesToday} value={rows.length} style={{ minWidth: 170 }} />
        <KpiCard label={t.avgYield} value={kYield} style={{ minWidth: 170 }} />
        <KpiCard label={t.yieldFlags} value={kFlags} tone="amber" style={{ minWidth: 170 }} />
        <KpiCard label={t.overproduction} value={kOver} tone="amber" style={{ minWidth: 170 }} />
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.3, minWidth: 420, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.liveBoard}</div>
          {rows.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.text4, fontSize: 13.5, border: `1px solid ${P.border}`, borderRadius: 14, background: P.card }}>{t.noBatches}</div>}
          {rows.map((r) => {
            const st = ST_STYLE[r.status];
            const name = store.itemName(r.itemId, isAr);
            return (
              <div key={r.key} style={{ border: `1px solid ${r.low ? P.amberBorder : P.border}`, background: r.low ? '#FDF9EE' : P.card, borderRadius: 14, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div onClick={r.batch ? () => setOpenBatch(r.batch!.id) : undefined} style={{ fontSize: 14.5, fontWeight: 700, cursor: r.batch ? 'pointer' : undefined }}>{name}</div>
                  <span onClick={r.batch ? () => setOpenBatch(r.batch!.id) : undefined} style={{ fontSize: 11, color: P.blueFg, cursor: r.batch ? 'pointer' : undefined }} dir="ltr">{r.id}</span>
                  {store.scope === 'all' && <span style={{ fontSize: 11, color: P.text4 }}>· {LOC_NAMES[lang][r.loc]}</span>}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 999, background: st[0], color: st[1], whiteSpace: 'nowrap' }}>{t.st[r.status]}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180, display: 'flex', gap: 4 }} dir="ltr">
                    {Array.from({ length: r.stagesTotal }, (_, j) => (
                      <div key={j} title={`${t.stageWord} ${j + 1}`} style={{ flex: 1, height: 8, borderRadius: 4, background: j < r.stagesDone ? (r.low ? P.amberDot : '#7A8F7A') : P.chip }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 12.5, color: P.text3 }} dir="ltr">{r.plan} → {r.actual}</span>
                  {r.yieldPct != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: r.low ? P.amberPill : P.greenBg, color: r.low ? P.amberFg : P.greenFg }} dir="ltr">{r.yieldPct.toFixed(1)}% / {r.std}%</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {r.batch && r.status === 'pending' && (
                    <button onClick={() => requestApprove(r.batch!)} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: 'none', background: P.ink, color: P.onInk, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.approve}</button>
                  )}
                  {r.batch && r.status === 'done' && <span style={{ fontSize: 12, fontWeight: 700, color: P.greenFg, alignSelf: 'center' }}>{t.approvedLbl}</span>}
                  <button onClick={() => trace(r)} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer' }}>{t.fullTrace}</button>
                  {r.low && (
                    <button onClick={() => investigate(r)} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${P.amberBorder}`, background: P.amberBg, color: P.amberFg, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.investigateYield}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.yieldPanel}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {yieldRows.length === 0 && <div style={{ fontSize: 12.5, color: P.text4 }}>{t.noYield}</div>}
              {yieldRows.map((y) => {
                const low = y.actual < y.std - 2;
                return (
                  <div key={y.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span className="ellipsis" style={{ width: 130, flex: 'none', fontWeight: 600 }}>{y.name}</span>
                    <div style={{ flex: 1, height: 14, background: '#EDEAE0', borderRadius: 4, overflow: 'hidden', position: 'relative' }} dir="ltr">
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${Math.min(100, y.actual)}%`, background: low ? P.amberDot : '#7A8F7A' }} />
                      <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${y.std}%`, width: 2, background: P.text }} />
                    </div>
                    <span style={{ width: 96, textAlign: 'end', fontWeight: 600, color: low ? P.amberFg : P.greenFg }} dir="ltr">{y.actual.toFixed(1)}% / {y.std}%</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: P.text4, marginTop: 10 }}>{t.yieldNote}</div>
          </div>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.overPanel}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {overRows.length === 0 && <div style={{ fontSize: 12.5, color: P.text4 }}>{t.noOver}</div>}
              {overRows.map(({ p, pct, bad }) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: bad ? '#FDF9EE' : '#F3F1E8', fontSize: 13 }}>
                  <span className="ellipsis" style={{ flex: 1, fontWeight: 600 }}>{store.itemName(p.itemId, isAr)}</span>
                  <span style={{ color: P.text3, whiteSpace: 'nowrap' }} dir="ltr">{fmt(p.plannedQty)} {p.unit} {t.vs} ~{fmt(p.expectedDemand ?? 0)} {p.unit} {t.needWord}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: bad ? P.amberPill : P.greenBg, color: bad ? P.amberFg : P.greenFg }} dir="ltr">+{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BatchDetail t={t} batch={openDetail} onClose={() => setOpenBatch(null)} onApprove={requestApprove} onInvestigate={(b) => go('production-gaps', { params: { batch: b.id } })} onTrace={(b) => go('search', { params: { q: b.id } })} />

      <ConfirmModal open={!!confirmBatch} onCancel={() => setConfirmBatch(null)}
        onConfirm={() => { if (confirmBatch) doApprove(confirmBatch); setConfirmBatch(null); }}
        title={t.confirmApprove}
        body={confirmBatch ? `${store.itemName(confirmBatch.itemId, isAr)} · ${confirmBatch.id}${confirmBatch.outputQty != null ? ` · ${fmt(confirmBatch.outputQty)} ${confirmBatch.unit}` : ''}` : undefined}
        cta={t.approve} cancelLabel={t.cancel}>
        <div style={{ fontSize: 13, color: P.text3, lineHeight: 1.5 }}>{t.confirmApproveBody}</div>
      </ConfirmModal>
    </div>
  );
}
