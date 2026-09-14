# KIS — Backend & Product Setup

This turns the KIS **prototype** (a React app running entirely in the browser on a
localStorage store) into a real **product**: a Postgres database, authentication with
roles, and a cloud backend that all three locations can reach from any device.

**Chosen stack (v1):** Supabase (managed Postgres + Auth + row-level security + file
storage) · auth & 7 roles built in · **online-only** (staff tablets need a connection).

---

## What's already built vs. what this adds

| | Status |
|---|---|
| All 25 feature-module screens (inventory, production, purchasing, receiving, accounting, staff shell), bilingual EN/AR | ✅ done, verified |
| Full domain data model (`src/store/types.ts` — 18 entities) | ✅ done → becomes the DB schema |
| Business logic (UOM conversion, moving-average costing, perpetual ledger, transfers, P&L) | ✅ done → reused |
| **Database schema** (`supabase/migrations/0001`) | ✅ written |
| **Auth, roles & row-level security** (`0002`) | ✅ written |
| **Server-authoritative RPCs** (`0003` — id allocation, ledger posting) | ✅ written |
| **Frontend data layer** (`src/data/` — client, hydrate, persist, auth) | 🟡 in progress |
| **Wiring** the store to the cloud + login gate | ⏭️ next step (after you create the project) |
| Deploy | ⏭️ next step |

Until the project is configured, the app **keeps working exactly as now** on the local
demo store — the cloud code is inert when the env vars are empty.

---

## One-time setup

### 1. Create the Supabase project
1. Sign up at [supabase.com](https://supabase.com) → **New project** (pick a region close to Lebanon, e.g. Frankfurt). Save the database password.
2. In **Project Settings → API**, copy the **Project URL** and the **anon/public key**.

### 2. Run the migrations
Two ways — pick one:

**A. Supabase SQL Editor (no tooling):** open each file under `supabase/migrations/` in
order and run it: `0001_core_schema.sql`, `0002_auth_and_rls.sql`, `0003_rpcs.sql`, then
`0004_bootstrap.sql` (the 3 locations, an owner profile `U-01`, and the settings row — the
minimum needed to sign in before the full dataset is loaded).

**B. Supabase CLI (repeatable):**
```bash
npm install -g supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

### 3. Point the app at the project
```bash
cp .env.example .env.local
# then edit .env.local:
#   VITE_SUPABASE_URL=https://<ref>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<anon key>
```
With these set, `src/data/supabase.ts` reports `isCloud = true` and the app uses Postgres.

### 4. Create the first login and link it to the owner profile
The bootstrap migration created profile `U-01` (Rudy, owner). Bind a login to it:
1. **Authentication → Users → Add user** (email + password).
2. In **User Metadata** add `{ "profile_id": "U-01" }` — the `handle_new_auth_user`
   trigger (migration 0002) links that auth account to `U-01`.
3. Open the app and sign in with that email/password.

### 5. Load the full demo data
On first sign-in the app hydrates from the (nearly empty) bootstrap tables. To fill it with
the full realistic dataset — no hand-written SQL needed:
- in the sidebar footer (owner, cloud mode only) click the **☁︎↑ “Load demo data to cloud”**
  button. It uploads `buildInitialState()` via `pushCoreState()` and the app refreshes with
  everything (items, suppliers, movements, invoices, batches…). Re-running is safe (upserts).

Then add the rest of your staff: **Add user** per person, each with their own
`{ "profile_id": "U-0x" }` matching a profile row. Once you have real data you'll stop using
the demo seed entirely.

---

## How it fits together

```
 React app (25 modules, unchanged)
        │  useStore()  ← same API as today
        ▼
 src/store/StoreContext.tsx
   ├─ local mode  → immer + localStorage           (when env vars empty)
   └─ cloud mode  → src/data/hydrate.ts  (load CoreState from Postgres on login)
                     src/data/persist.ts  (syncDiff writes changed rows back)
                     src/data/supabase.ts (client)
        │
        ▼
 Supabase Postgres
   ├─ 0001 schema     : 20 tables (items, stock, movements, transfers, deliveries,
   │                     supplier_invoices, batches, expenses, shift_closings, audit …)
   ├─ 0002 auth + RLS : profiles↔auth.users, app_role enum, location-scope policies
   ├─ 0003 RPCs       : next_id(), post_movement(), set_item_cost(), log_audit()
   └─ 0004 bootstrap  : 3 locations + owner profile + settings (enough to sign in)
```

**Server-authoritative** (can't be tampered with from the client): id allocation and stock
posting go through `post_movement()`, so every on-hand change is one audited path and ids
stay unique across devices.

**Row-level security** (migration 0002):
- everyone signed in can read master data (items, suppliers, locations, profiles);
- operational rows (stock, movements, waste, transfers, plans, batches, deliveries, POs)
  are visible/writable only within a user's **location scope** — management roles
  (superuser/owner/manager) see all;
- financial surfaces (expenses, supplier invoices, shift closings, FX) are limited to
  finance roles (accountant / invoice / cost / manager / owner);
- the **audit log is append-only** — no update or delete, for anyone.

**Roles** (the `app_role` enum): `superuser, owner, manager, storekeeper, prep,
production, service, accountant, invoice, cost`. Each profile carries a `scope`
(`all` or specific locations) enforced by the RLS helpers `my_role()` / `in_my_scope()`.

---

## Data model (schema ⇄ app)

| App (`types.ts`) | Table(s) |
|---|---|
| `Item` (+ `onHand` map) | `items` + `stock` (one row per item × location) |
| `Movement` | `movements` (perpetual ledger) |
| `Transfer` (+ `lines`) | `transfers` + `transfer_lines` |
| `Delivery` / `PurchaseOrder` (+ lines) | `deliveries`+`delivery_lines` / `purchase_orders`+`po_lines` |
| `SupplierInvoice`, `Expense`, `ShiftClosing`, `FxRate` | `supplier_invoices`, `expenses`, `shift_closings`, `fx_rates` |
| `ProductionPlan`, `Batch` | `production_plans`, `batches` (stages as jsonb) |
| `WasteRecord`, `Alert`, `AuditEntry` | `waste`, `alerts`, `audit` |
| `User` | `profiles` (linked to `auth.users`) |
| `Settings`, `CoreState.modules`, `CoreState.seq` | `settings` (1 row), `module_state`, `counters` |

Ids stay as the app's readable text keys (`RM-014`, `MV-1042`, `U-02`); money is
`numeric(14,4)`; timestamps are `timestamptz`.

---

## Roadmap

- [x] Database schema, auth/roles, RLS, RPCs, bootstrap seed
- [x] Frontend data layer (client, hydrate, persist, auth)
- [x] Wire `StoreContext` to cloud mode + gate the app behind login + one-click seed button
- [ ] **You:** create the Supabase project, run the 4 migrations, set `.env.local` (§ setup)
- [ ] Verify the full loop live (login → seed → a real transaction round-trips to Postgres)
- [ ] Deploy the frontend (Vercel/Netlify static build) and hand out the URL
- [ ] Later: move costing into server RPCs; file storage for invoice scans / waste photos;
      the deferred modules (POS, HR, onboarding) when their designs are ready
