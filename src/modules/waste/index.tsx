import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';
import { useStore } from '../../store';
import type { LocId, WasteRecord } from '../../store';
import { useModuleNav } from '../../shell/DesktopShell';
import { Page, PageHeader, Body, LocationSelector, ConfirmModal, useToast, money, fmt, shortDate, timeHM, P } from '../../ui';
import { TEXT, reasonLabel } from './text';
import { TREND, WASTE_TARGET_PCT, PCT_BY_SCOPE, PERIOD_LABEL } from './data';

type Cut = 'reason' | 'location' | 'employee' | 'product';
const CUT_KEYS: Cut[] = ['reason', 'location', 'employee', 'product'];
const BAR_COLOR = '#B08968';
/** Quantities as typed in the prototype ('2.4 KG', '14 PCS'): up to 2 decimals, never padded. */
const qtyFmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

const ST_STYLE: Record<WasteRecord['status'], [string, string]> = {
  approved: ['#E0E8DA', '#48603A'],
  pending: ['#F5E3B3', '#8A6D1F'],
  auto: ['#E6E2DA', '#6E6A5E'],
  rejected: ['#F0CFC9', '#96382E'],
};

const btnBase: React.CSSProperties = { height: 32, padding: '0 13px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' };

/** Shape of the slice the Reports (B7) thresholds tab persists via useModuleState('reports'). */
type ReportsModuleState = { bands?: Record<string, { warn?: string } | undefined> };

