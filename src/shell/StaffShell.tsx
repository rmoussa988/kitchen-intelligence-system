import { useNavigate, useParams } from 'react-router-dom';
import { useLang, LOC_NAMES, arDigits } from '../i18n/LangContext';
import { useStore } from '../store';
import { D } from '../theme/tokens';
import { Segmented } from '../ui';
import { STAFF_TILES } from './nav';
import { MODULE_MAP } from '../modules/registry';
import { ModuleView } from './DesktopShell';

const TEXT = {
  en: { greet: 'Good morning,', tasksToday: 'tasks assigned today', station: 'Station', toDesk: 'Desktop · Management', yourActions: 'Your actions', home: 'Home', date: 'Wednesday, Aug 12, 2026' },
  ar: { greet: 'صباح الخير،', tasksToday: 'مهام مسندة اليوم', station: 'المحطة', toDesk: 'سطح المكتب · الإدارة', yourActions: 'إجراءاتك', home: 'الرئيسية', date: 'الأربعاء ١٢ آب ٢٠٢٦' },
};

export default function StaffShell() {
  const { lang, isAr, setLang, dir, backGlyph } = useLang();
  const store = useStore();
  const nav = useNavigate();
  const { moduleId } = useParams();
  const t = TEXT[lang];
  const staff = store.state.users.find((u) => u.id === store.state.settings.staffUser);
  const staffName = staff ? (isAr ? staff.nameAr : staff.name) : 'Ziad';
  const def = moduleId ? MODULE_MAP[moduleId] : null;
  const tasks = store.state.plans.filter((p) => p.published && p.status !== 'done').length + store.state.transfers.filter((x) => x.status === 'sent' || x.status === 'requested').length;
  const seg = [{ value: 'en', label: 'EN' }, { value: 'ar', label: 'عربي' }] as { value: 'en' | 'ar'; label: string }[];

  return (
    <div dir={dir} className="dark" style={{ height: '100vh', minHeight: 640, display: 'flex', flexDirection: 'column', background: D.page, color: D.text, overflow: 'hidden', userSelect: 'none' }}>
      {!def ? (
        <>
          <div style={{ padding: '20px 26px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${D.headerBorder}`, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: D.muted, letterSpacing: '.4px' }}>{t.date}</div>
              <div style={{ fontSize: 21, fontWeight: 700, marginTop: 2 }}>{t.greet} <span style={{ color: D.gold }}>{staffName}</span></div>
              <div style={{ fontSize: 13, color: D.muted, marginTop: 3 }}>{isAr ? arDigits(tasks) : tasks} {t.tasksToday}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: `1px solid ${D.border3}`, background: D.card, fontSize: 13, color: D.text2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.greenDot }} />{t.station} · <b>{LOC_NAMES[lang].mk}</b>
              </div>
              <Segmented dark options={seg} value={lang} onChange={(v) => setLang(v)} />
              <button onClick={() => nav('/m/health')} style={{ height: 40, padding: '0 15px', borderRadius: 11, border: `1px solid ${D.border3}`, background: D.card, color: D.muted, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.toDesk}</button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '22px 26px' }}>
            <div style={{ color: D.muted, fontSize: 12, letterSpacing: '1.3px', textTransform: 'uppercase', marginBottom: 14 }}>{t.yourActions}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
              {STAFF_TILES.map((tl) => {
                const b = tl.badge ? tl.badge(store.state) : 0;
                return (
                  <button key={tl.id} className="tile-hover" onClick={() => nav(`/staff/${tl.id}`)} style={{ position: 'relative', border: `1.5px solid ${D.border}`, background: D.card, borderRadius: 18, padding: '22px 16px', textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
                    {b ? <span style={{ position: 'absolute', top: 12, insetInlineEnd: 12, background: D.redBorder, color: D.redBadgeFg, fontSize: 10.5, fontWeight: 700, minWidth: 19, height: 19, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{b}</span> : null}
                    <div style={{ width: 46, height: 46, margin: '0 auto 12px', borderRadius: 12, background: D.tileIcon, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, color: D.gold }}>{tl.glyph}</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{isAr ? tl.ar : tl.en}</div>
                    <div style={{ fontSize: 12, color: D.muted, marginTop: 3 }}>{isAr ? tl.subAr : tl.subEn}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${D.headerBorder}` }}>
            <button onClick={() => nav('/staff')} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: `1px solid ${D.border3}`, background: D.card, color: D.text, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{backGlyph} {t.home}</button>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{isAr ? def.ar : def.en}</div>
            <div style={{ flex: 1 }} />
            <Segmented dark options={seg} value={lang} onChange={(v) => setLang(v)} />
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: def.kind === 'staff' ? D.page : undefined }}>
            <ModuleView key={def.id} id={def.id} />
          </div>
        </>
      )}
    </div>
  );
}
