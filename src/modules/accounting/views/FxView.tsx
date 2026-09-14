import React, { useState } from 'react';
import { P, num, shortDate, useToast, DEMO_TODAY } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import { TEXT } from '../text';
import { longDate } from '../helpers';

export default function FxView() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const rate = store.state.settings.fxRate;
  const today = DEMO_TODAY.slice(0, 10);
  const todayEntry = store.state.fxHistory.find((f) => f.date === today);
  const appliedTo = todayEntry ? todayEntry.closings : store.state.closings.filter((c) => c.date === today).length;
  const [val, setVal] = useState(String(rate));

  const whoLabel = (id: string) => {
    const u = store.state.users.find((x) => x.id === id);
    const name = store.userName(id, isAr);
    if (!u) return name;
    return u.role === 'owner' ? `${name} (${t.roleOwner})` : u.role === 'accountant' ? `${name} (${t.roleAccountant})` : name;
  };

  const setFx = () => {
    const v = Math.round(parseFloat(val.replace(/[^0-9.]/g, '')));
    if (!v || v <= 0) return;
    const old = rate;
    const cu = store.state.settings.currentUser;
    store.update((d) => {
      d.settings.fxRate = v;
      const e = d.fxHistory.find((x) => x.date === today);
      if (e) { e.rate = v; e.setBy = cu; } else d.fxHistory.unshift({ date: today, rate: v, setBy: cu, closings: d.closings.filter((c) => c.date === today).length });
      for (const c of d.closings) if (c.date === today && c.status === 'in_transit') c.rate = v;
    });
    store.logAudit({ action: 'FX rate set', entity: `USD/LBP · ${shortDate(today)}`, oldValue: num(old), newValue: num(v), moduleId: 'accounting' });
    toast(t.fxToast);
  };

  return (
    <div style={{ padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.2, minWidth: 320, background: P.ink, color: P.page, borderRadius: 16, padding: '24px 28px' }}>
          <div style={{ fontSize: 12, color: P.inkMuted, textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.todayRate} · <span dir={isAr ? undefined : 'ltr'}>{longDate(today, isAr)}</span></div>
          <div style={{ fontSize: 44, fontWeight: 700, marginTop: 8 }} dir="ltr">1 USD = {num(rate)} LBP</div>
          <div style={{ fontSize: 13, color: P.inkMuted, marginTop: 6 }}>{t.setByWho} {whoLabel(todayEntry?.setBy ?? store.state.settings.currentUser)} · {t.appliedTo} <b>{appliedTo}</b> {t.closingsWord}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setFx(); }} dir="ltr"
              style={{ width: 150, height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.text2}`, background: P.ink2, fontSize: 17, fontWeight: 700, fontFamily: 'inherit', color: P.page, outline: 'none', textAlign: 'center' }} />
            <button onClick={setFx} style={{ height: 44, padding: '0 18px', borderRadius: 10, border: 'none', background: '#EDE6D6', color: '#14171A', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.setRate}</button>
            <span style={{ fontSize: 12, color: P.inkMuted }}>{t.fxLockNote}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 300, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: P.thead, borderBottom: `1px solid ${P.border}`, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.rateHistory}</div>
          {store.state.fxHistory.slice().sort((a, b) => b.date.localeCompare(a.date)).map((fx) => (
            <div key={fx.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: `1px solid ${P.borderRow}`, fontSize: 13 }}>
              <span style={{ color: P.text3, width: 92 }} dir="ltr">{shortDate(fx.date, isAr)}</span>
              <span style={{ fontWeight: 700, flex: 1 }} dir="ltr">{num(fx.rate)}</span>
              <span style={{ color: P.text3, fontSize: 12 }}>{whoLabel(fx.setBy)}</span>
              <span style={{ color: P.text4, fontSize: 12 }} dir="ltr">{fx.closings} {t.closingsUnit}</span>
            </div>
          ))}
          <div style={{ padding: '10px 18px', fontSize: 11.5, color: P.text4 }}>{t.fxFoot}</div>
        </div>
      </div>
    </div>
  );
}
