import { useLang } from '../i18n/LangContext';
import { P, D } from '../theme/tokens';
import type { ModuleDef } from './registry';

/** Rendered for a module whose port is still in progress. */
export default function Placeholder({ def }: { def: ModuleDef }) {
  const { isAr } = useLang();
  const dark = def.kind === 'staff';
  return (
    <div className="fade-in" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: dark ? D.page : P.page }}>
      <div style={{ maxWidth: 480, background: dark ? D.card : P.card, border: `1px solid ${dark ? D.border : P.border}`, borderRadius: 16, padding: 28, textAlign: 'center', color: dark ? D.text : P.text }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: dark ? D.amberChip : P.amberPill, color: dark ? D.gold : P.amberFg }}>{isAr ? 'قيد البناء' : 'Port in progress'}</span>
        <div style={{ fontSize: 19, fontWeight: 700, marginTop: 14 }}>{isAr ? def.ar : def.en}</div>
        <div style={{ fontSize: 12.5, color: dark ? D.muted : P.text3, marginTop: 6 }}>{def.screenIds.join(' · ')}</div>
        <div style={{ fontSize: 13.5, color: dark ? D.muted : P.text3, lineHeight: 1.6, marginTop: 8 }}>{isAr ? 'هذه الوحدة يجري نقلها من النموذج التصميمي.' : 'This module is being ported from the design prototype.'}<br />{def.file}</div>
      </div>
    </div>
  );
}
