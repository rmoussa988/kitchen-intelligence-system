import React from 'react';
import { P } from '../../../ui';

type CSS = React.CSSProperties;

/** Small action button — ink (primary) or outlined, as the prototype draws them inside rows/cards. */
export function SBtn({ ink, h = 30, px = 11, fs = 11.5, onClick, children, style, title, disabled }: {
  ink?: boolean; h?: number; px?: number; fs?: number; onClick?: () => void; children: React.ReactNode; style?: CSS; title?: string; disabled?: boolean;
}) {
  return (
    <button title={title} disabled={disabled} onClick={onClick} style={{ height: h, padding: `0 ${px}px`, borderRadius: 7, border: ink ? 'none' : `1px solid ${P.borderInput}`, background: ink ? P.ink : P.white, color: ink ? P.onInk : P.text2, fontSize: fs, fontWeight: ink ? 600 : 400, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', ...style }}>
      {children}
    </button>
  );
}

/** Round selectable chip (weeks, day presets, months, topics). */
export function ChipBtn({ on, onClick, children, h = 28, px = 12, fs = 11.5, ltr, offFg = P.text2 }: { on: boolean; onClick: () => void; children: React.ReactNode; h?: number; px?: number; fs?: number; ltr?: boolean; offFg?: string }) {
  return (
    <button onClick={onClick} dir={ltr ? 'ltr' : undefined} style={{ height: h, padding: `0 ${px}px`, borderRadius: 999, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : offFg, fontSize: fs, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

/** Button inside a bordered segmented group (white / ink). */
export function SegBtn({ on, onClick, children, h = 30, px = 12, fs = 12 }: { on: boolean; onClick: () => void; children: React.ReactNode; h?: number; px?: number; fs?: number }) {
  return (
    <button onClick={onClick} style={{ height: h, padding: `0 ${px}px`, border: 'none', fontSize: fs, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', background: on ? P.ink : P.white, color: on ? P.onInk : P.text3 }}>
      {children}
    </button>
  );
}

export const SEG_WRAP: CSS = { display: 'flex', border: `1px solid ${P.borderInput}`, borderRadius: 8, overflow: 'hidden', background: P.white };

export const CARD: CSS = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' };
export const CARD_PAD: CSS = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' };
export const UC_TITLE: CSS = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 };
export const UC_HEAD: CSS = { ...UC_TITLE, padding: '12px 18px', borderBottom: `1px solid ${P.border}`, background: P.thead };
export const TH_ROW: CSS = { fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}` };

export const SELECT: CSS = { height: 28, padding: '0 8px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' };
