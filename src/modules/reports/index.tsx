import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import { Page, PageHeader, LocationSelector, useToast } from '../../ui';
import { TEXT, type RptText } from './text';
import { BANDS, TH, THRESHOLD_SEED, TODAY_D, weekRanges, type GenRep, type ThresholdState } from './data';
import { EXTRA_ALERTS } from './seed';
import { Library, type HubPeriod } from './views/Library';
import { GenerateModal } from './views/GenerateModal';
import { Daily } from './views/Daily';
import { Monthly } from './views/Monthly';
import { Compare } from './views/Compare';
import { AlertsView } from './views/Alerts';
import { Thresholds } from './views/Thresholds';

type TabKey = 'library' | 'daily' | 'monthly' | 'compare' | 'alerts' | 'thresholds';
const TABS: { value: TabKey; tk: keyof RptText; screen: string }[] = [
  { value: 'library', tk: 'hub', screen: 'MGT-RPT-01' },
  { value: 'daily', tk: 'daily', screen: 'MGT-RPT-02' },
  { value: 'monthly', tk: 'monthly', screen: 'MGT-RPT-03' },
  { value: 'compare', tk: 'compare', screen: 'MGT-RPT-06' },
  { value: 'alerts', tk: 'alerts', screen: 'MGT-RPT-04' },
  { value: 'thresholds', tk: 'config', screen: 'MGT-RPT-05' },
];

export default function ReportsModule() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const raw = sp.get('tab');
  const tab: TabKey = TABS.some((x) => x.value === raw) ? (raw as TabKey) : 'library';
  const setTab = (v: string) => setSp(v === 'library' ? {} : { tab: v }, { replace: true });

  // prototype alert examples not already in the seed → merged once, so they behave like every other alert
  useEffect(() => {
    store.update((d) => { for (const x of EXTRA_ALERTS) if (!d.alerts.some((y) => y.id === x.id)) d.alerts.push(x); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hub period picks (month · week · day) + open generated report
  const [per, setPer] = useState<HubPeriod>({ perM: 7, perW: weekRanges(7).length - 1, perD: TODAY_D });
  const [gen, setGen] = useState<{ rep: GenRep; from: string; to: string } | null>(null);

  // thresholds: persisted (saved) in module state; the draft lives here so edits survive tab switches.
  // The KPI bands that drive status pills app-wide (Purchase-price, Inventory-variance, Yield) are seeded
  // from the live store.state.settings so the screen shows the same values every other module reads.
  const st = store.state.settings;
  const thresholdSeed = useMemo<ThresholdState>(() => ({
    th: THRESHOLD_SEED.th,
    bands: {
      ...THRESHOLD_SEED.bands,
      ppv: { warn: st.ppvAmberPct + '%', crit: st.ppvRedPct + '%' },
      invvar: { warn: THRESHOLD_SEED.bands.invvar.warn, crit: st.varianceTolerancePct + '%' },
      yield: { warn: THRESHOLD_SEED.bands.yield.warn, crit: '−' + st.productionGapAlertPct + '%' },
    },
  }), [st.ppvAmberPct, st.ppvRedPct, st.varianceTolerancePct, st.productionGapAlertPct]);
  const [saved, setSaved] = useModuleState<ThresholdState>('reports', thresholdSeed);
  const [draft, setDraft] = useState<ThresholdState>(() => saved);
  const saveThresholds = () => {
    const changes: string[] = [], before: string[] = [];
    for (const r of TH) for (const f of ['food', 'pkg'] as const) {
      const o = saved.th[r.key]?.[f] ?? '', n = draft.th[r.key]?.[f] ?? '';
      if (o !== n) { before.push(`${r.name} ${f} ${o}`); changes.push(`${r.name} ${f} ${n}`); }
    }
    for (const b of BANDS) for (const f of ['warn', 'crit'] as const) {
      const o = saved.bands[b.key]?.[f] ?? '', n = draft.bands[b.key]?.[f] ?? '';
      if (o !== n) { before.push(`${b.name} ${f} ${o}`); changes.push(`${b.name} ${f} ${n}`); }
    }
    setSaved(draft);
    // write the shared tweakables back so every status pill / alert follows the edited bands immediately
    store.update((d) => {
      const pf = (v: string) => parseFloat(String(v).replace(/[−–]/g, '-'));
      const bs = draft.bands;
      if (bs.ppv) {
        const w = pf(bs.ppv.warn), c = pf(bs.ppv.crit);
        if (!isNaN(w)) d.settings.ppvAmberPct = w;
        if (!isNaN(c)) d.settings.ppvRedPct = c;
      }
      if (bs.invvar) { const c = pf(bs.invvar.crit); if (!isNaN(c)) d.settings.varianceTolerancePct = c; }
      if (bs.yield) { const c = pf(bs.yield.crit); if (!isNaN(c)) d.settings.productionGapAlertPct = Math.abs(c); }
    });
    store.logAudit({ action: t.thresholdsAudit, entity: 'Recipe cost % + KPI bands', oldValue: before.length ? before.join('; ') : undefined, newValue: changes.length ? changes.join('; ') : t.unchanged, moduleId: 'reports' });
    toast(t.savedToast);
  };

  const openAlerts = store.state.alerts.filter((a) => !a.dismissed && store.inScope(a.loc)).length;
  const tabs = Object.assign(
    TABS.map((x) => ({ value: x.value, label: t[x.tk] as string, badge: x.value === 'alerts' && openAlerts ? openAlerts : undefined })),
    { active: tab, onChange: setTab },
  );

  return (
    <Page>
      <PageHeader title={t.title} screenId={TABS.find((x) => x.value === tab)?.screen} right={<LocationSelector />} tabs={tabs} />
      {tab === 'library' && <Library per={per} setPer={setPer} onGenerate={(rep, from, to) => setGen({ rep, from, to })} />}
      {tab === 'daily' && <Daily />}
      {tab === 'monthly' && <Monthly />}
      {tab === 'compare' && <Compare />}
      {tab === 'alerts' && <AlertsView onThresholds={() => setTab('thresholds')} />}
      {tab === 'thresholds' && <Thresholds draft={draft} setDraft={setDraft} onSave={saveThresholds} />}
      {gen && <GenerateModal key={gen.rep.key + gen.from + gen.to} rep={gen.rep} from0={gen.from} to0={gen.to} onClose={() => setGen(null)} />}
    </Page>
  );
}
