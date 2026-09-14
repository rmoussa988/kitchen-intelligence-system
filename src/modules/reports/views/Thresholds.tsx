import React from 'react';
import { useLang } from '../../../i18n/LangContext';
import { P } from '../../../ui';
import { TEXT } from '../text';
import { BANDS, TH, type ThresholdState } from '../data';
import { CARD, UC_HEAD } from './shared';

const numInput: React.CSSProperties = { width: 56, height: 32, padding: '0 6px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', textAlign: 'center', color: P.text, outline: 'none' };

/** MGT-RPT-05 — per-recipe expected cost % + global KPI bands (draft lives in the parent; Save persists + audits). */
export function Thresholds({ draft, setDraft, onSave }: { draft: ThresholdState; setDraft: (s: ThresholdState) => void; onSave: () => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const setTh = (key: string, field: 'food' | 'pkg', v: string) => setDraft({ ...draft, th: { ...draft.th, [key]: { ...draft.th[key], [field]: v } } });
  const setBand = (key: string, field: 'warn' | 'crit', v: string) => setDraft({ ...draft, bands: { ...draft.bands, [key]: { ...draft.bands[key], [field]: v } } });

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ ...CARD, flex: 1.2, minWidth: 400 }}>
          <div style={UC_HEAD}>{t.recipeThresholds}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(106px,1.4fr) 66px 76px 76px', gap: 10, padding: '9px 18px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}` }}>
            <div>{t.recipe}</div><div style={{ textAlign: 'end' }}>{t.currentPct}</div><div style={{ textAlign: 'end' }}>{t.expectedFood}</div><div style={{ textAlign: 'end' }}>{t.expectedPkg}</div>
          </div>
          {TH.map((r) => {
            const v = draft.th[r.key] ?? { food: r.food + '%', pkg: r.pkg + '%' };
            const limit = parseFloat(v.food);
            const over = r.cur > (isNaN(limit) ? r.food : limit);
            return (
              <div key={r.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(106px,1.4fr) 66px 76px 76px', gap: 10, padding: '9px 18px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{isAr ? r.nameAr : r.name}</div>
                <div style={{ textAlign: 'end', fontWeight: 700, color: over ? P.redFg : P.greenFg }} dir="ltr">{r.cur.toFixed(1)}%</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><input value={v.food} onChange={(e) => setTh(r.key, 'food', e.target.value)} style={numInput} dir="ltr" /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><input value={v.pkg} onChange={(e) => setTh(r.key, 'pkg', e.target.value)} style={numInput} dir="ltr" /></div>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={CARD}>
            <div style={UC_HEAD}>{t.globalBands}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px,1.4fr) 86px 86px', gap: 10, padding: '9px 18px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}` }}>
              <div>KPI</div>
              <div style={{ textAlign: 'end', color: P.amberFg }}>{t.warning}</div><div style={{ textAlign: 'end', color: P.redFg }}>{t.critical}</div>
            </div>
            {BANDS.map((b) => {
              const v = draft.bands[b.key] ?? { warn: b.warn, crit: b.crit };
              return (
                <div key={b.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px,1.4fr) 86px 86px', gap: 10, padding: '9px 18px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{isAr ? b.nameAr : b.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}><input value={v.warn} onChange={(e) => setBand(b.key, 'warn', e.target.value)} style={{ ...numInput, width: 64, padding: '0 8px', border: `1px solid ${P.amberBorder}`, background: P.amberBg, color: P.amberFg }} dir="ltr" /></div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}><input value={v.crit} onChange={(e) => setBand(b.key, 'crit', e.target.value)} style={{ ...numInput, width: 64, padding: '0 8px', border: `1px solid ${P.redBorder}`, background: P.redBg, color: P.redFg }} dir="ltr" /></div>
                </div>
              );
            })}
          </div>
          <button onClick={onSave} style={{ alignSelf: 'flex-start', height: 42, padding: '0 22px', borderRadius: 10, border: 'none', background: P.ink, color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.saveConfig}</button>
          <div style={{ fontSize: 12, color: P.text4 }}>{t.configNote}</div>
        </div>
      </div>
    </div>
  );
}
