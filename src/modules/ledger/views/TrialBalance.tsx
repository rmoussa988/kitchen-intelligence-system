import React from 'react';
import { P } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { TEXT } from '../text';
import { ACCTS, ACCT_CODES, fmt2 } from '../data';

const GRID = '64px minmax(220px,1.6fr) 130px 130px';

export default function TrialBalance({ bal, onExport }: { bal: Record<string, number>; onExport: () => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  let drT = 0;
  const rows = ACCT_CODES.map((code) => {
    const v = bal[code] || 0, d = v > 0 ? v : 0, c = v < 0 ? -v : 0;
    drT += d;
    return { code, name: ACCTS[code][isAr ? 'ar' : 'en'], d, c };
  });
  const btn: React.CSSProperties = { height: 32, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' };
  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 15px', borderRadius: 11, background: '#DDE8DA', border: '1px solid #B9CDB6', color: P.greenStrong, fontSize: 12.5, fontWeight: 700, marginBottom: 13 }}>
        ✓ {t.tbBalancedMsg}
      </div>
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.surface, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '9px 16px', background: P.page, borderBottom: `1px solid ${P.border}`, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text3 }}>
          <div dir="ltr">{t.tbCode}</div><div>{t.tbAcct}</div><div style={{ textAlign: 'end' }}>{t.tbDr}</div><div style={{ textAlign: 'end' }}>{t.tbCr}</div>
        </div>
        {rows.map((r) => (
          <div key={r.code} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, alignItems: 'center', padding: '7px 16px', minHeight: 34, borderBottom: `1px solid ${P.borderRow}`, fontSize: 12.5 }}>
            <span dir="ltr" style={{ color: P.text4, fontSize: 11 }}>{r.code}</span>
            <span style={{ fontWeight: 600 }}>{r.name}</span>
            <span dir="ltr" style={{ textAlign: 'end', fontWeight: r.d ? 700 : 400 }}>{r.d ? '$' + fmt2(r.d) : '—'}</span>
            <span dir="ltr" style={{ textAlign: 'end', fontWeight: r.c ? 700 : 400 }}>{r.c ? '$' + fmt2(r.c) : '—'}</span>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '10px 16px', background: P.ink, color: P.onInk, fontSize: 13, fontWeight: 700 }}>
          <span></span><span>{t.tbTotals}</span>
          <span dir="ltr" style={{ textAlign: 'end' }}>${fmt2(drT)}</span>
          <span dir="ltr" style={{ textAlign: 'end' }}>${fmt2(drT)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 9, marginTop: 12, alignItems: 'center' }}>
        <button onClick={onExport} className="row-hover" style={btn}>{t.tbExcel}</button>
        <button onClick={onExport} className="row-hover" style={btn}>{t.tbExportAcct}</button>
        <span style={{ fontSize: 11.5, color: P.text3 }}>{t.tbNote}</span>
      </div>
    </div>
  );
}
