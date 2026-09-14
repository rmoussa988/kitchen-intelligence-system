import React, { useState } from 'react';
import { Modal, Btn, Input, Toggle, useToast, money, P } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { LocId, Location } from '../../../store';
import { TEXT } from '../text';
import { AREA_INFO, LOC_DESC, RESP_LABEL } from '../data';

const MODULE_ID = 'master-data';
interface EditForm { id: LocId; en: string; ar: string; resp: string; areas: string; active: boolean }

export default function LocationsView() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const st = store.state;
  const [edit, setEdit] = useState<EditForm | null>(null);

  const stockValue = (loc: LocId) => st.items.reduce((a, it) => a + (it.onHand[loc] ?? 0) * it.cost, 0);
  const respLabel = (r: string) => { const k = RESP_LABEL[r.toLowerCase()]; return k ? (isAr ? k.ar : k.en) : r; };
  const areaOf = (a: string) => { const k = AREA_INFO[a]; return { name: k && isAr ? k.ar : a, note: k ? (isAr ? k.note.ar : k.note.en) : '' }; };
  const openEdit = (lc: Location) => setEdit({ id: lc.id, en: lc.en, ar: lc.ar, resp: lc.responsibilities.join(', '), areas: lc.storageAreas.join(', '), active: lc.active });
  const save = () => {
    if (!edit) return;
    const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const before = st.locations.find((l) => l.id === edit.id);
    store.update((d) => {
      const l = d.locations.find((x) => x.id === edit.id);
      if (!l) return;
      l.en = edit.en.trim() || l.en; l.ar = edit.ar.trim() || l.ar;
      l.responsibilities = split(edit.resp); l.storageAreas = split(edit.areas); l.active = edit.active;
    });
    store.logAudit({ action: t.auditLocUpdated, entity: `${edit.id} · ${edit.en.trim() || before?.en}`, oldValue: before ? `${before.responsibilities.join(', ')} | ${before.storageAreas.join(', ')} | ${before.active ? t.active : t.inactive}` : undefined, newValue: `${split(edit.resp).join(', ')} | ${split(edit.areas).join(', ')} | ${edit.active ? t.active : t.inactive}`, moduleId: MODULE_ID });
    setEdit(null);
    toast(t.savedToast);
  };
  const fieldLbl: React.CSSProperties = { fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 };

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px' }} className="fade-in">
      <div style={{ fontSize: 13, color: P.text3, marginBottom: 12 }}>{t.locHint}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
        {st.locations.map((lc) => {
          const desc = LOC_DESC[lc.id];
          const dim = !lc.active || !store.inScope(lc.id);
          return (
            <div key={lc.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, opacity: dim ? 0.7 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: lc.active ? '#8FA88F' : P.text4, flex: 'none' }} />
                <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>{isAr ? lc.ar : lc.en}</div>
                {!lc.active && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: '#E6E2DA', color: P.text4 }}>{t.inactive}</span>}
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: '#DCE4EC', color: '#37536B' }}>{t.types[lc.type]}</span>
              </div>
              <div style={{ fontSize: 12.5, color: P.text3, lineHeight: 1.5 }}>{desc ? (isAr ? desc.ar : desc.en) : ''}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text2, marginBottom: 6 }}>{t.responsibilities}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {lc.responsibilities.map((r) => <span key={r} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: P.chip, color: P.text2, fontWeight: 600 }}>{respLabel(r)}</span>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text2, marginBottom: 6 }}>{t.storageAreas}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {lc.storageAreas.map((a) => { const ar = areaOf(a); return (
                    <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '7px 11px', borderRadius: 8, background: P.thead }}>
                      <span style={{ fontWeight: 600 }}>{ar.name}</span><span style={{ color: P.text3 }}>{ar.note}</span>
                    </div>
                  ); })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${P.borderRow}`, paddingTop: 10 }}>
                <span style={{ fontSize: 12, color: P.text3 }} dir="ltr">{t.stockValue} {money(stockValue(lc.id))}</span>
                <button onClick={() => openEdit(lc)} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.edit}</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: P.text4, marginTop: 12 }}>{t.locNote}</div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={t.editLoc} sub={edit ? `${edit.id.toUpperCase()} · ${t.locNote}` : undefined} width={500}
        footer={<><Btn size="lg" variant="ghost" style={{ flex: 1 }} onClick={() => setEdit(null)}>{t.cancel}</Btn><Btn size="lg" variant="primary" style={{ flex: 1.4, fontWeight: 700 }} onClick={save}>{t.save}</Btn></>}>
        {edit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={fieldLbl}>{t.nameEn}</div><Input value={edit.en} onChange={(v) => setEdit({ ...edit, en: v })} width="100%" /></div>
              <div><div style={fieldLbl}>{t.nameArLbl}</div><Input value={edit.ar} onChange={(v) => setEdit({ ...edit, ar: v })} width="100%" /></div>
            </div>
            <div><div style={fieldLbl}>{t.responsibilities} · {t.respHint}</div><Input value={edit.resp} onChange={(v) => setEdit({ ...edit, resp: v })} width="100%" /></div>
            <div><div style={fieldLbl}>{t.storageAreas} · {t.areasHint}</div><Input value={edit.areas} onChange={(v) => setEdit({ ...edit, areas: v })} width="100%" /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Toggle on={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} /><span style={{ fontSize: 13 }}>{t.activeLbl}</span><span style={{ fontSize: 11.5, color: P.text4 }}>— {t.locHint}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
