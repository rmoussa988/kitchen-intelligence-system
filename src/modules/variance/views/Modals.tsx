import type { CSSProperties } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { Modal, Notice, P } from '../../../ui';
import type { VarText } from '../text';
import type { VarCase } from '../data';

const LABEL: CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text2, marginTop: 16 };

/** Physical count sheet viewer. */
export function SheetModal({ open, onClose, c, t, source, meta, physicalQty }: { open: boolean; onClose: () => void; c: VarCase; t: VarText; source: string; meta: string; physicalQty: string }) {
  const { isAr } = useLang();
  if (!open) return null;
  return (
    <div onClick={onClose} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,31,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="pop-up" style={{ width: 'min(560px,92%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t.sheetTitle}</div>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: P.chip, color: P.text3, letterSpacing: '.4px' }} dir="ltr">{source}</span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: P.greenBg, color: P.greenFg, fontWeight: 700 }}>{t.submitted}</span>
          </div>
          <div style={{ fontSize: 12.5, color: P.text3, marginTop: 6 }}>{meta}</div>
        </div>
        <div style={{ overflow: 'auto', padding: '8px 0' }}>
          <div style={{ display: 'flex', gap: 12, padding: '8px 22px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>
            <span style={{ flex: 1 }}>{t.itemCol}</span><span style={{ width: 110, textAlign: 'end' }}>{t.countedCol}</span>
          </div>
          {c.sheet.lines.map((ln, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 22px', borderTop: `1px solid ${P.borderRow}`, background: ln.focus ? P.redBg : 'transparent' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: ln.focus ? 700 : 500 }}>{isAr ? ln.ar : ln.en}</div>
                {ln.focus && <div style={{ fontSize: 11, fontWeight: 700, color: P.redFg, marginTop: 2 }}>{t.underInvestigation}</div>}
              </div>
              <span style={{ width: 110, textAlign: 'end', fontSize: 14, fontWeight: 700 }} dir="ltr">{ln.focus ? physicalQty : ln.qty}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, background: P.thead, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ height: 42, padding: '0 22px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.close}</button>
        </div>
      </div>
    </div>
  );
}

export type Reason = 'wrong' | 'waste';

/** Count correction (authorized by the signed-in manager). */
export function CorrectModal({ open, onClose, onSave, t, physCount, physNum, unit, val, setVal, reason, setReason, note, setNote, wasteInfo, user }: {
  open: boolean; onClose: () => void; onSave: () => void; t: VarText; physCount: string; physNum: string; unit: string;
  val: string; setVal: (v: string) => void; reason: Reason | null; setReason: (r: Reason) => void; note: string; setNote: (v: string) => void;
  wasteInfo: string; user: { ini: string; name: string; role: string };
}) {
  const parsed = parseFloat(val);
  const ready = !!val.trim() && Number.isFinite(parsed) && parsed >= 0 && !!reason;
  return (
    <Modal open={open} onClose={onClose} width={480} title={t.correctTitle} sub={t.correctBody}
      footer={<>
        <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${P.borderInput}`, background: 'transparent', color: P.text2, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cancel}</button>
        <button onClick={onSave} style={{ flex: 1.4, height: 44, borderRadius: 10, border: 'none', background: ready ? P.ink : '#9AA192', color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: ready ? 'pointer' : 'not-allowed' }}>{t.correctCta}</button>
      </>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 10, background: P.hover, border: `1px solid ${P.border}` }}>
        <span style={{ fontSize: 12, color: P.text3 }}>{t.staffCounted}</span>
        <span style={{ fontSize: 14, fontWeight: 700 }} dir="ltr">{physCount}</span>
      </div>
      <div style={LABEL}>{t.correctField}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={physNum} dir="ltr" autoFocus
          style={{ flex: 1, height: 46, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 20, fontWeight: 700, fontFamily: 'inherit', color: P.text, outline: 'none' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: P.text3 }} dir="ltr">{unit}</span>
      </div>
      <div style={LABEL}>{t.reasonLabel}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {(['wrong', 'waste'] as Reason[]).map((k) => {
          const on = reason === k;
          return (
            <button key={k} onClick={() => setReason(k)} style={{ textAlign: 'start', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 10, border: `1px solid ${on ? P.amberFg : P.borderInput}`, background: on ? P.amberBg : P.white, color: on ? '#5A4712' : P.text2, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', lineHeight: 1.4 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${on ? P.amberFg : P.borderInput}`, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? P.amberFg : 'transparent' }} /></span>
              <span>{k === 'wrong' ? t.reasonWrong : t.reasonWaste}</span>
            </button>
          );
        })}
      </div>
      {reason === 'waste' && (
        <div style={{ display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 10, background: '#EAF0E4', border: '1px solid #C3D3B4', marginTop: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5C8A3C', flex: 'none', marginTop: 5 }} />
          <span style={{ fontSize: 12.5, color: '#3E5A2C', lineHeight: 1.5 }}>{wasteInfo}</span>
        </div>
      )}
      <div style={LABEL}>{t.correctNoteLabel} <span style={{ fontWeight: 500, textTransform: 'none', color: P.text4, letterSpacing: 0 }}>{t.optional}</span></div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.correctNotePh}
        style={{ width: '100%', height: 64, marginTop: 8, padding: '10px 12px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 13, fontFamily: 'inherit', color: P.text, outline: 'none', resize: 'none', lineHeight: 1.5 }} />
      <div style={LABEL}>{t.correctByLabel}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, padding: '11px 14px', borderRadius: 10, border: `1px solid ${P.border}`, background: P.hover }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: P.ink, color: P.onInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flex: 'none' }}>{user.ini}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: P.text3, marginTop: 1 }}>{user.role} · {t.signedIn}</div>
        </div>
        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: P.greenBg, color: P.greenFg, fontWeight: 700 }}>{t.authorized}</span>
      </div>
      <Notice tone="amber" style={{ marginTop: 14 }}>{t.correctWarn}</Notice>
    </Modal>
  );
}
