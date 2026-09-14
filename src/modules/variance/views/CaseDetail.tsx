import type { CSSProperties } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { P } from '../../../ui';
import type { VarText } from '../text';
import { EVIDENCE_ICON, type VarCase } from '../data';

const HEAD: CSSProperties = { padding: '12px 18px', borderBottom: `1px solid ${P.border}`, background: P.thead, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 };
const LINK: CSSProperties = { fontSize: 11.5, color: P.blueFg };

export interface Note { text: string; who: string }

export function CaseDetail({ c, t, name, nameAlt, source, dQty, dCost, physicalQty, accepted, resolved, notes, noteVal, setNoteVal, onAddNote, onOpenSheet, onOpenAccept, onOpenCorrect, onRecount, onRef, refHasNav }: {
  c: VarCase; t: VarText; name: string; nameAlt: string; source: string; dQty: string; dCost: string; physicalQty: string; accepted: boolean; resolved: boolean;
  notes: Note[]; noteVal: string; setNoteVal: (v: string) => void; onAddNote: () => void;
  onOpenSheet: () => void; onOpenAccept: () => void; onOpenCorrect: () => void; onRecount: () => void;
  onRef: (ref: string) => void; refHasNav: (ref: string) => boolean;
}) {
  const { isAr } = useLang();
  const arrow = isAr ? '←' : '→';
  const bigNum = resolved ? P.text2 : P.redFg; // netted-to-zero variance is no longer "unfavorable" red
  const acceptOff = accepted || resolved;
  return (
    <>
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 21, fontWeight: 700 }}>{name}</div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 11px', borderRadius: 999, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8FA88F' }} />{t.locs[c.loc]}</span>
            <span style={{ fontSize: 12, color: P.text3 }} dir="ltr">{source}</span>
            <a href="#" onClick={(e) => { e.preventDefault(); onOpenSheet(); }} style={{ fontSize: 12, color: P.blueFg, fontWeight: 600 }}>{t.viewSheet} {arrow}</a>
          </div>
          <div style={{ fontSize: 13, color: P.text3, marginTop: 3 }}>{nameAlt}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.qtyVar}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: bigNum }} dir="ltr">{dQty}</div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.costImpact}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: bigNum }} dir="ltr">{dCost}</div>
          </div>
          {resolved
            ? <span style={{ fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 999, background: P.greenBg, color: P.greenFg }}>{t.resolvedBadge}</span>
            : <span style={{ fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 999, background: P.redPill, color: P.redFg }}>{t.unfavorable}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 16 }}>
        <div style={{ flex: 1.2, minWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* reconciliation */}
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={HEAD}>{t.reconciliation} — {t.confirmedData}</div>
            {c.recon.map((r, i) => {
              const last = i === c.recon.length - 1;
              const bold = r.op === '=' || last;
              const ref = r.ref || '';
              const nav = refHasNav(ref);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px', borderBottom: `1px solid ${P.borderRow}`, background: r.op === '=' ? P.hover : 'transparent' }}>
                  <span style={{ width: 22, textAlign: 'center', fontWeight: 700, color: P.text4, fontSize: 14 }}>{r.op}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: bold ? 700 : 500 }}>{isAr ? c.reconAr[i] : r.en}</span>
                  {nav
                    ? <a href="#" onClick={(e) => { e.preventDefault(); onRef(ref); }} style={LINK} dir="ltr">{ref}</a>
                    : <span style={LINK} dir="ltr">{ref}</span>}
                  <span style={{ width: 90, textAlign: 'end', fontSize: 13.5, fontWeight: 600 }} dir="ltr">{last ? physicalQty : r.qty}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: resolved ? P.hover : P.redBg }}>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{t.varLine}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: bigNum }} dir="ltr">{dQty} · {dCost}</span>
            </div>
          </div>
          {/* evidence checklist */}
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={HEAD}>{t.evidence} — {t.confirmedData}</div>
            {c.evidence.map((e, i) => {
              const im = EVIDENCE_ICON[e.status];
              const statusLabel = e.status === 'found' ? t.found : e.status === 'none' ? t.none : t.normal;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: `1px solid ${P.borderRow}` }}>
                  <span title={statusLabel} style={{ width: 22, height: 22, borderRadius: '50%', background: im[0], color: im[1], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{im[2]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{isAr ? e.qAr : e.q}</div>
                    <div style={{ fontSize: 12, color: P.text3, marginTop: 1 }}>{isAr ? e.aAr : e.a}</div>
                  </div>
                  {e.ref && (e.nav
                    ? <a href="#" onClick={(ev) => { ev.preventDefault(); onRef(e.ref ?? ''); }} style={{ fontSize: 12, color: P.blueFg, whiteSpace: 'nowrap' }}><span dir="ltr">{e.ref}</span> {arrow}</a>
                    : <span style={{ fontSize: 12, color: P.blueFg, whiteSpace: 'nowrap' }} dir="ltr">{e.ref}</span>)}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* possible causes — not confirmed */}
          <div style={{ background: P.card, border: '1.5px dashed #C6C0AB', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text3 }}>{t.possibleCauses}</span>
              <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: P.chip, color: P.text3 }}>{t.unconfirmed}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {c.causes.map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F3F1E8', fontSize: 13, color: P.text2, lineHeight: 1.5 }}>
                  <span style={{ color: P.text4, flex: 'none' }}>?</span><span>{isAr ? x.ar : x.en}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: P.text4, marginTop: 10 }}>{t.noAiNote}</div>
          </div>
          {/* notes & corrective actions */}
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.notes}</div>
            {notes.map((n, i) => (
              <div key={i} style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: P.hover, fontSize: 13, lineHeight: 1.5 }}>
                <div>{n.text}</div>
                <div style={{ fontSize: 11, color: P.text4, marginTop: 4 }}>{n.who}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input value={noteVal} onChange={(e) => setNoteVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onAddNote(); }} placeholder={t.notePh}
                style={{ flex: 1, height: 40, padding: '0 12px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 13, fontFamily: 'inherit', color: P.text, outline: 'none' }} />
              <button onClick={onAddNote} style={{ height: 40, padding: '0 14px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.add}</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onOpenAccept} disabled={acceptOff} title={resolved && !accepted ? t.resolvedBadge : undefined} style={{ height: 42, padding: '0 18px', borderRadius: 10, border: 'none', background: accepted ? P.greenBg : resolved ? P.chip : P.ink, color: accepted ? P.greenFg : resolved ? P.text3 : P.onInk, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: acceptOff ? 'default' : 'pointer' }}>{accepted ? t.acceptedBtn : t.accept}</button>
            <button onClick={onOpenCorrect} style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1px solid #B7924A', background: P.amberBg, color: P.amberFg, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.correct}</button>
            <button onClick={onRecount} style={{ height: 42, padding: '0 18px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.recount}</button>
          </div>
        </div>
      </div>
    </>
  );
}
