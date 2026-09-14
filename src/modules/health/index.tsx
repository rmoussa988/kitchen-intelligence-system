import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, PageHeader, Body, Pill, LocationSelector, useToast, shortDate, DEMO_TODAY } from '../../ui';
import { useLang, LOC_NAMES } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import { useModuleNav } from '../../shell/DesktopShell';
import { TEXT } from './text';
import { TABS, isTab, SEED_STATE, nextStatus, sevForWeight, addDays, atLocalMidnight, type Tab, type HealthState, type CorrectiveAction } from './data';
import HealthView from './views/Health';
import OwnerView from './views/Owner';
import ProductivityView from './views/Productivity';
import ComplianceView from './views/Compliance';

const MODULE_ID = 'health';

/**
 * Kitchen Health · Owner report · Productivity · Compliance (all Release 2).
 * Tabs are driven by `?tab=health|owner|productivity|compliance`.
 */
export default function Module() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();

  // ── tab from URL ──
  const [sp, setSp] = useSearchParams();
  const rawTab = sp.get('tab');
  const tab: Tab = isTab(rawTab) ? rawTab : 'health';
  const setTab = useCallback((v: string) => { if (isTab(v)) setSp(v === 'health' ? {} : { tab: v }, { replace: true }); }, [setSp]);

  // ── persisted compliance state ──
  const [raw, setMs] = useModuleState<HealthState>(MODULE_ID, SEED_STATE);
  const valid = !!raw && raw.version === SEED_STATE.version && Array.isArray(raw.checklists) && Array.isArray(raw.actions);
  const ms = valid ? raw : SEED_STATE;
  useEffect(() => { if (!valid) setMs(SEED_STATE); }, [valid, setMs]);

  // ── overdue corrective actions → alert center ──
  // Guard on the alert's *actual* existence in the store (not only a mount-scoped ref) so the alert is
  // re-raised after store.reset() clears it without needing a remount. The ref is a short-lived race guard
  // that bridges the gap between addAlert and the alertId landing back on the action; it is cleared as soon
  // as the persistent guard (alertId + live alert) takes over, or the action leaves 'overdue'.
  const firing = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const ca of ms.actions) {
      if (ca.status !== 'overdue') { firing.current.delete(ca.id); continue; }
      const hasLiveAlert = !!ca.alertId && store.state.alerts.some((a) => a.id === ca.alertId && !a.dismissed);
      if (hasLiveAlert) { firing.current.delete(ca.id); continue; }
      if (firing.current.has(ca.id)) continue;
      firing.current.add(ca.id);
      const id = store.addAlert({
        severity: 'red', type: 'corrective_overdue', loc: ca.loc, moduleId: MODULE_ID,
        en: `${TEXT.en.caOverdue} — ${ca.issue.en} · ${LOC_NAMES.en[ca.loc]} · ${TEXT.en.due} ${shortDate(atLocalMidnight(ca.deadline))}`,
        ar: `${TEXT.ar.caOverdue} — ${ca.issue.ar} · ${LOC_NAMES.ar[ca.loc]} · ${TEXT.ar.due} ${shortDate(atLocalMidnight(ca.deadline), true)}`,
      });
      setMs((d) => { const x = d.actions.find((a) => a.id === ca.id); if (x) x.alertId = id; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms.actions]);

  // ── compliance actions ──
  const cycleStatus = (actionId: string) => {
    const ca = ms.actions.find((a) => a.id === actionId);
    if (!ca) return;
    const next = nextStatus(ca.status);
    setMs((d) => { const x = d.actions.find((a) => a.id === actionId); if (x) x.status = next; });
    store.logAudit({ action: 'Corrective action status', entity: `${ca.id} · ${ca.issue.en}`, oldValue: TEXT.en.st[ca.status], newValue: TEXT.en.st[next], moduleId: MODULE_ID });
    if (ca.status === 'overdue' && ca.alertId) store.dismissAlert(ca.alertId);
  };

  const toggleItem = (checklistId: string, itemId: string) => {
    const cl = ms.checklists.find((c) => c.id === checklistId);
    const it = cl?.items.find((i) => i.id === itemId);
    if (!cl || !it) return;
    const pass = !it.pass;
    setMs((d) => { const i = d.checklists.find((c) => c.id === checklistId)?.items.find((x) => x.id === itemId); if (i) i.pass = pass; });
    store.logAudit({ action: pass ? 'Checklist item passed' : 'Checklist item failed', entity: `${cl.name.en} · ${it.name.en}`, oldValue: it.pass ? 'pass' : 'fail', newValue: pass ? 'pass' : 'fail', moduleId: MODULE_ID });
    if (pass) return;
    // a failed item auto-creates a corrective action (unless one is still open for the same item)
    const exists = ms.actions.some((a) => a.itemId === itemId && a.status !== 'done' && a.status !== 'closed');
    if (exists) return;
    const ca: CorrectiveAction = {
      id: store.nextId('CA'), issue: { en: it.name.en, ar: it.name.ar }, loc: cl.loc, src: { en: cl.name.en, ar: cl.name.ar },
      owner: 'Maya', sev: sevForWeight(it.weight), deadline: addDays(DEMO_TODAY, 3), status: 'open', itemId, createdAt: store.now(),
    };
    setMs((d) => { d.actions.push(ca); });
    store.logAudit({ action: 'Corrective action created', entity: `${ca.id} · ${ca.issue.en}`, newValue: `${LOC_NAMES.en[ca.loc]} · due ${shortDate(atLocalMidnight(ca.deadline))}`, moduleId: MODULE_ID });
    toast(`${t.caCreated} — ${isAr ? it.name.ar : it.name.en}`);
  };

  // ── owner report ──
  const [compare, setCompare] = useState(false);
  const onCompare = () => { setCompare((c) => !c); if (!compare) toast(t.compareToast); };
  const onExport = () => toast(t.exportToast);

  // ── header ──
  const overdue = ms.actions.filter((a) => a.status === 'overdue').length;
  const tabLabel = (k: Tab) => (k === 'health' ? t.health : k === 'owner' ? t.owner : k === 'productivity' ? t.prod : t.comp);
  const tabs = Object.assign(
    TABS.map((x) => ({ value: x.key, label: tabLabel(x.key), badge: x.key === 'compliance' && overdue > 0 ? overdue : undefined })),
    { active: tab, onChange: setTab },
  );
  const screenId = TABS.find((x) => x.key === tab)?.screenId ?? 'MGT-DSH-01';

  return (
    <Page>
      <PageHeader title={tabLabel(tab)} screenId={screenId} tabs={tabs}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill bg="#E4E0EE" fg="#5B5378" style={{ fontWeight: 700, fontSize: 11, padding: '3px 10px' }}>{t.release2}</Pill>
            {tab === 'health' && <LocationSelector />}
          </div>
        } />
      <Body gap={0} key={tab}>
        {tab === 'health' && <HealthView t={t} onTab={setTab} go={(m, params) => go(m, params ? { params } : undefined)} />}
        {tab === 'owner' && <OwnerView t={t} compare={compare} onCompare={onCompare} onExport={onExport} />}
        {tab === 'productivity' && <ProductivityView t={t} />}
        {tab === 'compliance' && <ComplianceView t={t} ms={ms} onToggleItem={toggleItem} onCycle={cycleStatus} />}
      </Body>
    </Page>
  );
}
