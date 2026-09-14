import { useState } from 'react';
import { P, GridTable, GridRow, Modal, Btn, Select, Input, useToast, fmt, DEMO_TODAY } from '../../../ui';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore, useModuleState } from '../../../store';
import type { LocId, ProductionPlan, User } from '../../../store';
import type { Text } from '../text';
import { MOD_SEED, OVER_FLAG_PCT } from '../data';
import type { ModState, PlanDraft } from '../data';

const GRID = 'minmax(150px,1.5fr) minmax(120px,1.1fr) 90px 96px minmax(110px,1fr) 110px';
const TODAY = DEMO_TODAY.slice(0, 10);

/** MGT-PRD-01 — plan lines vs expected demand, assignment, add line, publish.
 *  Qty / assignee edits are buffered as drafts (module state) and only reach the store — and the staff tablets — on "Publish plan". */
export default function Planning({ t }: { t: Text }) {
  const { isAr, lang } = useLang();
  const store = useStore();
  const toast = useToast();
  const [ms, setMs] = useModuleState<ModState>('production', MOD_SEED);
  const drafts = ms.drafts ?? {};
  /** Raw input text while typing (so "1." survives); the numeric draft lives in module state. */
  const [qtyText, setQtyText] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addLoc, setAddLoc] = useState<LocId>(store.scope === 'all' ? 'mk' : store.scope);
  const [addItem, setAddItem] = useState('');
  const [addQty, setAddQty] = useState('');

  const rows = store.state.plans.filter((p) => p.date === TODAY && store.inScope(p.loc));
  const effQty = (p: ProductionPlan) => drafts[p.id]?.qty ?? p.plannedQty;
  const effAssignee = (p: ProductionPlan) => drafts[p.id]?.assignedTo ?? p.assignedTo;
  const isPublished = rows.length > 0 && rows.every((p) => p.published && !drafts[p.id]);

  /** Assignable staff for a location: active prep/production users at that location (or roaming), else any active user
   *  at that location. The current assignee is always part of the cycle. Never falls back to other locations' staff. */
  const staffFor = (loc: LocId, current?: string): User[] => {
    const atLoc = (u: User) => u.scope === loc || (Array.isArray(u.scope) && u.scope.includes(loc));
    const active = store.state.users.filter((u) => u.active);
    const kitchen = active.filter((u) => (u.role === 'prep' || u.role === 'production') && (u.scope === 'all' || atLoc(u)));
    const local = kitchen.length ? kitchen : active.filter(atLoc);
    const cur = current ? store.state.users.find((u) => u.id === current) : undefined;
    return cur && !local.some((u) => u.id === cur.id) ? [cur, ...local] : local;
  };

  /** Merge a draft edit; drop fields that equal the published value so an untouched line carries no draft marker. */
  const setDraft = (p: ProductionPlan, patch: PlanDraft) => setMs((d) => {
    if (!d.drafts) d.drafts = {};
    const next: PlanDraft = { ...(d.drafts[p.id] ?? {}), ...patch };
    if (next.qty === p.plannedQty) delete next.qty;
    if (next.assignedTo === p.assignedTo) delete next.assignedTo;
    if (next.qty === undefined && next.assignedTo === undefined) delete d.drafts[p.id];
    else d.drafts[p.id] = next;
  });

  const onQty = (p: ProductionPlan, v: string) => {
    setQtyText((s) => ({ ...s, [p.id]: v }));
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 0) setDraft(p, { qty: n });
  };
  const cycleStaff = (p: ProductionPlan) => {
    const cur = effAssignee(p);
    const list = staffFor(p.loc, cur);
    if (!list.length) return;
    const idx = list.findIndex((u) => u.id === cur);
    const next = list[(idx + 1) % list.length];
    setDraft(p, { assignedTo: next.id });
  };
  const publish = () => {
    if (isPublished) { toast(t.alreadyPublished); return; }
    const scope = store.scope;
    const ids = rows.map((r) => r.id);
    store.update((d) => {
      for (const p of d.plans) {
        if (p.date !== TODAY || !(scope === 'all' || p.loc === scope)) continue;
        const dr = drafts[p.id];
        if (dr?.qty !== undefined) p.plannedQty = dr.qty;
        if (dr?.assignedTo !== undefined) p.assignedTo = dr.assignedTo;
        p.published = true;
      }
    });
    setMs((d) => { if (d.drafts) for (const id of ids) delete d.drafts[id]; });
    store.logAudit({ action: 'Plan published', entity: `${TODAY} · ${rows.length} lines · ${LOC_NAMES.en[scope]}`, newValue: rows.map((r) => `${store.itemName(r.itemId, false)} ${fmt(effQty(r))} ${r.unit}`).join(', '), moduleId: 'production' });
    setQtyText({});
    toast(t.publishToast);
  };

  // add-line candidates: recipe products not yet on today's plan at the chosen location
  const candidates = store.state.items.filter((it) => it.isRecipe && !store.state.plans.some((p) => p.date === TODAY && p.loc === addLoc && p.itemId === it.id));
  const openAdd = () => { setAddLoc(store.scope === 'all' ? 'mk' : store.scope); setAddItem(''); setAddQty(''); setAddOpen(true); };
  const addLine = () => {
    const it = store.item(addItem);
    const q = parseFloat(addQty);
    if (!it || isNaN(q) || q <= 0) return;
    const id = store.nextId('PLN');
    const staff = staffFor(addLoc)[0];
    store.update((d) => {
      d.plans.push({ id, date: TODAY, loc: addLoc, itemId: it.id, plannedQty: q, unit: it.base, assignedTo: staff?.id, openingStock: it.onHand[addLoc] ?? 0, status: 'not_started', published: false });
    });
    setAddOpen(false);
  };

  const demandText = (p: ProductionPlan) => {
    if (p.expectedDemand == null) return '—';
    return p.unit === 'PCS' ? `~${fmt(p.expectedDemand)} (${t.demandBasis})` : `~${fmt(p.expectedDemand)} ${p.unit} ${t.perDay}`;
  };

  return (
    <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 22px', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
        <div style={{ fontSize: 13, color: P.text3 }}>{t.planHint}</div>
        <div style={{ flex: 1 }} />
        <button onClick={openAdd} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ {t.addLine}</button>
        <button onClick={publish} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: isPublished ? '#7A8F7A' : P.ink, color: P.onInk, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{isPublished ? t.published : t.publish}</button>
      </div>

      <GridTable cols={GRID} style={{ flex: 1 }} empty={t.noPlans}
        head={[t.product, t.demandHint, { label: t.stock, align: 'end' }, { label: t.plannedQty, align: 'end' }, t.assignTo, t.flag]}>
        {rows.map((p) => {
          const qty = qtyText[p.id] ?? String(effQty(p));
          const q = parseFloat(qty) || 0;
          const dem = p.expectedDemand ?? 0;
          const overPct = dem ? Math.round(((q - dem) / dem) * 100) : 0;
          const over = overPct > OVER_FLAG_PCT;
          const assignee = effAssignee(p);
          const staffName = assignee ? store.userName(assignee, isAr) : t.unassigned;
          const isDraft = !p.published || !!drafts[p.id];
          const item = store.item(p.itemId);
          return (
            <GridRow key={p.id} cols={GRID} tone={over ? 'amber' : undefined} style={{ padding: '10px 16px' }}>
              <div style={{ minWidth: 0 }}>
                <div className="ellipsis" style={{ fontWeight: 600 }}>{store.itemName(p.itemId, isAr)}{isDraft && <span style={{ marginInlineStart: 6, fontSize: 10.5, color: P.text4, fontWeight: 500 }}>· {t.draft}</span>}</div>
                <div style={{ fontSize: 11.5, color: P.text4 }}>{item ? (isAr ? item.en : item.ar) : p.itemId}{store.scope === 'all' && <span> · {LOC_NAMES[lang][p.loc]}</span>}</div>
              </div>
              <div style={{ fontSize: 12, color: P.text3 }} dir="ltr">{demandText(p)}</div>
              <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{fmt(p.openingStock ?? 0)} {p.unit}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <input value={qty} onChange={(e) => onQty(p, e.target.value)} dir="ltr"
                  style={{ width: 72, height: 34, padding: '0 8px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', textAlign: 'center', color: P.text, outline: 'none' }} />
              </div>
              <div>
                <button onClick={() => cycleStaff(p)} title={t.assignTo} style={{ height: 32, padding: '0 12px', borderRadius: 999, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{staffName}</button>
              </div>
              <div>
                {over && <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: P.amberPill, color: P.amberFg, whiteSpace: 'nowrap' }} dir="ltr">+{overPct}%</span>}
              </div>
            </GridRow>
          );
        })}
      </GridTable>
      <div style={{ fontSize: 12, color: P.text4, flex: 'none' }}>{t.planNote}</div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t.addLineTitle} sub={t.addLineSub}
        footer={<><Btn size="lg" variant="ghost" style={{ flex: 1 }} onClick={() => setAddOpen(false)}>{t.cancel}</Btn><Btn size="lg" variant="primary" style={{ flex: 1.4, fontWeight: 700 }} disabled={!addItem || !(parseFloat(addQty) > 0)} onClick={addLine}>{t.add}</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: P.text3 }}>{t.location}
            <Select<LocId> value={addLoc} onChange={(v) => { setAddLoc(v); setAddItem(''); }} options={(['mk', 'rock', 'kad'] as LocId[]).map((l) => ({ value: l, label: LOC_NAMES[lang][l] }))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: P.text3 }}>{t.product}
            {candidates.length
              ? <Select value={addItem} onChange={(v) => { setAddItem(v); const it = store.item(v); if (it && !addQty) setAddQty(String(it.max ?? it.min ?? '')); }} options={[{ value: '', label: '—' }, ...candidates.map((it) => ({ value: it.id, label: `${isAr ? it.ar : it.en} (${it.base})` }))]} />
              : <div style={{ fontSize: 12.5, color: P.text4 }}>{t.noProducts}</div>}
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: P.text3 }}>{t.qty}{addItem && <span> · {store.item(addItem)?.base}</span>}
            <Input value={addQty} onChange={setAddQty} width="100%" ltr type="number" placeholder="0" />
          </label>
        </div>
      </Modal>
    </div>
  );
}
