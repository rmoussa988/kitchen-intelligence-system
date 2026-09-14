import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, PageHeader, LocationSelector, ConfirmModal, Notice, Input, P, useToast, fmt, shortDate } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import type { Batch } from '../../store';
import { useModuleNav } from '../../shell/DesktopShell';
import { TEXT } from './text';
import { PRODUCT_ITEMS, PRODUCT_KEYS, RECIPE_IDS, TREND, productKeyFor, type ProductKey } from './data';
import { EXTRA_BATCHES, mergeGapSeed } from './seed';

const GRID = 'minmax(120px,1.5fr) minmax(88px,1fr) minmax(94px,1.1fr) minmax(120px,1.2fr)';
interface ModState { product: ProductKey }
const SEED: ModState = { product: 'taouk' };
type ModalSpec = { kind: 'accept' | 'flag'; id: string } | { kind: 'suggest' } | null;

/** Signed cost impact: a positive gapUsd is a loss (−$x), a negative one a saving (+$x). */
const costStr = (n: number) => (n > 0 ? '−' : n < 0 ? '+' : '') + '$' + Math.abs(n).toFixed(2);

/** MGT-PRD-06 — per-batch gap table (accept / flag), KPIs, 8-week trend, recipe-vs-process verdict, recipe-change suggestion. */
export default function ProductionGaps() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [ms, setMs] = useModuleState<ModState>('production-gaps', SEED);
  const [modal, setModal] = useState<ModalSpec>(null);
  const [note, setNote] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [sp] = useSearchParams();
  const warnPct = store.state.settings.productionGapAlertPct;

  // Seed: prototype gap rows the shared seed lacks (merged only if absent), then ?batch=<id> → select that batch's product tab and highlight the row
  useEffect(() => {
    store.update(mergeGapSeed);
    const id = sp.get('batch');
    const b = id ? store.state.batches.find((x) => x.id === id) ?? EXTRA_BATCHES.find((x) => x.id === id) : undefined;
    if (b) { setMs((d) => { d.product = productKeyFor(b.itemId); }); setHighlight(b.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const product = ms.product;
  const items = PRODUCT_ITEMS[product];
  const batches = store.state.batches
    .filter((b) => store.inScope(b.loc) && b.gapKg != null && (items == null || items.includes(b.itemId)))
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt));

  const rows = batches.map((b) => {
    const st = b.gapStatus ?? 'open';
    const gapPct = b.gapPct ?? 0;
    const big = gapPct > warnPct;
    const std = b.outputQty != null && b.standardPerUnit != null ? b.outputQty * b.standardPerUnit : null;
    const mar = b.marinadeUsed != null && b.marinadeRecommended != null ? b.marinadeUsed - b.marinadeRecommended : null;
    return { b, st, big, gapPct, std, mar, hasMar: mar != null && Math.abs(mar) >= 0.005, open: st === 'open' };
  });
  const openCount = rows.filter((r) => r.open).length;
  const avgPct = rows.length ? rows.reduce((a, r) => a + r.gapPct, 0) / rows.length : 0;
  const costTotal = rows.reduce((a, r) => a + (r.b.gapUsd ?? 0), 0);
  const prodName = t.products[product];
  const trend = TREND[product];
  const maxT = Math.max(...trend);

  const sign = (n: number) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));
  const signPct1 = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1) + '%';
  // Prototype hard-codes taouk → trend verdict; the other tabs (incl. the added "All products") follow the data.
  const verdict = product === 'taouk' ? t.trendVerdict : avgPct > warnPct ? t.aboveTol : t.withinTol;
  const entityOf = (b: Batch) => `${b.id} · ${sign(b.gapKg ?? 0)} KG`;

  const accept = (id: string) => {
    const b = store.state.batches.find((x) => x.id === id); if (!b) return;
    store.update((d) => { const x = d.batches.find((y) => y.id === id); if (x) x.gapStatus = 'accepted'; const p = x?.planId ? d.plans.find((y) => y.id === x.planId) : undefined; if (p) p.gapOpen = false; });
    for (const a of store.state.alerts) if (!a.dismissed && a.type === 'production_gap' && a.en.includes(id)) store.dismissAlert(a.id);
    store.logAudit({ action: 'Gap accepted', entity: entityOf(b), newValue: `${costStr(b.gapUsd ?? 0)} to cost`, moduleId: 'production-gaps' });
    setModal(null); toast(t.acceptToast);
  };
  const flag = (id: string) => {
    const b = store.state.batches.find((x) => x.id === id); if (!b) return;
    store.update((d) => { const x = d.batches.find((y) => y.id === id); if (x) x.gapStatus = 'flagged'; });
    // Close the batch's open gap alert first (as accept does), then raise the corrective-action alert — a single-alert transition, not a duplicate.
    for (const a of store.state.alerts) if (!a.dismissed && a.type === 'production_gap' && a.en.includes(id)) store.dismissAlert(a.id);
    store.addAlert({ severity: 'amber', type: 'production_gap', en: TEXT.en.flagAlert(id), ar: TEXT.ar.flagAlert(id), loc: b.loc, moduleId: 'production-gaps' });
    store.logAudit({ action: 'Gap flagged', entity: entityOf(b), newValue: 'corrective action → shift lead', moduleId: 'production-gaps' });
    setModal(null); toast(t.flagToast);
  };
  const suggest = () => {
    store.logAudit({ action: 'Recipe-change suggestion', entity: `${prodName} · standard review`, newValue: note || undefined, moduleId: 'production-gaps' });
    setModal(null); setNote(''); toast(t.suggestToast);
    go('recipes', { params: { recipe: RECIPE_IDS[product], suggest: '1', ...(note ? { note } : {}) } });
  };

  const modalBatch = modal && modal.kind !== 'suggest' ? rows.find((r) => r.b.id === modal.id) : undefined;

  return (
    <Page>
      <PageHeader title={t.title} screenId="MGT-PRD-06"
        right={<>
          <div style={{ display: 'flex', border: `1px solid ${P.borderInput}`, borderRadius: 9, overflow: 'hidden', background: P.white }}>
            {PRODUCT_KEYS.map((k) => (
              <button key={k} onClick={() => setMs((d) => { d.product = k; })} style={{ height: 34, padding: '0 13px', border: 'none', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: product === k ? P.text2 : 'transparent', color: product === k ? P.onInk : P.text3, whiteSpace: 'nowrap' }}>{t.products[k]}</button>
            ))}
          </div>
          <span style={{ fontSize: 12.5, color: P.text3 }}>{t.periodShort}</span>
          <LocationSelector />
        </>} />

      <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 170, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.avgGapPrefix} — {prodName}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: avgPct > warnPct ? P.redFg : P.text }} dir="ltr">{rows.length ? signPct1(avgPct) : '—'}</div>
            <div style={{ fontSize: 11.5, color: P.text4, marginTop: 2 }}>{product === 'taouk' ? t.vsStandard : t.vsStandardGeneric}</div>
          </div>
          <div style={{ flex: 1, minWidth: 170, background: P.redBg, border: `1px solid ${P.redBorder}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.redFg, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.costImpact}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: P.redFg }} dir="ltr">{costStr(costTotal)}</div>
            <div style={{ fontSize: 11.5, color: P.redFg, marginTop: 2 }}>{t.thisPeriod}</div>
          </div>
          <div style={{ flex: 1, minWidth: 170, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.openGaps}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{openCount}</div>
            <div style={{ fontSize: 11.5, color: P.text4, marginTop: 2 }}>{t.awaitingAccept}</div>
          </div>
          <div style={{ flex: 2, minWidth: 280, background: P.amberBg, border: `1px solid ${P.amberBorder}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.amberFg, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.verdictTitle}</div>
            <div style={{ fontSize: 13.5, color: P.amberFg, marginTop: 4, lineHeight: 1.5 }}>{verdict}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1.6, minWidth: 480 }}>
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '10px 16px', fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}`, position: 'sticky', top: 0, background: P.thead, zIndex: 2 }}>
                <div>{t.batch}</div><div style={{ textAlign: 'end' }}>{t.stdVsAct}</div><div style={{ textAlign: 'end' }}>{t.gap}</div><div style={{ textAlign: 'end' }}>{t.status}</div>
              </div>
              {rows.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.text4, fontSize: 13.5 }}>{t.noRows}</div>}
              {rows.map((r) => {
                const b = r.b;
                const gapColor = r.big ? P.redFg : P.amberFg;
                const bg = highlight === b.id ? P.hover : r.open && r.big ? '#FBF6F0' : 'transparent';
                return (
                  <div key={b.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '10px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: bg }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="ellipsis" style={{ fontWeight: 600 }}>{store.itemName(b.itemId, isAr)}</div>
                      <div style={{ fontSize: 11.5, color: P.text4, lineHeight: 1.4 }} dir="ltr">{b.id} · {shortDate(b.completedAt ?? b.startedAt, isAr)} · {store.userName(b.employee, isAr)}</div>
                    </div>
                    <div style={{ textAlign: 'end' }}>
                      <div style={{ fontWeight: 600 }} dir="ltr">{b.rawUsed != null ? fmt(b.rawUsed) + ' KG' : '—'}</div>
                      <div style={{ fontSize: 11, color: P.text4 }} dir="ltr">{t.stdShort} {r.std != null ? fmt(r.std) + ' KG' : '—'}</div>
                    </div>
                    <div style={{ textAlign: 'end' }}>
                      <div style={{ fontWeight: 700, color: gapColor }} dir="ltr">{sign(b.gapKg ?? 0)} KG</div>
                      <div style={{ fontSize: 11, color: gapColor }} dir="ltr">{sign(r.gapPct)}% · {costStr(b.gapUsd ?? 0)}</div>
                      {r.hasMar && <div style={{ fontSize: 10.5, color: P.text4 }} dir="ltr">{t.marShort} {sign(r.mar ?? 0)} KG</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {r.open && <>
                        <button onClick={() => setModal({ kind: 'accept', id: b.id })} style={{ height: 28, padding: '0 10px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.accept}</button>
                        <button onClick={() => setModal({ kind: 'flag', id: b.id })} style={{ height: 28, padding: '0 10px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.rustFg, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.flag}</button>
                      </>}
                      {r.st === 'accepted' && <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: P.greenBg, color: P.greenFg, whiteSpace: 'nowrap' }}>{t.acceptedPill}</span>}
                      {r.st === 'flagged' && <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: P.rustBg, color: P.rustFg, whiteSpace: 'nowrap' }}>{t.flaggedPill}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: P.text4, marginTop: 8 }}>{t.tableNote}</div>
          </div>

          <div style={{ flex: 1, minWidth: 330, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, flex: 1 }}>{t.trendPrefix} — {prodName}</div>
                <span style={{ fontSize: 11.5, color: P.text4 }}>{t.trendSub}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110, marginTop: 14 }} dir="ltr">
                {trend.map((v, i) => {
                  const hot = v > warnPct;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: hot ? P.amberFg : P.text3, fontWeight: 600 }}>+{v.toFixed(0)}%</span>
                      <div style={{ width: '100%', height: Math.max(8, (v / maxT) * 78), background: hot ? P.amberDot : P.inkMuted, borderRadius: '4px 4px 0 0' }} />
                      <span style={{ fontSize: 9.5, color: P.text4 }}>W{i + 1}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '10px 13px', borderRadius: 10, background: P.amberBg, border: `1px solid ${P.amberBorder}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none' }} />
                <span style={{ fontSize: 12.5, color: P.amberFg, lineHeight: 1.5 }}>{verdict}</span>
              </div>
            </div>
            <div style={{ background: P.ink, color: P.page, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.decisionTitle}</div>
              <div style={{ fontSize: 13.5, color: P.inkText, lineHeight: 1.6, marginTop: 8 }}>{t.decisionBody}</div>
              <button onClick={() => { setNote(''); setModal({ kind: 'suggest' }); }} style={{ marginTop: 12, height: 42, padding: '0 18px', borderRadius: 10, border: 'none', background: '#EDE6D6', color: '#14171A', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.suggestCta}</button>
            </div>
            <div style={{ fontSize: 12, color: P.text4 }}>{t.feedNote}</div>
          </div>
        </div>
      </div>

      <ConfirmModal open={modal?.kind === 'accept'} onCancel={() => setModal(null)} onConfirm={() => modal?.kind === 'accept' && accept(modal.id)} title={t.acceptTitle} body={t.acceptBody} cta={t.acceptCtaM} cancelLabel={t.cancel}>
        {modalBatch && <div style={{ fontSize: 12.5, color: P.text2, marginBottom: 10 }} dir="ltr">{modalBatch.b.id} · {sign(modalBatch.b.gapKg ?? 0)} KG · {sign(modalBatch.gapPct)}% · {costStr(modalBatch.b.gapUsd ?? 0)}</div>}
        <Notice tone="amber">{t.acceptWarn}</Notice>
      </ConfirmModal>
      <ConfirmModal open={modal?.kind === 'flag'} onCancel={() => setModal(null)} onConfirm={() => modal?.kind === 'flag' && flag(modal.id)} title={t.flagTitle} body={t.flagBody} cta={t.flagCtaM} cancelLabel={t.cancel}>
        <Notice tone="amber">{t.flagWarn}</Notice>
      </ConfirmModal>
      <ConfirmModal open={modal?.kind === 'suggest'} onCancel={() => setModal(null)} onConfirm={suggest} title={t.suggestTitle} body={t.suggestBody} cta={t.suggestCtaM} cancelLabel={t.cancel}>
        <Input value={note} onChange={setNote} placeholder={t.suggestPh} width="100%" style={{ height: 44, borderRadius: 10, fontSize: 14, marginBottom: 14 }} />
        <Notice tone="amber">{t.suggestWarn}</Notice>
      </ConfirmModal>
    </Page>
  );
}
