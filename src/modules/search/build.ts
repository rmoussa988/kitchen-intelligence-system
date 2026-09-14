import type { CoreState, LocId } from '../../store';
import { money, fmt, shortDate, timeHM } from '../../ui';
import type { Kind, SearchText } from './text';
import type { Route } from './data';
import { DEMO_RESULTS, TRACE_ID } from './data';

export interface Entry {
  kind: Kind;
  title: [string, string];
  sub: [string, string];
  ref: string;
  /** lower-cased searchable text (ids, names in both languages, dates, related refs) */
  haystack: string;
  trace?: boolean;
  route: Route;
}

export const KIND_ORDER: Kind[] = ['batch', 'item', 'recipe', 'trf', 'waste', 'delivery', 'inv', 'sup', 'emp', 'storage', 'equip'];

/** Builds the global search index from the store's entities + the prototype's extra demo rows. */
export function buildIndex(state: CoreState, T: { en: SearchText; ar: SearchText }): Entry[] {
  const out: Entry[] = [];
  const itemName = (id: string): [string, string] => { const it = state.items.find((i) => i.id === id); return it ? [it.en, it.ar] : [id, id]; };
  const supName = (id: string): [string, string] => { const s = state.suppliers.find((x) => x.id === id); return s ? [s.name, s.nameAr ?? s.name] : [id, id]; };
  const userName = (id: string | undefined): [string, string] => { if (!id) return ['—', '—']; const u = state.users.find((x) => x.id === id); return u ? [u.name, u.nameAr] : [id, id]; };
  const locN = (l: LocId): [string, string] => [T.en.locs[l], T.ar.locs[l]];
  const dateN = (ts: string): [string, string] => [shortDate(ts, false), shortDate(ts, true)];
  const hay = (...parts: (string | number | undefined)[]) => parts.filter((p) => p !== undefined && p !== '').join(' ').toLowerCase();

  for (const it of state.items) {
    // Stocked prepared items (e.g. PR-002) carry a recipe but are searched/traced as inventory items, not recipes.
    const stockedPrep = !!it.isRecipe && it.type === 'prep' && it.stocked;
    const kind: Kind = it.isRecipe && !stockedPrep ? 'recipe' : 'item';
    const cost = `${money(it.cost, { max: 3 })} / ${it.base}`;
    out.push({ kind, title: [it.en, it.ar], sub: [`${it.id} · ${T.en.types[it.type]} · ${cost}`, `${it.id} · ${T.ar.types[it.type]} · ${cost}`], ref: it.id,
      haystack: hay(it.id, it.en, it.ar, it.cat, it.catAr, it.supplier, T.en.types[it.type], T.ar.types[it.type]),
      route: kind === 'recipe' ? ['recipes', { recipe: it.id }] : ['items', { item: it.id }] });
  }
  for (const b of state.batches) {
    const [en, ar] = itemName(b.itemId); const [le, la] = locN(b.loc); const [de, da] = dateN(b.startedAt);
    const y = b.yieldPct != null ? [` · ${T.en.yield} ${b.yieldPct}%`, ` · ${T.ar.yield} ${b.yieldPct}%`] : ['', ''];
    out.push({ kind: 'batch', title: [`${T.en.batch} ${b.id} — ${en}`, `${T.ar.batch} ${b.id} — ${ar}`], sub: [`${le} · ${de}${y[0]}`, `${la} · ${da}${y[1]}`], ref: b.id,
      haystack: hay(b.id, en, ar, le, la, de, da, b.startedAt.slice(0, 10), ...userName(b.employee), b.status), trace: b.id === TRACE_ID, route: ['production', { batch: b.id }] });
  }
  for (const x of state.transfers) {
    const [fe, fa] = locN(x.from); const [te, ta] = locN(x.to); const [de, da] = dateN(x.sentAt ?? x.requestedAt);
    out.push({ kind: 'trf', title: [`${T.en.transfer} ${x.id} — ${fe} → ${te}`, `${T.ar.transfer} ${x.id} — ${fa} ← ${ta}`],
      sub: [`${x.lines.length} ${T.en.lines} · ${T.en.trfStatus[x.status]} · ${de}`, `${x.lines.length} ${T.ar.lines} · ${T.ar.trfStatus[x.status]} · ${da}`], ref: x.id,
      haystack: hay(x.id, fe, fa, te, ta, de, da, x.status, x.requestedAt.slice(0, 10), ...x.lines.flatMap((l) => itemName(l.itemId))), route: ['transfers', { id: x.id }] });
  }
  for (const w of state.waste) {
    const [en, ar] = itemName(w.itemId); const [le, la] = locN(w.loc); const [de, da] = dateN(w.ts);
    out.push({ kind: 'waste', title: [`${T.en.waste} ${w.id} — ${fmt(w.qty)} ${w.unit} ${en}`, `${T.ar.waste} ${w.id} — ${fmt(w.qty)} ${w.unit} ${ar}`],
      sub: [`${le} · ${de} · ${money(w.cost)} · ${T.en.wasteStatus[w.status]}`, `${la} · ${da} · ${money(w.cost)} · ${T.ar.wasteStatus[w.status]}`], ref: w.id,
      haystack: hay(w.id, en, ar, le, la, de, da, w.ts.slice(0, 10), w.reason, ...userName(w.employee), w.status), route: ['waste', { id: w.id }] });
  }
  for (const d of state.deliveries) {
    const [se, sa] = supName(d.supplierId); const [le, la] = locN(d.loc); const [de, da] = dateN(d.ts);
    out.push({ kind: 'delivery', title: [`${T.en.delivery} ${d.id} — ${se}`, `${T.ar.delivery} ${d.id} — ${sa}`],
      sub: [`${d.invoiceNo} · ${le} · ${de} ${timeHM(d.ts)} · ${money(d.total)}`, `${d.invoiceNo} · ${la} · ${da} ${timeHM(d.ts)} · ${money(d.total)}`], ref: d.id,
      haystack: hay(d.id, d.invoiceNo, se, sa, le, la, de, da, d.ts.slice(0, 10), ...userName(d.receivedBy), ...d.lines.flatMap((l) => itemName(l.itemId))), route: ['receiving', { id: d.id }] });
  }
  for (const inv of state.invoices) {
    const [se, sa] = supName(inv.supplierId); const [de, da] = dateN(inv.date);
    const amt = inv.currency === 'LBP' ? `${inv.amount.toLocaleString('en-US')} LL` : money(inv.amount);
    out.push({ kind: 'inv', title: [`${T.en.invoice} ${inv.invoiceNo} — ${se}`, `${T.ar.invoice} ${inv.invoiceNo} — ${sa}`],
      sub: [`${inv.id} · ${amt} · ${T.en.stages[inv.stage]} · ${de}`, `${inv.id} · ${amt} · ${T.ar.stages[inv.stage]} · ${da}`], ref: inv.invoiceNo,
      haystack: hay(inv.id, inv.invoiceNo, se, sa, de, da, inv.date, inv.stage, inv.deliveryId, inv.poId), route: ['invoice-review', { id: inv.id }] });
  }
  for (const s of state.suppliers) {
    out.push({ kind: 'sup', title: [s.name, s.nameAr ?? s.name], sub: [`${s.id} · ${s.contact} · ${s.terms}`, `${s.id} · ${s.contact} · ${s.terms}`], ref: s.id,
      haystack: hay(s.id, s.name, s.nameAr, s.contact, s.phone, s.terms, ...s.products.flatMap((p) => itemName(p))), route: ['master-data', { tab: 'suppliers', id: s.id }] });
  }
  for (const u of state.users) {
    const scope = u.scope === 'all' ? T.en.locs.mk + ' · ' + T.en.locs.rock + ' · ' + T.en.locs.kad : (typeof u.scope === 'string' ? [u.scope] : u.scope).map((l) => T.en.locs[l as LocId]).join(' · ');
    const scopeAr = u.scope === 'all' ? T.ar.locs.mk + ' · ' + T.ar.locs.rock + ' · ' + T.ar.locs.kad : (typeof u.scope === 'string' ? [u.scope] : u.scope).map((l) => T.ar.locs[l as LocId]).join(' · ');
    const roleEn = T.en.roles[u.role] ?? u.role, roleAr = T.ar.roles[u.role] ?? u.role;
    out.push({ kind: 'emp', title: [u.name, u.nameAr], sub: [`${u.id} · ${roleEn} · ${scope}`, `${u.id} · ${roleAr} · ${scopeAr}`], ref: u.id,
      haystack: hay(u.id, u.name, u.nameAr, u.role, roleEn, roleAr, scope, scopeAr), route: ['master-data', { tab: 'users', id: u.id }] });
  }
  // prototype demo rows that have no store record
  const refs = new Set(out.map((e) => e.ref));
  for (const r of DEMO_RESULTS) {
    if (refs.has(r.ref)) continue;
    out.push({ kind: r.kind, title: r.title, sub: r.sub, ref: r.ref, haystack: hay(r.ref, ...r.title, ...r.sub), trace: r.ref === TRACE_ID, route: r.route });
  }
  return out;
}
