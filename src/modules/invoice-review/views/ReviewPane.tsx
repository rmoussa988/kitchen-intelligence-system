import React from 'react';
import { money, P, shortDate, timeHM } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { Delivery, Item, PurchaseOrder, SupplierInvoice } from '../../../store';
import type { PrintedLine, ScanInfo } from '../data';
import type { Calc } from '../logic';
import { num } from '../logic';
import type { Work } from '../types';
import { TEXT } from '../text';

export interface ReviewPaneProps {
  inv: SupplierInvoice; w: Work; calc: Calc; dlv?: Delivery; po?: PurchaseOrder; info: ScanInfo; printed: PrintedLine[]; fx: number;
  search: string; onSearch: (v: string) => void; results: Item[];
  dragging: boolean; setDragging: (b: boolean) => void;
  cloud: boolean; scanUrl?: string; uploading: boolean; onUploadFile: (file: File) => void; onRemoveScan: () => void;
  onField: (f: 'inv' | 'date' | 'vat' | 'taxRate', v: string) => void;
  onLine: (i: number, f: 'qty' | 'price', v: string) => void;
  onRemove: (i: number) => void; onAdd: (it: Item) => void;
  onAttach: () => void; onRemoveUpload: () => void; onRead: () => void;
  onApprove: () => void; onSendBack: () => void; onResolve: () => void;
  goSupplier: () => void; goDelivery: () => void; goPo: () => void;
}

