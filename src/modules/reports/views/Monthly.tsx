import React from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useModuleNav } from '../../../shell/DesktopShell';
import { P } from '../../../ui';
import { TEXT } from '../text';
import { CATS, DRIFT, PROFIT } from '../data';
import { CARD, CARD_PAD, UC_HEAD, UC_TITLE } from './shared';

/** MGT-RPT-03 — monthly costing: food-cost % actual vs theoretical, purchase variance, waste vs target, category bars, recipe drift, product profitability. */
export function Monthly() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const go = useModuleNav();
  const maxN = Math.max(...CATS.map((c) => c.n));
  const toRecipe = (id?: string) => (id ? go('recipes', { params: { recipe: id } }) : go('recipes'));

  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, background: P.ink, color: P.page, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.inkMuted, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.foodCostActual}</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2 }} dir="ltr">27.4%</div>
          <div style={{ fontSize: 12, color: P.inkMuted, marginTop: 2 }} dir="ltr">{t.theoretical}: 26.1% · {t.gap}: +1.3pt</div>
        </div>
        <div style={{ flex: 1, minWidth: 200, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.foodCostDollar}</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2 }} dir="ltr">$9,412</div>
          <div style={{ fontSize: 12, color: P.text3, marginTop: 2 }} dir="ltr">{t.purchaseVar}: +$268</div>
        </div>
        <div style={{ flex: 1, minWidth: 200, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.wastePct}</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2 }} dir="ltr">2.1%</div>
          <div style={{ fontSize: 12, color: P.text3, marginTop: 2 }}>{t.target} ≤ 2.0%</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={CARD_PAD}>
            <div style={UC_TITLE}>{t.costMovement}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
              {CATS.map((c) => (
                <div key={c.cat} onClick={() => go('items', { params: { cat: c.cat } })} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                  <span style={{ width: 110, flex: 'none' }}>{isAr ? c.ar : c.en}</span>
                  <div style={{ flex: 1, height: 16, background: '#EDEAE0', borderRadius: 4, overflow: 'hidden', display: 'flex' }} dir="ltr">
                    <div style={{ width: Math.round(c.n / maxN * 100) + '%', background: c.up ? '#B08968' : '#8FA88F', height: '100%' }} />
                  </div>
                  <span style={{ width: 66, textAlign: 'end', fontWeight: 600, color: c.up ? P.brownFg : P.greenFg }} dir="ltr">{c.val}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={CARD_PAD}>
            <div style={UC_TITLE}>{t.recipeDrift}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {DRIFT.map((d) => (
                <div key={d.en} className="row-hover" onClick={() => toRecipe(d.recipe)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: d.over ? P.redBg : '#F3F1E8', fontSize: 13, cursor: 'pointer' }}>
                  <span style={{ flex: 1, fontWeight: 600 }}>{isAr ? d.ar : d.en}</span>
                  <span dir="ltr" style={{ color: P.text3 }}>{d.move}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: d.over ? P.redPill : P.greenBg, color: d.over ? P.redFg : P.greenFg }}>{d.over ? t.overPill : t.okPill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...CARD, flex: 1.2, minWidth: 380 }}>
          <div style={UC_HEAD}>{t.profitability}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(96px,1.3fr) 50px 72px 72px 58px', gap: 10, padding: '9px 18px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}` }}>
            <div>{t.item}</div><div style={{ textAlign: 'end' }}>{t.sold}</div><div style={{ textAlign: 'end' }}>{t.revenue}</div><div style={{ textAlign: 'end' }}>{t.cost}</div><div style={{ textAlign: 'end' }}>{t.margin}</div>
          </div>
          {PROFIT.map((p) => (
            <div key={p.en} className="row-hover" onClick={() => toRecipe(p.recipe)} style={{ display: 'grid', gridTemplateColumns: 'minmax(96px,1.3fr) 50px 72px 72px 58px', gap: 10, padding: '9px 18px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: p.best ? '#F0F3EA' : p.worst ? '#FBF6F0' : 'transparent', cursor: 'pointer' }}>
              <div className="ellipsis" style={{ fontWeight: 600 }}>{isAr ? p.ar : p.en}</div>
              <div style={{ textAlign: 'end' }} dir="ltr">{p.sold}</div>
              <div style={{ textAlign: 'end' }} dir="ltr">{p.rev}</div>
              <div style={{ textAlign: 'end' }} dir="ltr">{p.cost}</div>
              <div style={{ textAlign: 'end', fontWeight: 700, color: p.best ? P.greenFg : p.worst ? P.redFg : P.text }} dir="ltr">{p.m.toFixed(1)}%</div>
            </div>
          ))}
          <div style={{ padding: '10px 18px', fontSize: 11.5, color: P.text4 }}>{t.profitNote}</div>
        </div>
      </div>
    </div>
  );
}
