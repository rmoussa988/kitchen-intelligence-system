import { useLang } from '../../../i18n/LangContext';
import type { Item, ItemType } from '../../../store';
import { useStore } from '../../../store';
import { GridTable, GridRow, Input, LocationSelector, Page, PageHeader, Body, TYPE_STYLE, P, money } from '../../../ui';
import { TEXT } from '../text';

export type TypeFilter = 'all' | ItemType;
const COLS = '72px minmax(160px,1.8fr) 100px minmax(80px,1fr) 56px 74px 92px 72px minmax(90px,1fr) 96px';
const CHIP_KEYS: TypeFilter[] = ['all', 'raw', 'sub', 'prep', 'menu', 'pack'];
const TYPE_ORDER: ItemType[] = ['raw', 'sub', 'prep', 'menu', 'pack'];

export function ItemList({ search, setSearch, typeFilter, setTypeFilter, onOpen, onNew }: {
  search: string; setSearch: (v: string) => void; typeFilter: TypeFilter; setTypeFilter: (v: TypeFilter) => void;
  onOpen: (id: string) => void; onNew: () => void;
}) {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const ALL = store.state.items;
  const nm = (o: Item) => (isAr ? o.ar : o.en);
  const nmAlt = (o: Item) => (isAr ? o.en : o.ar);
  const cat = (o: Item) => (isAr ? (o.catAr || o.cat) : o.cat);
  const sup = (o: Item) => (o.supplier ? store.supplierName(o.supplier) : '—');

  const q = search.trim().toLowerCase();
  const rows = ALL.filter((it) =>
    (typeFilter === 'all' || it.type === typeFilter) &&
    (!q || it.en.toLowerCase().includes(q) || it.ar.includes(search.trim()) || it.id.toLowerCase().includes(q) || sup(it).toLowerCase().includes(q) || it.cat.toLowerCase().includes(q) || (it.catAr ?? '').includes(search.trim())),
  );

  const typeCounts: Partial<Record<ItemType, number>> = {};
  ALL.forEach((it) => { typeCounts[it.type] = (typeCounts[it.type] || 0) + 1; });
  const kpiTypes = TYPE_ORDER.filter((k) => typeCounts[k]).map((k) => ({ n: typeCounts[k] ?? 0, label: t.types[k], color: TYPE_STYLE[k].dot }));
  const kpiIncomplete = ALL.filter((i) => i.incomplete).length;

  return (
    <Page>
      <PageHeader title={t.items} screenId="MGT-ITM-01" right={<LocationSelector />} />
      <Body>
        <div style={{ display: 'flex', gap: 12, flex: 'none' }}>
          <div style={{ flex: 1, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.totalItems}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }} dir="ltr">{ALL.length}</div>
          </div>
          <div style={{ flex: 2.2, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.text3, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.byType}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
              {kpiTypes.map((kt) => (
                <div key={kt.label} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: kt.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 18, fontWeight: 700 }} dir="ltr">{kt.n}</span>
                  <span style={{ fontSize: 12.5, color: P.text3 }}>{kt.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1.3, background: P.amberBg, border: `1px solid ${P.amberBorder}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, color: P.amberFg, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t.dataHealth}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: P.amberFg }} dir="ltr">{kpiIncomplete}</div>
              <div style={{ fontSize: 12.5, color: P.amberFg }}>{t.missingConv}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 'none' }}>
          <Input value={search} onChange={setSearch} placeholder={t.searchPh} />
          {CHIP_KEYS.map((k) => {
            const on = typeFilter === k;
            return (
              <button key={k} onClick={() => setTypeFilter(k)} style={{ height: 34, padding: '0 14px', borderRadius: 999, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                {k === 'all' ? t.all : t.types[k]}
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          <button onClick={onNew} style={{ height: 38, padding: '0 18px', borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.newItem}</button>
        </div>

        <GridTable cols={COLS} style={{ flex: 1 }} empty={t.emptyList}
          head={[t.code, t.name, t.type, t.category, t.base, t.purchase, { label: t.cost, align: 'end' }, { label: t.price, align: 'end' }, t.supplier, t.flagsCol]}>
          {rows.map((r) => {
            const ts = TYPE_STYLE[r.type];
            return (
              <GridRow key={r.id} cols={COLS} onClick={() => onOpen(r.id)}>
                <div style={{ color: P.text3, fontSize: 12 }} dir="ltr">{r.id}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontWeight: 600 }}>{nm(r)}</div>
                  <div className="ellipsis" style={{ fontSize: 11.5, color: P.text4 }}>{nmAlt(r)}</div>
                </div>
                <div><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: ts.bg, color: ts.fg }}>{t.types[r.type]}</span></div>
                <div style={{ color: P.text2 }}>{cat(r)}</div>
                <div style={{ fontWeight: 600 }} dir="ltr">{r.base}</div>
                <div style={{ color: P.text2 }} dir="ltr">{r.purch}</div>
                <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{money(r.cost, { max: 3 })} / {r.base}</div>
                <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{r.price ? money(r.price, { max: 3 }) : '—'}</div>
                <div className="ellipsis" style={{ color: P.text2 }}>{sup(r)}</div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {r.isRecipe && <span title="Recipe" style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 6, background: P.purpleBg, color: P.purpleFg, fontWeight: 600 }}>R</span>}
                  {r.pos && <span title="POS" style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 6, background: P.tealBg, color: P.tealFg, fontWeight: 600 }}>POS</span>}
                  {r.incomplete && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: P.amberPill, color: P.amberFg, fontWeight: 600 }}>{t.incomplete}</span>}
                </div>
              </GridRow>
            );
          })}
        </GridTable>
      </Body>
    </Page>
  );
}
