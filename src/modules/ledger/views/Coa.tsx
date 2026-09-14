import React from 'react';
import { P } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { TEXT } from '../text';
import { ACCTS, ACCT_CODES, GROUPS, NOTES, fmt2 } from '../data';

export default function Coa({ bal, onAcct }: { bal: Record<string, number>; onAcct: (code: string) => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
      {GROUPS.map(({ g, range }) => {
        const accts = ACCT_CODES.filter((k) => ACCTS[k].g === g);
        const gt = accts.reduce((a, k) => a + Math.abs(bal[k] || 0), 0);
        return (
          <div key={g} style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.surface, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: P.page, borderBottom: `1px solid ${P.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.groups[g]}</span>
              <span style={{ fontSize: 10.5, color: P.text4 }} dir="ltr">{range}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12.5, fontWeight: 700 }} dir="ltr">${fmt2(gt)}</span>
            </div>
            {accts.map((code) => {
              const v = bal[code] || 0;
              const note = NOTES[code];
              return (
                <button key={code} onClick={() => onAcct(code)} className="row-hover" style={{ width: '100%', display: 'grid', gridTemplateColumns: '64px minmax(200px,1.5fr) minmax(140px,1fr) 120px', gap: 10, alignItems: 'center', padding: '8px 16px', minHeight: 36, border: 'none', borderBottom: `1px solid ${P.borderRow}`, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', fontSize: 12.5, color: P.text }}>
                  <span dir="ltr" style={{ color: P.text4, fontSize: 11 }}>{code}</span>
                  <span style={{ fontWeight: 600 }}>{ACCTS[code][isAr ? 'ar' : 'en']}</span>
                  <span style={{ fontSize: 11, color: P.text3 }}>{note ? (isAr ? note.ar : note.en) : ''}</span>
                  <span dir="ltr" style={{ textAlign: 'end', fontWeight: 700, color: v === 0 ? P.text4 : P.text }}>${fmt2(Math.abs(v)) || '0.00'}</span>
                </button>
              );
            })}
          </div>
        );
      })}
      <div style={{ fontSize: 11.5, color: P.text3 }}>{t.coaNote}</div>
    </div>
  );
}
