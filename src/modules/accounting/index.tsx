/**
 * Accounting — lean (Part J). KIS feeds the accountant: cash handover (ACC-CLS-02), daily rate (ACC-FX-01),
 * daily sales (ACC-SAL-01), supplier bills (ACC-AP-01), expenses (ACC-EXP-01).
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, PageHeader, LocationSelector, P } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useStore } from '../../store';
import { TEXT } from './text';
import { EXTRA_EXPENSES } from './seed';
import CashView from './views/CashView';
import FxView from './views/FxView';
import SalesView from './views/SalesView';
import BillsView from './views/BillsView';
import ExpensesView from './views/ExpensesView';

type Tab = 'cash' | 'fx' | 'sales' | 'bills' | 'exp';
const TAB_KEYS: Tab[] = ['cash', 'fx', 'sales', 'bills', 'exp'];
const ID_MAP: Record<Tab, string> = { cash: 'ACC-CLS-02', fx: 'ACC-FX-01', sales: 'ACC-SAL-01', bills: 'ACC-AP-01', exp: 'ACC-EXP-01' };

function normTab(v: string | null): Tab | null {
  if (!v) return null;
  if (v === 'expenses') return 'exp';
  return (TAB_KEYS as string[]).includes(v) ? (v as Tab) : null;
}

export default function Module() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const [sp] = useSearchParams();
  const paramTab = normTab(sp.get('tab'));
  const paramId = sp.get('id');
  const [tab, setTabState] = useState<Tab>(paramTab ?? 'cash');
  const [focus, setFocus] = useState<string | null>(paramId);

  // React to deep links (?tab=…&id=…) arriving while mounted.
  useEffect(() => { if (paramTab) setTabState(paramTab); setFocus(paramId); }, [paramTab, paramId]);

  // Extend the seed world (July expenses + Aug tax lines) once, only if absent.
  useEffect(() => {
    store.update((d) => { for (const x of EXTRA_EXPENSES) if (!d.expenses.some((y) => y.id === x.id)) d.expenses.push(x); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTab = (v: string) => { setTabState(v as Tab); setFocus(null); };
  const pending = store.state.closings.filter((c) => c.status === 'in_transit' && store.inScope(c.loc)).length;

  const tabs = Object.assign(TAB_KEYS.map((k) => ({ value: k, label: t.tabs[k], badge: k === 'cash' && pending ? pending : undefined })), { active: tab, onChange: setTab });

  return (
    <Page>
      <PageHeader title={t.title} screenId={ID_MAP[tab]} tabs={tabs}
        right={<><span style={{ fontSize: 12.5, color: P.text3, whiteSpace: 'nowrap' }}>{t.feedsNote}</span><LocationSelector /></>} />
      <div className="fade-in" key={tab} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'cash' && <CashView focusId={focus} />}
        {tab === 'fx' && <FxView />}
        {tab === 'sales' && <SalesView onOpenClosing={(id) => { setTabState('cash'); setFocus(id); }} />}
        {tab === 'bills' && <BillsView focusId={focus} />}
        {tab === 'exp' && <ExpensesView focusId={focus} />}
      </div>
    </Page>
  );
}
