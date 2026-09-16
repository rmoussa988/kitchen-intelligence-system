import React, { Suspense, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import { useStore } from '../store';
import { isCloud } from '../data/supabase';
import { P, S } from '../theme/tokens';
import { Segmented } from '../ui';
import { NAV, type NavItem } from './nav';
import { MODULE_MAP } from '../modules/registry';
import Placeholder from '../modules/Placeholder';

const TEXT = {
  en: { mgmt: 'Management', searchPh: 'Search anything…', toTablet: 'Tablet · Staff', release2: 'Release 2', r2Body: 'Planned for a later release — not in the current scope. Listed so the navigation matches the full design; opens the designed screen.', reset: 'Reset demo data', resetQ: 'Reset all demo data to the seed state?', seed: 'Load demo data to cloud', seedQ: 'Upload the full demo dataset to the connected database? Existing rows with the same id are overwritten.', seedOk: 'Demo data uploaded to the cloud.', seedErr: 'Upload failed: ' },
  ar: { mgmt: 'الإدارة', searchPh: 'ابحث عن أي شيء…', toTablet: 'تابلت · الموظفون', release2: 'الإصدار ٢', r2Body: 'مخطط لإصدار لاحق — خارج النطاق الحالي. مدرج لتطابق الملاحة مع التصميم الكامل؛ يفتح الشاشة المصممة.', reset: 'إعادة ضبط البيانات', resetQ: 'إعادة كل البيانات التجريبية إلى الحالة الأولية؟', seed: 'تحميل البيانات التجريبية للسحابة', seedQ: 'رفع مجموعة البيانات التجريبية الكاملة إلى قاعدة البيانات المتصلة؟ ستُستبدل الصفوف ذات المعرّف نفسه.', seedOk: 'تم رفع البيانات التجريبية إلى السحابة.', seedErr: 'فشل الرفع: ' },
};

export default function DesktopShell() {
  const { lang, isAr, setLang, dir } = useLang();
  const store = useStore();
  const nav = useNavigate();
  const { moduleId = 'health' } = useParams();
  const [sp] = useSearchParams();
  const curTab = sp.get('tab');
  const t = TEXT[lang];
  // A nav row matches the current location by module id and, when the row targets a specific tab
  // (two entries share the master-data module), by the ?tab query too — so exactly one row is active.
  const matchItem = (it: NavItem) => it.id === moduleId && (it.tab == null || it.tab === curTab);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const def = MODULE_MAP[moduleId];
  const user = store.state.users.find((u) => u.id === store.state.settings.currentUser);
  const userIni = user?.ini ?? 'R', userName = user ? (isAr ? user.nameAr : user.name) : 'Rudy';
  const userRole = isAr ? 'المالك · مشرف' : 'Owner · Superuser';

  const crumb = useMemo(() => {
    for (const g of NAV) for (const it of g.items) if (matchItem(it)) return { item: isAr ? it.ar : it.en, group: isAr ? g.ar : g.en };
    for (const g of NAV) for (const it of g.items) if (it.id === moduleId) return { item: isAr ? it.ar : it.en, group: isAr ? g.ar : g.en };
    return { item: def ? (isAr ? def.ar : def.en) : moduleId, group: '' };
  }, [moduleId, curTab, isAr, def]); // eslint-disable-line react-hooks/exhaustive-deps

  const seg = [{ value: 'en', label: 'EN' }, { value: 'ar', label: 'عربي' }] as const;

  return (
    <div dir={dir} style={{ height: '100vh', minHeight: 640, display: 'grid', gridTemplateColumns: '250px 1fr', background: P.page, color: P.text, overflow: 'hidden' }}>
      <aside className="sidebar" style={{ background: S.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: S.logo, color: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, letterSpacing: '.5px', flex: 'none' }}>K</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: S.text, lineHeight: 1 }}>Kitchen Intelligence</div>
            <div style={{ fontSize: 10, color: S.muted, marginTop: 3, letterSpacing: '1.3px', textTransform: 'uppercase' }}>{t.mgmt}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 16px' }}>
          {NAV.map((g) => {
            const open = !collapsed[g.id];
            return (
              <div key={g.id} style={{ marginBottom: 4 }}>
                <button onClick={() => setCollapsed((p) => ({ ...p, [g.id]: !p[g.id] }))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px 6px', border: 'none', background: 'transparent', color: S.muted, fontSize: 10.5, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span>{isAr ? g.ar : g.en}</span><span style={{ fontSize: 9, opacity: .7 }}>{open ? '▾' : (isAr ? '◂' : '▸')}</span>
                </button>
                {open && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {g.items.map((it) => {
                      const on = matchItem(it);
                      const b = it.badge ? it.badge(store.state) : null;
                      return (
                        <button key={g.id + it.id} onClick={() => nav(`/m/${it.id}${it.tab ? `?tab=${it.tab}` : ''}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, border: 'none', background: on ? S.active : 'transparent', color: on ? S.text : S.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', position: 'relative' }}>
                          <span style={{ width: 3, height: 18, borderRadius: 3, background: on ? S.logo : 'transparent', flex: 'none' }} />
                          <span className="ellipsis" style={{ flex: 1, minWidth: 0 }}>{isAr ? it.ar : it.en}</span>
                          {b && <span style={{ background: b.red ? '#C0392B' : '#C99A2E', color: b.red ? '#FFFFFF' : '#231A06', fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flex: 'none' }}>{b.n}</span>}
                          {it.r2 && <span style={{ fontSize: 8.5, fontWeight: 700, color: S.muted, border: `1px solid ${S.border}`, borderRadius: 4, padding: '1px 4px', flex: 'none' }}>R2</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: 10, borderTop: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, background: S.active }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: S.logo, color: S.bg, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{userIni}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: S.text, lineHeight: 1.2 }}>{userName}</div>
              <div style={{ fontSize: 10.5, color: S.muted }}>{userRole}</div>
            </div>
            <div style={{ flex: 1 }} />
            {/* Demo-seed upload removed for production so real data can't be re-seeded by accident.
                (store.pushToCloud remains available if a demo/reset tool is ever wanted again.) */}
            {!isCloud && (
              <button title={t.reset} onClick={() => { if (window.confirm(t.resetQ)) store.reset(); }} style={{ border: 'none', background: 'transparent', color: S.muted, cursor: 'pointer', fontSize: 14, padding: 4 }}>↺</button>
            )}
          </div>
        </div>
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', background: P.page, overflow: 'hidden', minWidth: 0 }}>
        <div style={{ height: 58, flex: 'none', background: P.surface, borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>{crumb.item} <span style={{ fontWeight: 600, color: P.text4, fontSize: 12, marginInlineStart: 8 }}>{crumb.group}</span></div>
          <button onClick={() => nav('/m/search')} style={{ marginInlineStart: 8, flex: 1, maxWidth: 320, height: 36, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text4, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'start' }}>⌕ {t.searchPh}</button>
          <div style={{ flex: 1 }} />
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 9, padding: '5px 14px 5px 6px', borderRadius: 999, border: `1px solid ${P.borderInput}`, background: P.white, whiteSpace: 'nowrap' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: P.ink, color: P.onInk, fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{userIni}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{userName}</span>
            <span style={{ fontSize: 11, color: P.text3 }}>{userRole}</span>
          </div>
          <button onClick={() => nav('/m/reports?tab=alerts')} style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text3, cursor: 'pointer', position: 'relative', fontSize: 15 }}>
            ◷{store.state.alerts.some((a) => !a.dismissed && a.severity === 'red') && <span style={{ position: 'absolute', top: 7, insetInlineEnd: 8, width: 7, height: 7, borderRadius: '50%', background: P.redStrong }} />}
          </button>
          <Segmented options={seg as unknown as { value: 'en' | 'ar'; label: string }[]} value={lang} onChange={(v) => setLang(v)} />
          <button onClick={() => nav('/staff')} style={{ flex: 'none', height: 36, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.toTablet}</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          <ModuleView key={moduleId} id={moduleId} />
        </div>
      </main>
    </div>
  );
}

/**
 * True when a module is rendered inside another module (e.g. Invoice review embedded in Purchasing).
 * Embedded modules suppress their own page-title chrome — the host already provides it — mirroring
 * the prototype's `showHeader: !embedded` flag.
 */
export const ModuleEmbedContext = React.createContext(false);
export const useEmbedded = () => React.useContext(ModuleEmbedContext);

export function ModuleView({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const def = MODULE_MAP[id];
  const { isAr } = useLang();
  if (!def) return <div style={{ padding: 40, color: P.text3 }}>{isAr ? 'وحدة غير معروفة' : 'Unknown module'}: {id}</div>;
  const C = def.component;
  if (!C) return <Placeholder def={def} />;
  return (
    <ModuleEmbedContext.Provider value={embedded}>
      <Suspense fallback={<div style={{ padding: 40, color: P.text4, fontSize: 13 }}>…</div>}>
        <div style={{ height: '100%', minHeight: 0 }}><C /></div>
      </Suspense>
    </ModuleEmbedContext.Provider>
  );
}

export function useModuleNav() {
  const nav = useNavigate();
  return React.useCallback((moduleId: string, opts?: { staff?: boolean; params?: Record<string, string> }) => {
    const def = MODULE_MAP[moduleId];
    const staff = opts?.staff ?? def?.kind === 'staff';
    const q = opts?.params ? '?' + new URLSearchParams(opts.params).toString() : '';
    nav(`${staff ? '/staff/' : '/m/'}${moduleId}${q}`);
  }, [nav]);
}
