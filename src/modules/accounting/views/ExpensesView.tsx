import React, { useMemo, useState } from 'react';
import { Btn, Chip, Input, Modal, Notice, P, Segmented, Select, Toggle, money, num, shortDate, useToast, DEMO_TODAY } from '../../../ui';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { Expense, ExpenseCategory, LocId } from '../../../store';
import { TEXT } from '../text';
import { CURRENT_MONTH, PRIOR_MONTH } from '../data';
import { lbpShort, monthLabel, nextMonth } from '../helpers';

const GRID = 'minmax(120px,1.4fr) 92px 90px minmax(100px,1.1fr) 96px 96px';
const CAT_STYLE: Record<ExpenseCategory, [string, string]> = {
  rent: [P.purpleBg, P.purpleFg], gas: [P.blueBg, P.blueFg], electricity: [P.blueBg, P.blueFg], marketing: [P.brownBg, P.brownFg],
  maintenance: [P.tealBg, P.tealFg], salaries: [P.greenBg, P.greenFg], uniforms: [P.greyBg, P.greyFg], tax: [P.rustBg, P.rustFg], other: [P.greyBg, P.greyFg],
};
const CATS: ExpenseCategory[] = ['rent', 'gas', 'electricity', 'maintenance', 'uniforms', 'marketing', 'salaries', 'tax', 'other'];
const MONTHS = [PRIOR_MONTH, CURRENT_MONTH, nextMonth(CURRENT_MONTH)];

interface Draft { id?: string; vendor: string; amount: string; currency: 'USD' | 'LBP'; category: ExpenseCategory; accrualMonth: string; date: string; method: Expense['method']; allocation: LocId | 'split'; recurring: boolean; note: string }
const blank = (): Draft => ({ vendor: '', amount: '', currency: 'USD', category: 'electricity', accrualMonth: CURRENT_MONTH, date: DEMO_TODAY.slice(0, 10), method: 'cash', allocation: 'rock', recurring: false, note: '' });

