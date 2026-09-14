import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'en' | 'ar';

export interface LangCtx {
  lang: Lang;
  isAr: boolean;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  /** pick(en, ar) → the string for the current language */
  pick: (en: string, ar: string) => string;
  /** tx(dict) → dict[lang]  (dict = { en: {...}, ar: {...} }) */
  tx: <T,>(dict: { en: T; ar: T }) => T;
  /** Directional glyphs that must mirror in RTL */
  backGlyph: string; // ← / →
  fwdGlyph: string; // → / ←
  chevron: string; // › / ‹
  chevronBack: string; // ‹ / ›
}

const Ctx = createContext<LangCtx | null>(null);
const KEY = 'kis.lang';

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { const v = localStorage.getItem(KEY); if (v === 'ar' || v === 'en') return v; } catch { /* ignore */ }
    return 'en';
  });
  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem(KEY, l); } catch { /* ignore */ } }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  const value = useMemo<LangCtx>(() => {
    const isAr = lang === 'ar';
    return {
      lang, isAr, dir: isAr ? 'rtl' : 'ltr', setLang,
      pick: (en, ar) => (isAr ? ar : en),
      tx: (dict) => (isAr ? dict.ar : dict.en),
      backGlyph: isAr ? '→' : '←', fwdGlyph: isAr ? '←' : '→',
      chevron: isAr ? '‹' : '›', chevronBack: isAr ? '›' : '‹',
    };
  }, [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLang outside LangProvider');
  return v;
}

/** Location display names (shared everywhere). */
export const LOC_NAMES = {
  en: { mk: 'Main Kitchen', rock: 'Rock', kad: 'Kaddoum', all: 'All locations', central: 'Central' },
  ar: { mk: 'المطبخ الرئيسي', rock: 'روك', kad: 'قدّوم', all: 'كل المواقع', central: 'المركز' },
} as const;

/** Arabic-Indic digits helper (used sparingly where prototypes did, e.g. dates). */
export function arDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}
