# Kitchen Intelligence System — app

Real implementation of the KIS design prototypes (Claude Design handoff bundle in
`../joe-he-l-file-ma-tghalet/project/`). Vite + React 18 + TypeScript, no backend — a shared,
localStorage-persisted store makes the data chain real across modules
(receiving → inventory → production → transfers → waste → counts → variance → P&L).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static bundle in dist/ (open dist/index.html or serve it)
npm run typecheck
```

## Scope of this build

Only the modules from the "Inventory & Production", "Purchasing & Receiving", "Accounting & Finance"
and "Staff shell" groups of the design project. POS, HR, login/roles, settings/audit, onboarding,
day-one states and the AI analyst are **not** included yet (design still in progress).

| Group | Module id | Route | Source prototype |
|---|---|---|---|
| Inventory & Production | `items` | `#/m/items` | KIS Items & UOM |
| | `inventory` | `#/m/inventory` | KIS Inventory & Counts |
| | `recipes` | `#/m/recipes` | KIS Recipes |
| | `production` | `#/m/production` | KIS Production Management |
| | `production-gaps` | `#/m/production-gaps` | KIS Production Gap Review |
| | `transfers` | `#/m/transfers` | KIS Transfers |
| | `waste` | `#/m/waste` | KIS Waste Management |
| | `variance` | `#/m/variance` | KIS Variance Investigation |
| | `search` | `#/m/search` | KIS Search, Trace & QR |
| | `staff-production` | `#/staff/staff-production` | KIS Production Tablet v2 (staff) |
| | `staff-batch` | `#/staff/staff-batch` | KIS Production Batch (staff) |
| | `staff-waste` | `#/staff/staff-waste` | KIS Waste (staff) |
| Purchasing & Receiving | `purchasing` | `#/m/purchasing` | KIS Purchasing |
| | `receiving` | `#/m/receiving` | KIS Receiving Oversight |
| | `staff-receiving` | `#/staff/staff-receiving` | KIS Receiving Entry (staff) |
| | `invoice-pipeline` | `#/m/invoice-pipeline` | KIS Supplier Invoice Pipeline |
| | `invoice-review` | `#/m/invoice-review` | KIS-Invoice-Review |
| | `master-data` | `#/m/master-data` | KIS Users, Locations & Suppliers |
| Accounting & Finance | `accounting` | `#/m/accounting` | KIS Accounting |
| | `ledger` | `#/m/ledger` | KIS General Ledger |
| | `pnl` | `#/m/pnl` | KIS P&L |
| | `financial-pnl` | `#/m/financial-pnl` | KIS Financial P&L (owner) |
| | `reports` | `#/m/reports` | KIS Reports & Alerts |
| | `health` | `#/m/health` | KIS Health, Owner Report & Compliance |
| Staff shell | `staff-tablet` | `#/staff/staff-tablet` | KIS Staff Tablet |

`#/staff` is the tablet home (dark, oversized tiles); `#/m/...` runs inside the management shell
(sidebar, top bar, EN/عربي toggle with full RTL, global location scope).

## Layout

```
src/
  theme/        tokens (paper + dark palettes), global.css
  i18n/         LangContext — useLang(), LOC_NAMES
  store/        types, seed (demo world: Main Kitchen / Rock / Kaddoum, Aug 2026), StoreContext (useStore, useModuleState)
  ui/           shared primitives (pills, KPI cards, grid tables, modals, toast, dark keypad/sheets…), format helpers
  shell/        DesktopShell (sidebar + top bar), StaffShell (tablet home), nav
  modules/      one folder per module: index.tsx (+ views/, data.ts, text.ts, seed.ts)
docs/CONVENTIONS.md   porting rules (read before adding a module)
```

The sidebar "↺" button resets the demo data to the seed state.
