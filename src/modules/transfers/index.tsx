import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';
import { useStore } from '../../store';
import type { Transfer, TransferLine } from '../../store';
import { Page, PageHeader, Body, LocationSelector, GridTable, KpiCard, useToast, money, shortDate, timeHM, P } from '../../ui';
import { useModuleNav } from '../../shell/DesktopShell';
import { TEXT } from './text';
import { EXTRA_TRANSFERS } from './seed';

const GRID = 'minmax(110px,1fr) minmax(130px,1.2fr) minmax(120px,1fr) 84px minmax(120px,1fr) minmax(110px,1fr) 30px';
const DETAIL_GRID = 'minmax(140px,1.5fr) 76px 76px 76px 86px minmax(110px,1fr)';
type StKey = 'requested' | 'pending' | 'confirmed' | 'flagged';
const ST_STYLE: Record<StKey, [string, string]> = { requested: ['#E6E2DA', '#6E6A5E'], pending: ['#F5E3B3', '#8A6D1F'], confirmed: ['#E0E8DA', '#48603A'], flagged: ['#F0CFC9', '#96382E'] };
const stKey = (x: Transfer): StKey => (x.status === 'sent' ? 'pending' : x.status);
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function TransfersModule() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [params] = useSearchParams();
  const pId = params.get('id');
  const [openId, setOpenId] = useState<string | null>(pId ?? 'TRF-1038');
  useEffect(() => { if (pId) setOpenId(pId); }, [pId]);

  // Merge the prototype's extra transfer once, only if absent.
  useEffect(() => {
    store.update((d) => { for (const x of EXTRA_TRANSFERS) if (!d.transfers.some((y) => y.id === x.id)) d.transfers.push(x); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { transfers, alerts, settings } = store.state;
  const tolPct = settings.varianceTolerancePct;
  const isAll = store.scope === 'all';
  const arrow = isAr ? ' ← ' : ' → ';

  const visible = useMemo(() => {
    const v = transfers.filter((x) => isAll || x.from === store.scope || x.to === store.scope);
    // prototype order: transfers (newest first), open requests last
    const rank = (x: Transfer) => (x.status === 'requested' ? 1 : 0);
    return [...v].sort((a, b) => rank(a) - rank(b) || ((b.sentAt ?? b.requestedAt) < (a.sentAt ?? a.requestedAt) ? -1 : 1));
  }, [transfers, isAll, store.scope]);

  const calc = (x: Transfer) => {
    const sumReq = x.lines.reduce((a, l) => a + l.requested, 0);
    const anySent = x.lines.some((l) => l.sent != null), anyConf = x.lines.some((l) => l.confirmed != null);
    const sumSent = anySent ? x.lines.reduce((a, l) => a + (l.sent ?? 0), 0) : null;
    const sumConf = anyConf ? x.lines.reduce((a, l) => a + (l.confirmed ?? 0), 0) : null;
    const value = x.lines.reduce((a, l) => a + (l.confirmed ?? l.sent ?? l.requested) * l.cost, 0);
    const varValue = sumConf !== null ? r2(x.lines.reduce((a, l) => a + ((l.confirmed ?? 0) - (l.sent ?? 0)) * l.cost, 0)) : 0;
    const hasVar = sumConf !== null && varValue !== 0;
    return { sumReq, sumSent, sumConf, value, varValue, hasVar };
  };
  const stats = useMemo(() => visible.map((x) => ({ x, ...calc(x) })), [visible]);
  const confirmedValue = visible.filter((x) => x.status === 'confirmed' || x.status === 'flagged').reduce((a, x) => a + x.lines.reduce((b, l) => b + (l.confirmed ?? 0) * l.cost, 0), 0);
  const kpiVar = stats.filter((s) => s.hasVar).length;
  const kpiUnrec = visible.filter((x) => x.status === 'sent').length;
  const kpiReq = visible.filter((x) => x.status === 'requested').length;

  /* ── actions ── */
  const investigate = (x: Transfer) => {
    const flagged = x.lines.find((l) => l.flag || (l.confirmed != null && l.sent != null && l.confirmed !== l.sent)) ?? x.lines[0];
    go('variance', { params: { item: flagged.itemId, loc: x.to, transfer: x.id } });
  };
  const chase = (x: Transfer) => {
    const locName = t.locs[x.to];
    const already = alerts.some((a) => !a.dismissed && a.type === 'transfer_chase' && a.en.includes(x.id));
    if (!already) store.addAlert({ severity: 'amber', type: 'transfer_chase', en: TEXT.en.chaseAlert(x.id, TEXT.en.locs[x.to]), ar: TEXT.ar.chaseAlert(x.id, TEXT.ar.locs[x.to]), loc: x.to, moduleId: 'transfers' });
    store.logAudit({ action: 'Transfer chased', entity: `${x.id} · ${TEXT.en.locs[x.from]} → ${TEXT.en.locs[x.to]}`, newValue: `Reminder to ${TEXT.en.locs[x.to]}`, moduleId: 'transfers' });
    toast(`${t.chaseToast} ${locName}`);
  };
  const stockCards = (x: Transfer) => go('inventory', { params: { item: x.lines[0].itemId, loc: x.status === 'requested' ? x.from : x.to } });

  const lineVar = (l: TransferLine) => {
    const dv = l.confirmed != null && l.sent != null ? l.confirmed - l.sent : null;
    const pct = dv !== null && l.sent ? (Math.abs(dv) / l.sent) * 100 : 0;
    return { dv, beyond: dv !== null && dv !== 0 && pct > tolPct };
  };

  return (
    <Page>
      <PageHeader title={t.title} screenId="MGT-TRF-04" right={<LocationSelector />} />
      <Body pad="16px 22px" gap={12} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 12, flex: 'none' }}>
          <KpiCard flex={1.2} tone="ink" label={t.valueMoved} value={money(confirmedValue)} sub={`${t.thisWeek} · ${t.atCost}`} />
          <KpiCard tone="red" label={t.openVar} value={kpiVar} />
          <KpiCard tone="amber" label={t.unreceived} value={kpiUnrec} />
          <KpiCard label={t.openRequests} value={kpiReq} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          <div style={{ fontSize: 12.5, color: P.text3 }}>{t.hint}</div>
          <div style={{ flex: 1 }} />
          <button onClick={() => toast(t.exportToast)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.export}</button>
        </div>
        <GridTable cols={GRID} style={{ flex: 1, minHeight: 0 }} empty={t.empty}
          head={[t.transfer, t.route, { label: t.reqSentConf, align: 'end' }, { label: t.value, align: 'end' }, t.status, t.variance, '']}>
          {stats.map(({ x, sumReq, sumSent, sumConf, value, varValue, hasVar }) => {
            const sk = stKey(x);
            const st = ST_STYLE[sk];
            const beyond = x.status === 'flagged';
            const open = openId === x.id;
            const when = x.sentAt ?? x.requestedAt;
            return (
              <div key={x.id}>
                <div className="row-hover" onClick={() => setOpenId(open ? null : x.id)}
                  style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '10px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', cursor: 'pointer', background: beyond ? '#FBF6F0' : 'transparent' }}>
                  <div>
                    <div style={{ fontWeight: 600 }} dir="ltr">{x.id}</div>
                    <div style={{ fontSize: 11.5, color: P.text4 }}><span dir="ltr">{shortDate(when, isAr)} {timeHM(when)}</span> · {x.lines.length} {t.lines}</div>
                  </div>
                  <div style={{ fontSize: 12.5, color: P.text2 }}>{t.locs[x.from]}{arrow}{t.locs[x.to]}</div>
                  <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{sumReq} → {sumSent ?? '—'} → {sumConf ?? '—'}</div>
                  <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{money(value)}</div>
                  <div><span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: st[0], color: st[1], whiteSpace: 'nowrap' }}>{t.st[sk]}</span></div>
                  <div>
                    {hasVar
                      ? <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: beyond ? P.redPill : P.amberPill, color: beyond ? P.redFg : P.amberFg, whiteSpace: 'nowrap' }} dir="ltr">{money(varValue, { sign: true })}</span>
                      : <span style={{ fontSize: 12, color: '#C6C0AB' }}>—</span>}
                  </div>
                  <div style={{ textAlign: 'end', color: P.text4, fontSize: 15 }}>{open ? '▾' : '▸'}</div>
                </div>
                {open && (
                  <div className="fade-in" style={{ background: '#F3F1E8', borderBottom: `1px solid ${P.borderRow}`, padding: '12px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: DETAIL_GRID, gap: 10, padding: '0 0 8px', fontSize: 10.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                      <div>{t.item}</div><div style={{ textAlign: 'end' }}>{t.requested}</div><div style={{ textAlign: 'end' }}>{t.sent}</div><div style={{ textAlign: 'end' }}>{t.confirmed}</div><div style={{ textAlign: 'end' }}>{t.value}</div><div>{t.lineVariance}</div>
                    </div>
                    {x.lines.map((l) => {
                      const { dv, beyond: lb } = lineVar(l);
                      return (
                        <div key={l.itemId} style={{ display: 'grid', gridTemplateColumns: DETAIL_GRID, gap: 10, padding: '7px 0', fontSize: 12.5, alignItems: 'center', borderTop: `1px solid ${P.borderRow}` }}>
                          <div style={{ minWidth: 0 }}>
                            <div className="ellipsis" style={{ fontWeight: 600 }}>{store.itemName(l.itemId, isAr)}</div>
                            <div className="ellipsis" style={{ fontSize: 11, color: P.text4 }}>{store.itemName(l.itemId, !isAr)} · <span dir="ltr">${l.cost.toFixed(2)} / {l.unit}</span></div>
                          </div>
                          <div style={{ textAlign: 'end' }} dir="ltr">{l.requested} {l.unit}</div>
                          <div style={{ textAlign: 'end' }} dir="ltr">{l.sent != null ? `${l.sent} ${l.unit}` : '—'}</div>
                          <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{l.confirmed != null ? `${l.confirmed} ${l.unit}` : '—'}</div>
                          <div style={{ textAlign: 'end' }} dir="ltr">{money((l.confirmed ?? l.sent ?? l.requested) * l.cost)}</div>
                          <div>
                            {dv !== null && dv !== 0 && (
                              <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: lb ? P.redPill : P.amberPill, color: lb ? P.redFg : P.amberFg }} dir="ltr">
                                {dv > 0 ? '+' : '−'}{Math.abs(dv)} {l.unit} · {money(dv * l.cost, { sign: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {beyond && <button onClick={() => investigate(x)} style={{ height: 32, padding: '0 13px', borderRadius: 8, border: 'none', background: P.ink, color: P.onInk, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.investigate}</button>}
                      {x.status === 'sent' && <button onClick={() => chase(x)} style={{ height: 32, padding: '0 13px', borderRadius: 8, border: `1px solid ${P.amberBorder}`, background: P.amberBg, color: P.amberFg, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.chase}</button>}
                      <button onClick={() => stockCards(x)} style={{ height: 32, padding: '0 13px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>{t.stockCards}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </GridTable>
        <div style={{ fontSize: 12, color: P.text4, flex: 'none' }}>{t.footNote}</div>
      </Body>
    </Page>
  );
}
