import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, PageHeader, LocationSelector, Chip, useToast, money, lbp, shortDate, timeHM, P } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useStore } from '../../store';
import type { Delivery, InvoiceStage, SupplierInvoice } from '../../store';
import { useModuleNav } from '../../shell/DesktopShell';
import { TEXT } from './text';
import { useInvoiceSeedMerge } from './seed';

/* ── stage model: prototype s1/s2/s3 groups mapped onto the InvoiceStage union ── */
type Group = 's1' | 's2' | 's3';
type Filter = 'all' | Group | InvoiceStage;
const STAGES: InvoiceStage[] = ['received', 'entered', 'review', 'approved', 'disputed', 'paid'];
const GROUP_ORDER: Record<Group, number> = { s1: 0, s2: 1, s3: 2 };
const groupOf = (st: InvoiceStage): Group => (st === 'received' ? 's1' : st === 'entered' || st === 'review' ? 's2' : 's3');
const SCREEN_ID = 'ACC-INV-01';
const MODULE_ID = 'invoice-pipeline';

/** "$412.00", "412", "8.4M LBP", "2,475,000 LL" → amount + currency. */
function parseAmount(s: string): { amount: number; currency: 'USD' | 'LBP' } | null {
  const raw = s.trim();
  if (!raw) return null;
  const isLbp = /lbp|\bll\b|ل\.ل|ليرة/i.test(raw);
  const m = raw.replace(/[$,\s]/g, '').match(/([\d.]+)\s*(m|k)?/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (isNaN(n)) return null;
  const suf = (m[2] || '').toLowerCase();
  if (suf === 'm') n *= 1_000_000; else if (suf === 'k') n *= 1000;
  return { amount: Math.round(n * 100) / 100, currency: isLbp ? 'LBP' : 'USD' };
}

/** Derive a payable due date from a supplier's payment terms: 'Net N' → invoice date + N days; 'COD'/unknown → invoice date. */
function dueFromTerms(invoiceDate: string, terms: string | undefined): string {
  const d = new Date(invoiceDate + 'T00:00:00');
  const m = /net\s*(\d+)/i.exec(terms ?? '');
  if (m) d.setDate(d.getDate() + parseInt(m[1], 10));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Row { inv: SupplierInvoice; dlv?: Delivery; g: Group; ts: string }

export default function InvoicePipeline() {
  const { lang, isAr, fwdGlyph } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [params] = useSearchParams();
  useInvoiceSeedMerge(store);

  const st = store.state;
  const fx = st.settings.fxRate;
  const currentUser = st.settings.currentUser;
  const focusId = params.get('id');

  const [filter, setFilter] = useState<Filter>(() => {
    const s = params.get('stage');
    return s && (STAGES as string[]).includes(s) ? (s as InvoiceStage) : 'all';
  });
  const [modal, setModal] = useState<{ kind: 'enter' | 'approve' | 'dispute'; id: string } | null>(null);
  const [f1, setF1] = useState('');
  const [f2, setF2] = useState('');

  /* ── rows: one per receiving, grouped by stage, newest first inside a group ── */
  const rowsAll = useMemo<Row[]>(() => {
    return st.invoices
      .filter((inv) => store.inScope(inv.loc))
      .map((inv) => {
        const dlv = inv.deliveryId ? st.deliveries.find((d) => d.id === inv.deliveryId) : undefined;
        return { inv, dlv, g: groupOf(inv.stage), ts: dlv?.ts ?? inv.date + 'T00:00:00' };
      })
      .sort((a, b) => GROUP_ORDER[a.g] - GROUP_ORDER[b.g] || b.ts.localeCompare(a.ts));
  }, [st.invoices, st.deliveries, store.scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts: Record<Group, number> = { s1: 0, s2: 0, s3: 0 };
  rowsAll.forEach((r) => { counts[r.g]++; });
  const rows = rowsAll.filter((r) => filter === 'all' || filter === r.g || filter === r.inv.stage);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`pipe-${focusId}`);
    if (el) el.scrollIntoView({ block: 'center' });
  }, [focusId, rows.length]);

  const supName = (id: string) => { const s = st.suppliers.find((x) => x.id === id); return s ? (isAr && s.nameAr ? s.nameAr : s.name) : id; };
  const byLabel = (dlv?: Delivery) => {
    if (!dlv) return '—';
    const u = st.users.find((x) => x.id === dlv.receivedBy);
    const nm = store.userName(dlv.receivedBy, isAr);
    return u?.role === 'storekeeper' ? `${nm} (${t.storeSuffix})` : nm;
  };
  const amountLabel = (inv: SupplierInvoice) => (inv.currency === 'LBP' ? lbp(inv.amount) : money(inv.amount));

  const stageCards = (['s1', 's2', 's3'] as Group[]).map((k, i) => ({
    k, n: i + 1, name: t.stages[k], who: t.whos[k], count: counts[k],
    bg: k === 's1' ? '#FBF3DF' : k === 's2' ? '#EDF0F4' : '#EAF0E4',
    border: k === 's1' ? '#E2CD96' : k === 's2' ? '#C9D4DE' : '#B9CDB9',
    nBg: k === 's1' ? '#C99A2E' : k === 's2' ? '#37536B' : '#48603A',
  }));

  /* ── actions (every stage move → store.update + logAudit) ── */
  const close = () => { setModal(null); setF1(''); setF2(''); };
  const entityOf = (inv: SupplierInvoice, no?: string) => `${inv.id} · ${store.supplierName(inv.supplierId)} · ${no ?? inv.invoiceNo ?? '—'}`;
  const clearSeedAlert = (inv: SupplierInvoice) => { if (inv.id === 'SI-3019') store.dismissAlert('AL-008'); };

  const doEnter = (inv: SupplierInvoice) => {
    const no = f1.trim().toUpperCase();
    if (!no) return;
    const amt = parseAmount(f2);
    store.update((d) => {
      const x = d.invoices.find((i) => i.id === inv.id);
      if (!x) return;
      x.stage = 'entered'; x.invoiceNo = no; x.enteredBy = currentUser;
      if (amt) { x.amount = amt.amount; x.currency = amt.currency; }
    });
    store.logAudit({ action: t.auditEntered, entity: entityOf(inv, no), oldValue: inv.stage, newValue: 'entered', moduleId: MODULE_ID });
    close();
    toast(t.enteredToast);
  };
  const doApprove = (inv: SupplierInvoice) => {
    store.update((d) => {
      const x = d.invoices.find((i) => i.id === inv.id);
      if (!x) return;
      x.stage = 'approved'; x.reviewedBy = currentUser;
      if (!x.due) { const sup = d.suppliers.find((s) => s.id === x.supplierId); x.due = dueFromTerms(x.date, sup?.terms); }
      const dl = x.deliveryId ? d.deliveries.find((dd) => dd.id === x.deliveryId) : undefined;
      if (dl) dl.status = 'invoiced';
    });
    store.logAudit({ action: t.auditApproved, entity: entityOf(inv), oldValue: inv.stage, newValue: 'approved', moduleId: MODULE_ID });
    clearSeedAlert(inv);
    close();
    toast(t.approvedToast);
  };
  const doDispute = (inv: SupplierInvoice) => {
    const reason = f1.trim();
    if (!reason) return;
    store.update((d) => {
      const x = d.invoices.find((i) => i.id === inv.id);
      if (!x) return;
      x.stage = 'disputed'; x.reviewedBy = currentUser; x.note = reason;
      x.matchIssues = [reason, ...(x.matchIssues ?? []).filter((m) => m !== reason)];
    });
    store.logAudit({ action: t.auditDisputed, entity: entityOf(inv), oldValue: inv.stage, newValue: 'disputed', moduleId: MODULE_ID });
    store.addAlert({ severity: 'amber', type: 'invoice_mismatch', en: `${inv.invoiceNo} ${TEXT.en.alertDisputed} ${reason}`, ar: `${inv.invoiceNo} ${TEXT.ar.alertDisputed} ${reason}`, loc: inv.loc, moduleId: 'invoice-review' });
    clearSeedAlert(inv);
    close();
    toast(t.disputedToast);
  };

  /* ── modal contents ── */
  const modalInv = modal ? st.invoices.find((i) => i.id === modal.id) : undefined;
  let mTitle = '', mBody = '', mWarn = '', mCta = '', mFields = false, fp1 = '', fp2 = '', needF1 = false, mGo: () => void = () => {};
  if (modal && modalInv) {
    if (modal.kind === 'enter') {
      mTitle = t.enterTitle; mBody = t.enterBody; mWarn = t.enterWarn; mCta = t.enterCta; mFields = true; fp1 = t.enterPh1; fp2 = t.enterPh2; needF1 = true;
      mGo = () => doEnter(modalInv);
    } else if (modal.kind === 'approve') {
      mTitle = t.approveTitle; mBody = t.approveBody; mWarn = t.approveWarn; mCta = t.approveCta;
      mGo = () => doApprove(modalInv);
    } else {
      mTitle = t.disputeTitle; mBody = t.disputeBody; mWarn = t.disputeWarn; mCta = t.disputeCta; mFields = true; fp1 = t.disputePh1; needF1 = true;
      mGo = () => doDispute(modalInv);
    }
  }
  const goBg = !mFields || !needF1 || f1.trim() ? P.ink : P.text4;

  const cols = 'minmax(130px,1.4fr) minmax(96px,1fr) minmax(96px,1fr) minmax(96px,1fr) minmax(120px,1.1fr) 150px';
  const btnInk: React.CSSProperties = { height: 30, padding: '0 12px', borderRadius: 7, border: 'none', background: P.ink, color: P.onInk, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' };
  const btnGhost: React.CSSProperties = { height: 30, padding: '0 10px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' };

  return (
    <Page>
      <PageHeader title={t.title} screenId={SCREEN_ID} sub={t.subtitle} right={<LocationSelector />} />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px' }} className="fade-in">
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {stageCards.map((sg) => {
            const on = filter === sg.k;
            return (
              <div key={sg.k} onClick={() => setFilter((f) => (f === sg.k ? 'all' : sg.k))} style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 12, background: sg.bg, border: `1px solid ${on ? P.ink : sg.border}`, borderRadius: 12, padding: '12px 16px', cursor: 'pointer', boxShadow: on ? `0 0 0 1px ${P.ink}` : undefined }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: sg.nBg, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flex: 'none' }}>{sg.n}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{sg.name}</div>
                  <div style={{ fontSize: 11.5, color: P.text3, marginTop: 1 }}>{sg.who}</div>
                </div>
                <span style={{ fontSize: 20, fontWeight: 700 }} dir="ltr">{sg.count}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12.5, color: P.text3, marginBottom: 12 }}>{t.hint}</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t.allStages} · {rowsAll.length}</Chip>
          {stageCards.map((sg) => <Chip key={sg.k} active={filter === sg.k} onClick={() => setFilter(sg.k)}>{sg.n} · {sg.name} · {sg.count}</Chip>)}
          {(STAGES as string[]).includes(filter) && <Chip active tone="blue" onClick={() => setFilter('all')}>{t.stageNames[filter as InvoiceStage]} ×</Chip>}
        </div>

        <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, padding: '10px 16px', fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
            <div>{t.supplier}</div><div>{t.receiving}</div><div style={{ textAlign: 'end' }}>{t.amount}</div><div>{t.invoiceNo}</div><div>{t.stage}</div><div />
          </div>
          {rows.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.text4, fontSize: 13.5 }}>{t.noRows}</div>}
          {rows.map(({ inv, dlv, g }) => {
            const s = inv.stage;
            const done = g === 's3';
            const dotC = ['#C99A2E', '#37536B', s === 'disputed' ? '#C0392B' : '#48603A'];
            const stageN = g === 's1' ? 1 : g === 's2' ? 2 : 3;
            const stLabel = s === 'received' ? t.stLabels.s1 : s === 'entered' ? t.stLabels.s2 : s === 'review' ? t.stLabels.s2r : s === 'approved' ? t.stLabels.s3p : s === 'paid' ? t.stLabels.s3paid : t.stLabels.s3d;
            const stFg = g === 's1' ? '#8A6D1F' : g === 's2' ? '#37536B' : s === 'disputed' ? '#96382E' : '#48603A';
            const focused = focusId === inv.id;
            const bg = focused ? P.hover : g === 's2' ? '#FBF9F0' : 'transparent';
            const pill = s === 'approved' ? { label: t.payablePill, bg: '#E0E8DA', fg: '#48603A' } : s === 'paid' ? { label: t.paidPill, bg: '#E0E8DA', fg: '#48603A' } : { label: t.disputedPill, bg: '#F0CFC9', fg: '#96382E' };
            return (
              <div key={inv.id} id={`pipe-${inv.id}`} style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, padding: '11px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: bg }}>
                <div style={{ minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontWeight: 600 }}>{supName(inv.supplierId)}</div>
                  <div style={{ fontSize: 11, color: P.text4 }} dir="ltr">{dlv ? `${shortDate(dlv.ts)} ${timeHM(dlv.ts)}` : shortDate(inv.date)} · {byLabel(dlv)}</div>
                </div>
                <div>
                  {dlv ? (
                    <a href="#" onClick={(e) => { e.preventDefault(); go('receiving', { params: { id: dlv.id } }); }} style={{ fontSize: 12, color: '#37536B' }} dir="ltr">{dlv.id}</a>
                  ) : <span style={{ fontSize: 12, color: P.text4 }}>—</span>}
                </div>
                <div style={{ textAlign: 'end', fontWeight: 700, minWidth: 0 }} dir="ltr" title={inv.currency === 'LBP' ? `≈ ${money(inv.amount / fx)} · ${t.atRate}` : undefined}>
                  <div style={{ whiteSpace: 'nowrap' }}>{amountLabel(inv)}</div>
                  {inv.currency === 'LBP' && <div style={{ fontSize: 10.5, color: P.text4, fontWeight: 400, whiteSpace: 'nowrap' }}>≈ {money(inv.amount / fx)}</div>}
                </div>
                <div style={{ fontSize: 12, color: P.text2 }} dir="ltr">{inv.invoiceNo || '—'}</div>
                <div>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {[1, 2, 3].map((n) => <span key={n} style={{ width: 22, height: 6, borderRadius: 3, background: n <= stageN ? dotC[n - 1] : P.chip }} />)}
                  </div>
                  <div style={{ fontSize: 11, color: stFg, fontWeight: 600, marginTop: 4 }}>{stLabel}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {s === 'received' && <button onClick={() => { setModal({ kind: 'enter', id: inv.id }); setF1(inv.invoiceNo ?? ''); setF2(''); }} style={btnInk}>{t.enterInvoice}</button>}
                  {(s === 'entered' || s === 'review') && (
                    <>
                      <button onClick={() => setModal({ kind: 'approve', id: inv.id })} style={btnInk}>{t.approvePay}</button>
                      <button onClick={() => { setModal({ kind: 'dispute', id: inv.id }); setF1(''); setF2(''); }} style={{ ...btnGhost, color: '#8A4B2E' }}>{t.dispute}</button>
                      <button onClick={() => go('invoice-review', { params: { id: inv.id } })} style={btnGhost} title="INV-REV-01">{t.openReview} {fwdGlyph}</button>
                    </>
                  )}
                  {done && <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: pill.bg, color: pill.fg, whiteSpace: 'nowrap' }}>{pill.label}</span>}
                  {s === 'disputed' && <button onClick={() => go('invoice-review', { params: { id: inv.id } })} style={btnGhost} title="INV-REV-01">{t.openReview} {fwdGlyph}</button>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: P.text4, marginTop: 10, lineHeight: 1.55 }}>{t.foot}</div>
      </div>

      {modal && modalInv && (
        <div onClick={close} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,31,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} className="pop-up" style={{ width: 'min(480px,92%)', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{mTitle}</div>
            <div style={{ fontSize: 12.5, color: P.text3, marginTop: 4 }} dir="ltr">{modalInv.id} · {supName(modalInv.supplierId)} · {modalInv.deliveryId ?? '—'} · {amountLabel(modalInv)}</div>
            <div style={{ fontSize: 13.5, color: P.text2, marginTop: 8, lineHeight: 1.55 }}>{mBody}</div>
            {mFields && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
                <input value={f1} autoFocus onChange={(e) => setF1(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') mGo(); }} placeholder={fp1} style={{ height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontFamily: 'inherit', color: P.text, outline: 'none' }} />
                {fp2 && <input value={f2} onChange={(e) => setF2(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') mGo(); }} placeholder={fp2} dir="ltr" style={{ height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontFamily: 'inherit', color: P.text, outline: 'none' }} />}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 10, background: P.amberBg, border: `1px solid ${P.amberBorder}`, marginTop: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none', marginTop: 5 }} />
              <span style={{ fontSize: 12.5, color: P.amberFg, lineHeight: 1.5 }}>{mWarn}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={close} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${P.borderInput}`, background: 'transparent', color: P.text2, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cancel}</button>
              <button onClick={mGo} style={{ flex: 1.4, height: 44, borderRadius: 10, border: 'none', background: goBg, color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{mCta}</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
