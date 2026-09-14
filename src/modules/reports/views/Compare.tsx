import React, { useState } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { P } from '../../../ui';
import { TEXT } from '../text';
import { CMP_BASE, MFACT, MONTHS, type Unit } from '../data';
import { CARD, ChipBtn, UC_TITLE } from './shared';

const fmtU = (v: number, u: Unit) => u === '$' ? '$' + Math.round(v).toLocaleString('en-US') : u === '$2' ? '$' + v.toFixed(2) : u === '%' ? v.toFixed(1) + '%' : Math.round(v).toLocaleString('en-US');

/** MGT-RPT-06 — year over year, same month 2025 vs 2026. */
export function Compare() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const [cmpM, setCmpM] = useState(7);
  const mn = MONTHS[cmpM][0], f = MFACT[cmpM], isMtd = cmpM === 7;
  const max = 68400 * 1.12;

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{t.cmpTitle}</div>
        <div style={{ fontSize: 12.5, color: P.text3 }}>{t.cmpHint}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {MONTHS.map((mm, i) => <ChipBtn key={i} on={cmpM === i} onClick={() => setCmpM(i)} h={30} fs={12} ltr>{mm[0]}</ChipBtn>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ ...CARD, flex: 1.4, minWidth: 500 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,1.5fr) minmax(72px,1fr) minmax(72px,1fr) 118px', gap: 10, padding: '10px 18px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', background: P.thead, borderBottom: `1px solid ${P.border}` }}>
            <div>{t.cmpMetric}</div><div style={{ textAlign: 'end' }} dir="ltr">{mn + ' 2025'}</div><div style={{ textAlign: 'end' }} dir="ltr">{mn + ' 2026' + (isMtd ? ' · ' + t.mtd : '')}</div><div style={{ textAlign: 'end' }}>{t.cmpDelta}</div>
          </div>
          {CMP_BASE.map(([en, ar, base, u, r25, hib]) => {
            const v26 = u === '%' ? base : base * f, v25 = v26 * r25;
            const d = (v26 - v25) / v25 * 100;
            const good = hib ? d >= 0 : d <= 0;
            const color = good ? P.greenFg : P.redFg;
            return (
              <div key={en} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,1.5fr) minmax(72px,1fr) minmax(72px,1fr) 118px', gap: 10, padding: '11px 18px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{isAr ? ar : en}</div>
                <div style={{ textAlign: 'end', color: P.text3 }} dir="ltr">{fmtU(v25, u)}</div>
                <div style={{ textAlign: 'end', fontWeight: 700 }} dir="ltr">{fmtU(v26, u)}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }} dir="ltr">
                  <div style={{ width: 54, height: 6, borderRadius: 3, background: P.borderRow, overflow: 'hidden' }}><div style={{ height: '100%', width: Math.min(100, Math.abs(d) * 3.2) + '%', background: color }} /></div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color, minWidth: 52, textAlign: 'end' }}>{(d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1) + '%'}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 360, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <div style={UC_TITLE}>{t.cmpChart}</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 16, minHeight: 150 }} dir="ltr">
            {MONTHS.map((mm, i) => {
              const v26 = 68400 * MFACT[i], v25 = v26 * (0.78 + i * 0.008);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end', opacity: cmpM === i ? 1 : .55 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', height: '100%' }}>
                    <div title="2025" style={{ flex: 1, height: Math.round(v25 / max * 100) + '%', background: '#C4BEA9', borderRadius: '3px 3px 0 0' }} />
                    <div title="2026" style={{ flex: 1, height: Math.round(v26 / max * 100) + '%', background: i === 7 ? '#5A6B54' : P.ink, borderRadius: '3px 3px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: '#8A8D7C', fontWeight: 600 }}>{mm[0]}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11.5, color: P.text3 }} dir="ltr">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#C4BEA9' }} />2025</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: P.ink }} />2026</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: P.text4 }}>{t.cmpNote}</div>
    </div>
  );
}
