import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, PageHeader, LocationSelector, P } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import { TEXT } from './text';
import { MOD_SEED } from './data';
import type { ModState } from './data';
import Planning from './views/Planning';
import Monitoring from './views/Monitoring';

/** MGT-PRD-01 Production planning vs demand · MGT-PRD-05 Monitoring & yield (live batch board). */
export default function Production() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const [ms, setMs] = useModuleState<ModState>('production', MOD_SEED);
  const [sp] = useSearchParams();
  const [openBatch, setOpenBatch] = useState<string | null>(null);

  // ?batch=<id> deep link → monitoring tab with the batch detail open
  useEffect(() => {
    const b = sp.get('batch');
    if (b && store.state.batches.some((x) => x.id === b)) { setMs((d) => { d.tab = 'mon'; }); setOpenBatch(b); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = store.state.batches.filter((b) => b.status === 'complete' && store.inScope(b.loc)).length;
  const tab = ms.tab;

  return (
    <Page>
      <PageHeader
        title={t.title}
        screenId={tab === 'plan' ? 'MGT-PRD-01' : 'MGT-PRD-05'}
        right={<><span style={{ fontSize: 12.5, color: P.text3 }}>{t.date}</span><LocationSelector /></>}
        tabs={Object.assign(
          [{ value: 'plan', label: t.planning }, { value: 'mon', label: t.monitoring, badge: pending || undefined }],
          { active: tab, onChange: (v: string) => setMs((d) => { d.tab = v === 'mon' ? 'mon' : 'plan'; }) },
        )}
      />
      {tab === 'plan'
        ? <Planning t={t} />
        : <Monitoring t={t} openBatch={openBatch} setOpenBatch={setOpenBatch}
            approvedIds={ms.approvedIds ?? []}
            onApproved={(id) => setMs((d) => { const list = d.approvedIds ?? (d.approvedIds = []); if (!list.includes(id)) list.push(id); })} />}
    </Page>
  );
}
