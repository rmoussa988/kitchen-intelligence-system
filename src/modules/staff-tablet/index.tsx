import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang, LOC_NAMES } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import type { LocId } from '../../store';
import { D, KeypadSheet, ConfirmSheet, DoneScreen, Sheet, appendKey, fmt, money, timeHM } from '../../ui';
import { TEXT, ROLE_LABELS, TODAY_LABEL } from './text';
import { STATION, KITCHEN, COUNT_ITEMS, ORDER_ITEMS, COUNT_SOURCE, TABLET_SEED, round2, round3, unitAr } from './data';
import type { TabletState, CountLine } from './data';
import { CountView } from './views/Count';
import { OrderView } from './views/Order';
import { QueueList, FulfillDetail, ReceiveDetail } from './views/Transfers';
import type { ReceiveRow } from './views/Transfers';

type Screen = 'home' | 'count' | 'order' | 'fq' | 'fd' | 'rq' | 'rd' | 'done';
type DoneKind = 'count' | 'order' | 'fulfill' | 'receive';
interface Pad { title: string; sub: string; unit: string; onDone: (v: number) => void }

interface S {
  screen: Screen;
  countIdx: number; countBuf: string; countView: 'single' | 'list'; countVals: Record<number, number>; skips: Record<number, string>;
  orderQty: Record<number, number>;
  reqId: string | null; sentQty: Record<number, number>;
  trfId: string | null; recvQty: Record<number, number>; flags: Record<number, 0 | 1 | 2>;
  pad: Pad | null; padVal: string; skipOpen: boolean; confirm: 'order' | 'fulfill' | 'receive' | null; doneKind: DoneKind | null;
}

function initialState(params: URLSearchParams): S {
  const s: S = {
    screen: 'home', countIdx: 0, countBuf: '', countView: 'single', countVals: {}, skips: {},
    orderQty: {}, reqId: null, sentQty: {}, trfId: null, recvQty: {}, flags: {},
    pad: null, padVal: '', skipOpen: false, confirm: null, doneKind: null,
  };
  const sc = params.get('screen');
  if (sc === 'count') {
    s.screen = 'count';
    const i = COUNT_ITEMS.findIndex((c) => c.id === params.get('item'));
    if (i >= 0) s.countIdx = i;
    if (params.get('view') === 'list') s.countView = 'list';
  } else if (sc === 'order' || sc === 'fq' || sc === 'rq') s.screen = sc;
  else if (sc === 'rd') { s.screen = 'rd'; s.trfId = params.get('id'); }
  else if (sc === 'fd') { s.screen = 'fd'; s.reqId = params.get('id'); }
  return s;
}

const BACK: Partial<Record<Screen, Screen>> = { count: 'home', order: 'home', fq: 'home', fd: 'fq', rq: 'home', rd: 'rq' };
const LOC_OF: Record<Screen, LocId> = { home: STATION, count: STATION, order: STATION, fq: KITCHEN, fd: KITCHEN, rq: STATION, rd: STATION, done: STATION };
const SCREEN_ID: Partial<Record<Screen, string>> = { count: 'STF-INV-04', order: 'STF-TRF-01', fq: 'STF-TRF-02', fd: 'STF-TRF-02', rq: 'STF-TRF-03', rd: 'STF-TRF-03' };

