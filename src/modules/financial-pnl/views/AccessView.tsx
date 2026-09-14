import React, { useState } from 'react';
import { Notice, P, Select, shortDate, timeHM, useToast } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import { TEXT } from '../text';
import { MONTHS, WINS } from '../data';
import type { Grant, PnlState, Win } from '../data';
import { MON_AR, MON_EN, addDays, monthLabel } from '../../accounting/helpers';

/** "01–04 Aug" / "30 Jun–03 Jul" / "02 Jun" */
function rangeLabel(start: string, end: string | undefined, isAr: boolean): string {
  const s = new Date(start), e = end ? new Date(end) : null;
  if (!e || (e.getDate() === s.getDate() && e.getMonth() === s.getMonth())) return shortDate(start, isAr);
  if (e.getMonth() === s.getMonth()) {
    const dd = (d: Date) => (isAr ? String(d.getDate()) : String(d.getDate()).padStart(2, '0'));
    return `${dd(s)}–${dd(e)} ${isAr ? MON_AR[s.getMonth()] : MON_EN[s.getMonth()]}`;
  }
  return `${shortDate(start, isAr)}–${shortDate(end as string, isAr)}`;
}

export default function AccessView({ ms, setMs }: { ms: PnlState; setMs: (r: (d: PnlState) => void) => void }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const grantees = store.state.users.filter((u) => u.role === 'cost' && u.active);
  const [userId, setUserId] = useState(grantees[0]?.id ?? '');
  const [scopeM, setScopeM] = useState(MONTHS[0]);
  const [win, setWin] = useState<Win>('recon');
  const grantee = grantees.find((u) => u.id === userId) ?? grantees[0];
  const winLabel = (w: Win) => (w === 'recon' ? t.winRecon : w === '7d' ? t.win7 : t.win48);

  const active = ms.grants.filter((g) => g.status === 'active');
  const history = ms.grants.filter((g) => g.status !== 'active').slice().sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));

  const grant = () => {
    if (!grantee) return;
    const now = store.now();
    const expiresAt = win === '48h' ? addDays(now, 2) : win === '7d' ? addDays(now, 7) : undefined;
    // A grantee has at most one active grant per month scope: re-granting updates that grant's window instead
    // of stacking duplicate 'Active' rows (the prototype models a single active grant that re-granting reactivates).
    const existing = ms.grants.find((g) => g.status === 'active' && g.userId === grantee.id && g.month === scopeM);
    if (existing) {
      setMs((d) => { const x = d.grants.find((y) => y.id === existing.id); if (x) { x.win = win; x.grantedAt = now; x.expiresAt = expiresAt; x.endedAt = undefined; } });
    } else {
      const g: Grant = { id: store.nextId('GR'), userId: grantee.id, month: scopeM, win, grantedAt: now, expiresAt, status: 'active' };
      setMs((d) => { d.grants.unshift(g); });
    }
    store.logAudit({ action: 'Financial P&L access granted', entity: `${store.userName(grantee.id, false)} · ${monthLabel(scopeM)} · ${winLabel(win)}`, newValue: expiresAt ? `until ${shortDate(expiresAt)} ${timeHM(expiresAt)}` : 'until reconciliation ends', moduleId: 'financial-pnl' });
    toast(t.grantToast);
  };
  const revoke = (g: Grant) => {
    const now = store.now();
    setMs((d) => { const x = d.grants.find((y) => y.id === g.id); if (x) { x.status = 'revoked'; x.endedAt = now; } });
    store.logAudit({ action: 'Financial P&L access revoked', entity: `${store.userName(g.userId, false)} · ${monthLabel(g.month)} · ${winLabel(g.win)}`, oldValue: 'active', newValue: 'revoked early', moduleId: 'financial-pnl' });
    toast(t.revokeToast);
  };

  const chip = (on: boolean): React.CSSProperties => ({ height: 34, padding: '0 14px', borderRadius: 999, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' });
  const lab: React.CSSProperties = { fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 };
  const histWhat = (g: Grant) => {
    const who = store.userName(g.userId, isAr);
    if (g.descEn) return `${who} · ${isAr ? g.descAr : g.descEn}`;
    return g.win === 'recon' ? t.histWhat.replace('{who}', who).replace(/\{m\}/g, monthLabel(g.month, isAr)) : t.histWhatWin.replace('{who}', who).replace('{win}', winLabel(g.win)).replace('{m}', monthLabel(g.month, isAr));
  };

  return (
    <div style={{ padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 330, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t.grantTitle}</div>
          <div style={{ fontSize: 12.5, color: P.text3, marginTop: 4, lineHeight: 1.55 }}>{t.grantBody}</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: P.thead, border: `1px solid ${P.border}` }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: P.blueFg, color: P.onInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flex: 'none' }}>{grantee?.ini ?? '?'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{grantee ? (isAr ? grantee.nameAr : grantee.name) : '—'}</div>
                <div style={{ fontSize: 11.5, color: P.text3 }}>{t.granteeRole}</div>
              </div>
              {grantees.length > 1 && <Select value={userId} onChange={setUserId} options={grantees.map((u) => ({ value: u.id, label: isAr ? u.nameAr : u.name }))} style={{ height: 32 }} />}
            </div>
            <div>
              <div style={lab}>{t.scopeMonth}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {MONTHS.map((m) => <button key={m} onClick={() => setScopeM(m)} style={chip(scopeM === m)} dir={isAr ? undefined : 'ltr'}>{monthLabel(m, isAr)}</button>)}
              </div>
            </div>
            <div>
              <div style={lab}>{t.window}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {WINS.map((w) => <button key={w} onClick={() => setWin(w)} style={chip(win === w)}>{winLabel(w)}</button>)}
              </div>
            </div>
            <Notice tone="amber">{t.grantWarn}</Notice>
            <button onClick={grant} disabled={!grantee} style={{ height: 44, borderRadius: 10, border: 'none', background: P.ink, color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: grantee ? 1 : 0.55 }}>{t.grantCta}</button>
          </div>
        </div>
        <div style={{ flex: 1.2, minWidth: 350, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ border: `1px solid ${P.border}`, borderRadius: 14, background: P.card, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: P.thead, borderBottom: `1px solid ${P.border}`, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.activeGrants}</div>
            {active.length > 0 ? active.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${P.borderRow}`, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{store.userName(g.userId, isAr)} — {t.granteeRole}</div>
                  <div style={{ fontSize: 11.5, color: P.text3, marginTop: 2 }}>{monthLabel(g.month, isAr)} · {winLabel(g.win)} · {g.expiresAt ? `${t.expiresOn} ${shortDate(g.expiresAt, isAr)} ${timeHM(g.expiresAt)}` : t.autoExpires}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 999, background: P.greenBg, color: P.greenFg }}>{t.activeSt}</span>
                <button onClick={() => revoke(g)} style={{ height: 30, padding: '0 12px', borderRadius: 8, border: `1px solid ${P.redBorder}`, background: P.white, color: P.redFg, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.revoke}</button>
              </div>
            )) : (
              <div style={{ padding: '20px 18px', fontSize: 13, color: P.text4 }}>{t.noActive}</div>
            )}
          </div>
          <div style={{ border: `1px solid ${P.border}`, borderRadius: 14, background: P.card, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: P.thead, borderBottom: `1px solid ${P.border}`, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.grantHistory}</div>
            {history.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: `1px solid ${P.borderRow}`, fontSize: 12.5 }}>
                <span style={{ color: P.text3, width: 88, flex: 'none' }} dir="ltr">{rangeLabel(g.grantedAt, g.endedAt, isAr)}</span>
                <span style={{ flex: 1 }}>{histWhat(g)}</span>
                <span style={{ color: P.text4, fontSize: 11.5 }}>{g.status === 'revoked' ? t.revokedEarly : g.win === 'recon' && !g.descEn ? t.endedOnFinal : t.autoExpired}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: P.text4 }}>{t.accessFoot}</div>
        </div>
      </div>
    </div>
  );
}
