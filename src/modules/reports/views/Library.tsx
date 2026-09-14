import React from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import { useToast, P } from '../../../ui';
import { TEXT, type RptText } from '../text';
import { DOFF, MAXD, MONTHS, REPORTS, TODAY_D, weekRanges, type GenRep, type Group } from '../data';
import { ChipBtn, SBtn, SELECT } from './shared';

export interface HubPeriod { perM: number; perW: number; perD: number }

/** MGT-RPT-01 — report library: 7 daily / 6 weekly / 8 monthly, with period, week and day pickers. */
export function Library({ per, setPer, onGenerate }: { per: HubPeriod; setPer: (p: HubPeriod) => void; onGenerate: (rep: GenRep, from: string, to: string) => void }) {
  const { lang, isAr, chevron, chevronBack } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const scopeLabel = store.scope === 'all' ? t.all : t.locs[store.scope];

  const { perM, perW, perD } = per;
  const maxDay = MAXD[perM], mn0 = MONTHS[perM][0], isAug = perM === 7;
  const curD = Math.min(perD, maxDay);
  const weeks = weekRanges(perM);
  const curW = Math.min(perW, weeks.length - 1);
  // 1 Jan 2026 = Thursday
  const dow = (d: number) => t.dnames[(4 + DOFF[perM] + d - 1) % 7];
  const presets: [number, string][] = isAug ? [[TODAY_D, t.today], [TODAY_D - 1, t.yesterday]] : [[maxDay, t.lastDay + maxDay + ' ' + mn0]];

  const groups: [keyof RptText, Group][] = [['dailyT', 'daily'], ['weeklyT', 'weekly'], ['monthlyT', 'monthly']];

  const gen = (gk: Group, r: [string, string]) => {
    let from: string, to: string;
    if (gk === 'daily') { from = to = perM + '-' + curD; }
    else if (gk === 'weekly') { const w = weeks[curW]; from = perM + '-' + w.from; to = perM + '-' + w.to; }
    else { from = perM + '-1'; to = perM + '-' + maxDay; }
    onGenerate({ name: isAr ? r[1] : r[0], key: r[0], group: gk }, from, to);
  };

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: P.text3 }}>{t.hubHint} · <span style={{ fontWeight: 600, color: P.text }}>{scopeLabel}</span></div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: P.text3 }}>{t.period}:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setPer({ ...per, perM: Math.max(0, perM - 1) })} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>{chevronBack}</button>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: P.text, minWidth: 74, textAlign: 'center' }} dir="ltr">{mn0} 2026</span>
          <button onClick={() => setPer({ ...per, perM: Math.min(7, perM + 1) })} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${P.borderInput}`, background: perM === 7 ? P.thead : P.white, color: perM === 7 ? '#B4B09C' : P.text2, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>{chevron}</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {groups.map(([tk, gk]) => (
          <div key={gk}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t[tk] as string}</div>
              {gk === 'weekly' && weeks.map((w, i) => (
                <ChipBtn key={i} on={curW === i} onClick={() => setPer({ ...per, perW: i })} ltr>{t.week + (i + 1) + ' · ' + w.label}</ChipBtn>
              ))}
              {gk === 'daily' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {presets.map(([d, label]) => <ChipBtn key={d} on={curD === d} onClick={() => setPer({ ...per, perD: d })}>{label}</ChipBtn>)}
                  <select value={String(curD)} onChange={(e) => setPer({ ...per, perD: parseInt(e.target.value) })} dir="ltr" style={SELECT}>
                    {Array.from({ length: maxDay }, (_, i) => { const d = maxDay - i; return <option key={d} value={String(d)}>{dow(d) + ' ' + d + ' ' + mn0}</option>; })}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
              {REPORTS[gk].map((r) => (
                <div key={r[0]} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{isAr ? r[1] : r[0]}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <SBtn ink px={12} onClick={() => gen(gk, r)}>{t.generate}</SBtn>
                    <SBtn px={10} onClick={() => toast(t.schedToast)}>{t.schedule}</SBtn>
                    <SBtn px={10} onClick={() => toast(t.pdfToast)}>PDF</SBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: P.text4, marginTop: 14 }}>{t.hubNote}</div>
    </div>
  );
}
