import React, { useState } from 'react';
import { GridTable, GridRow, Modal, Btn, Segmented, Select, Input, useToast, P } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { LocId, Role, User } from '../../../store';
import { TEXT } from '../text';
import { LAST_SEEN, ROLE_COLOR, ROLE_KEY, ROLE_ORDER, ROLE_PERMS } from '../data';

const MODULE_ID = 'master-data';
const MGMT_ROLES: Role[] = ['superuser', 'owner', 'manager', 'accountant', 'invoice', 'cost'];
const LOCS: LocId[] = ['mk', 'rock', 'kad'];
const cols = 'minmax(130px,1.4fr) minmax(96px,1fr) minmax(90px,1fr) 84px 70px';

interface NewUser { name: string; nameAr: string; role: Role; all: boolean; locs: LocId[]; credential: 'pin' | 'password' }
const EMPTY: NewUser = { name: '', nameAr: '', role: 'service', all: false, locs: ['rock'], credential: 'pin' };

export default function UsersView({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const st = store.state;
  const [q, setQ] = useState('');
  const [nu, setNu] = useState<NewUser | null>(null);

  const scopeLocs = (u: User): LocId[] => (u.scope === 'all' ? LOCS : Array.isArray(u.scope) ? u.scope : [u.scope]);
  const scopeLabel = (u: User) => (u.scope === 'all' ? t.locs.all : scopeLocs(u).map((l) => t.locs[l]).join(' · '));
  const inScope = (u: User) => store.scope === 'all' || scopeLocs(u).includes(store.scope);
  const nm = (u: User) => (isAr ? u.nameAr : u.name);
  const nmAlt = (u: User) => (isAr ? u.name : u.nameAr);
  const roleLabel = (r: Role) => t.roles[ROLE_KEY[r]];
  const entity = (u: User) => `${u.id} · ${u.name}`;

  const qq = q.trim().toLowerCase();
  const list = st.users.filter((u) => inScope(u) && (!qq || u.name.toLowerCase().includes(qq) || u.nameAr.includes(q.trim()) || u.id.toLowerCase().includes(qq)));
  // Prototype always renders the 340px panel (USERS[userIdx] never undefined) — keep a user shown even when the search matches nothing.
  const du = st.users.find((u) => u.id === selectedId) ?? list[0] ?? st.users.find(inScope) ?? st.users[0];

  const reset = () => {
    if (!du) return;
    store.logAudit({ action: du.credential === 'pin' ? t.auditResetPin : t.auditResetPassword, entity: entity(du), moduleId: MODULE_ID });
    toast(t.resetToast);
  };
  const toggleActive = () => {
    if (!du) return;
    const next = !du.active;
    store.update((d) => { const u = d.users.find((x) => x.id === du.id); if (u) u.active = next; });
    store.logAudit({ action: next ? t.auditUserReactivated : t.auditUserDeactivated, entity: entity(du), oldValue: next ? t.inactive : t.active, newValue: next ? t.active : t.inactive, moduleId: MODULE_ID });
    toast(next ? t.reacToast : t.deacToast);
  };
  const create = () => {
    if (!nu) return;
    const name = nu.name.trim();
    if (!name) { toast(t.needName); return; }
    const id = store.nextId('U');
    const ini = name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    const scope: User['scope'] = nu.all ? 'all' : (nu.locs.length ? nu.locs : ['mk']);
    const user: User = { id, name, nameAr: nu.nameAr.trim() || name, ini, role: nu.role, scope, credential: nu.credential, active: true };
    store.update((d) => { d.users.push(user); });
    store.logAudit({ action: t.auditUserCreated, entity: `${id} · ${name}`, newValue: `${roleLabel(nu.role)} · ${scopeLabel(user)} · ${nu.credential === 'pin' ? t.pin : t.emailCred}`, moduleId: MODULE_ID });
    setNu(null);
    onSelect(id);
    toast(t.savedToast);
  };

  const fieldLbl: React.CSSProperties = { fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ flex: 1.2, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '16px 22px', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 'none' }}>
          <Input value={q} onChange={setQ} placeholder={t.searchUsers} width={220} style={{ height: 36, fontSize: 13 }} />
          <div style={{ flex: 1 }} />
          <Btn variant="primary" onClick={() => setNu({ ...EMPTY })}>＋ {t.newUser}</Btn>
        </div>
        <GridTable cols={cols} style={{ flex: 1 }} empty={t.noUsers}
          head={[t.name, t.role, t.scope, t.credentials, t.status]}>
          {list.map((u) => {
            const on = du?.id === u.id;
            return (
              <GridRow key={u.id} cols={cols} active={on} onClick={() => onSelect(u.id)} style={{ background: on ? P.hover : !u.active ? '#F5F3EA' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: ROLE_COLOR[u.role], color: '#14171A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, flex: 'none' }}>{u.ini}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="ellipsis" style={{ fontWeight: 600 }}>{nm(u)}</div>
                    <div style={{ fontSize: 11, color: P.text4 }}>{nmAlt(u)}</div>
                  </div>
                </div>
                <div style={{ color: P.text2, fontSize: 12.5 }}>{roleLabel(u.role)}</div>
                <div style={{ color: P.text2, fontSize: 12.5 }}>{scopeLabel(u)}</div>
                <div><span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: u.credential === 'pin' ? P.chip : '#DCE4EC', color: u.credential === 'pin' ? P.text3 : '#37536B', whiteSpace: 'nowrap' }}>{u.credential === 'pin' ? t.pin : t.emailCred}</span></div>
                <div><span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: u.active ? '#E0E8DA' : '#E6E2DA', color: u.active ? '#48603A' : P.text4 }}>{u.active ? t.active : t.inactive}</span></div>
              </GridRow>
            );
          })}
        </GridTable>
      </div>

      {du && (
        <div key={du.id} className="fade-in" style={{ width: 340, flex: 'none', borderInlineStart: `1px solid ${P.border}`, background: P.thead, overflow: 'auto', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: ROLE_COLOR[du.role], color: '#14171A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700 }}>{du.ini}</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{nm(du)}</div>
              <div style={{ fontSize: 12.5, color: P.text3 }}>{roleLabel(du.role)} · {scopeLabel(du)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: P.text3 }}>{t.credType}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{du.credential === 'pin' ? t.pin : t.emailCred}</span>
            </div>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: P.text3 }}>{t.lastActive}</span><span style={{ fontSize: 13, fontWeight: 600 }} dir="ltr">{du.lastSeen ?? LAST_SEEN[du.id] ?? '—'}</span>
            </div>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: P.text3 }}>{t.status}</span><span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: du.active ? '#E0E8DA' : '#E6E2DA', color: du.active ? '#48603A' : P.text4 }}>{du.active ? t.active : t.inactive}</span>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text2 }}>{t.permPreview}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {ROLE_PERMS[du.role].map((pm) => <span key={pm.en} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: P.chip, color: P.text2, fontWeight: 600 }}>{isAr ? pm.ar : pm.en}</span>)}
            </div>
            <div style={{ fontSize: 11.5, color: P.text4, marginTop: 8 }}>{t.permNote}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
            <button onClick={reset} style={{ height: 38, borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{du.credential === 'pin' ? t.resetPin : t.resetPassword} ({t.resetNote})</button>
            <button onClick={toggleActive} style={{ height: 38, borderRadius: 9, border: `1px solid ${du.active ? P.redBorder : P.borderInput}`, background: P.white, color: du.active ? P.redFg : P.text2, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{du.active ? t.deactivate : t.reactivate}</button>
          </div>
          <div style={{ fontSize: 11.5, color: P.text4, marginTop: 10 }}>{t.deacNote}</div>
        </div>
      )}

      <Modal open={!!nu} onClose={() => setNu(null)} title={t.nuTitle} sub={t.nuNote} width={480}
        footer={<><Btn size="lg" variant="ghost" style={{ flex: 1 }} onClick={() => setNu(null)}>{t.cancel}</Btn><Btn size="lg" variant="primary" style={{ flex: 1.4, fontWeight: 700 }} onClick={create}>{t.createUser}</Btn></>}>
        {nu && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={fieldLbl}>{t.nameEn}</div><Input value={nu.name} autoFocus onChange={(v) => setNu({ ...nu, name: v })} width="100%" /></div>
              <div><div style={fieldLbl}>{t.nameArLbl}</div><Input value={nu.nameAr} onChange={(v) => setNu({ ...nu, nameAr: v })} width="100%" /></div>
            </div>
            <div>
              <div style={fieldLbl}>{t.role}</div>
              <Select<Role> value={nu.role} width="100%" options={ROLE_ORDER.map((r) => ({ value: r, label: roleLabel(r) }))}
                onChange={(r) => setNu({ ...nu, role: r, credential: MGMT_ROLES.includes(r) ? 'password' : 'pin', all: MGMT_ROLES.includes(r) ? true : nu.all })} />
            </div>
            <div>
              <div style={fieldLbl}>{t.scope}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Segmented<'all' | 'some'> size="sm" value={nu.all ? 'all' : 'some'} onChange={(v) => setNu({ ...nu, all: v === 'all' })} options={[{ value: 'all', label: t.locs.all }, { value: 'some', label: LOCS.filter((l) => nu.locs.includes(l)).map((l) => t.locs[l]).join(' · ') || '—' }]} />
                {!nu.all && LOCS.map((l) => {
                  const on = nu.locs.includes(l);
                  return <button key={l} onClick={() => setNu({ ...nu, locs: on ? nu.locs.filter((x) => x !== l) : [...nu.locs, l] })} style={{ height: 28, padding: '0 11px', borderRadius: 999, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.locs[l]}</button>;
                })}
              </div>
            </div>
            <div>
              <div style={fieldLbl}>{t.credential}</div>
              <Segmented<'pin' | 'password'> size="sm" value={nu.credential} onChange={(v) => setNu({ ...nu, credential: v })} options={[{ value: 'pin', label: t.pin }, { value: 'password', label: t.emailCred }]} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
