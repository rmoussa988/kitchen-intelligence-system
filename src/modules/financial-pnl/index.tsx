/**
 * Financial P&L (owner) — MGT-PNL-03 statement with Provisional/Final month states, and PNL-ACC-01
 * time-boxed access grants for the cost controller. Owner-only unless a grant covers the month.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, PageHeader, P, DEMO_TODAY } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import { TEXT } from './text';
import { MONTHS, SEED_STATE } from './data';
import type { PnlState } from './data';
import { EXTRA_EXPENSES } from '../accounting/seed';
import PnlView from './views/PnlView';
import AccessView from './views/AccessView';

type Tab = 'pnl' | 'access';

export default function Module() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<Tab>(sp.get('tab') === 'access' ? 'access' : 'pnl');
  const [month, setMonth] = useState<string>(MONTHS.includes(sp.get('month') ?? '') ? (sp.get('month') as string) : MONTHS[0]);
  const [ms, setMs] = useModuleState<PnlState>('financial-pnl', SEED_STATE);

  // Same seed extension as Accounting (July expenses + Aug tax) — idempotent.
  useEffect(() => {
    store.update((d) => { for (const x of EXTRA_EXPENSES) if (!d.expenses.some((y) => y.id === x.id)) d.expenses.push(x); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Access rule: owner/superuser always; anyone else only through an active grant covering the month.
  const me = store.state.users.find((u) => u.id === store.state.settings.currentUser);
  const isOwner = !me || me.role === 'owner' || me.role === 'superuser';
  const now = DEMO_TODAY;
  const granted = !isOwner && ms.grants.some((g) => g.status === 'active' && g.userId === me?.id && g.month === month && (!g.expiresAt || g.expiresAt > now));
  const allowed = isOwner || granted;

  const tabs = Object.assign([{ value: 'pnl', label: t.pnlTab }, { value: 'access', label: t.accessTab }], { active: tab, onChange: (v: string) => setTab(v as Tab) });

  return (
    <Page>
      <PageHeader
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>{t.pnlTab}<span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: P.ink, color: '#EDE6D6', letterSpacing: '.3px' }}>{t.ownerOnly}</span></span>}
        screenId={tab === 'pnl' ? 'MGT-PNL-03' : 'PNL-ACC-01'} tabs={tabs} />
      <div className="fade-in" key={tab} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'pnl' && allowed && <PnlView month={month} setMonth={setMonth} ms={ms} setMs={(r) => setMs(r)} />}
        {tab === 'access' && isOwner && <AccessView ms={ms} setMs={(r) => setMs(r)} />}
        {((tab === 'pnl' && !allowed) || (tab === 'access' && !isOwner)) && (
          <div style={{ padding: '16px 22px' }}>
            <div style={{ maxWidth: 520, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{t.lockedTitle}</div>
              <div style={{ fontSize: 12.5, color: P.text3, marginTop: 4, lineHeight: 1.55 }}>{t.lockedBody}</div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
