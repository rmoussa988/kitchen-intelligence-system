import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { P, D, S } from '../theme/tokens';
import { useLang, LOC_NAMES } from '../i18n/LangContext';
import { useStore } from '../store';
import type { Scope } from '../store';

export { P, D, S, TYPE_STYLE, FONT } from '../theme/tokens';
export * from './format';
export * from './keypad';

type CSS = React.CSSProperties;
const sx = (...parts: (CSS | undefined | false)[]): CSS => Object.assign({}, ...parts.filter(Boolean));

/* ────────────────────────────── Pills / badges ────────────────────────────── */

export type Tone = 'neutral' | 'amber' | 'red' | 'green' | 'purple' | 'blue' | 'teal' | 'brown' | 'grey' | 'rust' | 'ink';

export const TONE: Record<Tone, { bg: string; fg: string; border?: string }> = {
  neutral: { bg: P.chip, fg: P.text3 },
  amber: { bg: P.amberPill, fg: P.amberFg, border: P.amberBorder },
  red: { bg: P.redPill, fg: P.redFg, border: P.redBorder },
  green: { bg: P.greenBg, fg: P.greenFg },
  purple: { bg: P.purpleBg, fg: P.purpleFg },
  blue: { bg: P.blueBg, fg: P.blueFg },
  teal: { bg: P.tealBg, fg: P.tealFg },
  brown: { bg: P.brownBg, fg: P.brownFg },
  grey: { bg: P.greyBg, fg: P.greyFg },
  rust: { bg: P.rustBg, fg: P.rustFg },
  ink: { bg: P.ink, fg: P.onInk },
};

/** Status pill — colours mean status only. */
export function Pill({ tone = 'neutral', bg, fg, size = 'sm', style, children, ltr, title }: {
  tone?: Tone; bg?: string; fg?: string; size?: 'xs' | 'sm' | 'md'; style?: CSS; children: React.ReactNode; ltr?: boolean; title?: string;
}) {
  const t = TONE[tone];
  const fs = size === 'xs' ? 10.5 : size === 'md' ? 12.5 : 11;
  const pad = size === 'xs' ? '2px 7px' : size === 'md' ? '4px 12px' : '3px 9px';
  return (
    <span title={title} dir={ltr ? 'ltr' : undefined} style={sx({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, fontWeight: 600, padding: pad, borderRadius: 999, background: bg ?? t.bg, color: fg ?? t.fg, whiteSpace: 'nowrap', lineHeight: 1.3 }, style)}>
      {children}
    </span>
  );
}

/** Small square-ish tag (e.g. FIXED / DENSITY / R / POS). */
export function Tag({ tone = 'neutral', bg, fg, children, style }: { tone?: Tone; bg?: string; fg?: string; children: React.ReactNode; style?: CSS }) {
  const t = TONE[tone];
  return <span style={sx({ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: bg ?? t.bg, color: fg ?? t.fg, whiteSpace: 'nowrap' }, style)}>{children}</span>;
}

/** Screen-ID badge (e.g. MGT-ITM-03). */
export function ScreenId({ id }: { id: string }) {
  return <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: P.chip, color: P.text3, letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{id}</span>;
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block', flex: 'none' }} />;
}

/* ────────────────────────────── Cards ────────────────────────────── */

export function Card({ children, style, pad = 16, tone, onClick, className }: { children: React.ReactNode; style?: CSS; pad?: number | string; tone?: 'default' | 'amber' | 'red' | 'green' | 'ink' | 'surface'; onClick?: () => void; className?: string }) {
  const t = tone === 'amber' ? { background: P.amberBg, border: `1px solid ${P.amberBorder}` }
    : tone === 'red' ? { background: P.redBg, border: `1px solid ${P.redBorder}` }
    : tone === 'green' ? { background: P.greenBg, border: `1px solid #C9D6C0` }
    : tone === 'ink' ? { background: P.ink, border: 'none', color: P.page }
    : tone === 'surface' ? { background: P.surface, border: `1px solid ${P.border}` }
    : { background: P.card, border: `1px solid ${P.border}` };
  return <div className={className} onClick={onClick} style={sx({ borderRadius: 12, padding: pad, cursor: onClick ? 'pointer' : undefined }, t, style)}>{children}</div>;
}