export default function StaffTabletModule() {
  const { lang, isAr, backGlyph, fwdGlyph, chevron } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const [params] = useSearchParams();
  const [s, setS] = useState<S>(() => initialState(params));
  const patch = (p: Partial<S>) => setS((prev) => ({ ...prev, ...p }));
  const [, setMs] = useModuleState<TabletState>('staff-tablet', TABLET_SEED);

  const staffId = store.state.settings.staffUser;
  const staff = store.state.users.find((u) => u.id === staffId);
  const userName = staff ? `${isAr ? staff.nameAr : staff.name} · ${(ROLE_LABELS[staff.role] ?? [staff.role, staff.role])[isAr ? 1 : 0]}` : '';
  const locName = (l: LocId) => t.locs[l];
  const tol = store.state.settings.varianceTolerancePct;

  /* ── derived data ── */
  const countRows = useMemo(() => COUNT_ITEMS.map((def) => ({ def, item: store.item(def.id) })), [store]);
  const orderRows = useMemo(() => ORDER_ITEMS.map((def) => ({ def, item: store.item(def.id) })), [store]);
  const requests = useMemo(() => store.state.transfers.filter((x) => x.status === 'requested' && x.from === KITCHEN).slice().sort((a, b) => (a.requestedAt < b.requestedAt ? -1 : 1)), [store.state.transfers]);
  const incoming = useMemo(() => store.state.transfers.filter((x) => x.status === 'sent' && x.to === STATION).slice().sort((a, b) => ((a.sentAt ?? '') < (b.sentAt ?? '') ? -1 : 1)), [store.state.transfers]);

  const req = requests.find((r) => r.id === s.reqId);
  const fulfillRows = (req?.lines ?? []).map((ln, i) => ({ ln, item: store.item(ln.itemId), sent: s.sentQty[i] ?? ln.requested }));
  const fulfillValue = fulfillRows.reduce((a, r) => a + r.sent * r.ln.cost, 0);
  const fulfillPreview = req ? `${locName(KITCHEN)} − ${money(fulfillValue)} · ${t.pendingAt} ${locName(req.to)}` : '';

  const trf = incoming.find((x) => x.id === s.trfId);
  const receiveRows: ReceiveRow[] = (trf?.lines ?? []).map((ln, i) => {
    const sent = ln.sent ?? ln.requested;
    const recv = s.recvQty[i] ?? sent;
    const pct = sent ? (Math.abs(recv - sent) / sent) * 100 : recv !== sent ? 100 : 0;
    return { ln, item: store.item(ln.itemId), sent, recv, beyond: pct > tol, flag: s.flags[i] ?? 0 };
  });
  const recvValue = receiveRows.reduce((a, r) => a + r.recv * r.ln.cost, 0);
  const varCount = receiveRows.filter((r) => r.recv !== r.sent).length;
  const receivePreview = money(recvValue) + (varCount ? ` · ${varCount} ${t.variance}` : '');

  const orderLines = orderRows.filter((_r, i) => (s.orderQty[i] || 0) > 0).length;
  const countedCount = COUNT_ITEMS.reduce((a, _c, i) => a + (s.countVals[i] !== undefined ? 1 : 0), 0);

  /* ── keypad ── */
  const openPad = (title: string, sub: string, unit: string, initial: number | '' | undefined, onDone: (v: number) => void) =>
    patch({ pad: { title, sub, unit, onDone }, padVal: initial ? String(initial) : '' });
  const padDone = () => { const v = parseFloat(s.padVal); if (s.pad && !isNaN(v)) s.pad.onDone(v); patch({ pad: null, padVal: '' }); };

  /* ── count ── */
  const nm = (item: { en: string; ar: string } | undefined, id: string) => (item ? (isAr ? item.ar : item.en) : id);
  const nmAlt = (item: { en: string; ar: string } | undefined) => (item ? (isAr ? item.en : item.ar) : '');

  const submitCount = (vals: Record<number, number>, skips: Record<number, string>) => {
    const ts = store.now();
    const lines: CountLine[] = [];
    COUNT_ITEMS.forEach((def, i) => {
      const item = store.item(def.id);
      const expected = item?.onHand[STATION] ?? 0;
      const entered = vals[i];
      if (entered === undefined) { if (skips[i]) lines.push({ itemId: def.id, unit: def.unit, expected, diff: 0, skip: skips[i] }); return; }
      const physical = round3(entered * def.factor);
      const diff = round3(physical - expected);
      lines.push({ itemId: def.id, entered, unit: def.unit, physical, expected, diff });
      // Staff submit must NOT adjust on-hand: the prototype's submitCountList only advances to the
      // "sent for review" done screen, and CONVENTIONS line 121 posts `count` movements only when
      // management *accepts* the count. On-hand stays untouched until then; we just record the
      // CountSession below so the Inventory Count review can reconcile and post on accept.
    });
    const id = store.nextId('CNT');
    setMs((d) => { d.countSessions.unshift({ id, ts, loc: STATION, by: staffId, source: COUNT_SOURCE, lines }); });
    const counted = lines.filter((l) => l.entered !== undefined).length;
    const adj = lines.filter((l) => l.diff !== 0).length;
    store.logAudit({ user: staffId, action: 'Count submitted', entity: `${COUNT_SOURCE} · ${LOC_NAMES.en[STATION]}`, newValue: `${counted} items · ${adj} adjustments`, moduleId: 'staff-tablet' });
    patch({ countVals: vals, skips, screen: 'done', doneKind: 'count', countIdx: 0, countBuf: '', skipOpen: false });
  };
  const countConfirm = () => {
    if (!s.countBuf) return;
    const val = parseFloat(s.countBuf);
    const vals = { ...s.countVals };
    if (!isNaN(val)) vals[s.countIdx] = val;
    if (s.countIdx + 1 >= COUNT_ITEMS.length) submitCount(vals, s.skips);
    else patch({ countVals: vals, countIdx: s.countIdx + 1, countBuf: String(vals[s.countIdx + 1] ?? ''), skipOpen: false });
  };
  const skipWith = (reason: string) => {
    const skips = { ...s.skips, [s.countIdx]: reason };
    if (s.countIdx + 1 >= COUNT_ITEMS.length) submitCount(s.countVals, skips);
    else patch({ skips, countIdx: s.countIdx + 1, countBuf: String(s.countVals[s.countIdx + 1] ?? ''), skipOpen: false });
  };

  /* ── order ── */
  const submitOrder = () => {
    const ts = store.now();
    const id = store.nextId('REQ');
    const lines = ORDER_ITEMS.map((def, i) => ({ def, q: s.orderQty[i] || 0 })).filter((x) => x.q > 0)
      .map((x) => ({ itemId: x.def.id, unit: x.def.unit, cost: store.item(x.def.id)?.cost ?? 0, requested: x.q }));
    store.update((d) => { d.transfers.push({ id, from: KITCHEN, to: STATION, status: 'requested', requestedAt: ts, requestedBy: staffId, lines }); });
    store.logAudit({ user: staffId, action: 'Transfer requested', entity: `${id} · ${LOC_NAMES.en[STATION]} ← ${LOC_NAMES.en[KITCHEN]}`, newValue: `${lines.length} lines`, moduleId: 'staff-tablet' });
    patch({ confirm: null, screen: 'done', doneKind: 'order' });
  };

  /* ── fulfill ── */
  const submitFulfill = () => {
    const r = req; if (!r) { patch({ confirm: null }); return; }
    const ts = store.now();
    // A request (REQ-…) becomes a sent transfer (TRF-…) — see store/types.ts:108 "REQ-1042 → TRF-1039".
    const trfId = store.nextId('TRF');
    const sentArr = r.lines.map((ln, i) => s.sentQty[i] ?? ln.requested);
    store.update((d) => {
      const x = d.transfers.find((y) => y.id === r.id); if (!x) return;
      x.id = trfId;
      x.lines.forEach((ln, i) => { ln.sent = sentArr[i]; });
      x.status = 'sent'; x.sentAt = ts; x.sentBy = staffId;
    });
    r.lines.forEach((ln, i) => {
      const q = sentArr[i];
      if (q > 0) store.postMovement({ ts, type: 'transfer_out', itemId: ln.itemId, loc: KITCHEN, qty: -q, enteredQty: q, enteredUnit: ln.unit, value: -round2(q * ln.cost), source: trfId, sourceKind: 'transfer', user: staffId });
    });
    store.logAudit({ user: staffId, action: 'Transfer sent', entity: `${trfId} · ${LOC_NAMES.en[KITCHEN]} → ${LOC_NAMES.en[r.to]}`, newValue: `−${money(fulfillValue)} at cost`, moduleId: 'staff-tablet' });
    patch({ confirm: null, screen: 'done', doneKind: 'fulfill' });
  };

  /* ── receive ── */
  const submitReceive = () => {
    const x = trf; if (!x) { patch({ confirm: null }); return; }
    const ts = store.now();
    const computed = receiveRows.map((r) => ({ ...r, flagKey: (r.flag === 1 ? 'short' : r.flag === 2 ? 'damaged' : null) as 'short' | 'damaged' | null }));
    const flagged = computed.some((c) => c.beyond || c.flagKey);
    store.update((d) => {
      const y = d.transfers.find((z) => z.id === x.id); if (!y) return;
      computed.forEach((c, i) => { const ln = y.lines[i]; if (ln) { ln.confirmed = c.recv; ln.flag = c.flagKey; } });
      y.status = flagged ? 'flagged' : 'confirmed'; y.confirmedAt = ts; y.confirmedBy = staffId;
    });
    computed.forEach((c) => {
      if (c.recv > 0) store.postMovement({ ts, type: 'transfer_in', itemId: c.ln.itemId, loc: STATION, qty: c.recv, enteredQty: c.recv, enteredUnit: c.ln.unit, value: round2(c.recv * c.ln.cost), source: x.id, sourceKind: 'transfer', user: staffId });
    });
    if (flagged) {
      const w = computed.find((c) => c.beyond || c.flagKey);
      if (w) {
        const it = store.item(w.ln.itemId);
        const flagEn = w.flagKey ?? 'variance';
        const flagAr = w.flagKey === 'damaged' ? 'تالف' : w.flagKey === 'short' ? 'نقص' : 'فرق';
        store.addAlert({ ts, severity: 'red', type: 'transfer_variance', loc: STATION, moduleId: 'transfers',
          en: `${x.id} confirmed ${fmt(w.recv)} of ${fmt(w.sent)} ${it?.en ?? w.ln.itemId} sent — flagged ${flagEn}`,
          ar: `${x.id} تم تأكيد ${fmt(w.recv)} من ${fmt(w.sent)} ${it?.ar ?? w.ln.itemId} — مُبلّغ ${flagAr}` });
      }
    }
    if (x.id === 'TRF-1039') store.dismissAlert('AL-009');
    store.logAudit({ user: staffId, action: flagged ? 'Transfer confirmed — flagged' : 'Transfer confirmed', entity: `${x.id} · ${LOC_NAMES.en[x.from]} → ${LOC_NAMES.en[x.to]}`, newValue: `+${money(recvValue)} at carried cost${varCount ? ` · ${varCount} variance` : ''}`, moduleId: 'staff-tablet' });
    patch({ confirm: null, screen: 'done', doneKind: 'receive' });
  };

  /* ── confirm sheet ── */
  let confirmTitle = '', confirmBody = '', confirmGo: () => void = () => {};
  if (s.confirm === 'order') {
    confirmTitle = t.confirmOrderT;
    confirmBody = `${orderLines} ${t.items} · ${locName(STATION)} ${fwdGlyph} ${locName(KITCHEN)}`;
    confirmGo = submitOrder;
  } else if (s.confirm === 'fulfill') {
    confirmTitle = t.confirmFulfillT;
    confirmBody = req ? `${locName(KITCHEN)} − ${t.valueLabel} ${money(fulfillValue)} · ${t.pendingAt} ${locName(req.to)}` : '';
    confirmGo = submitFulfill;
  } else if (s.confirm === 'receive') {
    confirmTitle = t.confirmReceiveT;
    confirmBody = t.valueEntering + money(recvValue) + (varCount ? ` · ${varCount} ${t.variancesFlagged}` : '');
    confirmGo = submitReceive;
  }

  const doneMap: Record<DoneKind, [string, string]> = { count: [t.countDoneT, t.countDoneB], order: [t.orderDoneT, t.orderDoneB], fulfill: [t.fulfillDoneT, t.fulfillDoneB], receive: [t.receiveDoneT, t.receiveDoneB] };
  const dd = s.doneKind ? doneMap[s.doneKind] : ['', ''];

  const screen: Screen = s.screen === 'fd' && !req ? 'fq' : s.screen === 'rd' && !trf ? 'rq' : s.screen;
  const docId = screen === 'fd' ? req?.id : screen === 'rd' ? trf?.id : undefined;
  const hasBack = screen !== 'home' && screen !== 'done';
  const goHome = () => patch({ screen: 'home', doneKind: null, orderQty: {}, sentQty: {}, recvQty: {}, flags: {}, countVals: {}, skips: {} });

  const tile: React.CSSProperties = { textAlign: 'start', border: `1px solid ${D.border}`, background: D.card, borderRadius: 22, padding: 26, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'inherit', color: D.text };
  const tileBadge: React.CSSProperties = { fontSize: 14, padding: '6px 12px', borderRadius: 999, background: D.chip, color: D.text2 };
  const tileBadgeGold: React.CSSProperties = { fontSize: 14, padding: '6px 12px', borderRadius: 999, background: D.amberChip, color: D.gold };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, color: D.text }}>
      {/* module header: back · screen title · screen id · station · user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px', borderBottom: `1px solid ${D.headerBorder}`, flex: 'none' }}>
        {hasBack && (
          <button onClick={() => patch({ screen: BACK[screen] ?? 'home' })} style={{ height: 52, minWidth: 52, padding: '0 18px', borderRadius: 14, border: `1px solid ${D.border3}`, background: D.card, color: D.text, fontSize: 20, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {backGlyph} <span style={{ fontSize: 16, color: D.muted }}>{t.back}</span>
          </button>
        )}
        <div style={{ fontSize: 19, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titles[screen]}</div>
        {SCREEN_ID[screen] && <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: D.headerBorder, color: D.muted }}>{SCREEN_ID[screen]}</span>}
        {docId && <span dir="ltr" style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: D.headerBorder, color: D.text2, fontVariantNumeric: 'tabular-nums' }}>{docId}</span>}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: `1px solid ${D.border3}`, background: D.card, fontSize: 15, color: D.text2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.greenDot, display: 'inline-block' }} />{locName(LOC_OF[screen])}
        </div>
        <div style={{ fontSize: 15, color: D.muted }}>{userName}</div>
      </div>

      {screen === 'home' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 32px', gap: 20, overflow: 'auto' }}>
          <div>
            <div style={{ fontSize: 15, color: D.muted, letterSpacing: '.4px' }}>{TODAY_LABEL[lang]}</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{t.homeTitle}</div>
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 18, minHeight: 0 }}>
            <button className="tile-hover" onClick={() => patch({ screen: 'count', countIdx: 0, countBuf: String(s.countVals[0] ?? '') })} style={tile}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={D.cream} strokeWidth="1.6"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
                <span style={tileBadge}>{t.daily}</span>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{t.count}</div>
                <div style={{ fontSize: 16, color: D.muted, marginTop: 6 }}>{COUNT_ITEMS.length} {t.items} · {locName(STATION)}</div>
              </div>
            </button>
            <button className="tile-hover" onClick={() => patch({ screen: 'order' })} style={tile}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={D.cream} strokeWidth="1.6"><path d="M4 6h16M7 12h13M10 18h10" /><circle cx="4.5" cy="12" r="1.4" fill={D.cream} stroke="none" /><circle cx="7.5" cy="18" r="1.4" fill={D.cream} stroke="none" /></svg>
                <span style={tileBadge}>{locName(STATION)} {fwdGlyph} {locName(KITCHEN)}</span>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{t.order}</div>
                <div style={{ fontSize: 16, color: D.muted, marginTop: 6 }}>{t.orderSub}</div>
              </div>
            </button>
            <button className="tile-hover" onClick={() => patch({ screen: 'fq' })} style={tile}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={D.cream} strokeWidth="1.6"><path d="M3 12h13M12 6l6 6-6 6" /><path d="M20 5v14" /></svg>
                <span style={tileBadgeGold}>{requests.length} {t.pending.toLowerCase()}</span>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{t.fulfill}</div>
                <div style={{ fontSize: 16, color: D.muted, marginTop: 6 }}>{t.fulfillSub}</div>
              </div>
            </button>
            <button className="tile-hover" onClick={() => patch({ screen: 'rq' })} style={tile}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={D.cream} strokeWidth="1.6"><path d="M21 12H8M12 6l-6 6 6 6" /><path d="M4 5v14" /></svg>
                <span style={tileBadgeGold}>{incoming.length} {t.pendingReceipt.toLowerCase()}</span>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{t.receive}</div>
                <div style={{ fontSize: 16, color: D.muted, marginTop: 6 }}>{t.receiveSub}</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {screen === 'count' && (
        <CountView t={t} isAr={isAr} rows={countRows} idx={s.countIdx} buf={s.countBuf} view={s.countView} vals={s.countVals} locLabel={locName(STATION)}
          onKey={(k) => setS((p) => ({ ...p, countBuf: appendKey(p.countBuf, k) }))}
          onConfirm={countConfirm}
          onSkip={() => patch({ skipOpen: true })}
          onSetView={(v) => patch(v === 'single' ? { countView: 'single', countBuf: String(s.countVals[s.countIdx] ?? '') } : { countView: 'list' })}
          onTapRow={(i) => { const r = countRows[i]; openPad(nm(r.item, r.def.id), nmAlt(r.item), isAr ? r.def.unitAr : r.def.unit, s.countVals[i] ?? '', (v) => setS((p) => ({ ...p, countVals: { ...p.countVals, [i]: v } }))); }}
          onSubmitList={() => { if (countedCount) submitCount(s.countVals, s.skips); }}
        />
      )}

      {screen === 'order' && (
        <OrderView t={t} isAr={isAr} rows={orderRows} qty={s.orderQty}
          onInc={(i) => setS((p) => ({ ...p, orderQty: { ...p.orderQty, [i]: (p.orderQty[i] || 0) + 1 } }))}
          onDec={(i) => setS((p) => ({ ...p, orderQty: { ...p.orderQty, [i]: Math.max(0, (p.orderQty[i] || 0) - 1) } }))}
          onTap={(i) => { const r = orderRows[i]; openPad(nm(r.item, r.def.id), nmAlt(r.item), isAr ? r.def.unitAr : r.def.unit, s.orderQty[i] || '', (v) => setS((p) => ({ ...p, orderQty: { ...p.orderQty, [i]: v } }))); }}
          onSubmit={() => { if (orderLines) patch({ confirm: 'order' }); }}
        />
      )}

      {screen === 'fq' && (
        <QueueList t={t} hint={t.fqHint} pill={t.pending} empty={t.emptyQueue} chevron={chevron}
          rows={requests.map((r) => ({ id: r.id, from: locName(r.to), time: timeHM(r.requestedAt), lines: r.lines.length }))}
          onOpen={(id) => patch({ screen: 'fd', reqId: id, sentQty: {} })} />
      )}

      {screen === 'fd' && req && (
        <FulfillDetail t={t} isAr={isAr} rows={fulfillRows} preview={fulfillPreview}
          onTap={(i) => { const r = fulfillRows[i]; const un = isAr ? unitAr(r.ln.unit) : r.ln.unit; openPad(nm(r.item, r.ln.itemId), `${t.requestedPrefix}${fmt(r.ln.requested)} ${un}`, un, r.sent, (v) => setS((p) => ({ ...p, sentQty: { ...p.sentQty, [i]: v } }))); }}
          onSubmit={() => patch({ confirm: 'fulfill' })} />
      )}

      {screen === 'rq' && (
        <QueueList t={t} hint={t.rqHint} pill={t.pendingReceipt} empty={t.emptyIncoming} chevron={chevron}
          rows={incoming.map((x) => ({ id: x.id, from: locName(x.from), time: timeHM(x.sentAt ?? x.requestedAt), lines: x.lines.length }))}
          onOpen={(id) => patch({ screen: 'rd', trfId: id, recvQty: {}, flags: {} })} />
      )}

      {screen === 'rd' && trf && (
        <ReceiveDetail t={t} isAr={isAr} rows={receiveRows} preview={receivePreview}
          onTap={(i) => { const r = receiveRows[i]; const un = isAr ? unitAr(r.ln.unit) : r.ln.unit; openPad(nm(r.item, r.ln.itemId), `${t.sentPrefix}${fmt(r.sent)} ${un}`, un, r.recv, (v) => setS((p) => ({ ...p, recvQty: { ...p.recvQty, [i]: v } }))); }}
          onFlag={(i) => setS((p) => ({ ...p, flags: { ...p.flags, [i]: (((p.flags[i] ?? 0) + 1) % 3) as 0 | 1 | 2 } }))}
          onSubmit={() => patch({ confirm: 'receive' })} />
      )}

      {screen === 'done' && <DoneScreen title={dd[0]} body={dd[1]} action={t.backHome} onAction={goHome} />}

      <KeypadSheet open={!!s.pad} title={s.pad?.title ?? ''} sub={s.pad?.sub} unit={s.pad?.unit} value={s.padVal}
        onChange={(v) => patch({ padVal: v })} onDone={padDone} onCancel={() => patch({ pad: null, padVal: '' })} cancelLabel={t.cancel} doneLabel={t.done} />

      <Sheet open={s.skipOpen} onClose={() => patch({ skipOpen: false })}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{t.skipWhy}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {[t.skipR1, t.skipR2, t.skipR3, t.skipR4].map((label) => (
            <button key={label} onClick={() => skipWith(label)} style={{ height: 60, borderRadius: 14, border: `1px solid ${D.border2}`, background: D.key, color: D.text, fontSize: 18, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'start', padding: '0 20px' }}>{label}</button>
          ))}
        </div>
        <button onClick={() => patch({ skipOpen: false })} style={{ width: '100%', marginTop: 12, height: 56, borderRadius: 14, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 17, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cancel}</button>
      </Sheet>

      <ConfirmSheet open={!!s.confirm} title={confirmTitle} body={confirmBody} onCancel={() => patch({ confirm: null })} onConfirm={confirmGo} cta={t.confirm} cancelLabel={t.cancel} />
    </div>
  );
}
