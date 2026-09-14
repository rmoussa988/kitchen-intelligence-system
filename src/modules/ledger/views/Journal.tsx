import React from 'react';
import { P } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { TEXT } from '../text';
import { ACCTS, SRC_FILTERS, SRC_TONE, fmt2 } from '../data';
import type { JE, Src } from '../data';

export default function Journal({ entries, src, setSrc, acctFilter, clearAcctFilter, open, toggle, onAcct, onManual, rate }: {
  entries: JE[]; src: 'all' | Src; setSrc: (s: 'all' | Src) => void; acctFilter: string | null; clearAcctFilter: () => void;
  open: Record<string, boolean>; toggle: (ref: string) => void; onAcct: (code: string) => void; onManual: () => void; rate: number;
}) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 13, flexWrap: 'wrap', alignItems: 'center' }}>
        {SRC_FILTERS.map((k) => {
          const on = src === k;
          return <button key={k} onClick={() => setSrc(k)} style={{ height: 28, padding: '0 12px', borderRadius: 999, border: `1.5px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{k === 'all' ? t.srcAll : k}</button>;
        })}
        {acctFilter && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px', borderRadius: 999, background: P.ink, color: P.onInk, fontSize: 11, fontWeight: 700 }}>
            {acctFilter} · {ACCTS[acctFilter][isAr ? 'ar' : 'en']}
            <button onClick={clearAcctFilter} style={{ border: 'none', background: 'transparent', color: '#B9BFAE', fontSize: 12, cursor: 'pointer', padding: 0 }}>✕</button>
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: P.text3 }}>{entries.length} {t.jShowing}</span>
        <button onClick={onManual} className="btn-hover" style={{ height: 32, padding: '0 15px', borderRadius: 8, border: 'none', background: P.ink, color: P.onInk, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>+ {t.manualJe}</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxWidth: 1020 }}>
        {entries.map((j) => {
          const tone = SRC_TONE[j.src];
          const isOpen = !!open[j.ref];
          const total = j.lines.reduce((a, l) => a + l[1], 0);
          return (
            <div key={j.ref} style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.surface, overflow: 'hidden' }}>
              <button onClick={() => toggle(j.ref)} className="row-hover" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', color: P.text }}>
                <span style={{ width: 16, textAlign: 'center', color: P.text3, fontSize: 11 }}>{isOpen ? '▾' : (isAr ? '◂' : '▸')}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: P.text4, width: 62 }} dir="ltr">{j.ref}</span>
                <span style={{ fontSize: 11, color: P.text4, width: 52 }} dir="ltr">{j.date}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isAr ? j.memoAr : j.memoEn}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: tone.bg, color: tone.fg, whiteSpace: 'nowrap' }}>{j.src}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, width: 96, textAlign: 'end' }} dir="ltr">${fmt2(total)}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: P.greenStrong, whiteSpace: 'nowrap' }}>✓ {t.balanced}</span>
              </button>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${P.borderRow}`, padding: '4px 0' }}>
                  {j.lines.map(([code, d, c], i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 90px minmax(220px,1.6fr) 110px 110px', gap: 10, alignItems: 'center', padding: '5px 16px', paddingInlineStart: 43, fontSize: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: d ? P.greenStrong : '#8A6116' }}>{d ? t.tbDr : t.tbCr}</span>
                      <span dir="ltr" style={{ color: P.text4, fontSize: 11 }}>{code}</span>
                      <button onClick={() => onAcct(code)} className="acct-link" style={{ border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer', textAlign: 'start' }}>{ACCTS[code][isAr ? 'ar' : 'en']}</button>
                      <span dir="ltr" style={{ textAlign: 'end', fontWeight: d ? 700 : 400, color: P.text }}>{d ? '$' + fmt2(d) : ''}</span>
                      <span dir="ltr" style={{ textAlign: 'end', fontWeight: c ? 700 : 400, color: P.text }}>{c ? '$' + fmt2(c) : ''}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, padding: '7px 16px 9px', paddingInlineStart: 43, fontSize: 10.5, color: P.text4, alignItems: 'center' }}>
                    <span>{t.origins[j.src]}</span>
                    <span style={{ flex: 1 }} />
                    <span dir="ltr">LL {(total * rate).toLocaleString('en-US')}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 11.5, color: P.text3, maxWidth: 860 }}>{t.journalNote}</div>
    </>
  );
}
