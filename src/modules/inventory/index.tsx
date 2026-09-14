import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang, LOC_NAMES } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import type { LocId } from '../../store';
import { Page, PageHeader, Body, LocationSelector, ConfirmModal, Notice, useToast, fmt, money, P } from '../../ui';
import { TEXT } from './text';
import { EXTRA_MOVEMENTS } from './seed';
import { REVIEW, reviewKey, reviewExpPhys, type ReviewRow, type Freq } from './data';
import { LedgerView } from './views/Ledger';
import { StockCardView } from './views/StockCard';
import { CountSetupView } from './views/CountSetup';
import { CountReviewView } from './views/CountReview';

/** Persisted module state (survives navigation). */
export interface InvModuleState { freqs: Record<string, Freq>; crits: Record<string, boolean>; accepted: Record<string, boolean>; recounts: Record<string, boolean> }
const MS_SEED: InvModuleState = { freqs: {}, crits: {}, accepted: {}, recounts: {} };

type Tab = 'ledger' | 'setup' | 'review';
type ModalState = { kind: 'adjust' } | { kind: 'accept'; row: ReviewRow } | { kind: 'startAll' } | { kind: 'startOne'; loc: LocId; itemId?: string };

const isLoc = (s: string | null): s is LocId => s === 'mk' || s === 'rock' || s === 'kad';
const INPUT: CSSProperties = { width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontFamily: 'inherit', color: P.text, outline: 'none' };