export default function WasteModule() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [params] = useSearchParams();
  const highlightId = params.get('id');

  const [cut, setCut] = useState<Cut>('reason');
  const [drill, setDrill] = useState<{ cut: Cut; key: string } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const isAll = store.scope === 'all';
  const locName = (l: LocId) => t.locs[l];

  // ── data ──
  const visible = useMemo(() => store.state.waste.filter((w) => store.inScope(w.loc)).slice().sort((a, b) => (a.ts < b.ts ? 1 : -1)), [store]);
  const counted = useMemo(() => visible.filter((w) => w.status !== 'rejected'), [visible]);
  const queue = useMemo(() => visible.filter((w) => w.status === 'pending'), [visible]);

  const labelOf = (c: Cut, k: string): string =>
    c === 'reason' ? reasonLabel(k, isAr) : c === 'location' ? locName(k as LocId) : c === 'employee' ? store.userName(k, isAr) : store.itemName(k, isAr);
  const keyOf = (w: WasteRecord, c: Cut): { key: string; label: string } => {
    const key = c === 'reason' ? w.reason : c === 'location' ? w.loc : c === 'employee' ? w.employee : w.itemId;
    return { key, label: labelOf(c, key) };
  };

  const cutRows = useMemo(() => {
    const m = new Map<string, { key: string; label: string; val: number }>();
    for (const w of counted) {
      const k = keyOf(w, cut);
      const cur = m.get(k.key) ?? { ...k, val: 0 };
      cur.val += w.cost;
      m.set(k.key, cur);
    }
    const rows = [...m.values()].sort((a, b) => b.val - a.val);
    const max = Math.max(1, ...rows.map((r) => r.val));
    const total = rows.reduce((a, r) => a + r.val, 0) || 1;
    return rows.map((r) => ({ ...r, w: Math.round((r.val / max) * 100) + '%', pct: Math.round((r.val / total) * 100) + '%' }));
  }, [counted, cut, isAr]);

  const topRows = useMemo(() => {
    const m = new Map<string, { itemId: string; qty: number; unit: string; val: number }>();
    for (const w of counted) {
      const cur = m.get(w.itemId) ?? { itemId: w.itemId, qty: 0, unit: w.unit, val: 0 };
      cur.qty += w.qty; cur.val += w.cost;
      m.set(w.itemId, cur);
    }
    return [...m.values()].sort((a, b) => b.val - a.val).slice(0, 6);
  }, [counted]);

  const records = useMemo(() => (drill ? visible.filter((w) => keyOf(w, drill.cut).key === drill.key) : visible),
    [visible, drill]);

  const totalWaste = counted.reduce((a, w) => a + w.cost, 0);
  const totalKg = counted.filter((w) => w.unit === 'KG').reduce((a, w) => a + w.baseQty, 0);
  const pct = PCT_BY_SCOPE[store.scope];
  // Target follows the B7 "Waste % of sales" warn band saved in Reports & Alerts (MGT-RPT-05); 2.0 when unset.
  const bandWarn = parseFloat((store.state.modules.reports as ReportsModuleState | undefined)?.bands?.waste?.warn ?? '');
  const wasteTarget = Number.isFinite(bandWarn) ? bandWarn : WASTE_TARGET_PCT;
  const overTarget = pct > wasteTarget;
  const trendMax = Math.max(...TREND);

  // ── highlight from ?id= ──
  const rowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (highlightId && rowRef.current) rowRef.current.scrollIntoView({ block: 'center' }); }, [highlightId]);

  // ── actions ──
  const decide = () => {
    const c = confirm; if (!c) return;
    const w = store.state.waste.find((x) => x.id === c.id); if (!w) { setConfirm(null); return; }
    const item = store.item(w.itemId);
    const entity = `${w.id} · ${item?.en ?? w.itemId} ${qtyFmt(w.qty)} ${w.unit}`;
    if (c.action === 'approve') {
      store.postMovement({ type: 'waste', itemId: w.itemId, loc: w.loc, qty: -w.baseQty, enteredQty: w.qty, enteredUnit: w.unit, value: -w.cost, source: w.id, sourceKind: 'waste', user: w.employee });
      store.update((d) => { const r = d.waste.find((x) => x.id === c.id); if (r) r.status = 'approved'; });
      store.logAudit({ action: 'Waste approved', entity, newValue: `−${money(w.cost)} at cost`, moduleId: 'waste' });
      toast(t.approveToast);
    } else {
      store.update((d) => { const r = d.waste.find((x) => x.id === c.id); if (r) r.status = 'rejected'; });
      store.logAudit({ action: 'Waste rejected', entity, newValue: 'no stock movement', moduleId: 'waste' });
      toast(t.rejectToast);
    }
    // Clear the per-record alert(s) raised by the staff screen (text carries the record id) …
    store.update((d) => { for (const a of d.alerts) if (a.type === 'waste_pending' && !a.dismissed && a.en.includes(c.id)) a.dismissed = true; });
    // … and the seed count alert once nothing is left in the queue (its text has no record id).
    const remaining = store.state.waste.filter((x) => x.status === 'pending' && x.id !== c.id).length;
    if (remaining === 0) store.dismissAlert('AL-007');
    setConfirm(null);
  };

  const confirmRec = confirm ? store.state.waste.find((x) => x.id === confirm.id) : undefined;
  const when = (ts: string) => `${shortDate(ts, isAr)} ${timeHM(ts)}`;
  const recGrid = isAll ? '82px minmax(110px,1.3fr) 86px 90px 60px 64px 66px 78px' : '82px minmax(110px,1.3fr) 90px 60px 64px 66px 78px';

  return (
    <Page>
      <PageHeader title={t.title} screenId="MGT-WST-02" right={
        <>
          <span style={{ fontSize: 12.5, color: P.text3, whiteSpace: 'nowrap' }}>{t.period}: <span style={{ fontWeight: 600, color: P.text }} dir="ltr">{PERIOD_LABEL}</span></span>
          <LocationSelector />
        </>
      } />
      <Body pad="16px 22px" gap={0}>
        {queue.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.amberFg, marginBottom: 8 }}>{t.approvalQueue} ({queue.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queue.map((q) => (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${P.amberBorder}`, background: '#FDF9EE', borderRadius: 12, flexWrap: 'wrap', outline: q.id === highlightId ? `2px solid ${P.amberDot}` : undefined }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{store.itemName(q.itemId, isAr)} · <span dir="ltr">{qtyFmt(q.qty)} {q.unit}</span> · <span dir="ltr" style={{ color: P.redFg }}>{money(q.cost)}</span></div>
                    <div style={{ fontSize: 12, color: P.text3, marginTop: 2 }}>{locName(q.loc)} · {store.userName(q.employee, isAr)} · <span dir="ltr">{when(q.ts)}</span></div>
                  </div>
                  {q.photoUrl ? (
                    <button onClick={() => setLightbox(q.photoUrl ?? null)} title={t.viewPhoto} style={{ padding: 0, border: `1px solid ${P.border}`, borderRadius: 8, background: P.white, cursor: 'pointer', lineHeight: 0, flex: 'none' }}>
                      <img src={q.photoUrl} alt={t.photoAttached} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 7, display: 'block' }} />
                    </button>
                  ) : q.photo ? (
                    <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: P.chip, color: P.text3 }}>📷 {t.photoAttached}</span>
                  ) : null}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#EDEAE0', color: P.text3 }}>{reasonLabel(q.reason, isAr)}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setConfirm({ id: q.id, action: 'approve' })} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: 'none', background: P.ink, color: P.onInk, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.approve}</button>
                    <button onClick={() => setConfirm({ id: q.id, action: 'reject' })} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.redBorder}`, background: P.white, color: P.redFg, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.reject}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1.1, minWidth: 170, background: P.ink, color: P.page, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.inkMuted, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.totalWaste}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }} dir="ltr">{money(totalWaste)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 150, background: P.surface, border: `1px solid ${overTarget ? P.amberBorder : P.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.wastePct}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2, color: overTarget ? P.amberFg : P.text }} dir="ltr">{pct.toFixed(1)}%</div>
            <div style={{ fontSize: 11.5, color: P.text3, marginTop: 2 }}>{t.target} ≤ {wasteTarget.toFixed(1)}%</div>
          </div>
          <div style={{ flex: 1, minWidth: 150, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.wasteKg}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }} dir="ltr">{fmt(totalKg, 1)} KG</div>
          </div>
          <div style={{ flex: 1.6, minWidth: 220, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.trend}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 34, marginTop: 6 }} dir="ltr">
              {TREND.map((v, i) => (
                <div key={i} title={'$' + v.toFixed(1)} style={{ flex: 1, height: Math.round((v / trendMax) * 100) + '%', background: v > 15 ? P.amberDot : i === TREND.length - 1 ? P.text2 : '#C6C0AB', borderRadius: '2px 2px 0 0' }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Left: cuts + top */}
          <div style={{ flex: 1, minWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, flex: 1 }}>{t.byCut}</div>
                {CUT_KEYS.map((k) => {
                  const on = cut === k;
                  return <button key={k} onClick={() => setCut(k)} style={{ height: 28, padding: '0 11px', borderRadius: 999, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cuts[k]}</button>;
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
                {cutRows.map((cr) => (
                  <div key={cr.key} onClick={() => { setDrill({ cut, key: cr.key }); toast(`${t.drillToast} ${cr.label}`); }} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                    <span style={{ width: 120, flex: 'none', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cr.label}</span>
                    <div style={{ flex: 1, height: 16, background: '#EDEAE0', borderRadius: 4, overflow: 'hidden' }} dir="ltr">
                      <div style={{ width: cr.w, height: '100%', background: BAR_COLOR }} />
                    </div>
                    <span style={{ width: 76, textAlign: 'end', fontWeight: 600 }} dir="ltr">{money(cr.val)}</span>
                    <span style={{ width: 44, textAlign: 'end', color: P.text3, fontSize: 12 }} dir="ltr">{cr.pct}</span>
                  </div>
                ))}
                {cutRows.length === 0 && <div style={{ fontSize: 12.5, color: P.text4 }}>{t.noRecords}</div>}
              </div>
            </div>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${P.border}`, background: P.thead, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.top10}</div>
              {topRows.map((tr, i) => (
                <div key={tr.itemId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: `1px solid ${P.borderRow}`, fontSize: 12.5 }}>
                  <span style={{ width: 18, fontWeight: 700, color: P.text4 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{store.itemName(tr.itemId, isAr)}</span>
                  <span style={{ color: P.text3 }} dir="ltr">{qtyFmt(tr.qty)} {tr.unit}</span>
                  <span style={{ width: 70, textAlign: 'end', fontWeight: 700, color: P.redFg }} dir="ltr">{money(tr.val)}</span>
                </div>
              ))}
              {topRows.length === 0 && <div style={{ padding: '14px 18px', fontSize: 12.5, color: P.text4 }}>{t.noRecords}</div>}
            </div>
          </div>

          {/* Right: records */}
          <div style={{ flex: 1.2, minWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, flex: 1 }}>{t.records}</div>
              {drill && (
                <button onClick={() => setDrill(null)} style={{ height: 28, padding: '0 10px', borderRadius: 999, border: `1px solid ${P.amberBorder}`, background: P.amberPill, color: P.amberFg, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {t.cuts[drill.cut]}: {labelOf(drill.cut, drill.key)} <span style={{ opacity: .7 }}>✕</span>
                </button>
              )}
              <button onClick={() => toast(t.exportToast)} style={btnBase}>{t.export}</button>
              <button onClick={() => { toast(t.configToast); go('reports', { params: { tab: 'thresholds' } }); }} style={btnBase}>{t.configure}</button>
            </div>
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: recGrid, gap: 10, padding: '9px 14px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
                <div>{t.when}</div><div>{t.product}</div>
                {isAll && <div>{t.location}</div>}
                <div>{t.reason}</div><div>{t.by}</div><div style={{ textAlign: 'end' }}>{t.qtyCol}</div><div style={{ textAlign: 'end' }}>{t.cost}</div><div>{t.status}</div>
              </div>
              {records.map((rc) => {
                const st = ST_STYLE[rc.status];
                const hl = rc.id === highlightId;
                return (
                  <div key={rc.id} ref={hl ? rowRef : undefined} title={rc.id} style={{ display: 'grid', gridTemplateColumns: recGrid, gap: 10, padding: '9px 14px', fontSize: 12.5, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: hl ? P.hover : rc.status === 'pending' ? '#FDF9EE' : 'transparent', boxShadow: hl ? `inset ${isAr ? '-3px' : '3px'} 0 0 ${P.amberDot}` : undefined }}>
                    <div style={{ color: P.text3, fontSize: 11.5 }} dir="ltr">{when(rc.ts)}</div>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.itemName(rc.itemId, isAr)}</div>
                    {isAll && <div style={{ color: P.text2, fontSize: 12 }}>{locName(rc.loc)}</div>}
                    <div><span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#EDEAE0', color: P.text3, whiteSpace: 'nowrap' }}>{reasonLabel(rc.reason, isAr)}</span></div>
                    <div style={{ color: P.text2, fontSize: 12 }}>{store.userName(rc.employee, isAr)}</div>
                    <div style={{ textAlign: 'end' }} dir="ltr">{qtyFmt(rc.qty)} {rc.unit}</div>
                    <div style={{ textAlign: 'end', fontWeight: 600, color: P.redFg }} dir="ltr">{money(rc.cost)}</div>
                    <div><span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: st[0], color: st[1], whiteSpace: 'nowrap' }}>{t[rc.status]}</span></div>
                  </div>
                );
              })}
              {records.length === 0 && <div style={{ padding: 36, textAlign: 'center', color: P.text4, fontSize: 13 }}>{t.noRecords}</div>}
            </div>
            <div style={{ fontSize: 12, color: P.text4 }}>{t.note}</div>
          </div>
        </div>
      </Body>

      <ConfirmModal
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={decide}
        title={confirm?.action === 'reject' ? t.rejectTitle : t.approveTitle}
        body={confirm?.action === 'reject' ? t.rejectBody : t.approveBody}
        cta={confirm?.action === 'reject' ? t.reject : t.approve}
        ctaVariant={confirm?.action === 'reject' ? 'danger' : 'primary'}
      >
        {confirmRec && (
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{store.itemName(confirmRec.itemId, isAr)} · <span dir="ltr">{qtyFmt(confirmRec.qty)} {confirmRec.unit}</span> · <span dir="ltr" style={{ color: P.redFg }}>{money(confirmRec.cost)}</span></div>
            <div style={{ fontSize: 12, color: P.text3, marginTop: 2 }}>{locName(confirmRec.loc)} · {store.userName(confirmRec.employee, isAr)} · {reasonLabel(confirmRec.reason, isAr)} · <span dir="ltr">{confirmRec.id}</span></div>
          </div>
        )}
      </ConfirmModal>

      {lightbox && (
        <div onClick={() => setLightbox(null)} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,22,20,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, cursor: 'zoom-out' }}>
          <img src={lightbox} alt={t.photoAttached} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '86vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', cursor: 'default' }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: isAr ? undefined : 24, left: isAr ? 24 : undefined, height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: P.white, color: P.text, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.closePhoto}</button>
        </div>
      )}
    </Page>
  );
}
