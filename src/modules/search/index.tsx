import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLang, arDigits } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import { useModuleNav } from '../../shell/DesktopShell';
import { Page, PageHeader, Body, useToast, money, fmt, shortDate, timeHM, P } from '../../ui';
import { TEXT, TAG_STYLE } from './text';
import { TRACE, TRACE_ID, QUICK_CHIPS, SCANS, ASSIGN, STAGE_COLORS, SEARCH_SEED } from './data';
import type { Route, SearchState } from './data';
import { buildIndex, KIND_ORDER } from './build';
import type { Entry } from './build';
import { EXTRA_DELIVERIES, EXTRA_TRANSFERS, EXTRA_WASTE } from './seed';

const smallBtn: React.CSSProperties = { height: 34, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' };

export default function SearchModule() {
  const { lang, isAr, backGlyph } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const location = useLocation();
  const [params] = useSearchParams();
  const inStaff = location.pathname.startsWith('/staff');
  const chevron = isAr ? '←' : '→';

  const [tab, setTab] = useState<'search' | 'qr'>(() => (params.get('tab') === 'qr' || inStaff ? 'qr' : 'search'));
  const [query, setQuery] = useState(() => params.get('q') ?? TRACE_ID);
  const [view, setView] = useState<'results' | 'trace'>(() => (params.get('q') ? 'results' : 'trace'));
  const [scanned, setScanned] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [ms, setMs] = useModuleState<SearchState>('search', SEARCH_SEED);

  // records referenced by the trace timeline — merged once, only if absent
  useEffect(() => {
    store.update((d) => {
      for (const x of EXTRA_DELIVERIES) if (!d.deliveries.some((y) => y.id === x.id)) d.deliveries.push(x);
      for (const x of EXTRA_TRANSFERS) if (!d.transfers.some((y) => y.id === x.id)) d.transfers.push(x);
      for (const x of EXTRA_WASTE) if (!d.waste.some((y) => y.id === x.id)) d.waste.push(x);
    });
  }, []);

  const index = useMemo(() => buildIndex(store.state, TEXT), [store.state]);
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const list = q ? index.filter((e) => e.haystack.includes(q)) : index;
    return list.slice().sort((a, b) => {
      const ae = a.ref.toLowerCase() === q ? 0 : 1, be = b.ref.toLowerCase() === q ? 0 : 1;
      if (ae !== be) return ae - be;
      return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    }).slice(0, 60);
  }, [index, q]);

  // The trace batch's PRODUCTION hop is derived from the store batch so it agrees with the store-derived result row.
  const trace = useMemo(() => {
    const b = store.state.batches.find((x) => x.id === TRACE_ID);
    if (!b || b.outputQty == null) return TRACE;
    const out = b.outputQty;
    const cpu = out && b.cost != null ? b.cost / out : 0;
    const emp = store.userName(b.employee, false);
    return TRACE.map((h) => h.key === 'PRODUCTION'
      ? { ...h,
          title: [`Batch ${b.id} — ${out} skewers`, `الدفعة ${b.id} — ${arDigits(out)} سيخاً`] as [string, string],
          detail: `${fmt(b.rawUsed ?? 0)} KG raw → yield ${b.yieldPct ?? 0}% · ${money(cpu)}/PCS · approved by ${emp}` }
      : h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.state.batches, store.state.users]);

  // Scans that open a store record (e.g. the transfer receive screen) show facts derived from that record.
  const scans = useMemo(() => SCANS.map((sc) => {
    const r = sc.route;
    if (r && r[0] === 'staff-tablet' && r[1].screen === 'rd') {
      const trf = store.state.transfers.find((x) => x.id === r[1].id);
      if (trf) {
        const value = trf.lines.reduce((a, l) => a + (l.sent ?? l.requested) * l.cost, 0);
        const facts: [string, string][] = [
          ['Lines', String(trf.lines.length)],
          ['Sent', trf.sentAt ? `${shortDate(trf.sentAt, false)} ${timeHM(trf.sentAt)}` : '—'],
          ['Value', money(value)],
        ];
        return { ...sc, facts };
      }
    }
    return sc;
  }), [store.state.transfers]);

  const follow = (route: Route, ref: string) => {
    if (route) go(route[0], { params: route[1] });
    else toast(`${t.openToast} ${ref}`);
  };
  const openEntry = (e: Entry) => { if (e.trace) setView('trace'); else follow(e.route, e.ref); };

  const sr = scanned !== null ? scans[scanned] : null;
  const screenId = tab === 'search' ? 'MGT-SRCH-01' : 'STF-QR-01';

  return (
    <Page>
      <PageHeader title={t.title} screenId={screenId}
        tabs={Object.assign([{ value: 'search', label: t.searchTab }, { value: 'qr', label: t.qrTab }], { active: tab, onChange: (v: string) => setTab(v as 'search' | 'qr') })} />

      {tab === 'search' && (
        <Body pad="18px 22px" gap={0}>
          <div style={{ maxWidth: 920, margin: '0 auto', width: '100%' }}>
            <input value={query} onChange={(e) => { setQuery(e.target.value); setView('results'); }} placeholder={t.searchPh}
              style={{ width: '100%', height: 52, padding: '0 20px', borderRadius: 14, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 16, fontFamily: 'inherit', color: P.text, outline: 'none', boxShadow: '0 2px 8px rgba(31,36,31,.05)' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {QUICK_CHIPS.map((label) => (
                <button key={label} onClick={() => { setQuery(label); setView(label === TRACE_ID ? 'trace' : 'results'); }} dir="ltr" style={{ height: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>{label}</button>
              ))}
            </div>

            {view === 'results' && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {results.map((r) => {
                  const ts = TAG_STYLE[r.kind];
                  return (
                    <button key={r.kind + r.ref} className="row-hover" onClick={() => openEntry(r)} style={{ textAlign: 'start', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${P.border}`, background: P.card, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', color: P.text }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: ts[0], color: ts[1], whiteSpace: 'nowrap' }}>{t.kinds[r.kind]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title[isAr ? 1 : 0]}</div>
                        <div style={{ fontSize: 12, color: P.text3, marginTop: 1 }}>{r.sub[isAr ? 1 : 0]}</div>
                      </div>
                      {r.trace && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: P.purpleBg, color: P.purpleFg, whiteSpace: 'nowrap' }}>{t.openTrace}</span>}
                      <span style={{ fontSize: 11.5, color: P.blueFg, whiteSpace: 'nowrap' }} dir="ltr">{r.ref}</span>
                      <span style={{ color: P.text4 }}>{chevron}</span>
                    </button>
                  );
                })}
                {results.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.text4, fontSize: 13.5 }}>{t.noResults}</div>}
              </div>
            )}

            {view === 'trace' && (
              <div className="fade-in" style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 700 }} dir="ltr">{TRACE_ID}</div>
                    <div style={{ fontSize: 13, color: P.text3, marginTop: 2 }}>{t.traceSub}</div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => toast(t.exportToast)} style={smallBtn}>{t.exportTrace}</button>
                  <button onClick={() => setView('results')} style={smallBtn}>{backGlyph} {t.results}</button>
                </div>
                <div style={{ marginTop: 16, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, insetInlineStart: 15, width: 2, background: '#D5CFBC' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {trace.map((h) => (
                      <div key={h.key} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: P.card, border: `2px solid ${P.borderInput}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', zIndex: 1, fontSize: 13 }}>{h.glyph}</div>
                        <div style={{ flex: 1, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: STAGE_COLORS[h.key] ?? P.text2 }}>{h.stage[isAr ? 1 : 0]}</span>
                            <span style={{ fontSize: 11, color: P.text4 }} dir="ltr">{h.when}</span>
                            <div style={{ flex: 1 }} />
                            <button onClick={() => follow(h.route, h.ref)} style={{ fontSize: 11.5, color: P.blueFg, background: 'transparent', border: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer' }} dir="ltr">{h.ref} {chevron}</button>
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{h.title[isAr ? 1 : 0]}</div>
                          <div style={{ fontSize: 12.5, color: P.text3, marginTop: 2 }} dir="ltr">{h.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: P.text4, marginTop: 12 }}>{t.traceNote}</div>
              </div>
            )}
          </div>
        </Body>
      )}

      {tab === 'qr' && (
        <Body pad="18px 22px" gap={0}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Staff scan (dark card) */}
            <div style={{ flex: 1, minWidth: 340, background: P.ink, color: P.page, borderRadius: 16, padding: '22px 24px' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.staffScan} · STF-QR-01</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>{t.scanHint}</div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scans.map((sd, i) => (
                  <button key={sd.code} onClick={() => setScanned(i)} style={{ textAlign: 'start', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${scanned === i ? P.inkMuted : P.inkBorder}`, background: P.ink2, cursor: 'pointer', fontFamily: 'inherit', color: P.page }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={P.inkMuted} strokeWidth="1.6"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM18 18h3v3h-3z" /></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }} dir="ltr">{sd.code}</div>
                      <div style={{ fontSize: 11.5, color: P.inkMuted, marginTop: 1 }}>{isAr ? sd.hintAr : sd.hintEn}</div>
                    </div>
                    <span style={{ fontSize: 14, color: P.inkMuted }}>{chevron}</span>
                  </button>
                ))}
              </div>
              {sr && (
                <div className="pop-up" style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: '#161F19', border: '1px solid #3B5A46' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: '#7FA98A' }}>{t.recognised}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{sr.title[isAr ? 1 : 0]}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    {sr.facts.map((f) => (
                      <div key={f[0]} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <span style={{ color: P.inkMuted }}>{f[0]}</span><span style={{ fontWeight: 600 }} dir="ltr">{f[1]}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => follow(sr.route, sr.code)} style={{ fontSize: 12, color: '#7FA98A', marginTop: 10, background: 'transparent', border: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'start', fontWeight: 600 }}>{sr.action[isAr ? 1 : 0]}</button>
                </div>
              )}
              <div style={{ fontSize: 11.5, color: P.inkMuted, marginTop: 12 }}>{t.fallbackNote}</div>
            </div>

            {/* Generate & assign (management) */}
            <div style={{ flex: 1.2, minWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, flex: 1 }}>{t.assignTitle}</div>
                <button onClick={() => toast(t.printToast)} style={{ ...smallBtn, fontWeight: 600 }}>{t.printSelected}{Object.values(checked).filter(Boolean).length ? ` (${Object.values(checked).filter(Boolean).length})` : ''}</button>
              </div>
              <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(140px,1.5fr) 100px minmax(110px,1fr) 90px', gap: 10, padding: '9px 14px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
                  <div /><div>{t.entity}</div><div>{t.kind}</div><div>{t.code}</div><div>{t.status}</div>
                </div>
                {ASSIGN.map((a, i) => {
                  const gen = ms.generated[String(i)];
                  const assigned = a.assigned || !!gen;
                  const ks = TAG_STYLE[a.kind];
                  const ck = !!checked[i];
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px minmax(140px,1.5fr) 100px minmax(110px,1fr) 90px', gap: 10, padding: '9px 14px', fontSize: 12.5, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
                      <button onClick={() => setChecked((p) => ({ ...p, [i]: !p[i] }))} style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${ck ? P.ink : P.borderInput}`, background: ck ? P.ink : 'transparent', color: P.onInk, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{ck ? '✓' : ''}</button>
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.name[isAr ? 1 : 0]}</div>
                        <div style={{ fontSize: 11, color: P.text4 }}>{a.sub}</div>
                      </div>
                      <div><span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: ks[0], color: ks[1] }}>{t.kinds[a.kind]}</span></div>
                      <div style={{ color: P.blueFg, fontSize: 11.5 }} dir="ltr">{gen ?? a.code}</div>
                      <div>
                        {assigned
                          ? <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: P.greenBg, color: P.greenFg }}>{t.printed}</span>
                          : <button onClick={() => { const code = a.genCode ?? `QR-${a.sub}`; setMs((d) => { d.generated[String(i)] = code; }); store.logAudit({ action: 'QR code assigned', entity: `${a.name[0]} · ${a.sub}`, newValue: code, moduleId: 'search' }); toast(t.genToast); }} style={{ height: 26, padding: '0 10px', borderRadius: 7, border: 'none', background: P.ink, color: P.onInk, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.generate}</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: P.text4 }}>{t.qrNote}</div>
            </div>
          </div>
        </Body>
      )}
    </Page>
  );
}
