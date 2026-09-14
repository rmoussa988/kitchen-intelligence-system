import React from 'react';
import { P } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { TEXT } from '../text';

export interface StatTile { label: string; val: string; fg: string; bg: string; border: string }
export interface SummaryRow { id: string; time: string; supplier: string; inv: string; subtotal: string; tax: string; total: string; chip: string; chipBg: string; chipFg: string; inQueue: boolean }

export default function SummaryView({ tiles, rows, highlight, onPick }: { tiles: StatTile[]; rows: SummaryRow[]; highlight: string | null; onPick: (id: string) => void }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const grid = '90px 1fr 130px 110px 120px 130px';
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 22px 28px' }} className="fade-in">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          {tiles.map((s, i) => (
            <div key={i} style={{ flex: 1, minWidth: 150, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4, color: s.fg }} dir="ltr">{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ border: `1px solid ${P.border}`, background: P.card, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '12px 20px', borderBottom: `1px solid ${P.border}`, background: P.thead, fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.3px' }}>
            <div>{t.colDate}</div><div>{t.colSupplier}</div><div dir="ltr">{t.colInvoice}</div><div style={{ textAlign: 'end' }}>{t.subtotal}</div><div style={{ textAlign: 'end' }}>{t.vat}</div><div style={{ textAlign: 'end' }}>{t.colStatusTotal}</div>
          </div>
          {rows.map((r) => (
            <div key={r.id} id={`sum-${r.id}`} className={r.inQueue ? 'row-hover' : undefined} onClick={r.inQueue ? () => onPick(r.id) : undefined}
              style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${P.borderRow}`, background: highlight === r.id ? P.hover : undefined, cursor: r.inQueue ? 'pointer' : undefined }}>
              <div style={{ fontSize: 14, color: P.text3 }} dir="ltr">{r.time}</div>
              <div style={{ fontSize: 15, fontWeight: 600, minWidth: 0 }}>{r.supplier}<span style={{ fontSize: 11, color: P.text4, fontWeight: 400, marginInlineStart: 8 }} dir="ltr">{r.id}</span></div>
              <div style={{ fontSize: 14, color: P.text3 }} dir="ltr">{r.inv}</div>
              <div style={{ textAlign: 'end', fontSize: 14 }} dir="ltr">{r.subtotal}</div>
              <div style={{ textAlign: 'end', fontSize: 14, color: P.text3 }} dir="ltr">{r.tax}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}><span style={{ fontSize: 15, fontWeight: 700 }} dir="ltr">{r.total}</span><span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 999, background: r.chipBg, color: r.chipFg, fontWeight: 600 }}>{r.chip}</span></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: '#5E665C', marginTop: 12, lineHeight: 1.6 }}>{t.summaryFoot}</div>
      </div>
    </div>
  );
}
