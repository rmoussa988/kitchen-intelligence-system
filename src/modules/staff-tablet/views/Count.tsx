import React from 'react';
import type { Item } from '../../../store';
import { D, KEYS, fmt } from '../../../ui';
import type { CountDef } from '../data';
import type { TabletText } from '../text';

export interface CountRow { def: CountDef; item: Item | undefined }

const seg = (on: boolean): React.CSSProperties => ({ height: 44, padding: '0 16px', border: 'none', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: on ? D.cream : 'transparent', color: on ? D.onCream : D.muted });

export function CountView({ t, isAr, rows, idx, buf, view, vals, locLabel, onKey, onConfirm, onSkip, onSetView, onTapRow, onSubmitList }: {
  t: TabletText; isAr: boolean; rows: CountRow[]; idx: number; buf: string; view: 'single' | 'list'; vals: Record<number, number>; locLabel: string;
  onKey: (k: string) => void; onConfirm: () => void; onSkip: () => void; onSetView: (v: 'single' | 'list') => void; onTapRow: (i: number) => void; onSubmitList: () => void;
}) {
  const ci = rows[idx] ?? rows[0];
  const name = (r: CountRow) => (r.item ? (isAr ? r.item.ar : r.item.en) : r.def.id);
  const nameAlt = (r: CountRow) => (r.item ? (isAr ? r.item.en : r.item.ar) : '');
  const un = (r: CountRow) => (isAr ? r.def.unitAr : r.def.unit);
  const countedCount = rows.reduce((a, _r, i) => a + (vals[i] !== undefined ? 1 : 0), 0);
  const countedLabel = `${countedCount} / ${rows.length} ${t.counted}`;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px 0', flex: 'none' }}>
        <div style={{ fontSize: 15, color: D.muted }}>{countedLabel}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', border: `1px solid ${D.border3}`, borderRadius: 12, overflow: 'hidden' }}>
          <button onClick={() => onSetView('single')} style={seg(view === 'single')}>{t.viewOne}</button>
          <button onClick={() => onSetView('list')} style={seg(view === 'list')}>{t.viewList}</button>
        </div>
      </div>

      {view === 'single' && ci && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', padding: '28px 32px', gap: 20, minWidth: 0 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, color: D.muted, marginBottom: 10 }}>
                <span>{t.item} <span dir="ltr">{idx + 1} / {rows.length}</span></span><span>{locLabel}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: D.tileIcon, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 999, background: D.cream, width: Math.round((idx / rows.length) * 100) + '%', transition: 'width .3s' }} />
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 84, height: 84, borderRadius: 18, background: D.headerBorder, border: `1px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: D.text3, flex: 'none' }}>{ci.def.ini}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>{name(ci)}</div>
                  <div style={{ fontSize: 18, color: D.muted, marginTop: 6 }}>{nameAlt(ci)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, padding: '7px 14px', borderRadius: 999, background: D.chip, color: D.text2 }}>{t.countUnit}: {un(ci)}</span>
                {ci.def.note && <span style={{ fontSize: 15, padding: '7px 14px', borderRadius: 999, background: D.chip, color: D.text2 }} dir="ltr">{ci.def.note}</span>}
              </div>
              <div style={{ border: `1px solid ${D.border2}`, background: D.card3, borderRadius: 20, padding: '20px 24px' }}>
                <div style={{ fontSize: 15, color: D.muted }}>{t.actualQty}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '.5px', color: buf ? D.text : D.dim, direction: 'ltr' }}>{buf || '0'}</div>
                  <div style={{ fontSize: 22, color: D.muted }}>{un(ci)}</div>
                </div>
              </div>
              <button onClick={onSkip} style={{ alignSelf: 'flex-start', height: 52, padding: '0 20px', borderRadius: 14, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 17, fontFamily: 'inherit', cursor: 'pointer' }}>{t.skip}</button>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 32px', gap: 14, borderInlineStart: `1px solid ${D.headerBorder}`, background: '#141714' }}>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, minHeight: 0 }} dir="ltr">
              {KEYS.map((k) => (
                <button key={k} onClick={() => onKey(k)} style={{ borderRadius: 16, border: `1px solid ${D.border2}`, background: D.key, color: D.text, fontSize: 30, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', minHeight: 64 }}>{k}</button>
              ))}
            </div>
            <button onClick={onConfirm} style={{ height: 72, borderRadius: 18, border: 'none', background: buf ? D.cream : D.disabled, color: D.onCream, fontSize: 22, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>{t.confirmNext}</button>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((r, i) => {
                const v = vals[i]; const has = v !== undefined;
                return (
                  <button key={r.def.id} onClick={() => onTapRow(i)} style={{ textAlign: 'start', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', border: `1px solid ${has ? '#4A5348' : D.border}`, background: D.card, borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: D.headerBorder, border: `1px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: D.text3, flex: 'none' }}>{r.def.ini}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 19, fontWeight: 600 }}>{name(r)}</div>
                      <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{nameAlt(r)} · {un(r)}</div>
                    </div>
                    <div style={{ textAlign: 'end' }} dir="ltr">
                      <div style={{ fontSize: 24, fontWeight: 700, color: has ? D.text : D.dim }}>{has ? fmt(v) : t.notCounted}</div>
                      <div style={{ fontSize: 13, color: D.muted }}>{un(r)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 20, padding: '16px 32px', borderTop: `1px solid ${D.headerBorder}`, background: D.card2 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: D.muted }}>{countedLabel}</div>
              <div style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>{locLabel}</div>
            </div>
            <button onClick={onSubmitList} style={{ height: 64, padding: '0 36px', borderRadius: 16, border: 'none', background: countedCount ? D.cream : D.disabled, color: D.onCream, fontSize: 20, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.submitCount}</button>
          </div>
        </div>
      )}
    </div>
  );
}
