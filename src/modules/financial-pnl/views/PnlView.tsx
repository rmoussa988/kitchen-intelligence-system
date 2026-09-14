import React, { useMemo, useState } from 'react';
import { Btn, LocationSelector, Modal, Notice, P, Segmented, useToast } from '../../../ui';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { LocId } from '../../../store';
import { useModuleNav } from '../../../shell/DesktopShell';
import { TEXT } from '../text';
import { MONTHS, monthKey } from '../data';
import type { PnlState } from '../data';
import { buildPnl } from '../compute';
import type { Drill } from '../compute';
import { monthLabel } from '../../accounting/helpers';

const GRID = '1fr 104px 70px';

export default function PnlView({ month, setMonth, ms, setMs }: { month: string; setMonth: (m: string) => void; ms: PnlState; setMs: (r: (d: PnlState) => void) => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const scope = store.scope;
  const key = monthKey(scope, month);
  const isFinal = !!ms.finalMonths[key];
  const isProvisional = !isFinal;
  const [modal, setModal] = useState(false);
  const names = LOC_NAMES[lang] as unknown as Record<LocId, string>;

  const pnl = useMemo(() => buildPnl({ scope, month, expenses: store.state.expenses, rate: store.state.settings.fxRate, provisional: isProvisional, t, isAr, locNames: names }), [scope, month, store.state.expenses, store.state.settings.fxRate, isProvisional, t, isAr, names]);

  const drill = (d: Drill) => {
    if (d === 'sales') go('accounting', { params: { tab: 'sales' } });
    else if (d === 'expenses') go('accounting', { params: { tab: 'expenses' } });
    else if (d === 'cogs') go('pnl');
    else toast(`${t.drillToast} ${t.payroll}`);
  };

  const markFinal = () => {
    // The prototype's modalGo only flags the month Final and never touches grants. Month state is keyed per
    // scope ('rock:2026-08') but grants carry only the month, so finalising one location must NOT expire a
    // month-wide 'until reconciliation ends' grant that still spans the other scopes.
    setMs((d) => {
      d.finalMonths[key] = true;
    });
    store.logAudit({ action: 'Month marked Final', entity: `Financial P&L · ${t.locs[scope]} · ${monthLabel(month)}`, oldValue: 'Provisional', newValue: 'Final · locked', moduleId: 'financial-pnl' });
    setModal(false);
    toast(t.finalToast);
  };

  return (
    <div style={{ padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <LocationSelector size="lg" style={{ borderRadius: 9 }} />
        <Segmented size="lg" style={{ borderRadius: 9 }} options={MONTHS.map((m) => ({ value: m, label: <span dir={isAr ? undefined : 'ltr'}>{monthLabel(m, isAr)}</span> }))} value={month} onChange={setMonth} />
        <div style={{ flex: 1 }} />
        <button onClick={() => toast(t.exportToast)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: 'none', background: P.ink, color: P.onInk, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>{t.exportAcct}</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 12, background: isProvisional ? P.amberBg : '#EAF0E4', border: `1px solid ${isProvisional ? P.amberBorder : '#B9CDB9'}`, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: isProvisional ? P.amberDot : P.greenFg, color: '#FFFFFF', whiteSpace: 'nowrap' }}>{isProvisional ? t.provisional : t.finalSt}</span>
        <span style={{ fontSize: 13, color: isProvisional ? P.amberFg : P.greenFg, flex: 1, minWidth: 240, lineHeight: 1.5 }}>{isProvisional ? t.provText : t.finalText}</span>
        {isProvisional && (
          <button onClick={() => setModal(true)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.amberBorder}`, background: P.white, color: P.amberFg, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>{t.markFinal}</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.5, minWidth: 400, border: `1px solid ${P.border}`, borderRadius: 14, background: P.card, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '10px 18px', fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
            <div>{t.locs[scope]} · <span dir="ltr">{monthLabel(month, isAr)}</span></div><div style={{ textAlign: 'end' }}>{t.value}</div><div style={{ textAlign: 'end' }}>{t.pctOfSales}</div>
          </div>
          {pnl.lines.map((st) => (
            <div key={st.key} className="row-hover" onClick={() => drill(st.drill)} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '9px 18px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: st.band ? P.hover : 'transparent', cursor: 'pointer' }}>
              <div style={{ fontWeight: st.bold ? 700 : 500, color: st.color ?? P.text, paddingInlineStart: st.sub ? 16 : 0 }}>
                {st.label}
                {st.pending && <span style={{ marginInlineStart: 8, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: P.amberPill, color: P.amberFg }}>{t.pendingChip}</span>}
              </div>
              <div style={{ textAlign: 'end', fontWeight: st.bold ? 700 : 500, color: st.color ?? P.text }} dir="ltr">{st.display}</div>
              <div style={{ textAlign: 'end', color: P.text3, fontSize: 12 }} dir="ltr">{st.p}</div>
            </div>
          ))}
          <div style={{ padding: '10px 18px', fontSize: 11.5, color: P.text4 }}>{t.stmtFoot}</div>
        </div>
        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isProvisional && (
            <div style={{ background: P.amberBg, border: `1px solid ${P.amberBorder}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.amberFg }}>{t.waitingOn}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {pnl.waiting.map((w) => (
                  <div key={w.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: P.white, border: '1px solid #EBDDBA' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                      <div style={{ fontSize: 11.5, color: P.amberFg, marginTop: 1 }}>{w.sub}</div>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: P.amberFg }} dir="ltr">{w.est}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: P.amberFg, marginTop: 10, lineHeight: 1.5 }}>{t.waitingNote}</div>
            </div>
          )}
          {isFinal && (
            <div style={{ background: '#EAF0E4', border: '1px solid #B9CDB9', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.greenFg }}>{t.finalTitle}</div>
              <div style={{ fontSize: 13, color: P.greenFg, marginTop: 8, lineHeight: 1.6 }}>{t.finalBody}</div>
            </div>
          )}
          <div style={{ background: P.ink, color: P.page, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.twoPnls}</div>
            <div style={{ fontSize: 13, color: P.inkText, lineHeight: 1.65, marginTop: 8 }}>{t.twoPnlsBody}</div>
          </div>
          <div style={{ fontSize: 12, color: P.text4 }}>{t.accrualNote}</div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} width={480} title={t.finalModalT} sub={t.finalModalB}
        footer={<>
          <Btn size="lg" variant="ghost" style={{ flex: 1, borderRadius: 10 }} onClick={() => setModal(false)}>{t.cancel}</Btn>
          <Btn size="lg" variant="primary" style={{ flex: 1.4, fontWeight: 700, borderRadius: 10 }} onClick={markFinal}>{t.finalModalCta}</Btn>
        </>}>
        <Notice tone="amber">{t.finalModalW}</Notice>
      </Modal>
    </div>
  );
}
