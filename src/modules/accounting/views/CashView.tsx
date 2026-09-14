import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Btn, Input, Modal, Notice, P, money, num, shortDate, useToast } from '../../../ui';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { ShiftClosing } from '../../../store';
import { TEXT } from '../text';
import { cashInHand, confirmedTotal, declaredTotal, lbpShort, money0 } from '../helpers';

const GRID = 'minmax(90px,1fr) repeat(4,minmax(88px,1fr)) minmax(110px,1.1fr)';
const ST_ORDER: Record<ShiftClosing['status'], number> = { in_transit: 0, gap: 1, confirmed: 2 };

interface GapDraft { id: string; usd: string; lbp: string; whish: string; card: string; note: string }

export default function CashView({ focusId }: { focusId: string | null }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const rate = store.state.settings.fxRate;
  const tol = store.state.settings.cashTolerance;
  const names = LOC_NAMES[lang];

  const closings = useMemo(() => store.state.closings.filter((c) => store.inScope(c.loc))
    .slice().sort((a, b) => ST_ORDER[a.status] - ST_ORDER[b.status] || b.date.localeCompare(a.date) || a.loc.localeCompare(b.loc)), [store]);
  const pending = closings.filter((c) => c.status === 'in_transit');
  const transitTotal = pending.reduce((a, c) => a + declaredTotal(c), 0);
  const gapCount = closings.filter((c) => c.status === 'gap').length;
  const cash = cashInHand(store.state);

  const [gap, setGap] = useState<GapDraft | null>(null);
  const focusRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (focusId && focusRef.current) focusRef.current.scrollIntoView({ block: 'center' }); }, [focusId]);

  const who = (c: ShiftClosing) => `${names[c.loc]} · ${t.shifts[c.shift] ?? c.shift} · ${store.userName(c.submittedBy, isAr)}`;

  const applyConfirm = (c: ShiftClosing, conf: NonNullable<ShiftClosing['confirmed']>, note?: string) => {
    const decl = declaredTotal(c);
    const confT = conf.cashUsd + conf.cashLbp / c.rate + conf.whish + conf.card;
    const diff = confT - decl;
    const status: ShiftClosing['status'] = Math.abs(diff) > tol ? 'gap' : 'confirmed';
    store.update((d) => { const x = d.closings.find((y) => y.id === c.id); if (x) { x.confirmed = conf; x.status = status; } });
    store.logAudit({
      action: status === 'gap' ? 'Cash handover confirmed with gap' : 'Cash handover confirmed',
      entity: `${c.id} · ${names[c.loc]} · ${shortDate(c.date, isAr)}${note ? ' · ' + note : ''}`,
      oldValue: money(decl), newValue: money(confT), moduleId: 'accounting',
    });
    if (c.id === 'CLS-0811-R') store.dismissAlert('AL-010');
    if (status === 'gap') store.addAlert({ severity: 'red', type: 'cash_gap', loc: c.loc, moduleId: 'accounting', en: `${LOC_NAMES.en[c.loc]} closing ${shortDate(c.date)} handover gap ${money(diff, { sign: true })} — declared ${money(decl)}, confirmed ${money(confT)}`, ar: `فجوة تسليم إقفال ${LOC_NAMES.ar[c.loc]} ${shortDate(c.date, true)} ${money(diff, { sign: true })} — المعلن ${money(decl)}، المؤكد ${money(confT)}` });
    toast(status === 'gap' ? t.gapToast : t.confirmToast);
  };

  const confirmMatch = (c: ShiftClosing) => applyConfirm(c, { cashUsd: c.declared.cashUsd, cashLbp: c.declared.cashLbp, whish: c.declared.whish, card: c.declared.card });
  const openGap = (c: ShiftClosing) => setGap({ id: c.id, usd: String(c.declared.cashUsd), lbp: String(c.declared.cashLbp), whish: String(c.declared.whish), card: String(c.declared.card), note: '' });

  const gapClosing = gap ? closings.find((c) => c.id === gap.id) ?? store.state.closings.find((c) => c.id === gap.id) : undefined;
  const parse = (s: string) => { const v = parseFloat(s.replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  const gapConf = gap ? { cashUsd: parse(gap.usd), cashLbp: parse(gap.lbp), whish: parse(gap.whish), card: parse(gap.card) } : null;
  const gapDecl = gapClosing ? declaredTotal(gapClosing) : 0;
  const gapConfT = gapClosing && gapConf ? gapConf.cashUsd + gapConf.cashLbp / gapClosing.rate + gapConf.whish + gapConf.card : 0;
  const gapDiff = gapConfT - gapDecl;

  const fieldStyle: React.CSSProperties = { height: 44, width: '100%', borderRadius: 10, fontSize: 14 };
  const fieldLabel: React.CSSProperties = { fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 };

  return (
    <div style={{ padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: 1.4, minWidth: 280, background: P.ink, color: P.page, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.inkMuted, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.cashInHand}</div>
          <div style={{ display: 'flex', gap: 22, marginTop: 6, flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 23, fontWeight: 700 }} dir="ltr">{money0(cash.usd)}</div><div style={{ fontSize: 11, color: P.inkMuted }}>USD</div></div>
            <div><div style={{ fontSize: 23, fontWeight: 700 }} dir="ltr">{num(cash.lbp)}</div><div style={{ fontSize: 11, color: P.inkMuted }}>LBP <span dir="ltr">(= {money0(cash.lbp / rate)})</span></div></div>
          </div>
          <div style={{ fontSize: 11, color: P.inkMuted, marginTop: 4 }}>{t.cashNote}</div>
        </div>
        <div style={{ flex: 1, minWidth: 200, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.inTransit}</div>
          <div style={{ fontSize: 23, fontWeight: 700, marginTop: 4 }} dir="ltr">{money(transitTotal)}</div>
          <div style={{ fontSize: 11.5, color: P.text4, marginTop: 2 }}>{pending.length} {t.closingsUnit}</div>
        </div>
        <div style={{ flex: 1, minWidth: 200, background: P.redBg, border: `1px solid ${P.redBorder}`, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, color: P.redFg, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.openGaps}</div>
          <div style={{ fontSize: 23, fontWeight: 700, marginTop: 4, color: P.redFg }}>{gapCount}</div>
          <div style={{ fontSize: 11.5, color: P.redFg, marginTop: 2 }}>{t.gapSub}</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: P.text3, marginBottom: 12 }}>{t.cashHint}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {closings.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.text4, fontSize: 13.5 }}>{t.noClosings}</div>}
        {closings.map((c) => {
          const isPending = c.status === 'in_transit';
          const hasGap = c.status === 'gap';
          const confT = confirmedTotal(c);
          const decl = declaredTotal(c);
          const diff = confT != null ? confT - decl : 0;
          const st = isPending ? t.pendingSt : hasGap ? t.gapSt : t.confirmedSt;
          const stC = isPending ? [P.amberPill, P.amberFg] : hasGap ? [P.redPill, P.redFg] : [P.greenBg, P.greenFg];
          const border = hasGap ? P.redBorder : !isPending ? '#B9CDB9' : P.amberBorder;
          const decl4 = [[money(c.declared.cashUsd), 'USD'], [lbpShort(c.declared.cashLbp), 'LBP'], [money(c.declared.whish), 'Whish'], [money(c.declared.card), 'Card']];
          const conf4 = c.confirmed ? [money(c.confirmed.cashUsd), lbpShort(c.confirmed.cashLbp), money(c.confirmed.whish), money(c.confirmed.card)] : [];
          const focused = focusId === c.id;
          return (
            <div key={c.id} ref={focused ? focusRef : undefined} style={{ border: `1px solid ${border}`, background: P.card, borderRadius: 14, overflow: 'hidden', boxShadow: focused ? `0 0 0 2px ${P.ink}` : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{who(c)}</div>
                  <div style={{ fontSize: 12, color: P.text3, marginTop: 2 }} dir="ltr">{c.id} · {shortDate(c.date, isAr)} · {t.rateAt} {num(c.rate)}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 999, background: stC[0], color: stC[1], whiteSpace: 'nowrap' }}>{st}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '0 18px 12px', fontSize: 12.5 }}>
                <div style={{ color: P.text3 }}>{t.declaredRow}</div>
                {decl4.map(([v, l]) => (
                  <div key={l} style={{ textAlign: 'end' }}><span style={{ fontWeight: 600 }} dir="ltr">{v}</span><div style={{ fontSize: 10.5, color: P.text4 }}>{l}</div></div>
                ))}
                <div style={{ textAlign: 'end', fontWeight: 700 }} dir="ltr">{money(decl)}</div>
              </div>
              {c.confirmed && confT != null && (
                <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '0 18px 12px', fontSize: 12.5 }}>
                  <div style={{ color: P.text3 }}>{t.confirmedRow}</div>
                  {conf4.map((v, i) => <div key={i} style={{ textAlign: 'end' }}><span style={{ fontWeight: 600 }} dir="ltr">{v}</span></div>)}
                  <div style={{ textAlign: 'end' }}>
                    <span style={{ fontWeight: 700 }} dir="ltr">{money(confT)}</span>
                    {Math.abs(diff) >= 0.005 && (
                      <span style={{ marginInlineStart: 6, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: hasGap ? P.redPill : P.amberPill, color: hasGap ? P.redFg : P.amberFg }} dir="ltr">{money(diff, { sign: true })}</span>
                    )}
                  </div>
                </div>
              )}
              {isPending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderTop: `1px solid ${P.borderRow}`, background: P.thead, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, color: P.text2, flex: 1, minWidth: 200 }}>{t.confirmHint}</span>
                  <button onClick={() => confirmMatch(c)} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: 'none', background: P.ink, color: P.onInk, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.confirmFull}</button>
                  <button onClick={() => openGap(c)} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.rustFg, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.confirmWithGap}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: P.text4, marginTop: 10 }}>{t.cashFoot}</div>

      <Modal open={!!gap && !!gapClosing} onClose={() => setGap(null)} width={500} title={gapClosing ? `${t.gapTitle} — ${who(gapClosing)}` : t.gapTitle} sub={t.gapBody}
        footer={<>
          <Btn size="lg" variant="ghost" style={{ flex: 1, borderRadius: 10 }} onClick={() => setGap(null)}>{t.cancel}</Btn>
          <Btn size="lg" variant="primary" disabled={!gap?.note.trim()} style={{ flex: 1.4, fontWeight: 700, borderRadius: 10 }} onClick={() => { if (!gap || !gapClosing || !gapConf || !gap.note.trim()) return; applyConfirm(gapClosing, gapConf, gap.note.trim()); setGap(null); }}>{t.gapCta}</Btn>
        </>}>
        {gap && gapClosing && gapConf && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ ...fieldLabel, marginBottom: 0 }}>{t.confirmedArrived}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {([['usd', 'USD', money(gapClosing.declared.cashUsd)], ['lbp', 'LBP', num(gapClosing.declared.cashLbp)], ['whish', 'Whish', money(gapClosing.declared.whish)], ['card', 'Card', money(gapClosing.declared.card)]] as const).map(([k, l, d]) => (
                <div key={k}>
                  <div style={fieldLabel}>{l} <span style={{ textTransform: 'none', letterSpacing: 0 }}>· {t.declaredRow.toLowerCase()} <span dir="ltr">{d}</span></span></div>
                  <Input ltr value={gap[k]} onChange={(v) => setGap({ ...gap, [k]: v })} placeholder={k === 'lbp' ? t.gapPh1Lbp : t.gapPh1} style={fieldStyle} />
                </div>
              ))}
            </div>
            <Input value={gap.note} onChange={(v) => setGap({ ...gap, note: v })} placeholder={t.gapPh2} style={fieldStyle} />
            <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: P.text2, flexWrap: 'wrap' }}>
              <span>{t.declaredTotal} <b dir="ltr">{money(gapDecl)}</b></span>
              <span>{t.confirmedTotal} <b dir="ltr">{money(gapConfT)}</b></span>
              <span>{t.difference} <b dir="ltr" style={{ color: Math.abs(gapDiff) > tol ? P.redFg : P.greenFg }}>{money(gapDiff, { sign: true })}</b> <span style={{ color: P.text4 }}>({Math.abs(gapDiff) > tol ? t.beyondTol : t.withinTol} ±{money(tol)})</span></span>
            </div>
            <Notice tone="amber" style={{ marginTop: 5 }}>{t.gapWarn}</Notice>
          </div>
        )}
      </Modal>
    </div>
  );
}
