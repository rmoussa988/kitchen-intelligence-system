import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { LocId, Movement } from '../../../store';
import { GridTable, GridRow, KpiCard, P, fmt, money, shortDate, timeHM, DEMO_TODAY } from '../../../ui';
import { useModuleNav } from '../../../shell/DesktopShell';
import type { InvText } from '../text';
import { MV_KEY, MV_STYLE, CHIP_KEYS, chipMatches, type ChipKey } from '../data';
import { balanceMap, sortMoves } from '../calc';

const GRID_ALL = '86px minmax(124px,1.4fr) 102px 88px minmax(92px,1fr) 76px 76px minmax(94px,1fr)';
const GRID_ONE = '86px minmax(124px,1.4fr) 102px minmax(92px,1fr) 76px 76px minmax(94px,1fr)';
const DEMO_DAY = DEMO_TODAY.slice(0, 10);

export function LedgerView({ t, onOpenCard, onCountRef }: { t: InvText; onOpenCard: (itemId: string, loc: LocId) => void; onCountRef: () => void }) {
  const { isAr } = useLang();
  const store = useStore();
  const go = useModuleNav();
  const [sp] = useSearchParams();
  const spType = sp.get('type'); // e.g. from the P&L statement drill (?tab=ledger&type=sale)
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<ChipKey>(() => (spType && (CHIP_KEYS as readonly string[]).includes(spType) ? (spType as ChipKey) : 'all'));
  const isAll = store.scope === 'all';
  const { items, movements, alerts, deliveries } = store.state;

  const balances = useMemo(() => balanceMap(items, movements), [items, movements]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortMoves(movements, 'desc').filter((m) => {
      if (!store.inScope(m.loc)) return false;
      if (!chipMatches(chip, MV_KEY[m.type])) return false;
      if (!q) return true;
      const it = store.item(m.itemId);
      return !!it && (it.en.toLowerCase().includes(q) || it.ar.includes(search.trim()) || it.id.toLowerCase().includes(q));
    });
  }, [movements, search, chip, store]);

  // KPI strip
  const stockValue = items.reduce((a, it) => a + store.scopeLocs.reduce((b, l) => b + (it.onHand[l] ?? 0) * it.cost, 0), 0);
  const movesToday = movements.filter((m) => m.ts.startsWith(DEMO_DAY) && store.inScope(m.loc)).length;
  const lowStock = items.reduce((a, it) => a + store.scopeLocs.filter((l) => it.stocked && it.onHand[l] != null && it.min != null && (it.onHand[l] ?? 0) < it.min).length, 0);
  const openVar = alerts.filter((a) => !a.dismissed && a.type === 'inv_variance' && store.inScope(a.loc)).length;
  const scopeLabel = isAll ? t.all : t.locs[store.scope as LocId];

  const chips: { k: ChipKey; label: string }[] = CHIP_KEYS.map((k) => ({
    k, label: k === 'all' ? t.all : k === 'prod' ? t.chipProd : k === 'trf' ? t.chipTrf : t.types[k],
  }));

  const onSource = (m: Movement) => {
    switch (m.sourceKind) {
      case 'delivery': { const d = deliveries.find((x) => x.invoiceNo === m.source || x.id === m.source); go('receiving', { params: { id: d?.id ?? m.source } }); break; }
      case 'batch': go('production', { params: { batch: m.source } }); break;
      case 'transfer': go('transfers', { params: { id: m.source } }); break;
      case 'waste': go('waste', { params: { id: m.source } }); break;
      case 'count': onCountRef(); break;
      default: break;
    }
  };

  const grid = isAll ? GRID_ALL : GRID_ONE;

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flex: 'none' }}>
        <KpiCard flex={1.2} tone="ink" label={`${t.stockValue} · ${scopeLabel}`} value={'$' + Math.round(stockValue).toLocaleString('en-US')} />
        <KpiCard label={t.movesToday} value={movesToday} />
        <KpiCard tone="amber" label={t.lowStock} value={lowStock} />
        <KpiCard tone="red" label={t.openVariances} value={openVar} />
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 'none', flexWrap: 'wrap' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPh}
          style={{ height: 36, width: 250, padding: '0 14px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, fontSize: 13, fontFamily: 'inherit', color: P.text, outline: 'none' }} />
        {chips.map((c) => {
          const on = chip === c.k;
          return (
            <button key={c.k} onClick={() => setChip(c.k)} style={{ height: 32, padding: '0 12px', borderRadius: 999, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{c.label}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: P.text3 }}>{t.today} · 12 Aug 2026</span>
      </div>
      <GridTable cols={grid} style={{ flex: 1, minHeight: 0 }} empty={t.emptyLedger}
        head={[t.time, t.product, t.movement, ...(isAll ? [t.location] : []), { label: t.qtyChange, align: 'end' }, { label: t.onHand, align: 'end' }, { label: t.valueImpact, align: 'end' }, t.source]}>
        {rows.map((m) => {
          const it = store.item(m.itemId);
          const k = MV_KEY[m.type];
          const ts = MV_STYLE[k];
          const baseUnit = it?.base ?? m.enteredUnit ?? '';
          const unit = m.enteredUnit ?? baseUnit;
          const bal = balances.get(m.id);
          let main: string, base: string, qtyColor: string;
          if (m.type === 'count') {
            const phys = bal ?? 0; const exp = phys - m.qty;
            main = `${fmt(phys)} ${baseUnit} ${t.counted}`; base = `${t.expected.toLowerCase()} ${fmt(exp)} ${baseUnit}`; qtyColor = P.text;
          } else {
            const eq = m.enteredQty ?? Math.abs(m.qty);
            main = `${m.qty > 0 ? '+' : m.qty < 0 ? '−' : ''}${fmt(eq)} ${unit}`;
            base = it && !it.stocked ? t.recipeConsumption : `= ${fmt(Math.abs(m.qty))} ${baseUnit} ${t.baseWord}`;
            qtyColor = m.qty > 0 ? P.greenFg : m.qty < 0 ? P.redFg : P.text;
          }
          const valColor = m.value > 0 ? P.greenFg : m.value < 0 ? P.redFg : P.text3;
          const clickable = !!it && it.stocked;
          const hasNav = m.sourceKind === 'delivery' || m.sourceKind === 'batch' || m.sourceKind === 'transfer' || m.sourceKind === 'waste' || m.sourceKind === 'count';
          return (
            <GridRow key={m.id} cols={grid}>
              <div style={{ color: P.text3, fontSize: 12 }} dir="ltr">{shortDate(m.ts, isAr)} {timeHM(m.ts)}</div>
              <div onClick={clickable ? () => onOpenCard(m.itemId, m.loc) : undefined} style={{ minWidth: 0, cursor: clickable ? 'pointer' : undefined }}>
                <div className="ellipsis" style={{ fontWeight: 600, color: P.ink, textDecoration: clickable ? 'underline' : undefined, textDecorationColor: '#C6C0AB', textUnderlineOffset: 3 }}>{it ? (isAr ? it.ar : it.en) : m.itemId}</div>
              </div>
              <div><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: ts.bg, color: ts.fg, whiteSpace: 'nowrap' }}>{t.types[k]}</span></div>
              {isAll && <div style={{ color: P.text2, fontSize: 12.5 }}>{t.locs[m.loc]}</div>}
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontWeight: 600, color: qtyColor }} dir="ltr">{main}</div>
                <div style={{ fontSize: 11, color: P.text4 }} dir="ltr">{base}</div>
              </div>
              <div style={{ textAlign: 'end', color: P.text2 }} dir="ltr">{bal != null ? `${fmt(bal)} ${baseUnit}` : '—'}</div>
              <div style={{ textAlign: 'end', fontWeight: 600, color: valColor }} dir="ltr">{money(m.value, { sign: true })}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); onSource(m); }} className="ellipsis" style={{ fontSize: 12, color: P.blueFg, cursor: hasNav ? 'pointer' : 'default' }} dir="ltr">{m.source}</a>
                {m.beyondTolerance && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: P.redPill, color: P.redFg, whiteSpace: 'nowrap', flex: 'none' }}>{t.beyondTol}</span>}
              </div>
            </GridRow>
          );
        })}
      </GridTable>
    </>
  );
}
