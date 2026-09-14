/**
 * LoginScreen — password sign-in for KIS management (paper theme, bilingual, RTL-aware).
 *
 * Two panels: a dark brand panel (sidebar palette S) and the paper sign-in form (palette P).
 * Copy lives in a small local TEXT dict; language + direction come from LangContext, so the
 * EN/عربي toggle flips the whole app. PIN / 2FA are a later phase — v1 is email + password.
 *
 * This component only renders the form and calls useAuth().signInWithPassword; showing it
 * (routing / gating) is wired separately.
 */
import React, { useState } from 'react';
import { P, S } from '../theme/tokens';
import { useLang, LOC_NAMES } from '../i18n/LangContext';
import { Btn, Input, Notice } from '../ui';
import { useAuth } from './AuthProvider';

type CSS = React.CSSProperties;

const TEXT = {
  en: {
    badge: 'MGT-AUTH-02',
    thesis: 'One honest ledger from receiving to P&L — per location, and combined.',
    flowLabel: 'Locations',
    title: 'Management console',
    sub: 'Sign in with your work email and password.',
    email: 'Email',
    password: 'Password',
    show: 'Show',
    hide: 'Hide',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    secured: 'Secured session · TLS',
    needFields: 'Enter your email and password.',
    badCreds: 'Incorrect email or password.',
    genericErr: 'Could not sign in. Please try again.',
    stats: [['3', 'locations'], ['241', 'items tracked']],
  },
  ar: {
    badge: 'MGT-AUTH-02',
    thesis: 'دفتر واحد صادق من الاستلام إلى الأرباح والخسائر — لكل موقع ومجمّعاً.',
    flowLabel: 'المواقع',
    title: 'وحدة الإدارة',
    sub: 'سجّل الدخول ببريد العمل وكلمة المرور.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    show: 'إظهار',
    hide: 'إخفاء',
    signIn: 'تسجيل الدخول',
    signingIn: 'جارٍ الدخول…',
    secured: 'جلسة مؤمنة · TLS',
    needFields: 'أدخل البريد الإلكتروني وكلمة المرور.',
    badCreds: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    genericErr: 'تعذّر تسجيل الدخول. حاول مرة أخرى.',
    stats: [['3', 'مواقع'], ['241', 'صنفاً متتبعاً']],
  },
} as const;

export default function LoginScreen() {
  const { lang, isAr, dir, setLang } = useLang();
  const { signInWithPassword } = useAuth();
  const t = TEXT[lang];
  const locs = LOC_NAMES[lang];

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!email.trim() || !pw) { setError(t.needFields); return; }
    setSubmitting(true);
    try {
      await signInWithPassword(email, pw);
      // On success the session updates and the gating layer swaps this screen out.
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(/invalid login credentials/i.test(msg) ? t.badCreds : (msg || t.genericErr));
    } finally {
      setSubmitting(false);
    }
  };

  const langBtn = (active: boolean): CSS => ({
    height: 30, padding: '0 14px', border: 'none', fontSize: 12, fontWeight: 600,
    fontFamily: 'inherit', cursor: 'pointer',
    background: active ? P.ink : 'transparent', color: active ? P.onInk : P.text3,
  });

  const flow = [locs.mk, locs.rock, locs.kad];

  return (
    <div dir={dir} style={{
      minHeight: '100vh', display: 'flex', flexWrap: 'wrap',
      background: P.page, color: P.text,
      fontFamily: "'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif", fontVariantNumeric: 'tabular-nums',
    }}>
      {/* ── Brand panel ── */}
      <div style={{
        flex: '1.1 1 340px', minWidth: 300, background: S.bg, color: S.text,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        gap: 32, padding: '44px clamp(28px, 5vw, 52px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1, color: S.logo }}>KIS</div>
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: S.active, color: S.muted, letterSpacing: '.4px' }} dir="ltr">{t.badge}</span>
        </div>

        <div>
          <div style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, lineHeight: 1.25, maxWidth: 480, color: S.text }}>{t.thesis}</div>
          <div style={{ fontSize: 11.5, color: S.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 28, marginBottom: 12 }}>{t.flowLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {flow.map((name, i) => (
              <React.Fragment key={name}>
                <span style={{ padding: '9px 16px', borderRadius: 12, background: S.active, border: `1px solid ${S.border}`, fontSize: 14, fontWeight: 600, color: S.text2 }}>{name}</span>
                {i < flow.length - 1 && <span style={{ color: S.muted, fontSize: 18 }} dir={dir}>{isAr ? '←' : '→'}</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {t.stats.map(([v, label]) => (
            <div key={label}>
              <div style={{ fontSize: 24, fontWeight: 700, color: S.text }} dir="ltr">{v}</div>
              <div style={{ fontSize: 13, color: S.muted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sign-in form ── */}
      <div style={{ flex: '1 1 340px', minWidth: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 4vw, 40px)' }}>
        <form onSubmit={onSubmit} style={{ width: 'min(400px, 100%)' }} className="fade-in">
          <div style={{ fontSize: 24, fontWeight: 700, textAlign: 'start' }}>{t.title}</div>
          <div style={{ fontSize: 14, color: P.text3, marginTop: 6, lineHeight: 1.5, textAlign: 'start' }}>{t.sub}</div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'block' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: P.text2, marginBottom: 6, textAlign: 'start' }}>{t.email}</div>
              <Input value={email} onChange={setEmail} placeholder="nadim@kis.example" type="email" ltr autoFocus width="100%" style={{ height: 46, fontSize: 14.5 }} />
            </label>

            <label style={{ display: 'block' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: P.text2, marginBottom: 6, textAlign: 'start' }}>{t.password}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input value={pw} onChange={setPw} placeholder="••••••••" type={showPw ? 'text' : 'password'} ltr width="auto" style={{ flex: 1, height: 46, fontSize: 14.5 }} />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-pressed={showPw}
                  style={{ height: 46, padding: '0 14px', borderRadius: 10, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {showPw ? t.hide : t.show}
                </button>
              </div>
            </label>

            {error && <Notice tone="red">{error}</Notice>}

            <Btn type="submit" variant="primary" size="lg" disabled={submitting} style={{ height: 50, width: '100%', justifyContent: 'center', fontSize: 15.5, fontWeight: 700, borderRadius: 11 }}>
              {submitting ? t.signingIn : t.signIn}
            </Btn>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.text4} strokeWidth="2" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 018 0v3" />
              </svg>
              <span style={{ fontSize: 12, color: P.text4 }}>{t.secured}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', border: `1px solid ${P.borderInput}`, borderRadius: 8, overflow: 'hidden', background: P.white }}>
                <button type="button" onClick={() => setLang('en')} style={langBtn(!isAr)}>EN</button>
                <button type="button" onClick={() => setLang('ar')} style={langBtn(isAr)}>عربي</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
