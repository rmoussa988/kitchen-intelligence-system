import React from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import { useModuleNav } from '../../../shell/DesktopShell';
import { useToast, P } from '../../../ui';
import { TEXT } from '../text';
import { DAILY, moneyS } from '../data';
import { SBtn } from './shared';

/** MGT-RPT-02 — daily variance ranked by $ impact, evidence counts, 7-day trend; Investigate → Variance module. */
export function Daily() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const isAll = store.scope === 'all';

  const rows = DAILY.filter((d) => isAll || d.loc === store.scope);
  const dNetV = rows.reduce((a, d) => a + d.impact, 0);
  const barVals = [-38, -22, -31, -18, -26, -35, Math.round(Math.abs(dNetV))];
  const grid = isAll ? '28px minmax(120px,1.4fr) 88px 84px 84px 84px 76px 158px' : '28px minmax(120px,1.4fr) 84px 84px 84px 76px 158px';

  const assign = (d: typeof DAILY[number]) => {
    const name = isAr ? d.ar : d.en;
    store.logAudit({ action: 'Corrective action assigned', entity: `${d.itemId} ${d.en} · ${t.locs[d.loc]}`, newValue: `${t.impact} ${moneyS(d.impact)}`, moduleId: 'reports' });
    toast(t.assignToast + ' ' + name);
  };

  return (
    <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 22px', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flex: 'none' }}>
        <div style={{ flex: 1, background: P.ink, color: P.page, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.inkMuted, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.netToday}</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: '#E5A9A0' }} dir="ltr">{moneyS(dNetV).replace('+', '')}</div>
        </div>
        <div style={{ flex: 1, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.vsYesterday}</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: P.greenFg }} dir="ltr">+$8.20</div>
        </div>
        <div style={{ flex: 2, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.dayOverDay}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 36, marginTop: 6 }} dir="ltr">
            {barVals.map((v, i) => (
              <div key={i} title={'−$' + Math.abs(v)} style={{ flex: 1, height: Math.round(Math.abs(v) / 40 * 100) + '%', background: i === barVals.length - 1 ? P.text2 : '#C6C0AB', borderRadius: '3px 3px 0 0' }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: `1px solid ${P.border}`, borderRadius: 12, background: P.card }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 16px', fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}`, position: 'sticky', top: 0, background: P.thead, zIndex: 2 }}>
          <div>#</div><div>{t.item}</div>
          {isAll && <div>{t.location}</div>}
          <div style={{ textAlign: 'end' }}>{t.theoretical}</div><div style={{ textAlign: 'end' }}>{t.actual}</div><div style={{ textAlign: 'end' }}>{t.impact}</div><div style={{ textAlign: 'end' }}>{t.evidenceCt}</div><div />
        </div>
        {rows.map((d, i) => (
          <div key={d.itemId + d.loc} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: Math.abs(d.impact) > 10 ? '#FBF6F0' : 'transparent' }}>
            <div style={{ fontWeight: 700, color: P.text4 }}>{i + 1}</div>
            <div style={{ minWidth: 0 }}>
              <div className="ellipsis" style={{ fontWeight: 600 }}>{isAr ? d.ar : d.en}</div>
              <div style={{ fontSize: 11.5, color: P.text4 }}>{isAr ? d.en : d.ar}</div>
            </div>
            {isAll && <div style={{ color: P.text2, fontSize: 12.5 }}>{t.locs[d.loc]}</div>}
            <div style={{ textAlign: 'end' }} dir="ltr">{d.theo}</div>
            <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{d.act}</div>
            <div style={{ textAlign: 'end', fontWeight: 700, color: d.impact > 0 ? P.greenFg : P.redFg }} dir="ltr">{moneyS(d.impact)}</div>
            <div style={{ textAlign: 'end', color: P.blueFg }}>{d.evd + ' ' + t.linked}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <SBtn ink h={28} px={10} onClick={() => go('variance', { params: { item: d.itemId, loc: d.loc } })}>{t.investigate}</SBtn>
              <SBtn h={28} px={10} onClick={() => assign(d)}>{t.assign}</SBtn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
