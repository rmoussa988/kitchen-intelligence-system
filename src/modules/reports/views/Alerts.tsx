import React, { useState } from 'react';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { Alert, CoreState } from '../../../store';
import { useModuleNav } from '../../../shell/DesktopShell';
import { MODULE_MAP } from '../../registry';
import { Btn, Modal, Select, useToast, shortDate, timeHM, P } from '../../../ui';
import { TEXT } from '../text';
import { SEV_RANK, SEV_STYLE } from '../data';
import { ALERT_SUBS } from '../seed';
import { SBtn } from './shared';

type Sev = 'crit' | 'warn' | 'info';
const sevOf = (s: Alert['severity']): Sev => (s === 'red' ? 'crit' : s === 'amber' ? 'warn' : 'info');

/**
 * Deep-link params for an alert, using the key each destination module actually reads:
 * transfers, receiving, invoice pipeline/review, waste → `id`; production and gap review → `batch`; variance/inventory/items → `item` + `loc`; recipes → `recipe`.
 */
function alertParams(a: Alert, state: CoreState): Record<string, string> | undefined {
  const p: Record<string, string> = {};
  const text = a.en;
  const target = a.moduleId ?? '';
  const trf = text.match(/\b(TRF|REQ)-\d+\b/);
  const batch = text.match(/\b[A-Z]{3}-\d{8}-\d{3}\b/);
  const wst = text.match(/\bWST-\d+\b/);
  const inv = text.match(/\b(INV|FB|AD|PP|DK|BF)-\d+\b/);
  const delivery = inv ? state.deliveries.find((x) => x.invoiceNo === inv[0]) : undefined;
  const invoice = inv ? state.invoices.find((x) => x.invoiceNo === inv[0]) : undefined;
  const lower = text.toLowerCase();
  const items = [...state.items].sort((x, y) => y.en.length - x.en.length);
  const it = items.find((x) => lower.includes(x.en.toLowerCase())) ?? items.find((x) => { const alt = x.en.split(' ').slice(1).join(' ').toLowerCase(); return alt.length > 4 && lower.includes(alt); });

  if (target === 'transfers' && trf) p.id = trf[0];
  else if (target === 'receiving' && delivery) p.id = delivery.id;
  else if ((target === 'invoice-review' || target === 'invoice-pipeline') && invoice) p.id = invoice.id;
  else if (target === 'waste' && wst) p.id = wst[0];
  else if ((target === 'production' || target === 'production-gaps') && batch) p.batch = batch[0];
  else if (target === 'accounting') p.tab = a.type === 'cash_gap' ? 'cash' : a.type === 'invoice_mismatch' ? 'bills' : 'cash';
  else if (target === 'recipes' && it) p.recipe = it.id;
  else if (target === 'reports') p.tab = 'alerts';

  if (it && (target === 'variance' || target === 'inventory' || target === 'items' || target === 'transfers')) p.item = it.id;
  if (a.loc && (target === 'variance' || target === 'inventory')) p.loc = a.loc;
  return Object.keys(p).length ? p : undefined;
}

/** MGT-RPT-04 — alert center from the shared store, severity-sorted, with Act / Assign / Dismiss. */
export function AlertsView({ onThresholds }: { onThresholds: () => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const isAll = store.scope === 'all';
  const scopeLabel = store.scope === 'all' ? t.all : t.locs[store.scope];

  const [assign, setAssign] = useState<Alert | null>(null);
  const [assignee, setAssignee] = useState('U-02');

  const rows = store.state.alerts
    .filter((a) => !a.dismissed && (isAll || !a.loc || a.loc === store.scope))
    .map((a) => ({ a, sev: sevOf(a.severity) }))
    .sort((x, y) => SEV_RANK[x.sev] - SEV_RANK[y.sev] || y.a.ts.localeCompare(x.a.ts));

  const act = (a: Alert) => {
    const title = isAr ? a.ar : a.en;
    if (a.moduleId && MODULE_MAP[a.moduleId]) go(a.moduleId, { params: alertParams(a, store.state) });
    else toast(t.actToast + ' ' + title.split('—')[0].trim());
  };
  const dismiss = (a: Alert) => { store.dismissAlert(a.id); toast(t.dismissToast); };
  const doAssign = () => {
    if (!assign) return;
    const prev = assign.assignedTo;
    const name = store.userName(assignee, isAr);
    store.update((d) => { const x = d.alerts.find((y) => y.id === assign.id); if (x) x.assignedTo = assignee; });
    store.logAudit({ action: 'Alert assigned', entity: `${assign.id} · ${assign.en}`, oldValue: prev ? store.userName(prev, false) : undefined, newValue: store.userName(assignee, false), moduleId: 'reports' });
    toast(t.assignedAlertToast + ' ' + name);
    setAssign(null);
  };

  const subOf = (a: Alert) => {
    const custom = ALERT_SUBS[a.id];
    const base = custom ? custom[isAr ? 1 : 0] : `${shortDate(a.ts, isAr)} · ${timeHM(a.ts)}`;
    return a.assignedTo ? `${base} · ${t.assignedTo} ${store.userName(a.assignedTo, isAr)}` : base;
  };

  const users = store.state.users.filter((u) => u.active).map((u) => ({ value: u.id, label: isAr ? u.nameAr : u.name }));

  return (
    <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 22px', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
        <div style={{ fontSize: 13, color: P.text3 }}>{rows.length} {t.activeAlerts} · {scopeLabel}</div>
        <div style={{ flex: 1 }} />
        <button onClick={onThresholds} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.configThresholds}</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ a, sev }) => {
          const sv = SEV_STYLE[sev];
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${sv[3]}`, background: sv[4], borderRadius: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: sv[2], flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{isAr ? a.ar : a.en}</div>
                <div style={{ fontSize: 12, color: P.text3, marginTop: 2 }}>{subOf(a)}</div>
              </div>
              <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: '#EDEAE0', color: P.text3, whiteSpace: 'nowrap' }}>{a.loc ? t.locs[a.loc] : t.all}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: sv[0], color: sv[1], whiteSpace: 'nowrap' }}>{t.sev[sev]}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <SBtn ink onClick={() => act(a)}>{t.actOn}</SBtn>
                <SBtn onClick={() => { setAssignee(a.assignedTo ?? 'U-02'); setAssign(a); }}>{t.assign}</SBtn>
                <SBtn onClick={() => dismiss(a)}>{t.dismiss}</SBtn>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: P.text4, fontSize: 14 }}>{t.noAlerts}</div>}
      </div>

      <Modal open={!!assign} onClose={() => setAssign(null)} title={t.assignTitle} sub={assign ? (isAr ? assign.ar : assign.en) : undefined}
        footer={<><Btn size="lg" variant="ghost" style={{ flex: 1 }} onClick={() => setAssign(null)}>{t.cancel}</Btn><Btn size="lg" variant="primary" style={{ flex: 1.4, fontWeight: 700 }} onClick={doAssign}>{t.assign}</Btn></>}>
        <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text3, marginBottom: 6 }}>{t.assignTo}</div>
        <Select value={assignee} onChange={setAssignee} options={users} width="100%" />
      </Modal>
    </div>
  );
}
