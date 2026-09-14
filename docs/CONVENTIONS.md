# KIS app — module porting conventions

You are porting one or more Claude Design prototypes (`*.dc.html`) from the handoff bundle into this
Vite + React 18 + TypeScript app. Read this whole file before touching code.

## Where things are

| Path | What |
|---|---|
| `/Users/apple/Desktop/KIS/joe-he-l-file-ma-tghalet/project/*.dc.html` | Source prototypes (read the one(s) you were assigned, fully — the `<x-dc>` template AND the `class Component extends DCLogic` script). |
| `src/modules/<id>/index.tsx` | Your module's entry (default export, no props). A stub exists — **overwrite it**. |
| `src/modules/registry.ts` | Module ids/titles/screen ids. Do not edit unless told. |
| `src/ui/index.tsx` | Shared primitives (below). Import from `'../../ui'`. |
| `src/theme/tokens.ts` | `P` (paper), `D` (dark), `S` (sidebar), `TYPE_STYLE`. Import from `'../../ui'` too. |
| `src/i18n/LangContext.tsx` | `useLang()`, `LOC_NAMES`, `arDigits`. |
| `src/store/` | Global store: `useStore()`, `useModuleState()`, types. Import from `'../../store'`. |
| `src/shell/DesktopShell.tsx` | `useModuleNav()` for cross-module navigation. |

## Prototype → React mapping

The prototypes are React-like: `state`, `TEXT = {en:{…}, ar:{…}}`, data constants, and a `renderVals()`
that computes every binding. Port them like this:

- Keep the module's **TEXT dictionary verbatim** (EN + AR) in the module file (or `text.ts`). Get the
  current language with `const { lang, isAr, dir, pick, backGlyph, chevron } = useLang(); const t = TEXT[lang];`
- Keep the prototype's **demo data** (recipes, cases, report rows, checklist items, trend arrays…) inside the
  module, **except** entities that live in the global store (items, suppliers, users, movements, transfers,
  waste, plans, batches, deliveries, purchase orders, invoices, expenses, closings, fx history, alerts, audit).
  For those, read from `useStore().state` and *add anything missing to the seed via your module's `seed.ts`*
  → see "Extending seed data".
- `state = {...}` → `useState`s (or one `useReducer`). Per-module state that should survive navigation
  (e.g. open case, accepted rows, edits) → `useModuleState(moduleId, seed)`.
- The `<x-dc>` template with inline `style="…"` → JSX with `style={{…}}`. **Copy the exact px, colours,
  radii, gaps, font sizes.** Prefer the token constants (`P.text3` etc.) over raw hex where the hex matches a
  token; raw hex is fine otherwise. `style-hover="background:#F3F0E1"` → `className="row-hover"`.
- `<sc-if>` → `{cond && (...)}` ; `<sc-for>` → `.map()` with keys.
- `dir="ltr"` on numbers → keep `dir="ltr"` (or `className="num"`).
- The prototype's own top chrome (the `KIS | title | screen-id | All locations | EN/عربي | avatar` bar) is
  **replaced by the shell**. Use `<PageHeader title screenId right tabs …/>` for the in-page header (title,
  screen id badge, back button, actions, tabs). Never render your own language toggle — the shell has one.
  Staff modules: the shell renders `← Home | title | EN/عربي`; your module renders everything under it.
- **Screen IDs** must remain visible (badge in PageHeader or inline `<ScreenId id="…"/>` when the screen changes).
- Cross-module jumps that the prototype "toasted" (e.g. "→ Stock card") should now **navigate** where the
  destination module exists: `const go = useModuleNav(); go('inventory', { params: { item: 'RM-001' } })`.
  Read incoming params with `useSearchParams()` from react-router-dom and open the right sub-view. If the
  destination is not in this build (POS, roles, settings, AI), keep a toast.
- Tweakable props (`data-props`: language, varianceTolerance, wasteAutoApprove…) → read from
  `store.state.settings` (`varianceTolerancePct`, `wasteAutoApproveUsd`, `ppvAmberPct/ppvRedPct`,
  `productionGapAlertPct`, `cashTolerance`, `fxRate`).
- Location scope: management screens must respect `store.scope` (`'all' | 'mk' | 'rock' | 'kad'`).
  Render `<LocationSelector/>` in the PageHeader `right` slot where the prototype had a location selector
  (it is bound to the global scope). Filter with `store.inScope(loc)` / `store.scopeLocs`.

## Layout skeleton (management)

```tsx
import { Page, PageHeader, Body, KpiCard, GridTable, GridRow, Pill, Btn, Chip, Input, LocationSelector, useToast, money, fmt, P } from '../../ui';

export default function Module() {
  const { lang, isAr } = useLang(); const t = TEXT[lang];
  const store = useStore(); const toast = useToast();
  return (
    <Page>
      <PageHeader title={t.title} screenId="MGT-XXX-01" right={<LocationSelector />}
        tabs={Object.assign([{ value: 'a', label: t.tabA }, { value: 'b', label: t.tabB, badge: 2 }], { active: tab, onChange: setTab })} />
      <Body>…</Body>
    </Page>
  );
}
```

`Page` = full-height flex column; `Body` = scrollable padded area (18px 22px). Sticky side panels: put a
flex row in Body with `position: sticky; top: 0` on the panel like the prototypes do.

## Layout skeleton (staff / dark)

The shell provides the dark background and header. Your root should be
`<div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, color: D.text }}>`.
Use `DCard`, `DBtn`, `DPill`, `DFooter`, `KeypadSheet`, `ConfirmSheet`, `Sheet`, `DoneScreen`, `Segmented dark`,
`LocBadge dark`. Touch targets ≥ 52px, font sizes as in the prototype (18–30px).

