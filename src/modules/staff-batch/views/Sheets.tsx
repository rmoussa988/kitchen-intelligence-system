import { useState } from 'react';
import { D, Sheet } from '../../../ui';
import type { Text } from '../text';
import { KB_ROWS, TYPE_STYLE, fmtN, type Recipe } from '../data';
import type { PadField } from '../index';

/** Ad-hoc batch sheet: recipe search + pick, note for management with on-screen keyboard, start. */
export function AdhocSheet({ open, t, isAr, lang, recipes, onPlanCount, planQty, onCancel, onStart }: {
  open: boolean; t: Text; isAr: boolean; lang: 'en' | 'ar'; recipes: Recipe[]; onPlanCount: number; planQty: (r: Recipe) => number; onCancel: () => void; onStart: (r: Recipe, note: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const [shift, setShift] = useState(false);
  const nm = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const nmAlt = (o: { en: string; ar: string }) => (isAr ? o.en : o.ar);
  const q = search.trim().toLowerCase();
  const rows = recipes.map((tk, i) => ({ tk, i })).filter(({ tk }) => (nm(tk) + ' ' + nmAlt(tk)).toLowerCase().includes(q));
  const close = () => { setSearch(''); setNote(''); setSel(null); setShift(false); onCancel(); };
  const submit = () => { if (sel === null) return; const r = recipes[sel]; setSearch(''); setNote(''); setSel(null); onStart(r, note); };

  return (
    <Sheet open={open} onClose={close} width={600}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ fontSize: 19, fontWeight: 700 }}>{t.adhocTitle}</div><div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{t.adhocPick}</div></div>
        <button onClick={close} style={{ height: 48, padding: '0 18px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cancel}</button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.adhocSearchPh} style={{ width: '100%', marginTop: 16, height: 52, padding: '0 16px', borderRadius: 14, border: `1px solid ${D.border3}`, background: D.card2, fontSize: 17, fontFamily: 'inherit', color: D.text, outline: 'none' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {rows.map(({ tk, i }) => {
          const planned = i < onPlanCount;
          const on = sel === i;
          return (
            <button key={tk.prefix} onClick={() => setSel(i)} style={{ textAlign: 'start', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', border: `1px solid ${on ? '#4A5348' : D.border}`, background: on ? D.key : D.card, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${on ? D.cream : D.border3}`, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 11, height: 11, borderRadius: '50%', background: on ? D.cream : 'transparent' }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 17, fontWeight: 600 }}>{nm(tk)}</div><div style={{ fontSize: 13.5, color: D.muted, marginTop: 2 }}>{nmAlt(tk)} · <span dir="ltr">{fmtN(planQty(tk))} {isAr ? tk.unitAr : tk.unit}</span> · {tk.recipe.length} {t.ingredients}</div></div>
              <span style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 999, background: planned ? '#2A3A2C' : D.chip, color: planned ? '#8FC79A' : D.muted, fontWeight: 600, whiteSpace: 'nowrap', flex: 'none' }}>{planned ? t.assigned : t.savedTag}</span>
            </button>
          );
        })}
        {rows.length === 0 && <div style={{ padding: 22, textAlign: 'center', color: D.dim, fontSize: 15 }}>{t.adhocNone}</div>}
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 14, color: D.muted }}>{t.adhocNoteLabel}</div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.adhocNotePh} style={{ width: '100%', marginTop: 8, minHeight: 60, padding: '12px 16px', borderRadius: 14, border: `1px solid ${D.border3}`, background: D.card2, fontSize: 16, fontFamily: 'inherit', color: D.text, outline: 'none', resize: 'none', lineHeight: 1.5 }} />
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }} dir="ltr">
          {KB_ROWS[lang].map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {row.map((ch) => {
                const c = !isAr && shift ? ch.toUpperCase() : ch;
                return <button key={ch} onClick={() => { setNote((n) => n + c); setShift(false); }} style={{ minWidth: 32, flex: 1, maxWidth: 52, height: 46, borderRadius: 10, border: `1px solid ${D.border2}`, background: D.key, color: D.text, fontSize: 18, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{c}</button>;
              })}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            {!isAr && <button onClick={() => setShift((s) => !s)} style={{ minWidth: 56, height: 46, borderRadius: 10, border: `1px solid ${D.border2}`, background: shift ? D.cream : D.key, color: shift ? D.onCream : D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>⇧</button>}
            <button onClick={() => setNote((n) => n + ' ')} style={{ flex: 1, height: 46, borderRadius: 10, border: `1px solid ${D.border2}`, background: D.key, color: D.muted, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>{t.space}</button>
            <button onClick={() => setNote((n) => n.slice(0, -1))} style={{ minWidth: 64, height: 46, borderRadius: 10, border: `1px solid ${D.border2}`, background: D.key, color: D.text, fontSize: 20, fontFamily: 'inherit', cursor: 'pointer' }}>⌫</button>
          </div>
        </div>
      </div>
      <button onClick={submit} disabled={sel === null} style={{ width: '100%', marginTop: 16, height: 64, borderRadius: 16, border: 'none', background: sel !== null ? D.cream : D.disabled, color: D.onCream, fontSize: 19, fontWeight: 700, fontFamily: 'inherit', cursor: sel !== null ? 'pointer' : 'not-allowed' }}>{t.adhocStart}</button>
    </Sheet>
  );
}

/** Waste-by-item sheet: one amount per ingredient (→ Waste records on completion). */
export function WasteSheet({ open, t, isAr, task, waste, onClose, openPad }: {
  open: boolean; t: Text; isAr: boolean; task: Recipe; waste: Record<string, number>; onClose: () => void; openPad: (field: PadField, title: string, unit: string, initial: number | null) => void;
}) {
  const nm = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const typeLabel = { inventory: t.typeInventory, sub: t.typeSub, recipe: t.typeRecipe };
  return (
    <Sheet open={open} onClose={onClose} width={600}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ fontSize: 19, fontWeight: 700 }}>{t.wasteSection}</div><div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{t.wasteWhich}</div></div>
        <button onClick={onClose} style={{ height: 48, padding: '0 20px', borderRadius: 12, border: 'none', background: D.cream, color: D.onCream, fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.done}</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {task.recipe.map((ig, i) => {
          const ts = TYPE_STYLE[ig.type];
          const wv = waste[i];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${D.border}`, background: D.card, borderRadius: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16.5, fontWeight: 600 }}>{nm(ig)}</div>
                <span style={{ fontSize: 11.5, padding: '2px 9px', borderRadius: 999, background: ts.bg, color: ts.fg, fontWeight: 600 }}>{typeLabel[ig.type]}</span>
              </div>
              <button onClick={() => openPad(`waste:${i}`, `${nm(ig)} — ${t.wasteSection}`, ig.unit, wv ?? null)} style={{ minWidth: 120, height: 54, borderRadius: 14, border: `1px solid ${wv ? D.amberBorder : D.border3}`, background: D.card2, color: wv ? D.gold : D.dim, fontSize: 21, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }} dir="ltr">{wv != null ? `${fmtN(wv)} ${ig.unit}` : '—'}</button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
