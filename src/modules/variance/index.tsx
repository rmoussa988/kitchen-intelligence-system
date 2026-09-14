import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang, LOC_NAMES } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import type { LocId } from '../../store';
import { Page, PageHeader, ConfirmModal, Notice, EmptyState, useToast, fmt, money, P } from '../../ui';
import { useModuleNav } from '../../shell/DesktopShell';
import { TEXT } from './text';
import { CASES, numOf, refNav, type VarCase } from './data';
import { EXTRA_MOVEMENTS } from './seed';
import { CaseDetail, type Note } from './views/CaseDetail';
import { SheetModal, CorrectModal, type Reason } from './views/Modals';

interface Correction { qty: number; reason: Reason; note: string }
interface VarModuleState { notes: Record<string, Note[]>; accepted: Record<string, boolean>; corrections: Record<string, Correction> }
const MS_SEED: VarModuleState = { notes: {}, accepted: {}, corrections: {} };
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function VarianceModule() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [params] = useSearchParams();
  const [ms, setMs] = useModuleState<VarModuleState>('variance', MS_SEED);

  // Extend the seed with the 12 Aug counts the cases reconcile against (only when absent).
  useEffect(() => {
    store.update((d) => { for (const m of EXTRA_MOVEMENTS) if (!d.movements.some((x) => x.id === m.id)) d.movements.push(m); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // deep links: ?case=chicken | ?item=RM-001[&loc=rock]. Returns null when a deep link matches no case.
  const pCase = params.get('case'), pItem = params.get('item'), pLoc = params.get('loc');
  const resolve = (): string | null => {
    if (pCase) return CASES.some((c) => c.id === pCase) ? pCase : null;
    if (pItem) { const hit = CASES.find((c) => c.itemId === pItem && (!pLoc || c.loc === pLoc)) ?? CASES.find((c) => c.itemId === pItem); return hit ? hit.id : null; }
    return CASES[0].id;
  };
  const [caseId, setCaseId] = useState<string | null>(resolve);
  useEffect(() => { setCaseId(resolve()); }, [pCase, pItem, pLoc]); // eslint-disable-line react-hooks/exhaustive-deps

  const [noteVal, setNoteVal] = useState('');
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const [correctVal, setCorrectVal] = useState('');
  const [correctReason, setCorrectReason] = useState<Reason | null>(null);
  const [correctNote, setCorrectNote] = useState('');

  const noCase = caseId === null; // deep link supplied but matched no open investigation
  const c: VarCase = CASES.find((x) => x.id === caseId) ?? CASES[0];
  const item = store.item(c.itemId);
  const { users, settings } = store.state;
  const currentUser = users.find((u) => u.id === settings.currentUser);
  const user = { ini: currentUser?.ini ?? 'R', name: currentUser ? (isAr ? currentUser.nameAr : currentUser.name) : 'Rudy', role: currentUser?.role === 'owner' || !currentUser ? t.ownerRole : currentUser.role };

  /**
   * Case view-model. Source/date/sheet meta come from the case's own 12 Aug fields so the header,
   * sidebar and count sheet agree with the reconciliation refs. A saved correction re-nets the
   * variance: a "wrong count" recomputes physical − expected, an "unrecorded waste" resolves the
   * P&L variance to 0 (the shortfall is booked as waste, not written off).
   */
  const vm = useMemo(() => {
    const expected = numOf(c.recon.find((r) => r.op === '=')?.qty ?? '0');
    const staffPhys = numOf(c.recon[c.recon.length - 1].qty);
    const corr = ms.corrections[c.id];
    const resolvedByWaste = corr?.reason === 'waste';
    const physical = corr ? corr.qty : staffPhys;
    const cost = item?.cost ?? 0;
    const qty = resolvedByWaste ? 0 : corr ? r2(physical - expected) : c.qty;
    const value = resolvedByWaste ? 0 : corr ? r2(qty * cost) : c.cost;
    return {
      source: c.source,
      date: c.date,
      expected, staffPhys, physical, qty, value, resolvedByWaste,
      dQty: `${qty > 0 ? '+' : qty < 0 ? '−' : ''}${fmt(Math.abs(qty))} ${c.unit}`,
      dCost: money(value, { sign: true }),
      physicalQty: `${fmt(physical)} ${c.unit}`,
      sheetMeta: `${t.countedByWord} ${isAr ? c.sheet.counterAr : c.sheet.counter} · ${c.sheet.time}`,
    };
  }, [c, ms.corrections, item, isAr, t]);

  const headline = (x: VarCase) => {
    const corr = ms.corrections[x.id];
    const resolved = corr?.reason === 'waste';
    const q = resolved ? 0 : corr ? r2(corr.qty - numOf(x.recon.find((r) => r.op === '=')?.qty ?? '0')) : x.qty;
    const v = resolved ? 0 : corr ? r2(q * (store.item(x.itemId)?.cost ?? 0)) : x.cost;
    return `${q > 0 ? '+' : q < 0 ? '−' : ''}${fmt(Math.abs(q))} ${x.unit} · ${money(v, { sign: true })}`;
  };

  const name = item ? (isAr ? item.ar : item.en) : c.itemId;
  const nameAlt = item ? (isAr ? item.en : item.ar) : '';
  const accepted = !!ms.accepted[c.id];
  const notes: Note[] = [...(c.seedNote ? [{ text: isAr ? c.seedNote.ar : c.seedNote.en, who: c.seedNote.who }] : []), ...(ms.notes[c.id] ?? [])];
  const entity = `${c.itemId} ${item?.en ?? ''} · ${LOC_NAMES.en[c.loc]}`;

  const deliveryIdFor = (inv: string) => store.state.deliveries.find((d) => d.invoiceNo === inv || d.id === inv)?.id;
  const navFor = (ref: string) => c.evidence.find((e) => e.ref === ref)?.nav ?? refNav(ref, c, deliveryIdFor);
  const onRef = (ref: string) => { const n = navFor(ref); if (n) go(n.module, { params: n.params }); };

  /* ── actions ── */
  const addNote = () => {
    const v = noteVal.trim(); if (!v) return;
    setMs((d) => { (d.notes[c.id] ??= []).push({ text: v, who: `${t.you} · 12 Aug` }); });
    setNoteVal('');
  };
  const acceptGo = () => {
    setMs((d) => { d.accepted[c.id] = true; });
    store.dismissAlert(c.alertId);
    store.logAudit({ action: 'Variance accepted', entity, oldValue: vm.dQty, newValue: `${vm.dCost} write-off · ${vm.source}`, moduleId: 'variance' });
    setAcceptOpen(false);
    toast(t.acceptedToast);
  };
  const recount = () => {
    store.logAudit({ action: 'Recount requested', entity, newValue: 'tomorrow 08:00', moduleId: 'variance' });
    toast(t.recountToast);
  };
  const openCorrect = () => { setCorrectVal(''); setCorrectReason(null); setCorrectNote(''); setCorrectOpen(true); };
  const wasteInfo = (() => {
    const adj = parseFloat(correctVal);
    if (Number.isFinite(adj) && vm.expected - adj > 0) return t.wasteInfoAmount(String(r2(vm.expected - adj)), c.unit, t.locs[c.loc]);
    return t.wasteInfoGeneric;
  })();
  const correctGo = () => {
    const v = parseFloat(correctVal);
    if (!correctVal.trim() || !Number.isFinite(v) || v < 0 || !correctReason || !item) return;
    const reasonLabel = correctReason === 'wrong' ? t.reasonWrong : t.reasonWaste;
    const extra = correctNote.trim() ? ' · ' + correctNote.trim() : '';
    // Bring on-hand to the corrected physical figure.
    const delta = r2(v - vm.staffPhys);
    if (delta !== 0) {
      store.postMovement({ itemId: c.itemId, loc: c.loc, type: 'count', qty: delta, enteredQty: Math.abs(delta), enteredUnit: c.unit, value: r2(delta * item.cost), source: `${vm.source}-ADJ`, sourceKind: 'count', note: `${reasonLabel}${extra}`, user: settings.currentUser });
    }
    // Unrecorded-waste correction: post the shortfall as a real waste entry (movement + record + audit)
    // instead of a P&L write-off.
    let wasteSuffix = '';
    let wastePosted = false;
    if (correctReason === 'waste') {
      const w = vm.expected - v > 0 ? r2(vm.expected - v) : null;
      if (w !== null) {
        const wid = store.nextId('WST');
        const wcost = r2(w * item.cost);
        store.update((d) => { d.waste.push({ id: wid, ts: store.now(), itemId: c.itemId, loc: c.loc, qty: w, unit: c.unit, baseQty: w, cost: wcost, reason: 'incorrect', employee: settings.currentUser, status: 'auto', note: `Reclassified from count variance ${vm.source}` }); });
        store.postMovement({ itemId: c.itemId, loc: c.loc, type: 'waste', qty: -w, enteredQty: w, enteredUnit: c.unit, value: -wcost, source: wid, sourceKind: 'waste', note: `Reclassified from count variance ${vm.source}`, user: settings.currentUser });
        store.logAudit({ action: 'Waste auto-posted', entity, oldValue: `${money(-wcost, { sign: true })} count variance`, newValue: `${fmt(w)} ${c.unit} waste · ${wid}`, moduleId: 'variance' });
        wasteSuffix = ` · ${t.wasteAutoPosted} (${wid}, ${fmt(w)} ${c.unit})`;
        wastePosted = true;
      }
    }
    const note: Note = {
      text: `${t.correctedTo} ${v} ${c.unit} — ${reasonLabel}${extra}${wasteSuffix}`,
      who: `${user.name} (${user.role}) · 12 Aug ${t.countAdjustment}`,
    };
    setMs((d) => { (d.notes[c.id] ??= []).push(note); d.corrections[c.id] = { qty: v, reason: correctReason, note: correctNote.trim() }; });
    store.logAudit({ action: 'Count corrected', entity, oldValue: `${fmt(vm.staffPhys)} ${c.unit}`, newValue: `${fmt(v)} ${c.unit} · ${reasonLabel}${extra}`, moduleId: 'variance' });
    setCorrectOpen(false);
    toast(wastePosted ? t.correctToastWaste : t.correctToast);
  };

  // Isolate the money as an LTR unit (U+2066 LRI … U+2069 PDI) so the leading minus stays attached
  // to the amount inside the RTL Arabic sentence.
  const acceptMoney = '⁦' + vm.dCost + '⁩';
  const acceptBody = t.acceptBody.replace('−$15.84', acceptMoney).replace('−١٥٫٨٤$', acceptMoney);

  return (
    <Page>
      <PageHeader title={t.title} screenId="MGT-VAR-01" />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 260, flex: 'none', borderInlineEnd: `1px solid ${P.border}`, background: P.thead, overflow: 'auto', padding: 14 }}>
          <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>{t.openCases}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CASES.map((x) => {
              const on = x.id === caseId;
              const xi = store.item(x.itemId);
              const resolved = ms.corrections[x.id]?.reason === 'waste';
              return (
                <button key={x.id} onClick={() => setCaseId(x.id)} style={{ textAlign: 'start', border: `1px solid ${on ? P.text2 : P.border}`, background: on ? P.card : P.surface, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', color: P.text }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{xi ? (isAr ? xi.ar : xi.en) : x.itemId}</div>
                  <div style={{ fontSize: 11.5, color: P.text3, marginTop: 2 }}>{t.locs[x.loc as LocId]} · {x.date}{ms.accepted[x.id] ? ` · ${t.acceptedBtn}` : resolved ? ` · ${t.resolvedBadge}` : ''}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: resolved || ms.accepted[x.id] ? P.text3 : P.redFg, marginTop: 6 }} dir="ltr">{headline(x)}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div key={caseId ?? 'none'} className="fade-in" style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '18px 22px' }}>
          {noCase
            ? <EmptyState>{t.noInvestigation}</EmptyState>
            : <CaseDetail c={c} t={t} name={name} nameAlt={nameAlt} source={vm.source} dQty={vm.dQty} dCost={vm.dCost} physicalQty={vm.physicalQty} accepted={accepted} resolved={vm.resolvedByWaste}
                notes={notes} noteVal={noteVal} setNoteVal={setNoteVal} onAddNote={addNote}
                onOpenSheet={() => setSheetOpen(true)} onOpenAccept={() => { if (!accepted && !vm.resolvedByWaste) setAcceptOpen(true); }} onOpenCorrect={openCorrect} onRecount={recount}
                onRef={onRef} refHasNav={(ref) => !!navFor(ref)} />}
        </div>
      </div>

      <ConfirmModal open={acceptOpen} onCancel={() => setAcceptOpen(false)} onConfirm={acceptGo} title={t.acceptTitle} body={acceptBody} cta={t.acceptCta} cancelLabel={t.cancel}>
        <Notice tone="amber">{t.acceptWarn}</Notice>
      </ConfirmModal>
      <SheetModal open={sheetOpen} onClose={() => setSheetOpen(false)} c={c} t={t} source={vm.source} meta={vm.sheetMeta} physicalQty={`${fmt(vm.staffPhys)} ${c.unit}`} />
      <CorrectModal open={correctOpen} onClose={() => setCorrectOpen(false)} onSave={correctGo} t={t}
        physCount={`${fmt(vm.staffPhys)} ${c.unit}`} physNum={String(vm.staffPhys)} unit={c.unit}
        val={correctVal} setVal={setCorrectVal} reason={correctReason} setReason={setCorrectReason} note={correctNote} setNote={setCorrectNote}
        wasteInfo={wasteInfo} user={user} />
    </Page>
  );
}
