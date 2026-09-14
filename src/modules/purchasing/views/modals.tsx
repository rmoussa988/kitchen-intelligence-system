import React, { useEffect, useState } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore, type LocId, type Scope, type Supplier } from '../../../store';
import { LocationSelector, P, money, shortDate } from '../../../ui';
import { TEXT, UOMS } from '../text';
import { lastPriceFor, supName, supplierCat } from '../../receiving/data';

type CSS = React.CSSProperties;
const overlay: CSS = { position: 'fixed', inset: 0, background: 'rgba(31,36,31,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
const head: CSS = { padding: '18px 22px', borderBottom: `1px solid ${P.border}`, background: P.thead, fontSize: 17, fontWeight: 700 };
const foot: CSS = { padding: '14px 22px', borderTop: `1px solid ${P.border}`, background: P.thead, display: 'flex', gap: 10, alignItems: 'center' };
const label: CSS = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text3 };
const inputS: CSS = { width: '100%', height: 44, marginTop: 6, padding: '0 12px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 15, fontFamily: 'inherit', color: P.text, outline: 'none' };
const searchS: CSS = { width: '100%', height: 40, marginTop: 8, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 13.5, fontFamily: 'inherit', color: P.text, outline: 'none' };
const cancelBtn: CSS = { height: 44, padding: '0 20px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' };
const primaryBtn = (on: boolean): CSS => ({ height: 44, padding: '0 24px', borderRadius: 10, border: 'none', background: on ? P.ink : '#9AA192', color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' });
const chip = (on: boolean, h = 40, r = 10): CSS => ({ height: h, padding: '0 16px', borderRadius: r, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' });

/* ───────────────────────── New order request ───────────────────────── */

export interface CreateInitial { supplierId: string | null; loc: LocId; draft: Record<string, number>; prices?: Record<string, number>; note: string; editId: string | null }
export interface DraftPayload { supplierId: string; loc: LocId; lines: { itemId: string; qty: number; unit: string; price: number }[]; note: string; editId: string | null }

export function CreateOrderModal({ initial, onClose, onSubmit, onCatalogAdd }: {
  initial: CreateInitial; onClose: () => void; onSubmit: (p: DraftPayload, status: 'sent' | 'draft') => void; onCatalogAdd: (supId: string, itemId: string) => void;
}) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const [supplierId, setSupplierId] = useState<string | null>(() => initial.supplierId);
  const [loc, setLoc] = useState<LocId>(() => initial.loc);
  const [draft, setDraft] = useState<Record<string, number>>(() => initial.draft);
  const [prices] = useState<Record<string, number>>(() => initial.prices ?? {});
  const [note, setNote] = useState(() => initial.note);
  const [supSearch, setSupSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  const st = store.state;
  const ALLSUP = st.suppliers.filter((s) => s.active);
  const dsup = supplierId ? ALLSUP.find((s) => s.id === supplierId) : undefined;
  const nm = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const createSuppliers = ALLSUP.filter((s) => supName(s, isAr).toLowerCase().includes(supSearch.trim().toLowerCase()) || s.name.toLowerCase().includes(supSearch.trim().toLowerCase()));
  const dprods = dsup ? dsup.products.map((id) => store.item(id)).filter((x): x is NonNullable<typeof x> => !!x) : [];
  const ciQ = itemSearch.trim();
  const createItems = dprods.filter((p) => !draft[p.id] && (nm(p).toLowerCase().includes(ciQ.toLowerCase()) || p.ar.includes(ciQ) || p.en.toLowerCase().includes(ciQ.toLowerCase())));
  const ciExact = dprods.some((p) => nm(p).toLowerCase() === ciQ.toLowerCase() || p.en.toLowerCase() === ciQ.toLowerCase());
  const showAdd = !!(dsup && ciQ && !ciExact);
  const addNewItem = () => {
    if (!dsup) return;
    const id = store.nextId('RM');
    const cat = supplierCat(st, dsup, false), catAr = supplierCat(st, dsup, true);
    const supId = dsup.id;
    store.update((d) => {
      d.items.push({ id, en: ciQ, ar: ciQ, type: 'raw', cat, catAr, base: 'KG', purch: 'KG', purchFactor: 1, cost: 0, supplier: supId, stocked: true, onHand: {} });
      const s = d.suppliers.find((x) => x.id === supId); if (s && !s.products.includes(id)) s.products.push(id);
    });
    onCatalogAdd(supId, id);
    setDraft((p) => ({ ...p, [id]: 1 })); setItemSearch('');
  };
  const entries = Object.keys(draft).map((id) => ({ id, qty: draft[id], p: store.item(id) })).filter((e): e is { id: string; qty: number; p: NonNullable<ReturnType<typeof store.item>> } => !!e.p);
  const priceOf = (id: string) => prices[id] ?? lastPriceFor(st, id);
  const totalN = entries.reduce((a, e) => a + e.qty * priceOf(e.id), 0);
  const ready = !!dsup && entries.length > 0;
  const orderMsg = t.orderRequestTo + (dsup ? supName(dsup, isAr) : '') + ' — ' + shortDate(store.now(), isAr) + '\n' + entries.map((e) => '• ' + nm(e.p) + ': ' + e.qty + ' ' + e.p.purch).join('\n') + (note.trim() ? '\n\n' + t.note + note.trim() : '');
  const payload = (): DraftPayload | null => (dsup && entries.length ? { supplierId: dsup.id, loc, lines: entries.map((e) => ({ itemId: e.id, qty: e.qty, unit: e.p.purch, price: priceOf(e.id) })), note: note.trim(), editId: initial.editId } : null);

  return (
    <div className="fade-in" style={overlay} onClick={onClose}>
      <div className="pop-up" onClick={(e) => e.stopPropagation()} style={{ width: 'min(680px,94%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={head}>{initial.editId ? <span>{t.editOrder} — <span dir="ltr">{initial.editId}</span></span> : t.newOrder}</div>
        <div style={{ padding: '18px 22px', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ ...label, flex: 1 }}>{t.supplier}</div>
            <span style={{ ...label, fontWeight: 600 }}>{t.location}</span>
            <LocationSelector allowAll={false} size="sm" value={loc} onChange={(s: Scope) => { if (s !== 'all') setLoc(s); }} />
          </div>
          <input value={supSearch} onChange={(e) => setSupSearch(e.target.value)} placeholder={t.searchSup} style={searchS} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {createSuppliers.map((s) => <button key={s.id} onClick={() => { setSupplierId(s.id); if (s.id !== supplierId) setDraft({}); }} style={chip(s.id === supplierId)}>{supName(s, isAr)}</button>)}
          </div>
          {dsup && (
            <div style={{ marginTop: 16 }}>
              <div style={label}>{t.addItems}</div>
              <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder={t.searchItems} style={searchS} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {createItems.map((p) => <button key={p.id} onClick={() => setDraft((d) => ({ ...d, [p.id]: 1 }))} style={{ height: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{nm(p)}</button>)}
              </div>
              {showAdd && <button onClick={addNewItem} style={{ width: '100%', marginTop: 8, height: 42, borderRadius: 10, border: '1.5px dashed #8FA88F', background: '#EFF3EA', color: P.ink, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.addItemPre}{ciQ}{t.addItemPost}</button>}
              <div style={{ marginTop: 14, border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 175px 100px 40px', gap: 10, padding: '9px 16px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
                  <div>{t.item}</div><div style={{ textAlign: 'end' }}>{t.qty}</div><div style={{ textAlign: 'end' }}>{t.estTotal}</div><div />
                </div>
                {entries.map((e) => {
                  const price = priceOf(e.id);
                  return (
                    <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr 175px 100px 40px', gap: 10, padding: '9px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
                      <div><div style={{ fontWeight: 600 }}>{nm(e.p)}</div><div style={{ fontSize: 11, color: P.text4 }} dir="ltr">{money(price)} / {e.p.purch}</div></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }} dir="ltr">
                        <button onClick={() => setDraft((d) => ({ ...d, [e.id]: Math.max(1, (d[e.id] || 1) - 1) }))} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>−</button>
                        <input value={e.qty} onChange={(ev) => { const v = Math.max(1, parseInt(ev.target.value) || 1); setDraft((d) => ({ ...d, [e.id]: v })); }} style={{ width: 52, height: 32, padding: '0 6px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: P.text, textAlign: 'center', outline: 'none' }} />
                        <button onClick={() => setDraft((d) => ({ ...d, [e.id]: (d[e.id] || 0) + 1 }))} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>＋</button>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: P.text3, minWidth: 40, textAlign: 'start' }}>{e.p.purch}</span>
                      </div>
                      <div style={{ textAlign: 'end', fontWeight: 700 }} dir="ltr">{money(e.qty * price)}</div>
                      <div style={{ textAlign: 'center' }}><button onClick={() => setDraft((d) => { const dd = { ...d }; delete dd[e.id]; return dd; })} style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #E2CBC6', background: '#FBEEEC', color: P.redFg, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>×</button></div>
                    </div>
                  );
                })}
                {entries.length === 0 && <div style={{ padding: 22, textAlign: 'center', color: P.text4, fontSize: 13 }}>{t.pickItems}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', background: P.hover }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{t.estTotal}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }} dir="ltr">{money(totalN)}</span>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={label}>{t.receiverNoteLabel}</div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.receiverNotePh} style={{ width: '100%', marginTop: 8, minHeight: 64, padding: '10px 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 13.5, fontFamily: 'inherit', color: P.text, outline: 'none', resize: 'none', lineHeight: 1.5 }} />
                <div style={{ fontSize: 11.5, color: P.text4, marginTop: 6 }}>{t.receiverNoteHint}</div>
              </div>
            </div>
          )}
        </div>
        <div style={foot}>
          {ready && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { const ph = dsup?.phone ? dsup.phone.replace(/[^0-9]/g, '') : ''; window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(orderMsg), '_blank'); }} style={{ height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid #B7CBA6', background: '#EAF3E2', color: '#2E5A1E', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#2E5A1E"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 10.4c-.25-.12-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42l-.48-.01c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" /></svg>{t.whatsapp}
              </button>
              <button onClick={() => { window.open('mailto:?subject=' + encodeURIComponent(t.orderRequest + (dsup ? ' — ' + supName(dsup, isAr) : '')) + '&body=' + encodeURIComponent(orderMsg), '_blank'); }} style={{ height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid #B9C7D2', background: '#EAF0F4', color: '#2A4A63', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2A4A63" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 6 8-6" /></svg>{t.email}
              </button>
            </div>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={cancelBtn}>{t.cancel}</button>
          <button onClick={() => { const p = payload(); if (p) onSubmit(p, 'draft'); }} style={{ ...cancelBtn, fontWeight: 600, opacity: ready ? 1 : .55 }}>{t.saveDraft}</button>
          <button onClick={() => { const p = payload(); if (p) onSubmit(p, 'sent'); }} style={primaryBtn(ready)}>{t.sendOrder}</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Add product (supplier catalog) ───────────────────────── */

export function AddProductModal({ open, supplier, onClose, onSave }: { open: boolean; supplier: Supplier | undefined; onClose: () => void; onSave: (name: string, unit: string, cost: number) => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('KG');
  const [cost, setCost] = useState('');
  useEffect(() => { if (open) { setName(''); setUnit('KG'); setCost(''); } }, [open]);
  if (!open) return null;
  const ok = name.trim().length > 0;
  return (
    <div className="fade-in" style={overlay} onClick={onClose}>
      <div className="pop-up" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px,94%)', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={head}>{t.addProduct} — {supName(supplier, isAr)}</div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><div style={label}>{t.product}</div><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.apNamePh} style={{ ...inputS, fontWeight: 600 }} /></div>
          <div>
            <div style={label}>{t.unit}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }} dir="ltr">
              {UOMS.map((u) => <button key={u} onClick={() => setUnit(u)} style={{ ...chip(unit === u, 38, 9), padding: '0 14px', fontSize: 13, fontWeight: 700 }}>{u}</button>)}
            </div>
          </div>
          <div><div style={label}>{t.lastPrice}</div><input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" dir="ltr" style={{ ...inputS, width: 140, fontWeight: 600, textAlign: 'end' }} /></div>
        </div>
        <div style={{ ...foot, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtn}>{t.cancel}</button>
          <button onClick={() => { if (ok) onSave(name.trim(), unit, parseFloat(cost) || 0); }} style={primaryBtn(ok)}>{t.saveProduct}</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── New supplier ───────────────────────── */

export interface NewSupplierInput { name: string; cat: string; contact: string; phone: string; terms: string }

export function NewSupplierModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (ns: NewSupplierInput) => void }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [ns, setNs] = useState<NewSupplierInput>({ name: '', cat: '', contact: '', phone: '', terms: '' });
  useEffect(() => { if (open) setNs({ name: '', cat: '', contact: '', phone: '', terms: '' }); }, [open]);
  if (!open) return null;
  const ok = ns.name.trim().length > 0;
  const f = (k: keyof NewSupplierInput) => (e: React.ChangeEvent<HTMLInputElement>) => setNs({ ...ns, [k]: e.target.value });
  return (
    <div className="fade-in" style={overlay} onClick={onClose}>
      <div className="pop-up" onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px,94%)', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={head}>{t.newSupplier}</div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><div style={label}>{t.nsName}</div><input value={ns.name} onChange={f('name')} placeholder={t.nsNamePh} style={{ ...inputS, fontWeight: 600 }} /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}><div style={label}>{t.nsCat}</div><input value={ns.cat} onChange={f('cat')} placeholder={t.nsCatPh} style={inputS} /></div>
            <div style={{ flex: 1 }}><div style={label}>{t.terms}</div><input value={ns.terms} onChange={f('terms')} placeholder={t.nsTermsPh} style={inputS} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}><div style={label}>{t.contact}</div><input value={ns.contact} onChange={f('contact')} placeholder={t.nsContactPh} style={inputS} /></div>
            <div style={{ flex: 1 }}><div style={label}>{t.nsPhone}</div><input value={ns.phone} onChange={f('phone')} placeholder="+961 …" dir="ltr" style={inputS} /></div>
          </div>
          <div style={{ fontSize: 12, color: P.text4, lineHeight: 1.5 }}>{t.nsHint}</div>
        </div>
        <div style={{ ...foot, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtn}>{t.cancel}</button>
          <button onClick={() => { if (ok) onSave({ ...ns, name: ns.name.trim() }); }} style={primaryBtn(ok)}>{t.saveSup}</button>
        </div>
      </div>
    </div>
  );
}