const inputBase: React.CSSProperties = { width: '100%', height: 44, marginTop: 6, padding: '0 12px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 15, fontFamily: 'inherit', color: P.text, outline: 'none' };
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text3 };
const attachBtn: React.CSSProperties = { flex: 1, height: 42, borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' };

export default function ReviewPane(p: ReviewPaneProps) {
  const { lang, isAr, fwdGlyph } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const { inv, w, calc, dlv, po, info, printed } = p;
  const nm = (id: string) => store.itemName(id, isAr);
  const sup = store.state.suppliers.find((s) => s.id === inv.supplierId);
  const supName = sup ? (isAr && sup.nameAr ? sup.nameAr : sup.name) : inv.supplierId;
  const src = info.scanned ? { label: t.scanned, bg: '#DCE4EC', fg: '#37536B' } : { label: t.manual, bg: '#F5E3B3', fg: '#8A6D1F' };
  const stagePill = inv.stage === 'disputed' ? { bg: '#F0CFC9', fg: '#96382E' } : inv.stage === 'review' ? { bg: '#DCE4EC', fg: '#37536B' } : { bg: P.chip, fg: P.text2 };
  const flag = info.issue ? (isAr ? info.issue.ar : info.issue.en) : (inv.matchIssues?.length ? inv.matchIssues.join(' · ') : '');
  const storedIssues = info.issue && inv.matchIssues?.length ? inv.matchIssues : [];
  const q = p.search.trim();
  const noLines = w.lines.length === 0;
  const scanFile = `Invoice_${w.inv || 'scan'}.jpg`;
  const grid = '1fr 84px 92px 104px 96px 40px';

  /* ── real upload plumbing (cloud mode) ── */
  const fileRef = React.useRef<HTMLInputElement>(null);
  const photoRef = React.useRef<HTMLInputElement>(null);
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) p.onUploadFile(f); e.currentTarget.value = ''; };
  const isPdf = (u: string) => /\.pdf(\?|#|$)/i.test(u);
  const hiddenInputs = (
    <>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onPick} disabled={p.uploading} style={{ display: 'none' }} />
      <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={onPick} disabled={p.uploading} style={{ display: 'none' }} />
    </>
  );
  const scanPreview = (url: string) => isPdf(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12, border: '1px solid #B9CDB9', background: '#EAF0E4', color: '#48603A', fontSize: 13.5, fontWeight: 600 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#48603A" strokeWidth="1.7"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
      <span style={{ flex: 1 }}>{t.viewScan} (PDF)</span>
      <span dir="ltr">{fwdGlyph}</span>
    </a>
  ) : (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }} title={t.viewScan}>
      <img src={url} alt={t.uploadedScan} style={{ width: '100%', display: 'block', borderRadius: 8, border: '1px solid #E2DDCB' }} />
    </a>
  );
  const uploadingBox = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px 18px', borderRadius: 12, border: `1.5px dashed ${P.borderInput}`, background: '#F0EAD9', color: P.text3, fontSize: 13.5, fontWeight: 600 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.text3} strokeWidth="2.4"><path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" /></path></svg>
      {t.uploading}
    </div>
  );

  return (
    <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '18px 22px' }} className="fade-in">
      <div style={{ maxWidth: 1220, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* header card */}
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={p.goSupplier} title="MGT-SUP-01" style={{ fontSize: 21, fontWeight: 700, border: 'none', background: 'transparent', padding: 0, color: P.text, fontFamily: 'inherit', cursor: 'pointer' }}>{supName}</button>
            <button onClick={po ? p.goPo : undefined} style={{ fontSize: 12, padding: '4px 11px', borderRadius: 999, background: P.chip, color: P.text2, border: 'none', fontFamily: 'inherit', cursor: po ? 'pointer' : 'default' }} dir="ltr">{inv.poId ?? t.noPo}</button>
            <span style={{ fontSize: 12, padding: '4px 11px', borderRadius: 999, background: src.bg, color: src.fg, fontWeight: 600 }}>{src.label}</span>
            <span style={{ fontSize: 12, padding: '4px 11px', borderRadius: 999, background: stagePill.bg, color: stagePill.fg, fontWeight: 600 }}>{t.stageNames[inv.stage]}</span>
            {dlv ? (
              <a href="#" onClick={(e) => { e.preventDefault(); p.goDelivery(); }} style={{ fontSize: 12.5, color: '#37536B', fontWeight: 600 }} dir="ltr">{dlv.id} {fwdGlyph}</a>
            ) : <span style={{ fontSize: 12.5, color: P.text4 }}>{t.noDelivery}</span>}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12.5, color: P.text3 }} dir="ltr">{t.receivedAt} {dlv ? `${shortDate(dlv.ts, isAr)} ${timeHM(dlv.ts)}` : shortDate(inv.date, isAr)} · {inv.id}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={labelStyle}>{t.invoiceNo}</div>
              <input value={w.inv} onChange={(e) => p.onField('inv', e.target.value)} placeholder="INV-0000" style={{ ...inputBase, fontWeight: 600 }} dir="ltr" />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={labelStyle}>{t.invoiceDate}</div>
              <input value={w.date} onChange={(e) => p.onField('date', e.target.value)} placeholder="2026-08-13" style={inputBase} dir="ltr" />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={labelStyle}>{t.supplierVat}</div>
              <input value={w.vat} onChange={(e) => p.onField('vat', e.target.value)} placeholder="VAT-000000" style={inputBase} dir="ltr" />
            </div>
          </div>
        </div>

        {flag && (
          <div style={{ display: 'flex', gap: 10, padding: '13px 16px', borderRadius: 12, background: P.amberBg, border: `1px solid ${P.amberBorder}` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none', marginTop: 5 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.amberFg }}>{t.receiverFlag}</div>
              <div style={{ fontSize: 13.5, color: P.amberFg, lineHeight: 1.5, marginTop: 2 }}>{flag}</div>
              {storedIssues.length > 0 && <div style={{ fontSize: 12, color: P.amberFg, lineHeight: 1.5, marginTop: 4 }}>{t.storedIssues}: {storedIssues.join(' · ')}</div>}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* scanned invoice / upload */}
          <div style={{ width: 380, flex: 'none', background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${P.border}`, background: P.thead, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, flex: 1 }}>{t.scannedInvoice}</span>
              {info.scanned && <span style={{ fontSize: 11, color: '#37536B', fontWeight: 600 }} dir="ltr">{scanFile}</span>}
            </div>
            {info.scanned ? (
              <div style={{ padding: 16 }}>
                {p.cloud && p.scanUrl && (
                  <div style={{ marginBottom: 14 }}>
                    {scanPreview(p.scanUrl)}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => !p.uploading && fileRef.current?.click()} disabled={p.uploading} style={{ ...attachBtn, opacity: p.uploading ? 0.6 : 1 }}>{t.replaceScan}</button>
                      <button onClick={p.onRemoveScan} disabled={p.uploading} style={{ ...attachBtn, color: P.text3 }}>{t.remove}</button>
                    </div>
                    {hiddenInputs}
                  </div>
                )}
                <div style={{ background: P.white, border: '1px solid #E2DDCB', borderRadius: 8, padding: 18, fontSize: 12.5, color: '#3A3A34' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{supName}</div>
                    <div style={{ textAlign: 'end', color: P.text3 }} dir="ltr">{w.inv}<br />{w.date}</div>
                  </div>
                  <div style={{ height: 1, background: '#EDE7D6', margin: '12px 0' }} />
                  {printed.map((pr, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0' }} dir="ltr">
                      <span style={{ flex: 1 }}>{nm(pr.itemId)}</span><span style={{ color: P.text3, whiteSpace: 'nowrap' }}>{pr.qty} {pr.unit}</span><span style={{ width: 64, textAlign: 'end' }}>{money(pr.price)}</span><span style={{ width: 70, textAlign: 'end', fontWeight: 600 }}>{money(pr.qty * pr.price)}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: '#EDE7D6', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }} dir="ltr"><span>{t.subtotal}</span><span>{money(calc.printedSub)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: P.text3 }} dir="ltr"><span>{t.vat} {calc.printedRate}%</span><span>{money(calc.printedTax)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, marginTop: 6 }} dir="ltr"><span>{t.total}</span><span>{money(calc.printedTotal)}</span></div>
                </div>
                <div style={{ fontSize: 11.5, color: P.text4, marginTop: 10, textAlign: 'center' }}>{t.scanFacsimile}</div>
                {p.cloud && !p.scanUrl && (
                  <>
                    {p.uploading ? <div style={{ marginTop: 12 }}>{uploadingBox}</div> : (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button onClick={() => fileRef.current?.click()} style={attachBtn}>{t.attachScan}</button>
                        <button onClick={() => photoRef.current?.click()} style={attachBtn}>{t.photo}</button>
                      </div>
                    )}
                    {hiddenInputs}
                  </>
                )}
                {inv.currency === 'LBP' && <div style={{ fontSize: 11.5, color: P.amberFg, marginTop: 6, textAlign: 'center' }}>{t.lbpNote} ({p.fx.toLocaleString('en-US')})</div>}
              </div>
            ) : (
              <div style={{ padding: 16 }}>
                {p.cloud ? (
                  p.scanUrl ? (
                    <>
                      {scanPreview(p.scanUrl)}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid #B9CDB9', background: '#EAF0E4' }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: '#48603A' }}>{t.uploadedScan}</div>
                        <button onClick={() => !p.uploading && fileRef.current?.click()} disabled={p.uploading} style={{ height: 38, padding: '0 12px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 12.5, fontFamily: 'inherit', cursor: p.uploading ? 'default' : 'pointer' }}>{t.replaceScan}</button>
                        <button onClick={p.onRemoveScan} disabled={p.uploading} style={{ height: 38, padding: '0 12px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text3, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer' }}>{t.remove}</button>
                      </div>
                      {noLines && <button onClick={p.onRead} style={{ width: '100%', marginTop: 10, height: 46, borderRadius: 11, border: 'none', background: P.ink, color: P.onInk, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.readItems}</button>}
                      <div style={{ fontSize: 11.5, color: P.text4, marginTop: 10, textAlign: 'center' }}>{t.manualReadHint}</div>
                      {hiddenInputs}
                    </>
                  ) : p.uploading ? (
                    <>{uploadingBox}{hiddenInputs}</>
                  ) : (
                    <>
                      <div onDrop={(e) => { e.preventDefault(); p.setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) p.onUploadFile(f); }} onDragOver={(e) => { e.preventDefault(); if (!p.dragging) p.setDragging(true); }} onDragLeave={(e) => { e.preventDefault(); p.setDragging(false); }} onClick={() => fileRef.current?.click()}
                        style={{ border: `1.5px dashed ${p.dragging ? '#8FA88F' : P.borderInput}`, background: p.dragging ? '#EAF0E4' : '#F0EAD9', borderRadius: 12, padding: '24px 18px', textAlign: 'center', cursor: 'pointer' }}>
                        <div style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 14, background: '#F0EAD9', border: '1px solid #E2DDCB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8A7A55" strokeWidth="1.6"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 12 }}>{t.noScanTitle}</div>
                        <div style={{ fontSize: 12.5, color: P.text3, marginTop: 4, lineHeight: 1.5 }}>{t.dropHint}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button onClick={() => fileRef.current?.click()} style={attachBtn}>{t.browse}</button>
                        <button onClick={() => photoRef.current?.click()} style={attachBtn}>{t.photo}</button>
                        <button onClick={() => fileRef.current?.click()} style={attachBtn}>{t.scanDoc}</button>
                      </div>
                      <div style={{ fontSize: 12, color: P.text4, marginTop: 12, lineHeight: 1.5 }}>{t.noScanBody}</div>
                      {hiddenInputs}
                    </>
                  )
                ) : !w.uploaded ? (
                  <>
                    <div onDrop={(e) => { e.preventDefault(); p.onAttach(); }} onDragOver={(e) => { e.preventDefault(); if (!p.dragging) p.setDragging(true); }} onDragLeave={(e) => { e.preventDefault(); p.setDragging(false); }} onClick={p.onAttach}
                      style={{ border: `1.5px dashed ${p.dragging ? '#8FA88F' : P.borderInput}`, background: p.dragging ? '#EAF0E4' : '#F0EAD9', borderRadius: 12, padding: '24px 18px', textAlign: 'center', cursor: 'pointer' }}>
                      <div style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 14, background: '#F0EAD9', border: '1px solid #E2DDCB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8A7A55" strokeWidth="1.6"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 12 }}>{t.noScanTitle}</div>
                      <div style={{ fontSize: 12.5, color: P.text3, marginTop: 4, lineHeight: 1.5 }}>{t.dropHint}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={p.onAttach} style={attachBtn}>{t.browse}</button>
                      <button onClick={p.onAttach} style={attachBtn}>{t.photo}</button>
                      <button onClick={p.onAttach} style={attachBtn}>{t.scanDoc}</button>
                    </div>
                    <div style={{ fontSize: 12, color: P.text4, marginTop: 12, lineHeight: 1.5 }}>{t.noScanBody}</div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: '1px solid #B9CDB9', background: '#EAF0E4' }}>
                      <div style={{ width: 42, height: 52, borderRadius: 8, background: '#DCE9D4', border: '1px solid #B9CDB9', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#48603A" strokeWidth="1.7"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }} dir="ltr">{w.uploaded}</div><div style={{ fontSize: 12, color: '#48603A', marginTop: 2 }}>{t.uploaded}</div></div>
                      <button onClick={p.onRemoveUpload} style={{ height: 40, padding: '0 12px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text3, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer' }}>{t.remove}</button>
                    </div>
                    {noLines && <button onClick={p.onRead} style={{ width: '100%', marginTop: 10, height: 46, borderRadius: 11, border: 'none', background: P.ink, color: P.onInk, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.readItems}</button>}
                    <div style={{ fontSize: 11.5, color: P.text4, marginTop: 10, textAlign: 'center' }}>{t.manualReadHint}</div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* entry */}
          <div style={{ flex: 1, minWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <input value={p.search} onChange={(e) => p.onSearch(e.target.value)} placeholder={t.searchPh} style={{ width: '100%', height: 46, padding: '0 16px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14.5, fontFamily: 'inherit', color: P.text, outline: 'none' }} />
              {q.length > 0 && (
                <div style={{ position: 'absolute', top: 52, left: 0, right: 0, background: P.white, border: `1px solid ${P.borderInput}`, borderRadius: 10, boxShadow: '0 12px 30px rgba(31,36,31,.14)', zIndex: 20, overflow: 'hidden' }}>
                  {p.results.map((it) => (
                    <button key={it.id} onClick={() => p.onAdd(it)} style={{ width: '100%', textAlign: 'start', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', borderBottom: '1px solid #EFEAD9', background: 'transparent', fontFamily: 'inherit', cursor: 'pointer', color: P.text }}>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{isAr ? it.ar : it.en}</span><span style={{ fontSize: 12.5, color: P.text3 }} dir="ltr">{it.purch} · {money(it.cost * (it.purchFactor ?? 1))}</span>
                    </button>
                  ))}
                  {p.results.length === 0 && <div style={{ padding: '12px 14px', fontSize: 13, color: P.text4 }}>{t.noItems}</div>}
                </div>
              )}
            </div>

            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '10px 16px', borderBottom: `1px solid ${P.border}`, background: P.thead, fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.3px' }}>
                <div>{t.colItem}</div><div style={{ textAlign: 'end' }}>{t.colOrdered}</div><div style={{ textAlign: 'end' }}>{t.colQty}</div><div style={{ textAlign: 'end' }}>{t.colPrice}</div><div style={{ textAlign: 'end' }}>{t.colTotal}</div><div />
              </div>
              {w.lines.map((ln, i) => {
                const qn = num(ln.qty), pn = num(ln.price);
                const qtyOff = (ln.ordered != null && qn !== ln.ordered) || (ln.received != null && qn !== ln.received);
                const priceOff = ln.deliveryPrice != null && Math.abs(pn - ln.deliveryPrice) >= 0.005;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, alignItems: 'center', padding: '9px 16px', borderBottom: `1px solid ${P.borderRow}` }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{nm(ln.itemId)}</span>
                        {ln.auto && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: '#DCE4EC', color: '#37536B', fontWeight: 700 }}>{t.autoBadge}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: P.text4, marginTop: 1 }} dir="ltr">{ln.unit}{ln.received != null ? ` · ${t.received} ${ln.received}` : ''}{ln.deliveryPrice != null ? ` @ ${money(ln.deliveryPrice)}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'end', fontSize: 13, color: P.text3 }} dir="ltr">{ln.ordered != null ? String(ln.ordered) : '—'}</div>
                    <div><input value={ln.qty} onChange={(e) => p.onLine(i, 'qty', e.target.value)} style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: `1px solid ${qtyOff ? P.amberBorder : P.borderInput}`, background: P.white, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: P.text, textAlign: 'end', outline: 'none' }} dir="ltr" /></div>
                    <div><input value={ln.price} onChange={(e) => p.onLine(i, 'price', e.target.value)} style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: `1px solid ${priceOff ? P.amberBorder : P.borderInput}`, background: P.white, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: P.text, textAlign: 'end', outline: 'none' }} dir="ltr" /></div>
                    <div style={{ textAlign: 'end', fontSize: 14, fontWeight: 700 }} dir="ltr">{money(qn * pn)}</div>
                    <div style={{ textAlign: 'center' }}><button onClick={() => p.onRemove(i)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E2CBC6', background: '#FBEEEC', color: P.redFg, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer', lineHeight: 1 }}>×</button></div>
                  </div>
                );
              })}
              {noLines && <div style={{ padding: 26, textAlign: 'center', color: P.text4, fontSize: 14 }}>{t.noLines}</div>}
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {calc.checks.length > 0 && (
                <div style={{ flex: 1, minWidth: 220, background: P.amberBg, border: `1px solid ${P.amberBorder}`, borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.amberFg }}>{t.varTitle}</div>
                  <div style={{ fontSize: 13, color: P.amberFg, lineHeight: 1.6, marginTop: 6 }}>{calc.checks.join(' · ')}</div>
                </div>
              )}
              {calc.checks.length === 0 && w.lines.length > 0 && (dlv || po) && (
                <div style={{ flex: 1, minWidth: 220, background: '#EAF0E4', border: '1px solid #B9CDB9', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.greenFg }}>{t.varTitle}</div>
                  <div style={{ fontSize: 13, color: P.greenFg, lineHeight: 1.6, marginTop: 6 }}>{t.allAgree}</div>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 280, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '14px 18px', marginInlineStart: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0' }} dir="ltr"><span style={{ color: P.text3 }}>{t.subtotal}</span><span style={{ fontWeight: 600 }}>{money(calc.subtotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '5px 0' }} dir="ltr">
                  <span style={{ color: P.text3 }}>{t.vatRate}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input value={w.taxRate} onChange={(e) => p.onField('taxRate', e.target.value)} style={{ width: 58, height: 34, padding: '0 8px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: P.text, textAlign: 'end', outline: 'none' }} dir="ltr" /><span style={{ color: P.text3 }}>%</span></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0' }} dir="ltr"><span style={{ color: P.text3 }}>{t.vatAmount}</span><span style={{ fontWeight: 600 }}>{money(calc.taxAmount)}</span></div>
                <div style={{ height: 1, background: P.borderRow, margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, padding: '3px 0' }} dir="ltr"><span>{t.grandTotal}</span><span>{money(calc.total)}</span></div>
                {info.scanned && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '9px 12px', borderRadius: 10, background: calc.matched ? '#E0E8DA' : P.amberBg }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: calc.matched ? '#48603A' : P.amberDot, flex: 'none' }} />
                    <span style={{ fontSize: 12.5, color: calc.matched ? '#48603A' : P.amberFg, fontWeight: 600 }}>{calc.matched ? t.matchExact : `${t.matchOffBy} ${money(Math.abs(calc.matchDiff))} ${t.vsInvoice}`}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 2 }}>
              {inv.stage === 'disputed' ? (
                <button onClick={p.onResolve} style={{ height: 48, padding: '0 20px', borderRadius: 11, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.resolve}</button>
              ) : (
                <button onClick={p.onSendBack} style={{ height: 48, padding: '0 20px', borderRadius: 11, border: `1px solid ${P.borderInput}`, background: P.white, color: P.redFg, fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.sendBack}</button>
              )}
              <button onClick={p.onApprove} style={{ height: 48, padding: '0 26px', borderRadius: 11, border: 'none', background: w.lines.length ? P.ink : '#9AA192', color: P.onInk, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.approve}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
