import React, { useMemo, useState } from 'react';
import { P, Segmented, money, pct, useToast } from '../../../ui';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { LocId } from '../../../store';
import { TEXT } from '../text';
import { LAST_CLOSE_DATE, MIX_COLORS, SALES_CATS, SALES_DATES, ZERO_SALES, addSales, monthSales, salesFor } from '../data';
import { LOC_ORDER, longDate, monthLabel } from '../helpers';
import type { SalesTotals } from '../data';

const GRID = 'minmax(80px,1.1fr) repeat(5,minmax(56px,1fr))';

export default function SalesView({ onOpenClosing }: { onOpenClosing: (closingId: string) => void }) {
  const { lang, isAr, chevron, chevronBack } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const names = LOC_NAMES[lang];
  const [mode, setMode] = useState<'day' | 'mtd'>('day');
  const [di, setDi] = useState(() => Math.max(0, SALES_DATES.indexOf(LAST_CLOSE_DATE)));
  const date = SALES_DATES[di] ?? LAST_CLOSE_DATE;
  const ym = date.slice(0, 7);

  const locs = LOC_ORDER.filter((l) => store.inScope(l));
  const totalsFor = (loc: LocId): SalesTotals => (mode === 'day' ? salesFor(loc, date) : monthSales(loc, ym, date));
  const rows = useMemo(() => locs.map((loc) => ({ loc, s: totalsFor(loc) })), [locs.join(), mode, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const combined = rows.reduce((a, r) => addSales(a, r.s), { ...ZERO_SALES });
  const catNames = [t.food, t.beverage, t.tobacco, t.tax];

  const closingFor = (loc: LocId) => store.state.closings.find((c) => c.loc === loc && c.date === date);

  const renderRow = (label: string, s: SalesTotals, bold: boolean, onClick?: () => void, key?: string) => (
    <div key={key ?? label} className={onClick ? 'row-hover' : undefined} onClick={onClick} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '11px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: bold ? P.hover : 'transparent', cursor: onClick ? 'pointer' : undefined }}>
      <div style={{ fontWeight: bold ? 700 : 600 }}>{label}</div>
      <div style={{ textAlign: 'end', fontWeight: 700 }} dir="ltr">{s.total ? money(s.total) : '—'}</div>
      {SALES_CATS.map((c) => (
        <div key={c} style={{ textAlign: 'end' }}>
          <div style={{ fontWeight: 600 }} dir="ltr">{s.total ? money(s[c]) : '—'}</div>
          <div style={{ fontSize: 10.5, color: P.text4 }} dir="ltr">{s.total ? pct((s[c] / s.total) * 100) : ''}</div>
        </div>
      ))}
    </div>
  );

  const navBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' };

  return (
    <div style={{ padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <Segmented size="lg" options={[{ value: 'day', label: t.dayView }, { value: 'mtd', label: t.mtdView }]} value={mode} onChange={setMode} />
        <button style={navBtn} disabled={di <= 0} onClick={() => setDi((i) => Math.max(0, i - 1))}>{chevronBack}</button>
        <span style={{ fontSize: 12.5, color: P.text3 }} dir={isAr ? undefined : 'ltr'}>{mode === 'day' ? longDate(date, isAr) : `${monthLabel(ym, isAr)} · ${isAr ? 'حتى' : 'to'} ${longDate(date, isAr)}`}</span>
        <button style={navBtn} disabled={di >= SALES_DATES.length - 1} onClick={() => setDi((i) => Math.min(SALES_DATES.length - 1, i + 1))}>{chevron}</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => toast(t.exportToast)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: 'none', background: P.ink, color: P.onInk, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.exportAcct}</button>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1.4, minWidth: 380, border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '10px 16px', fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
            <div>{t.location}</div><div style={{ textAlign: 'end' }}>{t.total}</div><div style={{ textAlign: 'end' }}>{t.food}</div><div style={{ textAlign: 'end' }}>{t.beverage}</div><div style={{ textAlign: 'end' }}>{t.tobacco}</div><div style={{ textAlign: 'end' }}>{t.tax}</div>
          </div>
          {rows.map((r) => {
            const cl = mode === 'day' ? closingFor(r.loc) : undefined;
            return renderRow(names[r.loc], r.s, false, cl ? () => onOpenClosing(cl.id) : undefined, r.loc);
          })}
          {store.scope === 'all' && renderRow(t.combined, combined, true)}
          <div style={{ padding: '10px 16px', fontSize: 11.5, color: P.text4 }}>{t.salesFoot}{mode === 'day' ? ` ${t.drillHint}.` : ''}</div>
        </div>
        <div style={{ flex: 1, minWidth: 300, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.mixTitle}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {SALES_CATS.map((c, i) => {
              const p = combined.total ? (combined[c] / combined.total) * 100 : 0;
              return (
                <div key={c}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{catNames[i]}</span><span style={{ color: P.text3 }} dir="ltr">{money(combined[c])} · {pct(p)}</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: P.borderRow, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: MIX_COLORS[i], width: `${p.toFixed(1)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, color: P.text4, marginTop: 12 }}>{t.mixFoot}</div>
        </div>
      </div>
    </div>
  );
}