## Shared UI (src/ui/index.tsx)

`Pill(tone|bg/fg, size)`, `Tag`, `ScreenId`, `Dot`, `Card(tone)`, `KpiCard(label,value,sub,tone)`, `Notice(tone)`,
`Btn(variant primary|secondary|ghost|danger|amber|green, size)`, `Chip(active)`, `Segmented(options,value,onChange,dark)`,
`LocationSelector`, `LocBadge(loc,dark)`, `Input`, `Select`, `Toggle`, `SectionTitle(right)`, `PageHeader`, `Tabs`,
`Body`, `Page`, `Row`, `Spacer`, `GridTable(cols, head, empty)`, `GridRow(cols, onClick, tone)`, `Cell2(a,b)`, `NumCell`,
`Sparkline(data, refLine)`, `Bar(value,max)`, `Ring(value)`, `Modal`, `ConfirmModal`, `useToast()`,
dark: `DBtn`, `Sheet`, `KeypadSheet`, `ConfirmSheet`, `DoneScreen`, `DPill`, `DCard`, `DFooter`,
misc: `EmptyState`, `Field`, `Note`, `Delta`. Formatting: `money`, `fmt`, `num`, `pct`, `signed`, `lbp`, `shortDate`,
`timeHM`, `DEMO_TODAY`. Keypad: `KEYS`, `appendKey`. Tones: `TONE` map.

You may add module-local components inside your module folder. **Do not edit `src/ui/index.tsx`** (other agents
are using it concurrently); if you need a primitive that isn't there, write it in your module folder.

## Store API (src/store)

```ts
const store = useStore();
store.state            // CoreState (see src/store/types.ts) — items, suppliers, users, movements, transfers, waste,
                       // plans, batches, deliveries, purchaseOrders, invoices, expenses, closings, fxHistory, alerts, audit, settings, scope
store.update(d => { d.waste[i].status = 'approved'; })   // immer draft
store.scope / store.setScope / store.scopeLocs / store.inScope(loc)
store.item(id) / store.itemName(id, isAr) / store.userName(id, isAr) / store.supplierName(id)
store.nextId('WST') → 'WST-1001'    store.now() → ISO string in the demo day (12 Aug 2026)
store.postMovement({ itemId, loc, type, qty(base, signed), enteredQty, enteredUnit, value, source, sourceKind })  // updates on-hand
store.addAlert({ severity, type, en, ar, loc?, moduleId? })  store.dismissAlert(id)
store.logAudit({ action, entity, oldValue?, newValue?, moduleId })
store.setItemCost(itemId, cost)
const [ms, setMs] = useModuleState<MyState>('items', SEED)   // persisted module-private state; setMs(draft => …) or setMs(value)
```

**Make the data chain real** where the prototype implies it:
- Waste approve → `postMovement(type:'waste', qty:-base, value:-cost)` + status → approved + audit. Reject → status only.
- Transfer send → `transfer_out` movements from sender, status `sent`; confirm → `transfer_in` at receiver, status `confirmed`
  (or `flagged` when beyond tolerance) + alert when flagged.
- Receiving submit → `receiving` movement per line + `setItemCost` to the new moving average + a Delivery row + an
  invoice in stage `received` for the pipeline + alert when PPV ≥ red band.
- Production complete → `production_out` for raw/marinade, `production_in` for output at built-up cost; batch → `complete`;
  gap alert when gap% ≥ `productionGapAlertPct`.
- Count accept → `count` movements (adjustment to physical) + audit. Gap accept → `gapStatus:'accepted'` + audit.
- Invoice pipeline stage moves → `invoices[].stage`; accountant approve → bill appears in Accounting payables (same rows).
- Anything "approval-gated" → show the ConfirmModal, then apply + `logAudit`.

### Extending seed data
If the prototype has entities of a store type that the seed lacks (e.g. more deliveries, another transfer, a batch),
create `src/modules/<id>/seed.ts` exporting e.g. `export const EXTRA_DELIVERIES: Delivery[] = [...]` and merge them
on mount **only if absent**:
```ts
useEffect(() => { store.update(d => { for (const x of EXTRA) if (!d.deliveries.some(y => y.id === x.id)) d.deliveries.push(x); }); }, []);
```
Keep ids unique and consistent with the seed's world (Main Kitchen / Rock / Kaddoum, USD, Aug 2026, items RM-/SR-/PR-/MI-/PK-).

## Bilingual / RTL rules
- Every visible string comes from TEXT[lang]; no hard-coded English in JSX.
- The shell sets `dir` on the root; use logical properties (`marginInlineStart`, `insetInlineEnd`, `textAlign:'start'|'end'`,
  `borderInlineStart`). Numbers/money/ids/units stay LTR (`dir="ltr"`).
- Arrows/chevrons: use `backGlyph`, `fwdGlyph`, `chevron` from `useLang()`.

## Quality bar
- `npm run typecheck` must pass for your files (strict TS; no `any` unless unavoidable — then `// eslint-disable-line`-free `unknown` casts).
- Every interactive affordance in the prototype works: tabs, filters, chips, search, row → detail, modals, keypads,
  approve/reject, accept/recount, add rows, toggles, sort. Empty states preserved.
- Match the prototype visually: same structure, spacing, colours, weights. Dense management screens; oversized staff screens.
- No external libraries beyond react / react-router-dom / immer.
- Keep files reasonable: split big modules into `index.tsx` + `views/*.tsx` + `data.ts` + `text.ts`.
- When done, report: what screens/states were ported, which store actions are wired, anything left as toast.
