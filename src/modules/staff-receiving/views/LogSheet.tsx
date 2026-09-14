import React, { useRef, useState } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore, type LocId } from '../../../store';
import { Sheet, KeypadSheet, DPill, DCard, Input, Segmented, D, money, fmt, useToast } from '../../../ui';
import { TEXT } from '../text';
import { lastPriceFor, pvLabel, supName } from '../../receiving/data';
import { PO_NOTES_AR } from '../../purchasing/seed';
import { canUpload, uploadAttachment } from '../../../data/storage';

export interface FormLine {
  itemId: string; qty: string; price: string; expiry: string; batch: string; temp: string;
  quality: 'ok' | 'issue'; rejected: string; ordered?: number; open?: boolean;
}
export interface LogForm {
  poId: string | null; supplierId: string | null; name: string; inv: string;
  // `url` is set only in cloud mode (real upload); local mode keeps the simulated placeholder with just a name.
  scan: { name: string; url?: string } | null; note: string; time: string; ts: string; loc: LocId; lines: FormLine[];
}

interface Props { form: LogForm; setForm: (f: LogForm) => void; onCancel: () => void; onSubmit: (status: 'ok' | 'issue') => void }

type KeyField = 'qty' | 'price' | 'rejected';

/** STF-RCV-01 — "Log delivery" bottom sheet (prototype) + product lines with keypad qty/price and Rule-7 base display. */
export default function LogSheet({ form, setForm, onCancel, onSubmit }: Props) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const { ppvAmberPct: amber, ppvRedPct: red } = store.state.settings;
  const [kp, setKp] = useState<{ idx: number; field: KeyField; value: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const cloud = canUpload();
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  // Uploads are genuinely async; a ref lets us merge the returned URL onto the LATEST form, not a stale closure.
  const formRef = useRef(form);
  formRef.current = form;

  const f = form;
  const nameOk = f.name.trim().length > 0;
  const invOk = f.inv.trim().length > 0;
  const scanOk = !!f.scan;
  const hint = !nameOk ? t.needName : !invOk ? t.needInv : !scanOk ? t.needScan : '';
  const okBg = nameOk && invOk && scanOk ? D.cream : D.disabled;

  const po = f.poId ? store.state.purchaseOrders.find((p) => p.id === f.poId) : undefined;
  const poNote = po?.note ? (isAr && PO_NOTES_AR[po.id] ? PO_NOTES_AR[po.id] : po.note) : '';
  const supplier = f.supplierId ? store.state.suppliers.find((s) => s.id === f.supplierId) : undefined;
  const q = f.name.trim().toLowerCase();
  const suggestions = store.state.suppliers.filter((s) => s.active && (!q || s.name.toLowerCase().includes(q) || (s.nameAr ?? '').includes(f.name.trim()))).slice(0, 8);
  const products = supplier ? supplier.products.map((id) => store.item(id)).filter((x): x is NonNullable<typeof x> => !!x && !f.lines.some((l) => l.itemId === x.id)) : [];

  const patch = (p: Partial<LogForm>) => setForm({ ...f, ...p });
  const patchLine = (idx: number, p: Partial<FormLine>) => patch({ lines: f.lines.map((l, i) => (i === idx ? { ...l, ...p } : l)) });
  const removeLine = (idx: number) => patch({ lines: f.lines.filter((_, i) => i !== idx) });
  const addLine = (itemId: string) => {
    const price = lastPriceFor(store.state, itemId);
    patch({ lines: [...f.lines, { itemId, qty: '', price: String(price), expiry: '', batch: '', temp: '', quality: 'ok', rejected: '' }] });
    setAddOpen(false);
    setKp({ idx: f.lines.length, field: 'qty', value: '' });
  };

  // Cloud mode only: upload the picked file to Supabase and hold its public URL on the form.
  const onScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file (rescan)
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const url = await uploadAttachment('invoice-scans', file);
      setForm({ ...formRef.current, scan: { name: file.name, url: url ?? undefined } });
    } catch {
      setUploadErr(t.uploadFailed);
      toast(t.uploadFailed, { dark: true });
    } finally {
      setUploading(false);
    }
  };

  const lineCalc = (l: FormLine) => {
    const it = store.item(l.itemId);
    const factor = it?.purchFactor ?? 1;
    const qty = parseFloat(l.qty) || 0, price = parseFloat(l.price) || 0, rejected = Math.min(qty, parseFloat(l.rejected) || 0);
    const last = lastPriceFor(store.state, l.itemId);
    const pv = last ? Math.round(((price - last) / last) * 1000) / 10 : 0;
    const tone: 'green' | 'amber' | 'red' = Math.abs(pv) >= red ? 'red' : Math.abs(pv) >= amber ? 'amber' : 'green';
    return { it, factor, qty, price, rejected, accepted: qty - rejected, last, pv, tone, unit: it?.purch ?? '', base: it?.base ?? '' };
  };
  const total = f.lines.reduce((a, l) => { const c = lineCalc(l); return a + c.accepted * c.price; }, 0);

  const kpLine = kp ? f.lines[kp.idx] : undefined;
  const kpCalc = kpLine ? lineCalc(kpLine) : undefined;
  const kpDone = () => {
    if (!kp) return;
    patchLine(kp.idx, { [kp.field]: kp.value } as Partial<FormLine>);
    setKp(null);
  };

  const label: React.CSSProperties = { fontSize: 14, color: D.muted };
  const box: React.CSSProperties = { marginTop: 8, height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderRadius: 12, border: `1px solid ${D.border3}`, background: D.card2 };
  const input: React.CSSProperties = { width: '100%', marginTop: 8, height: 56, padding: '0 16px', borderRadius: 12, border: `1px solid ${D.border3}`, background: D.card2, fontSize: 19, fontWeight: 600, fontFamily: 'inherit', color: D.text, outline: 'none' };
  const tile: React.CSSProperties = { flex: 1, minHeight: 68, textAlign: 'start', padding: '10px 14px', borderRadius: 12, border: `1px solid ${D.border2}`, background: D.page, color: D.text, fontFamily: 'inherit', cursor: 'pointer' };
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: D.muted, marginBottom: 4 };

  return (
    <>
      {/* No onClose on the outer sheet: a stray backdrop tap must not discard the whole form — only Cancel dismisses it. */}
      <Sheet open width={600}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{t.logTitle}</div>
            <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{f.poId ? t.fromRequest : t.walkIn}</div>
          </div>
          <button onClick={onCancel} style={{ height: 48, padding: '0 18px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cancel}</button>
        </div>

        {poNote && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: '#26211A', border: `1px solid ${D.amberBorder}`, lineHeight: 1.5 }}>
            <div style={{ fontSize: 12.5, color: D.muted, textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 3 }}>{t.noteFromPurchasing}</div>
            <div style={{ fontSize: 15, color: D.gold }}>{poNote}</div>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <div style={label}>{t.supName}</div>
          {f.poId ? (
            <div style={box}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: D.greenDot, flex: 'none' }} />
              <span style={{ fontSize: 19, fontWeight: 600, flex: 1 }}>{f.name}</span>
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: D.greenBg, color: D.greenFg }}>{t.fromPO}</span>
              {f.poId && <span dir="ltr" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: D.chip, color: D.muted }}>{f.poId}</span>}
            </div>
          ) : (
            <>
              <input value={f.name} placeholder={t.supNamePh} style={input}
                onChange={(e) => { const v = e.target.value; const m = store.state.suppliers.find((s) => s.name.toLowerCase() === v.trim().toLowerCase() || s.nameAr === v.trim()); patch({ name: v, supplierId: m ? m.id : null, lines: m && m.id === f.supplierId ? f.lines : [] }); }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: D.dim }}>{t.knownSuppliers}:</span>
                {suggestions.map((s) => {
                  const on = s.id === f.supplierId;
                  return <button key={s.id} onClick={() => patch({ supplierId: s.id, name: supName(s, isAr), lines: on ? f.lines : [] })} style={{ height: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${on ? D.cream : D.border3}`, background: on ? D.cream : D.card, color: on ? D.onCream : D.text2, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{supName(s, isAr)}</button>;
                })}
                {nameOk && !f.supplierId && <span style={{ fontSize: 12.5, color: D.gold }}>{t.newSupplierNote}</span>}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>{t.invoiceNo}</div>
            <input value={f.inv} onChange={(e) => patch({ inv: e.target.value })} placeholder="INV-0000" style={input} dir="ltr" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>{t.dateTime}</div>
            <div style={{ ...box, border: `1px solid ${D.border}`, background: D.page }}>
              <span style={{ fontSize: 17, fontWeight: 600, flex: 1 }} dir="ltr">{t.datePrefix}{f.time}</span>
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: D.headerBorder, color: D.muted }}>{t.auto}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={label}>{t.scanTitle}</div>
          {!cloud ? (
            /* LOCAL / demo mode — simulated scan affordance (unchanged). */
            !f.scan ? (
              <button onClick={() => patch({ scan: { name: 'Invoice_' + (f.inv.trim() || 'scan') + '.jpg' } })} style={{ width: '100%', marginTop: 8, height: 92, borderRadius: 14, border: `1.5px dashed ${D.border3}`, background: D.card2, color: D.text2, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={D.greenDot} strokeWidth="1.7"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /><rect x="7" y="9" width="10" height="6" rx="1" /></svg>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{t.scanCta}</span>
                <span style={{ fontSize: 13, color: D.muted }}>{t.scanHint}</span>
              </button>
            ) : (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: `1px solid ${D.greenBorder}`, background: '#161F19' }}>
                <div style={{ width: 42, height: 52, borderRadius: 8, background: D.greenBg, border: `1px solid ${D.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={D.greenFg} strokeWidth="1.7"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }} dir="ltr">{f.scan.name}</div>
                  <div style={{ fontSize: 13, color: D.greenFg, marginTop: 2 }}>{t.scanned}</div>
                </div>
                <button onClick={() => patch({ scan: { name: 'Invoice_' + (f.inv.trim() || 'scan') + '.jpg' } })} style={{ height: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.text2, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{t.rescan}</button>
                <button onClick={() => patch({ scan: null })} style={{ height: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{t.remove}</button>
              </div>
            )
          ) : uploading ? (
            /* CLOUD mode — upload in progress. */
            <div style={{ width: '100%', marginTop: 8, height: 92, borderRadius: 14, border: `1.5px dashed ${D.border3}`, background: D.card2, color: D.text2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: D.greenDot, display: 'inline-block', animation: 'pulse 1s ease-in-out infinite' }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>{t.uploading}</span>
            </div>
          ) : !f.scan ? (
            /* CLOUD mode — real file input (image or PDF). */
            <label style={{ width: '100%', marginTop: 8, height: 92, borderRadius: 14, border: `1.5px dashed ${D.border3}`, background: D.card2, color: D.text2, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={D.greenDot} strokeWidth="1.7"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /><rect x="7" y="9" width="10" height="6" rx="1" /></svg>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{t.scanCtaCloud}</span>
              <span style={{ fontSize: 13, color: D.muted }}>{t.scanHintCloud}</span>
              <input type="file" accept="image/*,application/pdf" onChange={onScanFile} style={{ display: 'none' }} />
            </label>
          ) : (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: `1px solid ${D.greenBorder}`, background: '#161F19' }}>
              {f.scan.url && !/\.pdf$/i.test(f.scan.name) ? (
                <a href={f.scan.url} target="_blank" rel="noopener noreferrer" style={{ flex: 'none' }}>
                  <img src={f.scan.url} alt={f.scan.name} style={{ width: 42, height: 52, objectFit: 'cover', borderRadius: 8, border: `1px solid ${D.greenBorder}`, display: 'block' }} />
                </a>
              ) : (
                <div style={{ width: 42, height: 52, borderRadius: 8, background: D.greenBg, border: `1px solid ${D.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={D.greenFg} strokeWidth="1.7"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">{f.scan.name}</div>
                {f.scan.url
                  ? <a href={f.scan.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: D.greenFg, marginTop: 2, display: 'inline-block', textDecoration: 'none' }}>{t.scanned} · {t.viewScan}</a>
                  : <div style={{ fontSize: 13, color: D.greenFg, marginTop: 2 }}>{t.scanned}</div>}
              </div>
              <label style={{ height: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.text2, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {t.rescan}
                <input type="file" accept="image/*,application/pdf" onChange={onScanFile} style={{ display: 'none' }} />
              </label>
              <button onClick={() => { setUploadErr(null); patch({ scan: null }); }} style={{ height: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{t.remove}</button>
            </div>
          )}
          {uploadErr && <div style={{ marginTop: 8, fontSize: 13.5, color: D.redFg }}>{uploadErr}</div>}
        </div>

        {/* Product lines — Rule-7 entered unit + base, keypad qty/price, live PPV chips */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ ...label, flex: 1 }}>{t.linesTitle} ({f.lines.length})</div>
            {supplier && <button onClick={() => setAddOpen(true)} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: `1px solid ${D.border3}`, background: D.card, color: D.text, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.addProduct}</button>}
          </div>
          {f.lines.length === 0 && (
            <div style={{ marginTop: 8, padding: '16px 18px', borderRadius: 14, border: `1px dashed ${D.border3}`, color: D.muted, fontSize: 14, lineHeight: 1.5 }}>{supplier ? t.linesEmpty : t.linesNoSupplier}</div>
          )}
          {f.lines.map((l, idx) => {
            const c = lineCalc(l);
            const it = c.it;
            if (!it) return null;
            return (
              <div key={l.itemId} style={{ marginTop: 8, border: `1px solid ${l.quality === 'issue' ? D.amberBorder : D.border3}`, background: D.card2, borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 600 }}>{isAr ? it.ar : it.en}</div>
                    <div style={{ fontSize: 13, color: D.muted, marginTop: 2 }}>{isAr ? it.en : it.ar}{l.ordered != null && <span dir="ltr"> · {t.ordered} {fmt(l.ordered)} {c.unit}</span>}<span dir="ltr"> · {t.onHand} {fmt(it.onHand[f.loc] ?? 0)} {c.base}</span></div>
                  </div>
                  <button onClick={() => removeLine(idx)} style={{ height: 36, padding: '0 12px', borderRadius: 10, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>{t.remove}</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => setKp({ idx, field: 'qty', value: l.qty })} style={tile}>
                    <div style={fieldLabel}>{t.qty}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: l.qty ? D.text : D.dim }} dir="ltr">{l.qty || '0'} {c.unit}</div>
                    {c.factor !== 1 && <div style={{ fontSize: 12, color: D.muted, marginTop: 2 }} dir="ltr">= {fmt(c.qty * c.factor)} {c.base}</div>}
                  </button>
                  <button onClick={() => setKp({ idx, field: 'price', value: l.price })} style={{ ...tile, flex: 1.3 }}>
                    <div style={fieldLabel}>{t.price} / {c.unit}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }} dir="ltr">{money(c.price)}</div>
                      <DPill ltr tone={c.tone} style={{ fontSize: 12.5, padding: '4px 10px' }}>{pvLabel(c.pv)} {t.vsLast} {money(c.last)}</DPill>
                    </div>
                  </button>
                </div>
                <button onClick={() => patchLine(idx, { open: !l.open })} style={{ marginTop: 8, height: 36, padding: 0, border: 'none', background: 'transparent', color: D.muted, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>{l.open ? t.hideDetails : t.details} {l.open ? '▴' : '▾'}</button>
                {l.open && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <div><div style={fieldLabel}>{t.expiry}</div><Input dark ltr value={l.expiry} onChange={(v) => patchLine(idx, { expiry: v })} placeholder="YYYY-MM-DD" width="100%" style={{ height: 48, fontSize: 15 }} /></div>
                    <div><div style={fieldLabel}>{t.batch}</div><Input dark ltr value={l.batch} onChange={(v) => patchLine(idx, { batch: v })} placeholder="LOT-0000" width="100%" style={{ height: 48, fontSize: 15 }} /></div>
                    <div><div style={fieldLabel}>{t.temp}</div><Input dark ltr value={l.temp} onChange={(v) => patchLine(idx, { temp: v })} placeholder="°C" width="100%" style={{ height: 48, fontSize: 15 }} /></div>
                    <div><div style={fieldLabel}>{t.quality}</div><Segmented dark size="lg" options={[{ value: 'ok', label: t.qOk }, { value: 'issue', label: t.qIssue }]} value={l.quality} onChange={(v) => patchLine(idx, { quality: v })} /></div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={fieldLabel}>{t.rejected}</div>
                      <button onClick={() => setKp({ idx, field: 'rejected', value: l.rejected })} style={{ ...tile, width: '100%', minHeight: 52, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: c.rejected ? D.redFg : D.dim }} dir="ltr">{l.rejected || '0'} {c.unit}</span>
                        <span style={{ fontSize: 13, color: D.muted }} dir="ltr">· {fmt(c.accepted)} {c.unit} {t.accepted} = {fmt(c.accepted * c.factor)} {c.base}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {f.lines.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, padding: '10px 14px', background: D.card3, border: `1px solid ${D.border2}`, borderRadius: 12 }}>
              <span style={{ fontSize: 14, color: D.muted }}>{f.lines.length} {t.items}</span>
              <span style={{ fontSize: 17, fontWeight: 700 }}>{t.total} <span dir="ltr">{money(total)}</span></span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={label}>{t.noteOptional}</div>
          <textarea value={f.note} onChange={(e) => patch({ note: e.target.value })} placeholder={t.notePh}
            style={{ width: '100%', marginTop: 8, minHeight: 70, padding: '12px 16px', borderRadius: 12, border: `1px solid ${D.border3}`, background: D.card2, fontSize: 16, fontFamily: 'inherit', color: D.text, outline: 'none', resize: 'none', lineHeight: 1.5 }} />
        </div>

        {hint && <div style={{ marginTop: 10, fontSize: 13.5, color: D.muted }}>{hint}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={() => onSubmit('issue')} style={{ flex: 1, height: 62, borderRadius: 16, border: `1px solid ${D.amberBorder}`, background: '#26211A', color: D.gold, fontSize: 17, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.submitIssue}</button>
          <button onClick={() => onSubmit('ok')} style={{ flex: 1.3, height: 62, borderRadius: 16, border: 'none', background: okBg, color: D.onCream, fontSize: 18, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.submitOk}</button>
        </div>
      </Sheet>

      {/* Add product — supplier catalogue */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} width={600}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{t.addProduct}</div>
            <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{supName(supplier, isAr)}</div>
          </div>
          <button onClick={() => setAddOpen(false)} style={{ height: 48, padding: '0 18px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cancel}</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {products.length === 0 && <div style={{ padding: 26, textAlign: 'center', color: D.dim, fontSize: 15, border: `1px dashed ${D.border}`, borderRadius: 16 }}>{t.noProducts}</div>}
          {products.map((it) => (
            <DCard key={it.id} pad="14px 18px" onClick={() => addLine(it.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{isAr ? it.ar : it.en}</div>
                  <div style={{ fontSize: 13.5, color: D.muted, marginTop: 2 }} dir="ltr">{it.purch}{(it.purchFactor ?? 1) !== 1 ? ` = ${fmt(it.purchFactor ?? 1)} ${it.base}` : ''} · {t.lastPrice} {money(lastPriceFor(store.state, it.id))} · {t.onHand} {fmt(it.onHand[f.loc] ?? 0)} {it.base}</div>
                </div>
                <span style={{ fontSize: 22, color: D.greenDot }}>＋</span>
              </div>
            </DCard>
          ))}
        </div>
      </Sheet>

      <KeypadSheet open={!!kp} title={kpCalc?.it ? (isAr ? kpCalc.it.ar : kpCalc.it.en) : ''}
        sub={kp?.field === 'qty' ? t.enterQty : kp?.field === 'price' ? `${t.enterPrice} · ${t.lastPrice} ${money(kpCalc?.last ?? 0)}` : t.enterRejected}
        unit={kp?.field === 'price' ? `$ / ${kpCalc?.unit ?? ''}` : kpCalc?.unit}
        value={kp?.value ?? ''} onChange={(v) => kp && setKp({ ...kp, value: v })} onDone={kpDone} onCancel={() => setKp(null)}
        hint={kp && kpCalc && kp.field !== 'price' && kpCalc.factor !== 1 ? <span dir="ltr">{kp.value || '0'} {kpCalc.unit} = {fmt((parseFloat(kp.value) || 0) * kpCalc.factor)} {kpCalc.base}</span> : undefined} />
    </>
  );
}
