/**
 * Items & Units — port of "KIS Items & UOM.dc.html".
 * MGT-ITM-01 item list · MGT-ITM-02 item detail (per-type adaptive tabs) · MGT-ITM-03 Units & Conversions.
 * Items come from the global store; per-item detail data lives in ./data.ts; factor edits and added
 * conversions persist in useModuleState('items').
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';
import { useStore, useModuleState } from '../../store';
import type { Item, ItemType } from '../../store';
import { useToast, P, shortDate } from '../../ui';
import { useModuleNav } from '../../shell/DesktopShell';
import { TEXT } from './text';
import { detailFor, resolvePurchFactor, ITEMS_SEED, type ConvRow, type ItemsState } from './data';
import { ItemList, type TypeFilter } from './views/ItemList';
import { ItemDetailView, tabsFor, TAB_KEYS, type ConvView, type TabKey } from './views/ItemDetail';
import { AmberNote, Dialog, DialogBtns, FormInput } from './views/Dialog';
import { recipeIdForItem } from '../recipes/data';

const DEMO_DATE = '12 Aug 2026';

export default function ItemsModule() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const go = useModuleNav();
  const [sp, setSp] = useSearchParams();
  const [ms, setMs] = useModuleState<ItemsState>('items', ITEMS_SEED);

  const spItem = sp.get('item');
  const spTab = sp.get('tab');
  const spCat = sp.get('cat');
  const validTab = (v: string | null): TabKey => (v && (TAB_KEYS as string[]).includes(v) ? (v as TabKey) : 'units');

  const [view, setView] = useState<'list' | 'detail'>(() => (spItem && store.item(spItem) ? 'detail' : 'list'));
  const [itemId, setItemId] = useState<string | null>(() => (spItem && store.item(spItem) ? spItem : null));
  const [tab, setTab] = useState<TabKey>(() => validTab(spTab));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  // factor edit modal
  const [edit, setEdit] = useState<{ idx: number; rule: string; prefix: string; suffix: string; old: number } | null>(null);
  const [editVal, setEditVal] = useState('');
  // quick creation forms
  const [form, setForm] = useState<'item' | 'conv' | null>(null);
  const [f1, setF1] = useState(''); const [f2, setF2] = useState(''); const [f3, setF3] = useState('');

  // deep links from other modules (?item=RM-001&tab=units)
  useEffect(() => {
    if (spItem && store.item(spItem)) { setItemId(spItem); setView('detail'); setTab(validTab(spTab)); }
    else if (spCat) { setView('list'); setSearch(spCat); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spItem, spTab, spCat]);

  const item: Item = (itemId ? store.item(itemId) : undefined) ?? store.state.items[0];
  const detail = useMemo(() => detailFor(item, store.state), [item, store.state]);

  // keep the tab valid for the item's type (like the prototype's `tab` fallback)
  const tabKeys = tabsFor(item);
  const effTab: TabKey = tabKeys.includes(tab) ? tab : 'general';

  const convRows: ConvView[] = detail.conv.concat(ms.extraConv[item.id] ?? []).map((c, i) => {
    const ov = ms.factors[item.id + ':' + i];
    const overridden = ov !== undefined;
    const factor = overridden ? ov : c.factor;
    return { ...c, idx: i, overridden, liveFactor: factor, liveRule: `${c.prefix} ${factor} ${c.suffix}`, liveEff: overridden ? DEMO_DATE : c.eff };
  });

  const openItem = (id: string) => { setItemId(id); setView('detail'); setTab('units'); };
  const backToList = () => { setView('list'); if (spItem) setSp({}, { replace: true }); };

  // ── keep the shared Item.purchFactor in step with the live purchasing-unit chain ──
  // "Applies from today": Receiving, Stock card and Invoice review convert with Item.purchFactor, so a factor
  // edit or an added rule on the purch → base path must reach the store; posted movements keep their own qty.
  type LiveRule = Pick<ConvRow, 'prefix' | 'suffix' | 'factor'>;
  const liveRules = (override?: { idx: number; factor: number }, extra?: LiveRule): LiveRule[] => {
    const rows: LiveRule[] = convRows.map((cv) => ({ prefix: cv.prefix, suffix: cv.suffix, factor: override && cv.idx === override.idx ? override.factor : cv.liveFactor }));
    return extra ? rows.concat(extra) : rows;
  };
  const syncPurchFactor = (rows: LiveRule[]) => {
    const f = resolvePurchFactor(item.purch, item.base, rows);
    if (f === undefined || f === item.purchFactor) return;
    const id = item.id;
    store.update((d) => { const it = d.items.find((i) => i.id === id); if (it) it.purchFactor = f; });
  };

  // ── factor edit (versioned, applies from today) ──
  const openEdit = (cv: ConvView) => { setEdit({ idx: cv.idx, rule: cv.liveRule, prefix: cv.prefix, suffix: cv.suffix, old: cv.liveFactor }); setEditVal(String(cv.liveFactor)); };
  const editSave = () => {
    const v = parseFloat(editVal);
    if (edit && !isNaN(v) && v > 0) {
      const e = edit;
      setMs((d) => { d.factors[item.id + ':' + e.idx] = v; });
      syncPurchFactor(liveRules({ idx: e.idx, factor: v }));
      store.logAudit({ action: 'Conversion factor changed', entity: `${item.id} ${item.en} · conversion`, oldValue: `${e.prefix} ${e.old} ${e.suffix}`, newValue: `${e.prefix} ${v} ${e.suffix} · from ${DEMO_DATE}`, moduleId: 'items' });
      toast(t.toastFactor);
    }
    setEdit(null);
  };

  // ── quick creation forms ──
  const openNewItem = () => { setForm('item'); setF1(''); setF2(''); setF3(''); };
  const openAddConv = () => { setForm('conv'); setF1(''); setF2(''); setF3(''); };
  const formGo = () => {
    if (!f1.trim() || !f2.trim()) return;
    if (form === 'item') {
      const base = (f3.trim() || 'KG').toUpperCase();
      const n = store.state.items.filter((i) => i.id.startsWith('NEW-')).length + 1;
      const id = 'NEW-' + String(n).padStart(2, '0');
      const type: ItemType = typeFilter !== 'all' ? typeFilter : 'raw';
      const it: Item = { id, en: f1.trim(), ar: f2.trim(), type, cat: '—', catAr: '—', base, purch: '—', cost: 0, stocked: true, incomplete: true, onHand: {} };
      store.update((d) => { d.items.push(it); });
      store.logAudit({ action: 'Item created', entity: `${id} ${it.en}`, newValue: `${t.types[type]} · base ${base} · Incomplete`, moduleId: 'items' });
      setForm(null);
      toast(t.toastItem);
    } else {
      const from = f1.trim().toUpperCase(), factor = parseFloat(f2), to = (f3.trim() || item.base).toUpperCase();
      if (isNaN(factor) || factor <= 0) return;
      const c: ConvRow = { rule: `1 ${from} = ${factor} ${to}`, kind: 'fixed', sub: null, resolved: `1 ${from} → ${factor} ${to}`, eff: DEMO_DATE, factor, prefix: `1 ${from} =`, suffix: to };
      const id = item.id;
      setMs((d) => { (d.extraConv[id] ??= []).push(c); });
      syncPurchFactor(liveRules(undefined, c));
      store.logAudit({ action: 'Conversion added', entity: `${item.id} ${item.en} · conversion`, newValue: `${c.rule} · from ${shortDate(store.now(), isAr)}`, moduleId: 'items' });
      setForm(null);
      toast(t.toastConv);
    }
  };
  const formOk = !!f1.trim() && !!f2.trim();
  const nm = (o: Item) => (isAr ? o.ar : o.en);

  const openRecipe = () => {
    const rid = recipeIdForItem(item.id);
    if (rid) go('recipes', { params: { recipe: rid } });
    else go('recipes');
  };

  return (
    <>
      {view === 'list'
        ? <ItemList search={search} setSearch={setSearch} typeFilter={typeFilter} setTypeFilter={setTypeFilter} onOpen={openItem} onNew={openNewItem} />
        : <ItemDetailView item={item} detail={detail} convRows={convRows} tab={effTab} setTab={setTab} onBack={backToList} onEdit={openEdit} onAddConv={openAddConv} onOpenRecipe={openRecipe} />}

      {form && (
        <Dialog onClose={() => setForm(null)}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{form === 'item' ? t.formNewItem : t.formAddConv + nm(item)}</div>
          <div style={{ fontSize: 13, color: P.text3, marginTop: 4, lineHeight: 1.5 }}>{form === 'item' ? t.formSubItem : t.formSubConv}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
            <FormInput autoFocus value={f1} onChange={setF1} placeholder={form === 'item' ? t.fp1Item : t.fp1Conv} />
            <FormInput value={f2} onChange={setF2} placeholder={form === 'item' ? t.fp2Item : t.fp2Conv} />
            <FormInput value={f3} onChange={setF3} placeholder={form === 'item' ? t.fp3Item : t.fp3Conv} />
          </div>
          <AmberNote style={{ marginTop: 14 }}>{form === 'item' ? t.formWarnItem : t.formWarnConv}</AmberNote>
          <DialogBtns cancel={t.cancel} onCancel={() => setForm(null)} cta={form === 'item' ? t.ctaItem : t.ctaConv} onGo={formGo} goBg={formOk ? P.ink : P.text4} />
        </Dialog>
      )}

      {edit && (
        <Dialog onClose={() => setEdit(null)}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{t.editFactor}</div>
          <div style={{ fontSize: 13, color: P.text3, marginTop: 4 }} dir="ltr">{edit.rule}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }} dir="ltr">
            <span style={{ fontSize: 14, color: P.text2 }}>{edit.prefix}</span>
            <input value={editVal} autoFocus onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') editSave(); }}
              style={{ width: 110, height: 44, padding: '0 12px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 17, fontWeight: 700, fontFamily: 'inherit', textAlign: 'center', color: P.text, outline: 'none' }} />
            <span style={{ fontSize: 14, color: P.text2 }}>{edit.suffix}</span>
          </div>
          <AmberNote style={{ padding: '12px 14px' }}>{t.factorWarning}</AmberNote>
          <DialogBtns style={{ marginTop: 20 }} cancel={t.cancel} onCancel={() => setEdit(null)} cta={t.applyToday} onGo={editSave} />
        </Dialog>
      )}
    </>
  );
}
