/**
 * General Ledger — ACC-GL-01. Release-2 proposal kept for reference (superseded by Part J: KIS feeds the
 * accountant's software). Ported as-is with the prototype's own data; posting is local state + toast.
 */
import React, { useMemo, useState } from 'react';
import { Page, PageHeader, P, num, shortDate, useToast } from '../../ui';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import { TEXT } from './text';
import { ACCTS, ACCT_CODES, JES, balances } from './data';
import type { JE, Src } from './data';
import Journal from './views/Journal';
import Coa from './views/Coa';
import TrialBalance from './views/TrialBalance';

type Tab = 'journal' | 'coa' | 'tb';

/** Per-module state that must survive cross-module navigation (posted entries, view state). */
interface LedgerState {
  manual: JE[];
  tab: Tab;
  src: 'all' | Src;
  acctFilter: string | null;
  open: Record<string, boolean>;
}
const SEED: LedgerState = { manual: [], tab: 'journal', src: 'all', acctFilter: null, open: { 'JE-0031': true } };

export default function Module() {
  const { lang, isAr, dir } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const rate = store.state.settings.fxRate;

  const [ms, setMs] = useModuleState<LedgerState>('ledger', SEED);
  const { manual, tab, src, acctFilter, open } = ms;
  const setTab = (v: Tab) => setMs((d) => { d.tab = v; });
  const setSrc = (v: 'all' | Src) => setMs((d) => { d.src = v; });

  const [modal, setModal] = useState(false);
  const [memo, setMemo] = useState('');
  const [drAcct, setDrAcct] = useState('6300');
  const [crAcct, setCrAcct] = useState('1010');
  const [amt, setAmt] = useState('');

  const all = useMemo(() => [...manual, ...JES], [manual]);
  const filtered = all.filter((j) => (src === 'all' || j.src === src) && (!acctFilter || j.lines.some((l) => l[0] === acctFilter)));
  const bal = useMemo(() => balances(all), [all]);

  const onAcct = (code: string) => setMs((d) => { d.tab = 'journal'; d.acctFilter = code; d.src = 'all'; });

  const amtN = parseFloat(amt), amtOk = !isNaN(amtN) && amtN > 0, same = drAcct === crAcct;
  const postDisabled = !amtOk || same || !memo.trim();
  const post = () => {
    if (postDisabled) return;
    const ref = 'JE-M' + String(manual.length + 1).padStart(3, '0');
    const je: JE = { ref, date: shortDate(store.now(), isAr), src: 'MANUAL', memoEn: memo, memoAr: memo, lines: [[drAcct, amtN, 0], [crAcct, 0, amtN]] };
    setMs((d) => { d.manual.unshift(je); d.open[ref] = true; });
    store.logAudit({ action: 'manual_journal_entry', entity: ref, newValue: `${drAcct}/${crAcct} $${amtN}`, moduleId: 'ledger' });
    setModal(false); setMemo(''); setAmt('');
    toast(t.posted);
  };

  const tabs = Object.assign([{ value: 'journal', label: t.tabJournal }, { value: 'coa', label: t.tabCoa }, { value: 'tb', label: t.tabTb }], { active: tab, onChange: (v: string) => setTab(v as Tab) });
  const acctOpts = ACCT_CODES.map((k) => ({ v: k, label: `${k} · ${ACCTS[k][isAr ? 'ar' : 'en']}` }));
  const sel: React.CSSProperties = { height: 34, padding: '0 8px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 12, fontFamily: 'inherit', color: P.text };

  return (
    <Page>
      <style>{`.acct-link:hover{color:#37536B;text-decoration:underline}.ledger-input:focus{outline:2px solid #37536B}`}</style>
      <PageHeader
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{t.title}<span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', padding: '3px 8px', borderRadius: 999, background: P.blueFg, color: '#FFFFFF' }}>{t.r2}</span></span>}
        screenId="ACC-GL-01" tabs={tabs}
        right={<><span style={{ fontSize: 12.5, fontWeight: 700 }} dir="ltr">{t.period}</span><span style={{ fontSize: 11, color: P.text3 }} dir="ltr">USD · LL @ {num(rate)}</span></>} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 22px', background: '#DCE5EC', borderBottom: '1px solid #C9D4DE', color: P.blueFg, fontSize: 11.5, fontWeight: 600, flex: 'none' }}>
        ◆ {t.proposalNote}
      </div>
      <div className="fade-in" key={tab} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px 24px' }}>
        {tab === 'journal' && <Journal entries={filtered} src={src} setSrc={setSrc} acctFilter={acctFilter} clearAcctFilter={() => setMs((d) => { d.acctFilter = null; })} open={open} toggle={(ref) => setMs((d) => { d.open[ref] = !d.open[ref]; })} onAcct={onAcct} onManual={() => setModal(true)} rate={rate} />}
        {tab === 'coa' && <Coa bal={bal} onAcct={onAcct} />}
        {tab === 'tb' && <TrialBalance bal={bal} onExport={() => toast(t.exported)} />}
      </div>

      {modal && (
        <div onClick={() => setModal(false)} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,31,.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div dir={dir} onClick={(e) => e.stopPropagation()} className="pop-up" style={{ width: 'min(480px,94vw)', background: P.surface, borderRadius: 14, border: `1px solid ${P.border}`, boxShadow: '0 16px 44px rgba(31,36,31,.3)', padding: 17, display: 'flex', flexDirection: 'column', gap: 11, color: P.text }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{t.manualJe}</div>
              <button onClick={() => setModal(false)} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 13, cursor: 'pointer' }}>✕</button>
            </div>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={t.mMemo} autoFocus className="ledger-input" style={{ height: 36, padding: '0 11px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 12.5, fontFamily: 'inherit', width: '100%' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 10.5, fontWeight: 700, color: P.text3 }}>{t.mDebit}</span>
                <select value={drAcct} onChange={(e) => setDrAcct(e.target.value)} className="ledger-input" style={sel}>{acctOpts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 10.5, fontWeight: 700, color: P.text3 }}>{t.mCredit}</span>
                <select value={crAcct} onChange={(e) => setCrAcct(e.target.value)} className="ledger-input" style={sel}>{acctOpts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 180 }}><span style={{ fontSize: 10.5, fontWeight: 700, color: P.text3 }}>{t.mAmount} (USD)</span>
              <input value={amt} onChange={(e) => setAmt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') post(); }} dir="ltr" className="ledger-input" style={{ height: 36, padding: '0 11px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, fontWeight: 700, fontSize: 14, fontFamily: 'inherit', width: '100%' }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: same ? '#8A6116' : amtOk ? P.greenStrong : P.text4, fontWeight: 600 }}>{same ? t.mSame : amtOk ? t.mBalanced : t.mNoAmt}</div>
            <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.cancel}</button>
              <button onClick={post} disabled={postDisabled} style={{ height: 34, padding: '0 17px', borderRadius: 8, border: 'none', background: P.ink, color: P.onInk, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: postDisabled ? 'not-allowed' : 'pointer', opacity: postDisabled ? 0.5 : 1 }}>{t.mPost}</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