/** KPI stat card: label (uppercase small) + big value + optional sub. */
export function KpiCard({ label, value, sub, tone = 'default', style, flex, ltr = true, onClick }: {
  label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: 'default' | 'amber' | 'red' | 'green' | 'ink'; style?: CSS; flex?: number; ltr?: boolean; onClick?: () => void;
}) {
  const fg = tone === 'amber' ? P.amberFg : tone === 'red' ? P.redFg : tone === 'green' ? P.greenFg : tone === 'ink' ? P.page : P.text;
  const lab = tone === 'amber' ? P.amberFg : tone === 'red' ? P.redFg : tone === 'green' ? P.greenFg : tone === 'ink' ? P.inkMuted : P.text3;
  const bg = tone === 'amber' ? P.amberBg : tone === 'red' ? P.redBg : tone === 'green' ? P.greenBg : tone === 'ink' ? P.ink : P.surface;
  const bd = tone === 'amber' ? P.amberBorder : tone === 'red' ? P.redBorder : tone === 'green' ? '#C9D6C0' : tone === 'ink' ? P.ink : P.border;
  return (
    <div onClick={onClick} style={sx({ flex: flex ?? 1, background: bg, border: `1px solid ${bd}`, borderRadius: 12, padding: '12px 16px', minWidth: 0, cursor: onClick ? 'pointer' : undefined }, style)}>
      <div style={{ fontSize: 11.5, color: lab, letterSpacing: '.4px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div dir={ltr ? 'ltr' : undefined} style={{ fontSize: 26, fontWeight: 700, marginTop: 2, color: fg, lineHeight: 1.2, textAlign: 'start' }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: lab, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/** Amber / red / green / neutral inline notice with a dot. */
export function Notice({ tone = 'amber', children, style, dot = true }: { tone?: 'amber' | 'red' | 'green' | 'neutral' | 'ink'; children: React.ReactNode; style?: CSS; dot?: boolean }) {
  const t = tone === 'amber' ? { bg: P.amberBg, bd: P.amberBorder, fg: P.amberFg, dc: P.amberDot }
    : tone === 'red' ? { bg: P.redBg, bd: P.redBorder, fg: P.redFg, dc: P.redFg }
    : tone === 'green' ? { bg: P.greenBg, bd: '#C9D6C0', fg: P.greenFg, dc: P.greenStrong }
    : tone === 'ink' ? { bg: P.ink, bd: P.ink, fg: P.page, dc: P.inkMuted }
    : { bg: P.card, bd: P.border, fg: P.text2, dc: P.text4 };
  return (
    <div style={sx({ display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 10, background: t.bg, border: `1px solid ${t.bd}`, alignItems: 'flex-start' }, style)}>
      {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.dc, flex: 'none', marginTop: 5 }} />}
      <span style={{ fontSize: 12.5, color: t.fg, lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

/* ────────────────────────────── Buttons ────────────────────────────── */

export function Btn({ variant = 'secondary', size = 'md', children, onClick, disabled, style, type = 'button', title }: {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber' | 'green'; size?: 'sm' | 'md' | 'lg'; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void; disabled?: boolean; style?: CSS; type?: 'button' | 'submit'; title?: string;
}) {
  const h = size === 'sm' ? 30 : size === 'lg' ? 44 : 36;
  const fs = size === 'sm' ? 12 : size === 'lg' ? 14 : 13;
  const px = size === 'sm' ? 11 : size === 'lg' ? 20 : 14;
  const v: CSS = variant === 'primary' ? { background: P.ink, color: P.onInk, border: 'none', fontWeight: 600 }
    : variant === 'danger' ? { background: P.redFg, color: '#fff', border: 'none', fontWeight: 600 }
    : variant === 'amber' ? { background: P.amberFg, color: '#fff', border: 'none', fontWeight: 600 }
    : variant === 'green' ? { background: P.greenStrong, color: '#fff', border: 'none', fontWeight: 600 }
    : variant === 'ghost' ? { background: 'transparent', color: P.text2, border: `1px solid ${P.borderInput}` }
    : { background: P.white, color: P.text2, border: `1px solid ${P.borderInput}`, fontWeight: 600 };
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} style={sx({ height: h, padding: `0 ${px}px`, borderRadius: size === 'sm' ? 7 : 9, fontSize: fs, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }, v, style)}>
      {children}
    </button>
  );
}

/** Filter chip (round). */
export function Chip({ active, children, onClick, tone, style }: { active?: boolean; children: React.ReactNode; onClick?: () => void; tone?: Tone; style?: CSS }) {
  const t = tone ? TONE[tone] : null;
  return (
    <button onClick={onClick} style={sx({ height: 34, padding: '0 14px', borderRadius: 999, border: `1px solid ${active ? (t?.bg ? t.fg : P.ink) : P.borderInput}`, background: active ? (t ? t.bg : P.ink) : P.white, color: active ? (t ? t.fg : P.onInk) : P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }, style)}>
      {children}
    </button>
  );
}

/** Segmented toggle (paper or dark). */
export function Segmented<T extends string>({ options, value, onChange, dark, size = 'md', style }: {
  options: { value: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void; dark?: boolean; size?: 'sm' | 'md' | 'lg'; style?: CSS;
}) {
  const h = dark ? (size === 'lg' ? 48 : 40) : (size === 'sm' ? 28 : size === 'lg' ? 36 : 30);
  const fs = dark ? (size === 'lg' ? 16 : 14) : (size === 'sm' ? 11.5 : 12);
  const px = dark ? 15 : 12;
  return (
    <div style={sx({ display: 'flex', border: `1px solid ${dark ? D.border3 : P.borderInput}`, borderRadius: dark ? 12 : 8, overflow: 'hidden', background: dark ? 'transparent' : P.white, flex: 'none' }, style)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{ height: h, padding: `0 ${px}px`, border: 'none', fontSize: fs, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: on ? (dark ? D.cream : P.ink) : 'transparent', color: on ? (dark ? D.onCream : P.onInk) : (dark ? D.muted : P.text3), whiteSpace: 'nowrap' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Global location selector bound to the store scope (All / MK / Rock / Kaddoum). */
export function LocationSelector({ dark, size, allowAll = true, value, onChange, style }: { dark?: boolean; size?: 'sm' | 'md' | 'lg'; allowAll?: boolean; value?: Scope; onChange?: (s: Scope) => void; style?: CSS }) {
  const { lang } = useLang();
  const store = useStore();
  const names = LOC_NAMES[lang];
  const opts: { value: Scope; label: string }[] = [
    ...(allowAll ? [{ value: 'all' as Scope, label: names.all }] : []),
    { value: 'mk', label: names.mk }, { value: 'rock', label: names.rock }, { value: 'kad', label: names.kad },
  ];
  return <Segmented options={opts} value={value ?? store.scope} onChange={onChange ?? store.setScope} dark={dark} size={size} style={style} />;
}

/** Location badge (name with dot). */
export function LocBadge({ loc, dark }: { loc: 'mk' | 'rock' | 'kad' | 'all'; dark?: boolean }) {
  const { lang } = useLang();
  const n = LOC_NAMES[lang][loc];
  if (dark) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: `1px solid ${D.border3}`, background: D.card, fontSize: 15, color: D.text2 }}><Dot color={D.greenDot} />{n}</span>;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: P.chip, color: P.text2, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}><Dot color={P.greenStrong} size={6} />{n}</span>;
}

/* ────────────────────────────── Inputs ────────────────────────────── */

export function Input({ value, onChange, placeholder, style, type = 'text', width, dark, ltr, onKeyDown, autoFocus }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; style?: CSS; type?: string; width?: number | string; dark?: boolean; ltr?: boolean; onKeyDown?: (e: React.KeyboardEvent) => void; autoFocus?: boolean;
}) {
  return (
    <input type={type} value={value} autoFocus={autoFocus} onKeyDown={onKeyDown} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={ltr ? 'ltr' : undefined}
      style={sx({ height: 38, width: width ?? 280, padding: '0 14px', borderRadius: 9, border: `1px solid ${dark ? D.border3 : P.borderInput}`, background: dark ? D.card2 : P.white, fontSize: 13.5, fontFamily: 'inherit', color: dark ? D.text : P.text, outline: 'none' }, style)} />
  );
}

export function Select<T extends string>({ value, onChange, options, style, width }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; style?: CSS; width?: number | string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} style={sx({ height: 36, width, padding: '0 10px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 13, fontFamily: 'inherit', color: P.text, outline: 'none' }, style)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Toggle({ on, onChange, dark, disabled }: { on: boolean; onChange: (v: boolean) => void; dark?: boolean; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={() => onChange(!on)} aria-pressed={on} style={{ width: 38, height: 22, borderRadius: 999, border: 'none', padding: 2, background: on ? (dark ? D.cream : P.ink) : (dark ? D.border3 : P.borderInput), cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', flex: 'none', opacity: disabled ? 0.5 : 1 }}>
      <span style={{ display: 'block', width: 18, height: 18, borderRadius: '50%', background: on ? (dark ? D.onCream : P.white) : P.white, transform: on ? 'translateX(16px)' : 'translateX(0)', transition: 'transform .15s' }} />
    </button>
  );
}

/* ────────────────────────────── Layout ────────────────────────────── */

/** Section heading (uppercase small caps). */
export function SectionTitle({ children, right, style }: { children: React.ReactNode; right?: React.ReactNode; style?: CSS }) {
  return (
    <div style={sx({ display: 'flex', alignItems: 'center', marginBottom: 8 }, style)}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{children}</div>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}

/**
 * Page header used inside the desktop shell: back button (optional), title, screen-id badge, right slot, tabs row.
 */
export function PageHeader({ title, screenId, sub, back, onBack, right, tabs, style }: {
  title: React.ReactNode; screenId?: string; sub?: React.ReactNode; back?: React.ReactNode; onBack?: () => void; right?: React.ReactNode; style?: CSS;
  tabs?: { value: string; label: React.ReactNode; badge?: React.ReactNode }[] & { active?: string; onChange?: (v: string) => void };
}) {
  const { backGlyph } = useLang();
  return (
    <div style={sx({ flex: 'none', padding: '12px 22px 0', background: P.surface, borderBottom: `1px solid ${P.border}` }, style)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 36, paddingBottom: tabs ? 0 : 12 }}>
        {onBack && <Btn size="sm" onClick={onBack}>{backGlyph} {back}</Btn>}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>{title}</div>
            {screenId && <ScreenId id={screenId} />}
          </div>
          {sub && <div style={{ fontSize: 12.5, color: P.text3, marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {tabs && <Tabs tabs={tabs} active={tabs.active ?? ''} onChange={tabs.onChange ?? (() => {})} />}
    </div>
  );
}

export function Tabs({ tabs, active, onChange, style }: { tabs: { value: string; label: React.ReactNode; badge?: React.ReactNode }[]; active: string; onChange: (v: string) => void; style?: CSS }) {
  return (
    <div style={sx({ display: 'flex', gap: 2, marginTop: 10, overflowX: 'auto' }, style)}>
      {tabs.map((tb) => {
        const on = tb.value === active;
        return (
          <button key={tb.value} onClick={() => onChange(tb.value)} style={{ height: 38, padding: '0 16px', border: 'none', borderBottom: `2px solid ${on ? P.ink : 'transparent'}`, background: 'transparent', color: on ? P.text : P.text3, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {tb.label}{tb.badge != null && <span style={{ fontSize: 10.5, fontWeight: 700, minWidth: 17, height: 17, borderRadius: 9, padding: '0 5px', background: on ? P.ink : P.chip, color: on ? P.onInk : P.text3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{tb.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Scrollable content body of a management page. */
export function Body({ children, style, pad = '18px 22px', gap = 14 }: { children: React.ReactNode; style?: CSS; pad?: string | number; gap?: number }) {
  return <div className="fade-in" style={sx({ flex: 1, minHeight: 0, overflow: 'auto', padding: pad, display: 'flex', flexDirection: 'column', gap }, style)}>{children}</div>;
}

/** Root of a management page: full-height column. */
export function Page({ children, style }: { children: React.ReactNode; style?: CSS }) {
  return <div style={sx({ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, background: P.page, color: P.text }, style)}>{children}</div>;
}

export function Row({ children, gap = 10, style, align = 'center', wrap }: { children: React.ReactNode; gap?: number; style?: CSS; align?: CSS['alignItems']; wrap?: boolean }) {
  return <div style={sx({ display: 'flex', alignItems: align, gap, flexWrap: wrap ? 'wrap' : undefined }, style)}>{children}</div>;
}

export function Spacer() { return <div style={{ flex: 1 }} />; }

/* ────────────────────────────── Grid table ────────────────────────────── */

export interface GridCol { label: React.ReactNode; align?: 'start' | 'end' | 'center' }

/** Sticky-header grid table container. `cols` = CSS grid-template-columns. */
export function GridTable({ cols, head, children, style, maxHeight, empty, headStyle }: {
  cols: string; head: (GridCol | React.ReactNode)[]; children: React.ReactNode; style?: CSS; maxHeight?: number | string; empty?: React.ReactNode; headStyle?: CSS;
}) {
  const hasRows = React.Children.count(children) > 0;
  return (
    <div style={sx({ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'auto', maxHeight, minHeight: 0 }, style)}>
      <div style={sx({ display: 'grid', gridTemplateColumns: cols, gap: 10, padding: '10px 16px', fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}`, position: 'sticky', top: 0, background: P.thead, zIndex: 2 }, headStyle)}>
        {head.map((h, i) => {
          const c = (h && typeof h === 'object' && 'label' in (h as GridCol)) ? (h as GridCol) : { label: h as React.ReactNode };
          return <div key={i} style={{ textAlign: c.align ?? 'start', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>;
        })}
      </div>
      {hasRows ? children : <div style={{ padding: 48, textAlign: 'center', color: P.text4, fontSize: 14 }}>{empty ?? '—'}</div>}
    </div>
  );
}

export function GridRow({ cols, children, onClick, style, active, tone }: { cols: string; children: React.ReactNode; onClick?: () => void; style?: CSS; active?: boolean; tone?: 'amber' | 'red' | 'green' }) {
  const bg = active ? P.hover : tone === 'amber' ? '#FBF6E8' : tone === 'red' ? '#FBEFEC' : tone === 'green' ? '#F0F4EC' : undefined;
  return (
    <div className={onClick ? 'row-hover' : undefined} onClick={onClick} style={sx({ display: 'grid', gridTemplateColumns: cols, gap: 10, padding: '9px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', cursor: onClick ? 'pointer' : undefined, background: bg }, style)}>
      {children}
    </div>
  );
}

/** Two-line cell: primary + muted secondary. */
export function Cell2({ a, b, ltr }: { a: React.ReactNode; b?: React.ReactNode; ltr?: boolean }) {
  return (
    <div style={{ minWidth: 0 }} dir={ltr ? 'ltr' : undefined}>
      <div className="ellipsis" style={{ fontWeight: 600 }}>{a}</div>
      {b != null && <div className="ellipsis" style={{ fontSize: 11.5, color: P.text4 }}>{b}</div>}
    </div>
  );
}

/** Right-aligned number cell. */
export function NumCell({ children, bold, color, style }: { children: React.ReactNode; bold?: boolean; color?: string; style?: CSS }) {
  return <div dir="ltr" style={sx({ textAlign: 'end', fontWeight: bold ? 600 : undefined, color, whiteSpace: 'nowrap' }, style)}>{children}</div>;
}

/* ────────────────────────────── Charts ────────────────────────────── */

export function Sparkline({ data, width = 120, height = 32, color = P.ink, fill, min, refLine, refColor = P.amberDot, strokeWidth = 1.6 }: {
  data: number[]; width?: number; height?: number; color?: string; fill?: string; min?: number; refLine?: number; refColor?: string; strokeWidth?: number;
}) {
  if (!data.length) return null;
  const lo = Math.min(...data, min ?? Infinity, refLine ?? Infinity);
  const hi = Math.max(...data, refLine ?? -Infinity);
  const span = hi - lo || 1;
  const pts = data.map((v, i) => [ (i / Math.max(1, data.length - 1)) * (width - 4) + 2, height - 3 - ((v - lo) / span) * (height - 6) ]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const ry = refLine != null ? height - 3 - ((refLine - lo) / span) * (height - 6) : null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {fill && <path d={`${d} L ${(width - 2).toFixed(1)} ${height} L 2 ${height} Z`} fill={fill} />}
      {ry != null && <line x1={0} x2={width} y1={ry} y2={ry} stroke={refColor} strokeDasharray="3 3" strokeWidth={1} />}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.2} fill={color} />
    </svg>
  );
}

/** Horizontal bar with label + value. */
export function Bar({ label, value, max, color = P.ink, right, height = 8, style }: { label?: React.ReactNode; value: number; max: number; color?: string; right?: React.ReactNode; height?: number; style?: CSS }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={sx({ display: 'flex', flexDirection: 'column', gap: 4 }, style)}>
      {(label || right) && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><span style={{ color: P.text2 }}>{label}</span><span dir="ltr" style={{ fontWeight: 600 }}>{right}</span></div>}
      <div style={{ height, borderRadius: 999, background: P.chip, overflow: 'hidden' }}><div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .3s' }} /></div>
    </div>
  );
}

/** 0-100 ring. */
export function Ring({ value, size = 120, stroke = 10, color, track = P.chip, label, sub }: { value: number; size?: number; stroke?: number; color?: string; track?: string; label?: React.ReactNode; sub?: React.ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const col = color ?? (value >= 80 ? P.greenStrong : value >= 60 ? P.amberDot : P.redFg);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={stroke} fill="none" strokeDasharray={`${(c * value) / 100} ${c}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div dir="ltr" style={{ fontSize: size / 4, fontWeight: 700, lineHeight: 1 }}>{label ?? Math.round(value)}</div>
        {sub && <div style={{ fontSize: 11, color: P.text3, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────────── Overlays (paper) ────────────────────────────── */

export function Modal({ open, onClose, title, sub, children, footer, width = 460, dark }: { open: boolean; onClose?: () => void; title?: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; width?: number; dark?: boolean }) {
  if (!open) return null;
  return (
    <div onClick={onClose} className="fade-in" style={{ position: 'fixed', inset: 0, background: dark ? 'rgba(8,10,8,.65)' : 'rgba(31,36,31,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="pop-up" style={{ width: `min(${width}px, 92%)`, maxHeight: '90vh', overflow: 'auto', background: dark ? D.sheet : P.surface, border: `1px solid ${dark ? D.border2 : P.border}`, borderRadius: dark ? 24 : 18, padding: dark ? 28 : 24, color: dark ? D.text : P.text }}>
        {title && <div style={{ fontSize: dark ? 22 : 17, fontWeight: 700 }}>{title}</div>}
        {sub && <div style={{ fontSize: dark ? 17 : 13, color: dark ? D.text3 : P.text3, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
        {children && <div style={{ marginTop: 14 }}>{children}</div>}
        {footer && <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

/** Confirm dialog (paper): cancel + primary CTA. */
export function ConfirmModal({ open, onCancel, onConfirm, title, body, cta, ctaVariant = 'primary', cancelLabel, children }: { open: boolean; onCancel: () => void; onConfirm: () => void; title: React.ReactNode; body?: React.ReactNode; cta: React.ReactNode; ctaVariant?: 'primary' | 'danger' | 'amber' | 'green'; cancelLabel?: React.ReactNode; children?: React.ReactNode }) {
  const { pick } = useLang();
  return (
    <Modal open={open} onClose={onCancel} title={title} sub={body}
      footer={<><Btn size="lg" variant="ghost" style={{ flex: 1 }} onClick={onCancel}>{cancelLabel ?? pick('Cancel', 'إلغاء')}</Btn><Btn size="lg" variant={ctaVariant} style={{ flex: 1.4, fontWeight: 700 }} onClick={onConfirm}>{cta}</Btn></>}>
      {children}
    </Modal>
  );
}

/* ────────────────────────────── Toast ────────────────────────────── */

interface ToastCtx { toast: (msg: React.ReactNode, opts?: { dark?: boolean; ms?: number }) => void }
const TCtx = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ node: React.ReactNode; dark?: boolean; key: number } | null>(null);
  const timer = useRef<number | null>(null);
  const toast = useCallback((node: React.ReactNode, opts?: { dark?: boolean; ms?: number }) => {
    setMsg({ node, dark: opts?.dark, key: Date.now() });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), opts?.ms ?? 2400);
  }, []);
  const v = useMemo(() => ({ toast }), [toast]);
  return (
    <TCtx.Provider value={v}>
      {children}
      {msg && (
        <div key={msg.key} className="pop-up" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: msg.dark ? D.cream : P.ink, color: msg.dark ? D.onCream : P.page, padding: '12px 22px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(31,36,31,.25)', zIndex: 100, maxWidth: '80vw', textAlign: 'center' }}>
          {msg.node}
        </div>
      )}
    </TCtx.Provider>
  );
}

export function useToast() { return useContext(TCtx).toast; }

/* ────────────────────────────── Staff (dark) primitives ────────────────────────────── */

/** Big dark primary/secondary tablet buttons. */
export function DBtn({ variant = 'primary', children, onClick, disabled, style, h = 60 }: { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: CSS; h?: number }) {
  const v: CSS = variant === 'primary' ? { background: disabled ? D.disabled : D.cream, color: D.onCream, border: 'none', fontWeight: 700 }
    : variant === 'danger' ? { background: D.redChip, color: D.redFg, border: `1px solid ${D.redBorder}`, fontWeight: 600 }
    : variant === 'ghost' ? { background: 'transparent', color: D.muted, border: `1px solid ${D.border3}` }
    : { background: D.card, color: D.text, border: `1px solid ${D.border3}`, fontWeight: 600 };
  return <button disabled={disabled} onClick={onClick} style={sx({ height: h, padding: '0 24px', borderRadius: 16, fontSize: 19, fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }, v, style)}>{children}</button>;
}

/** Dark bottom sheet. */
export function Sheet({ open, onClose, children, width = 560 }: { open: boolean; onClose?: () => void; children: React.ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div onClick={onClose} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,8,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 40 }}>
      <div onClick={(e) => e.stopPropagation()} className="sheet-up" style={{ width: `min(${width}px,100%)`, maxHeight: '92vh', overflow: 'auto', background: D.sheet, border: `1px solid ${D.border2}`, borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '24px 28px 28px', color: D.text }}>
        {children}
      </div>
    </div>
  );
}

/** Keypad sheet: title/sub/unit, big display, 3×4 keys, Done. */
export function KeypadSheet({ open, title, sub, unit, value, onChange, onDone, onCancel, cancelLabel, doneLabel, hint }: {
  open: boolean; title: React.ReactNode; sub?: React.ReactNode; unit?: string; value: string; onChange: (v: string) => void; onDone: () => void; onCancel: () => void; cancelLabel?: string; doneLabel?: string; hint?: React.ReactNode;
}) {
  const { pick } = useLang();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  const append = (cur: string, k: string) => { if (k === '⌫') return cur.slice(0, -1); if (k === '.' && cur.includes('.')) return cur; if (cur.length >= 7) return cur; if (k === '.' && !cur) return '0.'; return cur + k; };
  return (
    <Sheet open={open} onClose={onCancel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{title}</div>
          {sub && <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{sub}</div>}
        </div>
        <button onClick={onCancel} style={{ height: 48, padding: '0 18px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{cancelLabel ?? pick('Cancel', 'إلغاء')}</button>
      </div>
      <div dir="ltr" style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '14px 0', padding: '14px 20px', border: `1px solid ${D.border2}`, background: D.page, borderRadius: 16 }}>
        <div style={{ flex: 1, fontSize: 40, fontWeight: 700, color: value ? D.text : D.dim }}>{value || '0'}</div>
        {unit && <div style={{ fontSize: 18, color: D.muted }}>{unit}</div>}
      </div>
      {hint && <div style={{ fontSize: 13.5, color: D.muted, marginBottom: 10 }}>{hint}</div>}
      <div dir="ltr" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {keys.map((k) => <button key={k} onClick={() => onChange(append(value, k))} style={{ height: 62, borderRadius: 14, border: `1px solid ${D.border2}`, background: D.key, color: D.text, fontSize: 26, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{k}</button>)}
      </div>
      <button onClick={onDone} style={{ width: '100%', marginTop: 12, height: 62, borderRadius: 16, border: 'none', background: D.cream, color: D.onCream, fontSize: 20, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{doneLabel ?? pick('Done', 'تم')}</button>
    </Sheet>
  );
}

/** Dark confirmation dialog (centered). */
export function ConfirmSheet({ open, title, body, onCancel, onConfirm, cta, cancelLabel, children, danger }: { open: boolean; title: React.ReactNode; body?: React.ReactNode; onCancel: () => void; onConfirm: () => void; cta?: React.ReactNode; cancelLabel?: React.ReactNode; children?: React.ReactNode; danger?: boolean }) {
  const { pick } = useLang();
  if (!open) return null;
  return (
    <div onClick={onCancel} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,8,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="sheet-up" style={{ width: 'min(520px,92%)', maxHeight: '90vh', overflow: 'auto', background: D.sheet, border: `1px solid ${D.border2}`, borderRadius: 24, padding: 28, color: D.text }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{title}</div>
        {body && <div style={{ fontSize: 17, color: D.text3, marginTop: 10, lineHeight: 1.55 }}>{body}</div>}
        {children && <div style={{ marginTop: 14 }}>{children}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 60, borderRadius: 14, border: `1px solid ${D.border3}`, background: 'transparent', color: D.text2, fontSize: 18, fontFamily: 'inherit', cursor: 'pointer' }}>{cancelLabel ?? pick('Cancel', 'إلغاء')}</button>
          <button onClick={onConfirm} style={{ flex: 1.4, height: 60, borderRadius: 14, border: 'none', background: danger ? D.redBorder : D.cream, color: danger ? '#fff' : D.onCream, fontSize: 18, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{cta ?? pick('Confirm', 'تأكيد')}</button>
        </div>
      </div>
    </div>
  );
}

/** Dark "done" screen with check icon. */
export function DoneScreen({ title, body, action, onAction }: { title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode; onAction?: () => void }) {
  return (
    <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 40 }}>
      <div style={{ width: 96, height: 96, borderRadius: '50%', background: D.greenBg, border: `1px solid ${D.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={D.greenFg} strokeWidth="2.4"><path d="M4 12.5l5 5L20 6.5" /></svg>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, textAlign: 'center' }}>{title}</div>
      {body && <div style={{ fontSize: 18, color: D.muted, textAlign: 'center', maxWidth: 520, lineHeight: 1.5 }}>{body}</div>}
      {action && <DBtn variant="secondary" onClick={onAction} style={{ marginTop: 10 }}>{action}</DBtn>}
    </div>
  );
}

/** Dark chip / pill. */
export function DPill({ tone = 'neutral', children, style, ltr }: { tone?: 'neutral' | 'amber' | 'red' | 'green' | 'gold' | 'cream'; children: React.ReactNode; style?: CSS; ltr?: boolean }) {
  const t = tone === 'amber' ? { bg: D.amberChip, fg: D.gold } : tone === 'gold' ? { bg: D.amberChip, fg: D.gold } : tone === 'red' ? { bg: D.redChip, fg: D.redFg } : tone === 'green' ? { bg: D.greenBg, fg: D.greenFg } : tone === 'cream' ? { bg: D.cream, fg: D.onCream } : { bg: D.chip, fg: D.text2 };
  return <span dir={ltr ? 'ltr' : undefined} style={sx({ fontSize: 14, padding: '6px 12px', borderRadius: 999, background: t.bg, color: t.fg, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }, style)}>{children}</span>;
}

/** Dark card. */
export function DCard({ children, style, onClick, active, pad = 18 }: { children: React.ReactNode; style?: CSS; onClick?: () => void; active?: boolean; pad?: number | string }) {
  return <div className={onClick ? 'tile-hover' : undefined} onClick={onClick} style={sx({ border: `1px solid ${active ? '#4A5348' : D.border}`, background: D.card, borderRadius: 18, padding: pad, cursor: onClick ? 'pointer' : undefined, color: D.text }, style)}>{children}</div>;
}

/** Dark page footer bar with summary + CTA. */
export function DFooter({ label, value, cta, onCta, disabled, extra }: { label?: React.ReactNode; value?: React.ReactNode; cta: React.ReactNode; onCta: () => void; disabled?: boolean; extra?: React.ReactNode }) {
  return (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 20, padding: '16px 32px', borderTop: `1px solid ${D.headerBorder}`, background: D.card2 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && <div style={{ fontSize: 15, color: D.muted }}>{label}</div>}
        {value && <div style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>{value}</div>}
      </div>
      {extra}
      <DBtn h={64} disabled={disabled} onClick={onCta} style={{ padding: '0 36px', fontSize: 20 }}>{cta}</DBtn>
    </div>
  );
}

/* ────────────────────────────── Misc ────────────────────────────── */

export function EmptyState({ children, style, dark }: { children: React.ReactNode; style?: CSS; dark?: boolean }) {
  return <div style={sx({ padding: 48, textAlign: 'center', color: dark ? D.muted : P.text4, fontSize: 14, lineHeight: 1.6 }, style)}>{children}</div>;
}

/** Simple key/value definition card (used in General tabs). */
export function Field({ label, value, ltr, style }: { label: React.ReactNode; value: React.ReactNode; ltr?: boolean; style?: CSS }) {
  return (
    <div style={sx({ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '12px 14px', minWidth: 0 }, style)}>
      <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
      <div dir={ltr ? 'ltr' : undefined} style={{ fontSize: 14.5, fontWeight: 600, marginTop: 4, textAlign: 'start' }}>{value}</div>
    </div>
  );
}

/** Small footnote text. */
export function Note({ children, style }: { children: React.ReactNode; style?: CSS }) {
  return <div style={sx({ fontSize: 12.5, color: P.text4, lineHeight: 1.5 }, style)}>{children}</div>;
}

/** Colored variance value (+ green / − red). */
export function Delta({ value, fmt: f, positiveGood = true, style }: { value: number; fmt: (n: number) => string; positiveGood?: boolean; style?: CSS }) {
  const good = positiveGood ? value >= 0 : value <= 0;
  return <span dir="ltr" style={sx({ color: value === 0 ? P.text3 : good ? P.greenFg : P.redFg, fontWeight: 600 }, style)}>{f(value)}</span>;
}

export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
