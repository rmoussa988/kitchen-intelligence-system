import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, PageHeader, LocationSelector } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useModuleState } from '../../store';
import { TEXT } from './text';
import UsersView from './views/UsersView';
import LocationsView from './views/LocationsView';
import SuppliersView from './views/SuppliersView';

type Tab = 'users' | 'locations' | 'suppliers';
interface MasterState { tab: Tab; userId: string | null; supId: string | null }
const MS_SEED: MasterState = { tab: 'users', userId: null, supId: null };
const SCREEN: Record<Tab, string> = { users: 'MGT-USR-01', locations: 'MGT-LOC-01', suppliers: 'MGT-SUP-01' };
const isTab = (v: string | null): v is Tab => v === 'users' || v === 'locations' || v === 'suppliers';

/** MGT-USR-01 users · MGT-LOC-01 locations · MGT-SUP-01 suppliers — one module, three tabs. */
export default function MasterData() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [ms, setMs] = useModuleState<MasterState>('master-data', MS_SEED);
  const [params] = useSearchParams();
  const urlTab = params.get('tab');
  const urlId = params.get('id');

  useEffect(() => {
    if (!isTab(urlTab) && !urlId) return;
    setMs((d) => {
      const tab: Tab = isTab(urlTab) ? urlTab : d.tab;
      d.tab = tab;
      if (urlId) { if (tab === 'suppliers') d.supId = urlId; else if (tab === 'users') d.userId = urlId; }
    });
  }, [urlTab, urlId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tab = ms.tab;
  const title = tab === 'users' ? t.users : tab === 'locations' ? t.locations : t.suppliers;
  const tabs = Object.assign(
    [{ value: 'users', label: t.users }, { value: 'locations', label: t.locations }, { value: 'suppliers', label: t.suppliers }],
    { active: tab, onChange: (v: string) => setMs((d) => { if (isTab(v)) d.tab = v; }) },
  );

  return (
    <Page>
      <PageHeader title={title} screenId={SCREEN[tab]} right={<LocationSelector />} tabs={tabs} />
      {tab === 'users' && <UsersView selectedId={ms.userId} onSelect={(id) => setMs((d) => { d.userId = id; })} />}
      {tab === 'locations' && <LocationsView />}
      {tab === 'suppliers' && <SuppliersView selectedId={ms.supId} onSelect={(id) => setMs((d) => { d.supId = id; })} />}
    </Page>
  );
}
