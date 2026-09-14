import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, PageHeader, Tabs, LocationSelector, useToast, money, P, shortDate, timeHM } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import type { InvoiceStage, Item, SupplierInvoice } from '../../store';
import { useModuleNav, useEmbedded } from '../../shell/DesktopShell';
import { canUpload, uploadAttachment } from '../../data/storage';
import { TEXT } from './text';
import { useInvoiceSeedMerge } from '../invoice-pipeline/seed';
import type { ReviewState, Work } from './types';
import { amountUsd, buildWork, computeReview, deliveryOf, ocrLines, poOf, printedLines, scanInfo } from './logic';
import ReviewPane from './views/ReviewPane';
import SummaryView, { type StatTile, type SummaryRow } from './views/SummaryView';

const MODULE_ID = 'invoice-review';
const SCREEN_ID = 'INV-REV-01';
const MS_SEED: ReviewState = { selectedId: null, tab: 'review', work: {}, posted: {} };
const QUEUE_STAGES: InvoiceStage[] = ['entered', 'review', 'disputed'];
type QFilter = 'all' | 'pending' | 'disputed';

export default function InvoiceReview() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const embedded = useEmbedded();
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [params] = useSearchParams();
  useInvoiceSeedMerge(store);
  const [ms, setMs] = useModuleState<ReviewState>(MODULE_ID, MS_SEED);

  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cloud = canUpload();
  const [filter, setFilter] = useState<QFilter>(() => { const s = params.get('stage'); return s === 'disputed' ? 'disputed' : s === 'review' || s === 'entered' ? 'pending' : 'all'; });
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);

  const st = store.state;
  const fx = st.settings.fxRate;
  const currentUser = st.settings.currentUser;
  const tab = ms.tab;

  const supLabel = (id: string) => { const s = st.suppliers.find((x) => x.id === id); return s ? (isAr && s.nameAr ? s.nameAr : s.name) : id; };
  const nameOf = (id: string) => store.itemName(id, isAr);
  const tsOf = (inv: SupplierInvoice) => deliveryOf(inv, st)?.ts ?? inv.date + 'T00:00:00';

  /* ── queue = accountant's inbox: entered / review / disputed, oldest first, disputed last ── */
  const queue = useMemo(() => st.invoices
    .filter((i) => store.inScope(i.loc) && QUEUE_STAGES.includes(i.stage))
    .sort((a, b) => (a.stage === 'disputed' ? 1 : 0) - (b.stage === 'disputed' ? 1 : 0) || tsOf(a).localeCompare(tsOf(b))),
  [st.invoices, st.deliveries, store.scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const pending = queue.filter((i) => filter === 'all' || (filter === 'pending' ? i.stage !== 'disputed' : i.stage === 'disputed'));
  const sel = pending.find((i) => i.id === ms.selectedId) ?? pending[0] ?? null;
  const w: Work | undefined = sel ? ms.work[sel.id] ?? buildWork(sel, st) : undefined;
  const nPending = queue.filter((i) => i.stage !== 'disputed').length, nDisputed = queue.length - nPending;

  const entityOf = (inv: SupplierInvoice, no?: string) => `${inv.id} · ${store.supplierName(inv.supplierId)} · ${no ?? inv.invoiceNo ?? '—'}`;
  /** Picking an entered invoice moves it to 'review' (accountant has it). */
  const ensureReviewing = (inv: SupplierInvoice) => {
    if (inv.stage !== 'entered') return;
    store.update((d) => { const x = d.invoices.find((i) => i.id === inv.id); if (x && x.stage === 'entered') { x.stage = 'review'; x.reviewedBy = currentUser; } });
    store.logAudit({ action: t.auditReview, entity: entityOf(inv), oldValue: 'entered', newValue: 'review', moduleId: MODULE_ID });
  };
  const pick = (inv: SupplierInvoice) => { setMs((d) => { d.selectedId = inv.id; d.tab = 'review'; }); setSearch(''); ensureReviewing(inv); };

  /* ── ?id= deep link ── */
  const urlId = params.get('id');
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!urlId || handled.current === urlId) return;
    const inv = st.invoices.find((i) => i.id === urlId);
    if (!inv) return; // extras may still be merging
    handled.current = urlId;
    if (QUEUE_STAGES.includes(inv.stage)) { setFilter('all'); pick(inv); }
    else { setMs((d) => { d.tab = 'summary'; }); setHighlight(urlId); setTimeout(() => document.getElementById(`sum-${urlId}`)?.scrollIntoView({ block: 'center' }), 50); }
  }, [urlId, st.invoices]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── work edits ── */
  const updateWork = (recipe: (wk: Work) => void) => {
    if (!sel) return;
    const id = sel.id, base = buildWork(sel, st);
    setMs((d) => { if (!d.work[id]) d.work[id] = base; recipe(d.work[id] as Work); });
    ensureReviewing(sel);
  };

  /* ── real scan upload (cloud mode only; local mode keeps the simulated attach) ── */
  const doUploadScan = async (file: File) => {
    if (!sel || uploading) return;
    const id = sel.id;
    setUploading(true);
    try {
      const url = await uploadAttachment('invoice-scans', file);
      if (url) {
        store.update((d) => { const x = d.invoices.find((i) => i.id === id); if (x) x.scanUrl = url; });
        updateWork((wk) => { wk.uploaded = file.name || t.uploadedScan; });
      }
    } catch {
      toast(t.uploadError);
    } finally {
      setUploading(false);
    }
  };
  const doRemoveScan = () => {
    if (!sel) return;
    const id = sel.id;
    store.update((d) => { const x = d.invoices.find((i) => i.id === id); if (x) x.scanUrl = undefined; });
    updateWork((wk) => { wk.uploaded = null; });
  };
  const results: Item[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !w) return [];
    const existing = new Set(w.lines.map((l) => l.itemId));
    return st.items.filter((it) => it.stocked && it.purch !== '—' && !existing.has(it.id) && (it.en.toLowerCase().includes(q) || it.ar.includes(search.trim()) || it.id.toLowerCase().includes(q))).slice(0, 6);
  }, [search, w, st.items]);

  const calc = sel && w ? computeReview(w, sel, st, fx, t, nameOf) : null;
  const nextAfter = (id: string) => pending.filter((i) => i.id !== id)[0]?.id ?? null;

  /* ── decisions ── */
  const doApprove = () => {
    if (!sel || !w || !calc || !w.lines.length) return;
    const invOk = !!w.inv.trim(), scanOk = scanInfo(sel).scanned || !!w.uploaded || !!sel.scanUrl;
    if (!invOk || !scanOk) { toast(!invOk ? t.needInv : t.needScan); return; }
    const no = w.inv.trim().toUpperCase();
    store.update((d) => {
      const x = d.invoices.find((i) => i.id === sel.id);
      if (!x) return;
      x.stage = 'approved'; x.reviewedBy = currentUser; x.invoiceNo = no; if (w.date.trim()) x.date = w.date.trim();
      x.amount = x.currency === 'USD' ? Math.round(calc.total * 100) / 100 : Math.round(calc.total * fx);
      x.matchIssues = calc.checks.length ? calc.checks : undefined;
      const dl = x.deliveryId ? d.deliveries.find((dd) => dd.id === x.deliveryId) : undefined;
      if (dl) dl.status = 'invoiced';
    });
    store.logAudit({ action: t.auditApproved, entity: entityOf(sel, no), oldValue: sel.stage, newValue: 'approved', moduleId: MODULE_ID });
    if (sel.id === 'SI-3019') store.dismissAlert('AL-008');
    const next = nextAfter(sel.id);
    setMs((d) => { d.posted[sel.id] = { subtotal: calc.subtotal, tax: calc.taxAmount, total: calc.total, status: 'approved' }; d.selectedId = next; });
    setSearch('');
    toast(`${t.approveToast} · ${t.payableToast}`);
  };
  const doSendBack = () => {
    if (!sel || !w || !calc) return;
    const r = reason.trim();
    if (!r) return;
    store.update((d) => {
      const x = d.invoices.find((i) => i.id === sel.id);
      if (!x) return;
      x.stage = 'disputed'; x.reviewedBy = currentUser; x.note = r; x.matchIssues = [r, ...calc.checks];
    });
    store.logAudit({ action: t.auditDisputed, entity: entityOf(sel), oldValue: sel.stage, newValue: 'disputed', moduleId: MODULE_ID });
    const ref = sel.invoiceNo || sel.id;
    store.addAlert({ severity: 'amber', type: 'invoice_mismatch', en: `${ref} ${TEXT.en.alertDisputed} ${r}`, ar: `${ref} ${TEXT.ar.alertDisputed} ${r}`, loc: sel.loc, moduleId: MODULE_ID });
    if (sel.id === 'SI-3019') store.dismissAlert('AL-008');
    const next = nextAfter(sel.id);
    setMs((d) => { d.posted[sel.id] = { subtotal: calc.subtotal, tax: calc.taxAmount, total: calc.total, status: 'sent' }; d.selectedId = next; });
    setDisputeOpen(false); setReason(''); setSearch('');
    toast(t.sendToast);
  };
  const doResolve = () => {
    if (!sel) return;
    const ref = sel.invoiceNo;
    store.update((d) => {
      const x = d.invoices.find((i) => i.id === sel.id);
      if (!x) return;
      x.stage = 'review'; x.reviewedBy = currentUser;
      if (ref) for (const a of d.alerts) if (a.type === 'invoice_mismatch' && !a.dismissed && a.en.includes(ref)) a.dismissed = true;
    });
    store.logAudit({ action: t.auditResolved, entity: entityOf(sel), oldValue: 'disputed', newValue: 'review', moduleId: MODULE_ID });
    setMs((d) => { delete d.posted[sel.id]; d.selectedId = sel.id; });
    if (filter === 'disputed') setFilter('all');
    toast(t.resolveToast);
  };

  /* ── summary ── */
  const inScopeAll = st.invoices.filter((i) => store.inScope(i.loc)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const approvedList = inScopeAll.filter((i) => i.stage === 'approved' || i.stage === 'paid');
  const approvedValue = approvedList.reduce((a, i) => a + amountUsd(i, fx), 0);
  const vatPosted = approvedList.reduce((a, i) => a + (ms.posted[i.id]?.tax ?? 0), 0);
  const tiles: StatTile[] = [
    { label: t.tPending, val: String(nPending), fg: P.text, bg: P.thead, border: P.border },
    { label: t.tApproved, val: String(approvedList.length), fg: '#48603A', bg: '#EAF0E4', border: '#B9CDB9' },
    { label: t.tSent, val: String(inScopeAll.filter((i) => i.stage === 'disputed').length), fg: '#8A6D1F', bg: P.amberBg, border: P.amberBorder },
    { label: t.tApprovedValue, val: money(approvedValue), fg: P.text, bg: P.surface, border: P.border },
    { label: t.tVatCollected, val: money(vatPosted), fg: P.text, bg: P.surface, border: P.border },
  ];
  const chipOf = (stg: InvoiceStage) => stg === 'approved' || stg === 'paid' ? { chip: stg === 'paid' ? t.stageNames.paid : t.tApproved, chipBg: '#E0E8DA', chipFg: '#48603A' }
    : stg === 'disputed' ? { chip: t.tSent, chipBg: P.amberBg, chipFg: '#8A6D1F' }
    : stg === 'received' ? { chip: t.stageNames.received, chipBg: P.chip, chipFg: P.text3 }
    : { chip: t.tPending, chipBg: P.chip, chipFg: P.text3 };
  const summaryRows: SummaryRow[] = inScopeAll.map((i) => {
    const c = chipOf(i.stage), po = ms.posted[i.id], usd = amountUsd(i, fx);
    const decided = i.stage === 'approved' || i.stage === 'paid' || i.stage === 'disputed';
    return { id: i.id, time: shortDate(i.date, isAr), supplier: supLabel(i.supplierId), inv: i.invoiceNo || t.noNumber,
      subtotal: decided ? money(po ? po.subtotal : usd) : '—', tax: decided ? money(po ? po.tax : 0) : '—', total: decided ? money(po ? po.total : usd) : '—', ...c, inQueue: QUEUE_STAGES.includes(i.stage) };
  });

  const tabs = Object.assign([
    { value: 'review', label: t.tabReview, badge: queue.length },
    { value: 'summary', label: t.tabSummary },
  ], { active: tab, onChange: (v: string) => setMs((d) => { d.tab = v as 'review' | 'summary'; }) });

  const fchip = (k: QFilter, label: string, n: number) => (
    <button key={k} onClick={() => setFilter(k)} style={{ height: 24, padding: '0 9px', borderRadius: 999, border: `1px solid ${filter === k ? P.ink : P.borderInput}`, background: filter === k ? P.ink : P.white, color: filter === k ? P.onInk : P.text3, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{label} · {n}</button>
  );

  return (
    <Page>
      {embedded
        ? <div style={{ flex: 'none', padding: '12px 22px 0', background: P.surface, borderBottom: `1px solid ${P.border}` }}><Tabs tabs={tabs} active={tabs.active ?? ''} onChange={tabs.onChange ?? (() => {})} /></div>
        : <PageHeader title={t.title} screenId={SCREEN_ID} right={<LocationSelector />} tabs={tabs} />}

      {tab === 'review' && (
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ width: 280, flex: 'none', borderInlineEnd: `1px solid ${P.border}`, background: P.thead, overflow: 'auto', padding: 14 }}>
            <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>{t.queueTitle} ({pending.length})</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {fchip('all', t.fAll, queue.length)}{fchip('pending', t.fPending, nPending)}{fchip('disputed', t.fDisputed, nDisputed)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.map((q) => {
                const on = sel?.id === q.id;
                const info = scanInfo(q);
                const src = info.scanned ? { label: t.scanned, bg: '#DCE4EC', fg: '#37536B' } : { label: t.manual, bg: '#F5E3B3', fg: '#8A6D1F' };
                const dl = deliveryOf(q, st);
                const issue = !!(info.issue || q.matchIssues?.length);
                return (
                  <button key={q.id} onClick={() => pick(q)} style={{ textAlign: 'start', border: `1px solid ${on ? P.text2 : P.border}`, background: on ? P.card : P.surface, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', color: P.text }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>{supLabel(q.supplierId)}</div>
                      {issue && <span style={{ width: 8, height: 8, borderRadius: '50%', background: q.stage === 'disputed' ? P.redStrong : P.amberDot, flex: 'none' }} />}
                    </div>
                    <div style={{ fontSize: 11.5, color: P.text3, marginTop: 3 }} dir="ltr">{q.invoiceNo || t.noNumber} · {dl ? timeHM(dl.ts) : shortDate(q.date, isAr)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: P.chip, color: P.text3 }} dir="ltr">{q.poId ?? t.noPo}</span>
                      <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: src.bg, color: src.fg }}>{src.label}</span>
                      {q.stage === 'disputed' && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: '#F0CFC9', color: '#96382E', fontWeight: 600 }}>{t.stageNames.disputed}</span>}
                    </div>
                  </button>
                );
              })}
              {pending.length === 0 && <div style={{ padding: '22px 12px', textAlign: 'center', color: P.text4, fontSize: 13, border: `1px dashed ${P.borderInput}`, borderRadius: 12 }}>{t.queueEmpty}</div>}
            </div>
          </div>

          {sel && w && calc ? (
            <ReviewPane key={sel.id}
              inv={sel} w={w} calc={calc} dlv={deliveryOf(sel, st)} po={poOf(sel, st)} info={scanInfo(sel)} printed={printedLines(sel, st)} fx={fx}
              search={search} onSearch={setSearch} results={results} dragging={dragging} setDragging={setDragging}
              cloud={cloud} scanUrl={sel.scanUrl} uploading={uploading} onUploadFile={doUploadScan} onRemoveScan={doRemoveScan}
              onField={(f, v) => updateWork((wk) => { wk[f] = v; })}
              onLine={(i, f, v) => updateWork((wk) => { if (wk.lines[i]) wk.lines[i][f] = v; })}
              onRemove={(i) => updateWork((wk) => { wk.lines.splice(i, 1); })}
              onAdd={(it) => { updateWork((wk) => { wk.lines.push({ itemId: it.id, unit: it.purch, ordered: null, received: null, deliveryPrice: null, qty: '0', price: (it.cost * (it.purchFactor ?? 1)).toFixed(2), auto: false }); }); setSearch(''); }}
              onAttach={() => { updateWork((wk) => { wk.uploaded = `Invoice_${wk.inv || sel.id + '_manual'}.jpg`; }); setDragging(false); }}
              onRemoveUpload={() => { updateWork((wk) => { wk.uploaded = null; }); setDragging(false); }}
              onRead={() => { const lines = ocrLines(sel, st); updateWork((wk) => { wk.lines = lines; }); }}
              onApprove={doApprove} onSendBack={() => { setReason(''); setDisputeOpen(true); }} onResolve={doResolve}
              goSupplier={() => go('master-data', { params: { tab: 'suppliers', id: sel.supplierId } })}
              goDelivery={() => { if (sel.deliveryId) go('receiving', { params: { id: sel.deliveryId } }); }}
              goPo={() => { if (sel.poId) go('purchasing', { params: { id: sel.poId } }); }}
            />
          ) : queue.length === 0 ? (
            /* prototype: allClear = !sel on the unfiltered inbox — only when nothing at all awaits review */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#E0E8DA', border: '1px solid #B9CDB9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#48603A" strokeWidth="2.2"><path d="M4 12.5l5 5L20 6.5" /></svg></div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{t.allClearTitle}</div>
              <div style={{ fontSize: 15, color: P.text3, textAlign: 'center', maxWidth: 440, lineHeight: 1.5 }}>{t.allClearBody}</div>
            </div>
          ) : (
            /* the active filter chip has no rows but the inbox is not empty — neutral, not the green all-clear */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
              <div style={{ fontSize: 15, color: P.text4 }}>{t.queueEmpty}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'summary' && <SummaryView tiles={tiles} rows={summaryRows} highlight={highlight} onPick={(id) => { const inv = st.invoices.find((i) => i.id === id); if (inv) { setFilter('all'); pick(inv); } }} />}

      {disputeOpen && sel && (
        <div onClick={() => setDisputeOpen(false)} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,31,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} className="pop-up" style={{ width: 'min(480px,92%)', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{t.sbTitle}</div>
            <div style={{ fontSize: 12.5, color: P.text3, marginTop: 4 }} dir="ltr">{sel.id} · {supLabel(sel.supplierId)} · {sel.invoiceNo || t.noNumber}</div>
            <div style={{ fontSize: 13.5, color: P.text2, marginTop: 8, lineHeight: 1.55 }}>{t.sbBody}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
              <input value={reason} autoFocus onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doSendBack(); }} placeholder={t.sbPh} style={{ height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontFamily: 'inherit', color: P.text, outline: 'none' }} />
            </div>
            {calc && calc.checks.length > 0 && (
              <div style={{ display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 10, background: P.amberBg, border: `1px solid ${P.amberBorder}`, marginTop: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none', marginTop: 5 }} />
                <span style={{ fontSize: 12.5, color: P.amberFg, lineHeight: 1.5 }}>{calc.checks.join(' · ')}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setDisputeOpen(false)} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${P.borderInput}`, background: 'transparent', color: P.text2, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cancel}</button>
              <button onClick={doSendBack} style={{ flex: 1.4, height: 44, borderRadius: 10, border: 'none', background: reason.trim() ? P.ink : P.text4, color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.sbCta}</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