export default function InventoryModule() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const [params] = useSearchParams();
  const [ms, setMs] = useModuleState<InvModuleState>('inventory', MS_SEED);

  // Merge the prototype's extra ledger rows once (only for items that exist, only when absent).
  useEffect(() => {
    store.update((d) => {
      const ids = new Set(d.items.map((i) => i.id));
      for (const x of EXTRA_MOVEMENTS) if (ids.has(x.itemId) && !d.movements.some((m) => m.id === x.id)) d.movements.push(x);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pTab = params.get('tab'), pItem = params.get('item'), pLoc = params.get('loc');
  const [tab, setTab] = useState<Tab>(pTab === 'setup' || pTab === 'review' ? pTab : 'ledger');
  const [card, setCard] = useState<{ item: string; loc: LocId } | null>(null);

  const locFor = (itemId: string, loc: string | null): LocId => {
    if (isLoc(loc)) return loc;
    if (store.scope !== 'all') return store.scope;
    const it = store.item(itemId);
    const first = it ? (Object.keys(it.onHand) as LocId[]).find((l) => it.onHand[l] != null) : undefined;
    return first ?? 'mk';
  };
  useEffect(() => {
    if (pItem && store.item(pItem)) { setCard({ item: pItem, loc: locFor(pItem, pLoc) }); setTab('ledger'); }
  }, [pItem, pLoc]); // eslint-disable-line react-hooks/exhaustive-deps

  const [modal, setModal] = useState<ModalState | null>(null);
  const [reason, setReason] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const close = () => { setModal(null); setReason(''); setAdjQty(''); };

  const cardItem = card ? store.item(card.item) : undefined;
  const singleLoc: LocId = store.scope === 'all' ? 'mk' : store.scope;
  const scopeSingle = t.locs[singleLoc];
  const currentUser = store.state.settings.currentUser;
  const locEn = (l: LocId) => LOC_NAMES.en[l];

  /* ── review acceptance: driven solely by the persisted flag (set on accept), like the prototype's `s.accepted[key]` ── */
  const isAccepted = (r: ReviewRow) => !!ms.accepted[reviewKey(r)];
  const pendingReview = useMemo(() => REVIEW.filter((r) => store.inScope(r.loc) && !isAccepted(r)).length, [ms.accepted, store]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── actions ── */
  const openCard = (itemId: string, loc: LocId) => { const it = store.item(itemId); if (!it || !it.stocked) return; setCard({ item: itemId, loc }); setTab('ledger'); };

  const doAdjust = () => {
    if (!card || !cardItem) return;
    const q = parseFloat(adjQty.replace('−', '-').replace(',', '.'));
    if (!reason.trim() || !q || Number.isNaN(q)) return;
    const before = cardItem.onHand[card.loc] ?? 0;
    const ref = store.nextId('ADJ');
    store.postMovement({ itemId: cardItem.id, loc: card.loc, type: 'adjustment', qty: q, enteredQty: Math.abs(q), enteredUnit: cardItem.base, value: Math.round(q * cardItem.cost * 100) / 100, source: ref, sourceKind: 'adjustment', note: reason.trim(), user: currentUser });
    store.logAudit({ action: 'Stock adjustment approved', entity: `${cardItem.id} ${cardItem.en} · ${locEn(card.loc)}`, oldValue: `${fmt(before)} ${cardItem.base}`, newValue: `${fmt(before + q)} ${cardItem.base} · ${reason.trim()}`, moduleId: 'inventory' });
    close();
    toast(t.adjustSent);
  };

  const doAccept = (r: ReviewRow) => {
    const it = store.item(r.itemId);
    const { exp, phys } = reviewExpPhys(it, r);
    store.postMovement({ itemId: r.itemId, loc: r.loc, type: 'count', qty: r.varQty, enteredQty: Math.abs(r.varQty), enteredUnit: r.unit, value: r.impact, source: r.source, sourceKind: 'count', beyondTolerance: r.status === 'unfav', user: currentUser });
    store.logAudit({ action: 'Count variance accepted', entity: `${r.itemId} ${it?.en ?? r.en} · ${locEn(r.loc)}`, oldValue: `${fmt(exp)} ${r.unit} expected`, newValue: `${fmt(phys)} ${r.unit} physical · ${money(r.impact, { sign: true })}`, moduleId: 'inventory' });
    setMs((d) => { d.accepted[reviewKey(r)] = true; delete d.recounts[reviewKey(r)]; });
    close();
    toast(t.acceptedToast);
  };

  const doRecount = (r: ReviewRow) => {
    const it = store.item(r.itemId);
    setMs((d) => { d.recounts[reviewKey(r)] = true; });
    store.logAudit({ action: 'Recount requested', entity: `${r.itemId} ${it?.en ?? r.en} · ${locEn(r.loc)}`, moduleId: 'inventory' });
    toast(`${t.recountToast} — ${it ? (isAr ? it.ar : it.en) : (isAr ? r.ar : r.en)}`);
  };

  const launchAll = () => {
    store.logAudit({ action: 'Count launched', entity: 'All locations · 3 parallel tasks', moduleId: 'inventory' });
    close();
    toast(t.countLaunched);
  };
  const launchOne = (loc: LocId, itemId?: string) => {
    store.logAudit({ action: 'Count launched', entity: `${locEn(loc)}${itemId ? ` · ${itemId}` : ''}`, moduleId: 'inventory' });
    close();
    toast(`${t.countLaunchedOne} ${t.locs[loc]}`);
  };

  const onFreq = (row: string, loc: LocId, from: Freq, to: Freq) => {
    setMs((d) => { d.freqs[`${row}:${loc}`] = to; });
    store.logAudit({ action: 'Count frequency changed', entity: `${row} · ${locEn(loc)}`, oldValue: TEXT.en.freqs[from], newValue: TEXT.en.freqs[to], moduleId: 'inventory' });
  };
  const onCrit = (row: string, to: boolean) => {
    setMs((d) => { d.crits[row] = to; });
    store.logAudit({ action: 'Critical flag changed', entity: row, oldValue: String(!to), newValue: String(to), moduleId: 'inventory' });
  };

  const screenId = card ? 'MGT-INV-02' : tab === 'ledger' ? 'MGT-INV-01' : tab === 'setup' ? 'MGT-INV-03' : 'MGT-INV-05';
  const tabs = Object.assign(
    [{ value: 'ledger', label: t.ledger }, { value: 'setup', label: t.setup }, { value: 'review', label: t.review, badge: pendingReview || undefined }],
    { active: tab, onChange: (v: string) => { setCard(null); setTab(v as Tab); } },
  );

  return (
    <Page>
      <PageHeader title={t.title} screenId={screenId} right={<LocationSelector />} tabs={tabs}
        onBack={card ? () => setCard(null) : undefined} back={t.ledger} />

      {card && cardItem ? (
        <Body pad="18px 22px">
          <StockCardView item={cardItem} loc={card.loc} t={t}
            onAdjust={() => setModal({ kind: 'adjust' })}
            onStartCount={() => setModal({ kind: 'startOne', loc: card.loc, itemId: cardItem.id })}
            onExport={() => toast(t.exportToast)} />
        </Body>
      ) : (
        <Body pad="16px 22px" gap={12} style={{ overflow: 'hidden' }}>
          {tab === 'ledger' && <LedgerView t={t} onOpenCard={openCard} onCountRef={() => setTab('review')} />}
          {tab === 'setup' && (
            <CountSetupView t={t} freqs={ms.freqs} crits={ms.crits} onFreq={onFreq} onCrit={onCrit} scopeSingle={scopeSingle}
              onStartAll={() => setModal({ kind: 'startAll' })} onStartOne={() => setModal({ kind: 'startOne', loc: singleLoc })} />
          )}
          {tab === 'review' && (
            <CountReviewView t={t} isAccepted={isAccepted} recounts={ms.recounts} onAccept={(r) => setModal({ kind: 'accept', row: r })} onRecount={doRecount} />
          )}
        </Body>
      )}

      {/* ── approval-gated modals ── */}
      <ConfirmModal open={modal?.kind === 'adjust'} onCancel={close} onConfirm={doAdjust} title={t.adjustTitle} body={t.adjustBody} cta={t.adjustCta} cancelLabel={t.cancel}>
        <input value={adjQty} onChange={(e) => setAdjQty(e.target.value)} placeholder={t.adjustQtyPh} dir="ltr" style={INPUT} />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.adjustPh} style={{ ...INPUT, marginTop: 10 }} />
        <Notice tone="amber" style={{ marginTop: 14 }}>{t.adjustWarn}</Notice>
      </ConfirmModal>

      <ConfirmModal open={modal?.kind === 'accept'} onCancel={close} onConfirm={() => { if (modal?.kind === 'accept') doAccept(modal.row); }} title={t.acceptTitle} body={t.acceptBody} cta={t.acceptCta} cancelLabel={t.cancel}>
        {modal?.kind === 'accept' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 10, background: P.hover, border: `1px solid ${P.border}`, fontSize: 13 }}>
            <span style={{ flex: 1, fontWeight: 600 }}>{store.itemName(modal.row.itemId, isAr)} · {t.locs[modal.row.loc]}</span>
            <span dir="ltr" style={{ fontWeight: 700, color: modal.row.impact < 0 ? P.redFg : P.greenFg }}>{modal.row.varQty === 0 ? '0' : `${modal.row.varQty > 0 ? '+' : '−'}${fmt(Math.abs(modal.row.varQty))} ${modal.row.unit}`} · {money(modal.row.impact, { sign: true })}</span>
          </div>
        )}
        <Notice tone="amber" style={{ marginTop: 14 }}>{t.acceptWarn}</Notice>
      </ConfirmModal>

      <ConfirmModal open={modal?.kind === 'startAll'} onCancel={close} onConfirm={launchAll} title={t.startAllTitle} body={t.startAllBody} cta={t.startCta} cancelLabel={t.cancel}>
        <Notice tone="amber">{t.startWarn}</Notice>
      </ConfirmModal>

      <ConfirmModal open={modal?.kind === 'startOne'} onCancel={close} onConfirm={() => { if (modal?.kind === 'startOne') launchOne(modal.loc, modal.itemId); }}
        title={`${t.startOneTitle} — ${modal?.kind === 'startOne' ? t.locs[modal.loc] : ''}`} body={t.startAllBody} cta={t.startCta} cancelLabel={t.cancel}>
        <Notice tone="amber">{t.startWarn}</Notice>
      </ConfirmModal>
    </Page>
  );
}