export default function ExpensesView({ focusId }: { focusId: string | null }) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const names = LOC_NAMES[lang];
  const [monthF, setMonthF] = useState<'all' | string>('all');
  const [draft, setDraft] = useState<Draft | null>(null);

  const rows = useMemo(() => store.state.expenses
    .filter((e) => (e.allocation === 'split' || store.inScope(e.allocation)) && (monthF === 'all' || e.accrualMonth === monthF))
    .slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [store, monthF]);

  const allocName = (a: Expense['allocation']) => (a === 'split' ? (isAr ? '÷٣ بالتساوي' : '÷3 evenly') : names[a]);
  const amountOf = (e: Expense) => (e.currency === 'USD' ? money(e.amount, { min: 0, max: 0 }) : `${lbpShort(e.amount)} LBP`);
  const isLate = (e: Expense) => e.accrualMonth < e.date.slice(0, 7);

  const openEdit = (e: Expense) => setDraft({ id: e.id, vendor: e.vendor ?? '', amount: String(e.amount), currency: e.currency, category: e.category, accrualMonth: e.accrualMonth, date: e.date, method: e.method, allocation: e.allocation, recurring: !!e.recurring, note: e.note ?? '' });

  const save = () => {
    if (!draft) return;
    const amt = parseFloat(draft.amount.replace(/[^0-9.]/g, ''));
    if (!draft.vendor.trim() || !amt || amt <= 0) return;
    const catLabel = t.catsLong[draft.category];
    const summary = `${draft.currency === 'USD' ? money(amt) : num(amt) + ' LL'} · ${allocName(draft.allocation)} · ${monthLabel(draft.accrualMonth)}`;
    if (draft.id) {
      const old = store.state.expenses.find((e) => e.id === draft.id);
      store.update((d) => {
        const x = d.expenses.find((e) => e.id === draft.id);
        if (x) { x.vendor = draft.vendor.trim(); x.amount = amt; x.currency = draft.currency; x.category = draft.category; x.accrualMonth = draft.accrualMonth; x.date = draft.date; x.method = draft.method; x.allocation = draft.allocation; x.recurring = draft.recurring; x.note = draft.note.trim() || undefined; }
      });
      store.logAudit({ action: 'Expense edited', entity: `${draft.id} · ${catLabel} · ${draft.vendor.trim()}`, oldValue: old ? `${old.currency === 'USD' ? money(old.amount) : num(old.amount) + ' LL'} · ${allocName(old.allocation)} · ${monthLabel(old.accrualMonth)}` : undefined, newValue: summary, moduleId: 'accounting' });
      toast(t.editToast);
    } else {
      const id = store.nextId('EXP');
      store.update((d) => { d.expenses.unshift({ id, date: draft.date, accrualMonth: draft.accrualMonth, category: draft.category, amount: amt, currency: draft.currency, method: draft.method, allocation: draft.allocation, vendor: draft.vendor.trim(), note: draft.note.trim() || undefined, recurring: draft.recurring }); });
      store.logAudit({ action: 'Expense added', entity: `${id} · ${catLabel} · ${draft.vendor.trim()}`, newValue: summary, moduleId: 'accounting' });
      toast(t.expToast);
    }
    setDraft(null);
  };

  const label: React.CSSProperties = { fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 };
  const field: React.CSSProperties = { height: 44, width: '100%', borderRadius: 10, fontSize: 14 };
  const canSave = !!draft && !!draft.vendor.trim() && parseFloat(draft.amount) > 0;

  return (
    <div style={{ padding: '16px 22px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: P.text2 }}>{t.expHint}</span>
        <div style={{ flex: 1 }} />
        <Chip active={monthF === 'all'} onClick={() => setMonthF('all')} style={{ height: 32 }}>{t.allMonths}</Chip>
        {[CURRENT_MONTH, PRIOR_MONTH].map((m) => <Chip key={m} active={monthF === m} onClick={() => setMonthF(m)} style={{ height: 32 }}>{monthLabel(m, isAr)}</Chip>)}
        <button onClick={() => setDraft(blank())} style={{ height: 36, padding: '0 16px', borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.addExpense}</button>
      </div>
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '10px 16px', fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
          <div>{t.expense}</div><div>{t.category}</div><div style={{ textAlign: 'end' }}>{t.amount}</div><div>{t.allocation}</div><div>{t.accrualMonth}</div><div>{t.paid}</div>
        </div>
        {rows.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.text4, fontSize: 13.5 }}>{t.noExpenses}</div>}
        {rows.map((e) => {
          const cs = CAT_STYLE[e.category];
          const late = isLate(e);
          return (
            <div key={e.id} className="row-hover" onClick={() => openEdit(e)} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '10px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', cursor: 'pointer', background: focusId === e.id ? P.hover : undefined }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.vendor || t.catsLong[e.category]}</div>
                <div style={{ fontSize: 11, color: P.text4 }}>{e.note ?? <span dir="ltr">{e.id}</span>}{e.recurring && <span style={{ marginInlineStart: 6, fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: P.purpleBg, color: P.purpleFg }}>{t.recurring}</span>}</div>
              </div>
              <div><span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: cs[0], color: cs[1], whiteSpace: 'nowrap' }}>{t.cats[e.category]}</span></div>
              <div style={{ textAlign: 'end', fontWeight: 700 }} dir="ltr">{amountOf(e)}</div>
              <div style={{ fontSize: 12, color: P.text2 }}>{allocName(e.allocation)}</div>
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: late ? P.amberPill : P.chip, color: late ? P.amberFg : P.text3 }} dir="ltr">{monthLabel(e.accrualMonth, isAr)}</span>
                {late && <div style={{ fontSize: 10, color: P.amberFg, marginTop: 2 }}>{t.lateNote}</div>}
              </div>
              <div style={{ fontSize: 12, color: P.text3 }} dir="ltr">{shortDate(e.date, isAr)} · {t.methods[e.method]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: P.text4, marginTop: 8 }}>{t.expFoot}</div>

      <Modal open={!!draft} onClose={() => setDraft(null)} width={500} title={draft?.id ? `${t.editTitle} — ${draft.id}` : t.expTitle} sub={t.expBody}
        footer={<>
          <Btn size="lg" variant="ghost" style={{ flex: 1, borderRadius: 10 }} onClick={() => setDraft(null)}>{t.cancel}</Btn>
          <Btn size="lg" variant="primary" disabled={!canSave} style={{ flex: 1.4, fontWeight: 700, borderRadius: 10 }} onClick={save}>{draft?.id ? t.editCta : t.expCta}</Btn>
        </>}>
        {draft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Input value={draft.vendor} onChange={(v) => setDraft({ ...draft, vendor: v })} placeholder={t.expPh1} style={field} autoFocus />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 9, alignItems: 'end' }}>
              <div><div style={label}>{t.fAmount}</div><Input ltr type="number" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} placeholder="480" style={field} /></div>
              <div><div style={label}>{t.fCurrency}</div><Segmented size="lg" options={[{ value: 'USD', label: 'USD' }, { value: 'LBP', label: 'LBP' }]} value={draft.currency} onChange={(v) => setDraft({ ...draft, currency: v })} style={{ borderRadius: 10, height: 44, alignItems: 'stretch' }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <div><div style={label}>{t.fCategory}</div><Select value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} options={CATS.map((c) => ({ value: c, label: t.catsLong[c] }))} style={{ height: 44, width: '100%', borderRadius: 10 }} /></div>
              <div><div style={label}>{t.fMethod}</div><Segmented size="lg" options={(['cash', 'card', 'whish'] as const).map((m) => ({ value: m, label: t.methods[m] }))} value={draft.method} onChange={(v) => setDraft({ ...draft, method: v })} style={{ borderRadius: 10, height: 44, alignItems: 'stretch' }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <div><div style={label}>{t.fAccrual}</div><Select value={draft.accrualMonth} onChange={(v) => setDraft({ ...draft, accrualMonth: v })} options={MONTHS.map((m) => ({ value: m, label: monthLabel(m, isAr) }))} style={{ height: 44, width: '100%', borderRadius: 10 }} /></div>
              <div><div style={label}>{t.fPayDate}</div><Input ltr type="date" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v || draft.date })} style={field} /></div>
            </div>
            <div>
              <div style={label}>{t.fAlloc}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([['rock', t.allocRock], ['kad', t.allocKad], ['mk', t.allocMk], ['split', t.allocSplit]] as const).map(([k, l]) => {
                  const on = draft.allocation === k;
                  return <button key={k} onClick={() => setDraft({ ...draft, allocation: k })} style={{ height: 34, padding: '0 13px', borderRadius: 999, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{l}</button>;
                })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: P.text2 }}>
              <Toggle on={draft.recurring} onChange={(v) => setDraft({ ...draft, recurring: v })} /><span>{t.fRecurring}</span>
            </div>
            <Notice tone="amber" style={{ marginTop: 5 }}>{t.expWarn}</Notice>
          </div>
        )}
      </Modal>
    </div>
  );
}
