import React from 'react';
import { P } from '../../../ui';

/** Fixed overlay + paper card — exact geometry of the prototype's modals (460px, radius 18, padding 24). */
export function Dialog({ width = 460, onClose, children }: { width?: number; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,31,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="pop-up" style={{ width: `min(${width}px,92%)`, maxHeight: '92vh', overflow: 'auto', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 18, padding: 24, color: P.text }}>
        {children}
      </div>
    </div>
  );
}

/** Amber note with a dot (prototype's form warning). */
export function AmberNote({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 10, background: P.amberBg, border: `1px solid ${P.amberBorder}`, ...style }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none', marginTop: 5 }} />
      <span style={{ fontSize: 12.5, color: P.amberFg, lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

/** Cancel + CTA row (flex 1 / 1.4, 44px). */
export function DialogBtns({ cancel, onCancel, cta, onGo, goBg, style }: { cancel: string; onCancel: () => void; cta: string; onGo: () => void; goBg?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 18, ...style }}>
      <button onClick={onCancel} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${P.borderInput}`, background: 'transparent', color: P.text2, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{cancel}</button>
      <button onClick={onGo} style={{ flex: 1.4, height: 44, borderRadius: 10, border: 'none', background: goBg ?? P.ink, color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{cta}</button>
    </div>
  );
}

/** Prototype's 44px form input. */
export function FormInput({ value, onChange, placeholder, style, ltr, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties; ltr?: boolean; autoFocus?: boolean }) {
  return (
    <input value={value} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={ltr ? 'ltr' : undefined}
      style={{ height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 14, fontFamily: 'inherit', color: P.text, outline: 'none', ...style }} />
  );
}
