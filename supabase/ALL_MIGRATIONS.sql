-- KIS — ALL migrations combined (0001..0006), for a fresh project only.

-- ===========================================================================
-- migrations/0001_core_schema.sql
-- ===========================================================================
-- KIS — core schema (0001)
-- Faithful translation of src/store/types.ts (CoreState) into Postgres.
-- Conventions: snake_case; text primary keys matching the app's ids (RM-014, MV-1001, U-02…);
-- money as numeric(14,4); timestamps as timestamptz; relational child tables for line arrays;
-- jsonb only for genuine value objects (meta, cash declarations, batch stages, module state).
-- Auth linkage, roles and RLS live in 0002; server-authoritative helpers in 0003.

set check_function_bodies = off;

-- ─────────────────────────────── enums ───────────────────────────────
create type loc_id           as enum ('mk', 'rock', 'kad');
create type location_type    as enum ('production', 'restaurant', 'juice');
create type item_type        as enum ('raw', 'sub', 'prep', 'menu', 'pack');
create type app_role         as enum ('superuser','owner','manager','storekeeper','prep','production','service','accountant','invoice','cost');
create type credential_type  as enum ('pin', 'password');
create type movement_type    as enum ('receiving','production_in','production_out','transfer_in','transfer_out','waste','adjustment','sale','count');
create type source_kind      as enum ('delivery','batch','transfer','waste','count','adjustment','sale');
create type transfer_status  as enum ('requested','sent','confirmed','flagged');
create type line_flag        as enum ('short','damaged');
create type waste_status     as enum ('auto','pending','approved','rejected');
create type plan_status      as enum ('not_started','in_progress','paused','done');
create type batch_status     as enum ('started','marinating','stages','output','complete','approved');
create type gap_status       as enum ('open','accepted','flagged');
create type delivery_status  as enum ('draft','received','approved','invoiced','adjusted');
create type po_status        as enum ('draft','sent','partial','received','closed','cancelled');
create type invoice_stage    as enum ('received','entered','review','approved','disputed','paid');
create type expense_category as enum ('rent','gas','electricity','maintenance','uniforms','marketing','salaries','tax','other');
create type currency_code    as enum ('USD','LBP');
create type pay_method       as enum ('cash','card','whish');
create type closing_status   as enum ('in_transit','confirmed','gap');
create type alert_severity   as enum ('red','amber','info');
create type quality_flag     as enum ('ok','issue');

-- ───────────────────── updated_at trigger helper ─────────────────────
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ───────────────────────────── master data ───────────────────────────
create table locations (
  id            loc_id primary key,
  en            text not null,
  ar            text not null,
  type          location_type not null,
  sells         boolean not null default true,
  responsibilities text[] not null default '{}',
  storage_areas text[] not null default '{}',
  active        boolean not null default true,
  updated_at    timestamptz not null default now()
);

-- Domain "users" = staff/login accounts. Linked 1:1 to auth.users via auth_uid (nullable
-- until an account is provisioned). All user_id FKs below reference this text id (e.g. 'U-02').
create table profiles (
  id          text primary key,                 -- 'U-01' … stable domain id
  auth_uid    uuid unique,                       -- references auth.users(id); wired in 0002
  name        text not null,
  name_ar     text not null,
  ini         text not null,
  role        app_role not null,
  scope       jsonb not null default '"all"'::jsonb,  -- 'all' | loc_id | loc_id[]
  credential  credential_type not null default 'password',
  active      boolean not null default true,
  last_seen   timestamptz,
  updated_at  timestamptz not null default now()
);

create table suppliers (
  id          text primary key,
  name        text not null,
  name_ar     text,
  contact     text not null default '',
  phone       text,
  terms       text not null default '',
  products    text[] not null default '{}',       -- item ids
  spend_month numeric(14,4),
  alert       boolean not null default false,
  active      boolean not null default true,
  meta        jsonb,
  updated_at  timestamptz not null default now()
);

create table items (
  id           text primary key,
  en           text not null,
  ar           text not null,
  type         item_type not null,
  cat          text not null default '—',
  cat_ar       text,
  base         text not null,                      -- base inventory unit
  purch        text not null default '—',          -- purchasing unit
  cost         numeric(14,4) not null default 0,   -- moving-avg cost per base unit (USD)
  price        numeric(14,4),                       -- selling price (menu items)
  supplier     text references suppliers(id),
  stocked      boolean not null default true,
  is_recipe    boolean not null default false,
  pos          boolean not null default false,
  incomplete   boolean not null default false,
  shelf        text,
  min_qty      numeric(14,4),
  max_qty      numeric(14,4),
  purch_factor numeric(18,6),                       -- 1 purch unit = purch_factor base units
  meta         jsonb,
  updated_at   timestamptz not null default now()
);
create index items_type_idx on items(type);
create index items_supplier_idx on items(supplier);

-- Per-location on-hand (was Item.onHand map). One row per stocked item × location.
create table stock (
  item_id   text not null references items(id) on delete cascade,
  loc       loc_id not null,
  qty       numeric(18,4) not null default 0,       -- in base unit
  primary key (item_id, loc)
);

-- ─────────────────────────── perpetual ledger ────────────────────────
create table movements (
  id               text primary key,
  ts               timestamptz not null default now(),
  item_id          text not null references items(id),
  loc              loc_id not null,
  type             movement_type not null,
  qty              numeric(18,4) not null,          -- signed, base unit
  entered_qty      numeric(18,4),                    -- Rule-7 original qty
  entered_unit     text,                             -- Rule-7 original unit
  value            numeric(14,4) not null default 0, -- signed $ at cost
  source           text not null default '',         -- human ref (INV-2211, TRF-1039…)
  source_kind      source_kind,
  beyond_tolerance boolean not null default false,
  note             text,
  user_id          text references profiles(id)
);
create index movements_item_loc_idx on movements(item_id, loc);
create index movements_ts_idx on movements(ts desc);
create index movements_type_idx on movements(type);

-- ───────────────────────────── transfers ─────────────────────────────
create table transfers (
  id           text primary key,
  from_loc     loc_id not null,
  to_loc       loc_id not null,
  status       transfer_status not null default 'requested',
  requested_at timestamptz not null default now(),
  sent_at      timestamptz,
  confirmed_at timestamptz,
  requested_by text references profiles(id),
  sent_by      text references profiles(id),
  confirmed_by text references profiles(id),
  note         text,
  updated_at   timestamptz not null default now()
);
create table transfer_lines (
  transfer_id text not null references transfers(id) on delete cascade,
  line_no     int  not null,
  item_id     text not null references items(id),
  unit        text not null,
  cost        numeric(14,4) not null default 0,   -- per unit at time of send
  requested   numeric(18,4) not null,
  sent        numeric(18,4),
  confirmed   numeric(18,4),
  flag        line_flag,
  primary key (transfer_id, line_no)
);

-- ─────────────────────────────── waste ───────────────────────────────
create table waste (
  id        text primary key,
  ts        timestamptz not null default now(),
  item_id   text not null references items(id),
  loc       loc_id not null,
  qty       numeric(18,4) not null,               -- entered
  unit      text not null,
  base_qty  numeric(18,4) not null,               -- Rule-7 base
  cost      numeric(14,4) not null default 0,
  reason    text not null,
  employee  text references profiles(id),
  status    waste_status not null default 'pending',
  photo     boolean not null default false,
  note      text,
  updated_at timestamptz not null default now()
);
create index waste_status_idx on waste(status);

-- ───────────────────────────── production ────────────────────────────
create table production_plans (
  id              text primary key,
  date            date not null,
  loc             loc_id not null,
  item_id         text not null references items(id),
  planned_qty     numeric(18,4) not null,
  unit            text not null,
  assigned_to     text references profiles(id),
  expected_demand numeric(18,4),
  opening_stock   numeric(18,4),
  status          plan_status not null default 'not_started',
  published       boolean not null default false,
  batch_id        text,
  progress        numeric(5,4),
  gap_open        boolean not null default false,
  updated_at      timestamptz not null default now()
);
create table batches (
  id                   text primary key,
  plan_id              text references production_plans(id),
  item_id              text not null references items(id),
  loc                  loc_id not null,
  employee             text references profiles(id),
  started_at           timestamptz not null default now(),
  completed_at         timestamptz,
  status               batch_status not null default 'started',
  planned_qty          numeric(18,4) not null,
  unit                 text not null,
  input_mode           text,                         -- 'commit' | 'draw'
  raw_item_id          text references items(id),
  raw_drawn            numeric(18,4),
  raw_returned         numeric(18,4),
  raw_used             numeric(18,4),
  trim_waste           numeric(18,4),
  marinade_recommended numeric(18,4),
  marinade_used        numeric(18,4),
  stages               jsonb,                        -- BatchStage[] value object
  output_qty           numeric(18,4),
  standard_per_unit    numeric(18,6),
  gap_kg               numeric(18,4),
  gap_pct              numeric(8,4),
  gap_usd              numeric(14,4),
  gap_status           gap_status,
  cost                 numeric(14,4),
  yield_pct            numeric(8,4),
  updated_at           timestamptz not null default now()
);

-- ─────────────────────── purchasing & receiving ──────────────────────
create table purchase_orders (
  id         text primary key,
  ts         timestamptz not null default now(),
  supplier_id text not null references suppliers(id),
  loc        loc_id not null,
  status     po_status not null default 'draft',
  total      numeric(14,4) not null default 0,
  expected   date,
  created_by text references profiles(id),
  note       text,
  updated_at timestamptz not null default now()
);
create table po_lines (
  po_id    text not null references purchase_orders(id) on delete cascade,
  line_no  int  not null,
  item_id  text not null references items(id),
  qty      numeric(18,4) not null,
  unit     text not null,
  price    numeric(14,4) not null default 0,
  received numeric(18,4),
  primary key (po_id, line_no)
);

create table deliveries (
  id                 text primary key,
  ts                 timestamptz not null default now(),
  supplier_id        text not null references suppliers(id),
  invoice_no         text not null default '',
  loc                loc_id not null,
  total              numeric(14,4) not null default 0,
  received_by        text references profiles(id),
  status             delivery_status not null default 'received',
  worst_variance_pct numeric(8,4),
  po_id              text references purchase_orders(id),
  updated_at         timestamptz not null default now()
);
create table delivery_lines (
  delivery_id  text not null references deliveries(id) on delete cascade,
  line_no      int  not null,
  item_id      text not null references items(id),
  ordered      numeric(18,4),
  received     numeric(18,4) not null,
  unit         text not null,
  base_qty     numeric(18,4) not null,
  unit_price   numeric(14,4) not null default 0,
  last_price   numeric(14,4),
  variance_pct numeric(8,4),
  expiry       date,
  batch        text,
  temp         text,
  quality      quality_flag,
  rejected     numeric(18,4),
  old_avg      numeric(14,4),
  new_avg      numeric(14,4),
  primary key (delivery_id, line_no)
);

create table supplier_invoices (
  id             text primary key,
  supplier_id    text not null references suppliers(id),
  invoice_no     text not null default '',
  date           date,
  due            date,
  amount         numeric(14,4) not null default 0,
  currency       currency_code not null default 'USD',
  stage          invoice_stage not null default 'received',
  delivery_id    text references deliveries(id),
  po_id          text references purchase_orders(id),
  loc            loc_id not null,
  entered_by     text references profiles(id),
  reviewed_by    text references profiles(id),
  match_issues   jsonb,                              -- string[]
  paid_amount    numeric(14,4),
  payment_method pay_method,
  note           text,
  updated_at     timestamptz not null default now()
);
create index supplier_invoices_stage_idx on supplier_invoices(stage);

-- ──────────────────────── accounting & finance ───────────────────────
create table expenses (
  id            text primary key,
  date          date not null,                     -- pay date
  accrual_month text not null,                       -- 'YYYY-MM'
  category      expense_category not null,
  amount        numeric(14,4) not null default 0,
  currency      currency_code not null default 'USD',
  method        pay_method not null default 'cash',
  allocation    text not null default 'split',      -- loc_id | 'split'
  vendor        text,
  note          text,
  receipt       boolean not null default false,
  recurring     boolean not null default false,
  updated_at    timestamptz not null default now()
);

create table shift_closings (
  id           text primary key,
  loc          loc_id not null,
  date         date not null,
  shift        text not null default '',
  expected     numeric(14,4) not null default 0,   -- POS expected USD
  declared     jsonb not null,                      -- {cashUsd,cashLbp,whish,card,expenses}
  confirmed    jsonb,                               -- {cashUsd,cashLbp,whish,card}
  rate         numeric(14,4) not null,              -- day rate locked
  status       closing_status not null default 'in_transit',
  over_short   numeric(14,4),
  submitted_by text references profiles(id),
  updated_at   timestamptz not null default now()
);

create table fx_rates (
  date     date primary key,
  rate     numeric(14,4) not null,
  set_by   text references profiles(id),
  closings int not null default 0
);

-- ─────────────────────────── alerts & audit ──────────────────────────
create table alerts (
  id          text primary key,
  ts          timestamptz not null default now(),
  severity    alert_severity not null,
  type        text not null,
  en          text not null,
  ar          text not null,
  loc         loc_id,
  module_id   text,
  dismissed   boolean not null default false,
  assigned_to text references profiles(id)
);
create index alerts_open_idx on alerts(dismissed) where dismissed = false;

create table audit (
  id        text primary key,
  ts        timestamptz not null default now(),
  user_id   text references profiles(id),
  action    text not null,
  entity    text not null,
  old_value text,
  new_value text,
  module_id text
);
create index audit_ts_idx on audit(ts desc);

-- ─────────────────── settings, module state, counters ────────────────
-- Single-row settings (id fixed to 1).
create table settings (
  id                        int primary key default 1 check (id = 1),
  fx_rate                   numeric(14,4) not null default 89500,
  variance_tolerance_pct    numeric(6,3)  not null default 2,
  waste_auto_approve_usd    numeric(10,2) not null default 25,
  ppv_amber_pct             numeric(6,3)  not null default 3,
  ppv_red_pct               numeric(6,3)  not null default 8,
  production_gap_alert_pct  numeric(6,3)  not null default 5,
  cash_tolerance            numeric(10,2) not null default 5,
  current_user_id           text references profiles(id),
  staff_user_id             text references profiles(id),
  period                    text not null default '2026-08',
  updated_at                timestamptz not null default now()
);

-- Module-private persisted UI state (was CoreState.modules). One row per module id.
create table module_state (
  module_id text primary key,
  data      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Monotonic id counter (was CoreState.seq). Row 'seq' backs next_id() in 0003.
create table counters (
  name  text primary key,
  value bigint not null default 0
);
insert into counters(name, value) values ('seq', 1000);

-- updated_at triggers on mutable master/aggregate tables
do $$
declare t text;
begin
  foreach t in array array[
    'locations','profiles','suppliers','items','transfers','waste','production_plans',
    'batches','purchase_orders','deliveries','supplier_invoices','expenses','shift_closings',
    'settings','module_state'
  ] loop
    execute format('create trigger %I_set_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;


-- ===========================================================================
-- migrations/0002_auth_and_rls.sql
-- ===========================================================================
-- KIS — auth, roles & row-level security (0002)
-- Links Supabase auth.users to public.profiles, exposes role/scope helpers, and enables RLS
-- on every table. Model for v1 (online-only, small trusted team):
--   • every signed-in user may READ master data and anything within their location scope;
--   • financial surfaces (expenses, supplier_invoices, shift_closings, fx) are role-gated;
--   • audit is append-only (insert by anyone signed in; never update/delete);
--   • management roles (superuser/owner/manager) bypass the location-scope test.
-- Tighten later per module as real usage settles.

-- ─────────────────────── auth linkage + helpers ──────────────────────
alter table profiles
  add constraint profiles_auth_uid_fkey
  foreign key (auth_uid) references auth.users(id) on delete set null;

-- Caller's profile id (text, e.g. 'U-02'), or null when unlinked.
create or replace function my_profile_id() returns text
language sql stable security definer set search_path = public as $$
  select id from profiles where auth_uid = auth.uid() limit 1
$$;

create or replace function my_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where auth_uid = auth.uid() limit 1
$$;

-- Management roles see and touch every location.
create or replace function is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('superuser','owner','manager'), false)
$$;

-- Roles allowed on financial surfaces.
create or replace function is_finance() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('superuser','owner','manager','accountant','invoice','cost'), false)
$$;

-- Does the caller's scope (jsonb: 'all' | loc | loc[]) include a location?
create or replace function in_my_scope(target loc_id) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when is_manager() then true
    else exists (
      select 1 from profiles p
      where p.auth_uid = auth.uid()
        and (
          p.scope = '"all"'::jsonb
          or p.scope = to_jsonb(target::text)
          or (jsonb_typeof(p.scope) = 'array' and p.scope ? target::text)
        )
    )
  end
$$;

-- ─────────────────────────── enable RLS ──────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'locations','profiles','suppliers','items','stock','movements','transfers','transfer_lines',
    'waste','production_plans','batches','purchase_orders','po_lines','deliveries','delivery_lines',
    'supplier_invoices','expenses','shift_closings','fx_rates','alerts','audit','settings',
    'module_state','counters'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Convenience: an authenticated caller with a linked profile.
create or replace function is_signed_in() returns boolean
language sql stable security definer set search_path = public as $$
  select my_profile_id() is not null
$$;

-- ───────── master data: read for all signed-in, write for managers ─────────
do $$
declare t text;
begin
  foreach t in array array['locations','suppliers','items','profiles','fx_rates','settings','counters'] loop
    execute format('create policy %I_read on %I for select using (is_signed_in())', t, t);
  end loop;
  -- managers manage master data + settings; counters are updated via SECURITY DEFINER rpc only
  foreach t in array array['locations','suppliers','items','fx_rates','settings'] loop
    execute format('create policy %I_write on %I for all using (is_manager()) with check (is_manager())', t, t);
  end loop;
end $$;

-- Profiles: everyone reads (names/roles power the UI); a user updates their own last_seen;
-- managers manage all profiles. Inserts (provisioning) are manager-only.
create policy profiles_self_update on profiles for update
  using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());
create policy profiles_manage on profiles for all
  using (is_manager()) with check (is_manager());

-- ───────── location-scoped operational tables ─────────
-- stock, movements, waste, plans, batches: read+write when the row's loc is in caller scope.
do $$
declare t text;
begin
  foreach t in array array['stock','movements','waste','production_plans','batches'] loop
    execute format($f$create policy %I_scope on %I for all
      using (in_my_scope(loc)) with check (in_my_scope(loc))$f$, t, t);
  end loop;
end $$;

-- transfers: visible/writable if caller can see either endpoint.
create policy transfers_scope on transfers for all
  using (in_my_scope(from_loc) or in_my_scope(to_loc))
  with check (in_my_scope(from_loc) or in_my_scope(to_loc));
create policy transfer_lines_scope on transfer_lines for all
  using (exists (select 1 from transfers x where x.id = transfer_id and (in_my_scope(x.from_loc) or in_my_scope(x.to_loc))))
  with check (exists (select 1 from transfers x where x.id = transfer_id and (in_my_scope(x.from_loc) or in_my_scope(x.to_loc))));

-- deliveries + POs: scoped by their loc; lines follow their parent.
create policy deliveries_scope on deliveries for all using (in_my_scope(loc)) with check (in_my_scope(loc));
create policy delivery_lines_scope on delivery_lines for all
  using (exists (select 1 from deliveries d where d.id = delivery_id and in_my_scope(d.loc)))
  with check (exists (select 1 from deliveries d where d.id = delivery_id and in_my_scope(d.loc)));
create policy pos_scope on purchase_orders for all using (in_my_scope(loc)) with check (in_my_scope(loc));
create policy po_lines_scope on po_lines for all
  using (exists (select 1 from purchase_orders p where p.id = po_id and in_my_scope(p.loc)))
  with check (exists (select 1 from purchase_orders p where p.id = po_id and in_my_scope(p.loc)));

-- ───────── financial surfaces: finance roles only ─────────
create policy invoices_finance on supplier_invoices for all using (is_finance()) with check (is_finance());
create policy expenses_finance on expenses for all using (is_finance()) with check (is_finance());
create policy fx_read_all on fx_rates for select using (is_signed_in());  -- already covered above; explicit read
create policy closings_scope on shift_closings for all
  using (in_my_scope(loc) or is_finance()) with check (in_my_scope(loc) or is_finance());

-- ───────── alerts: read for signed-in; managers/finance mutate ─────────
create policy alerts_read on alerts for select using (is_signed_in());
create policy alerts_write on alerts for all using (is_manager() or is_finance()) with check (is_manager() or is_finance());

-- ───────── audit: append-only ─────────
create policy audit_read on audit for select using (is_signed_in());
create policy audit_insert on audit for insert with check (is_signed_in());
-- deliberately NO update/delete policy → append-only for everyone incl. managers.

-- ───────── module_state: per-user UI prefs are shared here for v1 ─────────
create policy module_state_rw on module_state for all using (is_signed_in()) with check (is_signed_in());

-- ─────────── auto-provision a profile link on auth signup ───────────
-- When an auth user is created with metadata.profile_id, bind it to that profile row.
create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid text := nullif(new.raw_user_meta_data->>'profile_id','');
begin
  if pid is not null then
    update profiles set auth_uid = new.id where id = pid and auth_uid is null;
  end if;
  return new;
end $$;
-- Attaching a trigger to auth.users needs elevated privileges that some projects don't grant
-- to the SQL-editor role. It's a convenience only (logins can be linked to a profile with a
-- one-line UPDATE instead), so a failure here must not abort the rest of the script.
do $$
begin
  create trigger on_auth_user_created
    after insert on auth.users for each row execute function handle_new_auth_user();
exception when others then
  raise notice 'Skipped auth.users signup trigger (%). Link logins to a profile manually.', sqlerrm;
end $$;


-- ===========================================================================
-- migrations/0003_rpcs.sql
-- ===========================================================================
-- KIS — server-authoritative operations (0003)
-- The two money-critical operations the app store did client-side (nextId, postMovement) move
-- to the server so ids stay unique across devices and every stock change goes through one
-- audited path. Other mutations remain plain table writes gated by the RLS in 0002.

-- Atomic id allocation (was CoreState.seq + nextId). Returns 'PREFIX-N'.
create or replace function next_id(prefix text) returns text
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  update counters set value = value + 1 where name = 'seq' returning value into n;
  return prefix || '-' || n::text;
end $$;

-- Post a perpetual-ledger movement and move on-hand stock in one transaction.
-- qty is signed and in the item's BASE unit; value is the signed $ impact at cost.
-- Mirrors StoreContext.postMovement (rounds on-hand to 3 dp). Scope is enforced by the
-- stock/movements RLS policies, which this SECURITY DEFINER function re-asserts explicitly.
create or replace function post_movement(
  p_item_id          text,
  p_loc              loc_id,
  p_type             movement_type,
  p_qty              numeric,
  p_value            numeric default 0,
  p_source           text default '',
  p_source_kind      source_kind default null,
  p_entered_qty      numeric default null,
  p_entered_unit     text default null,
  p_beyond_tolerance boolean default false,
  p_note             text default null,
  p_ts               timestamptz default null
) returns text
language plpgsql security definer set search_path = public as $$
declare mid text; uid text := my_profile_id();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not in_my_scope(p_loc) then raise exception 'location % out of scope', p_loc; end if;

  mid := next_id('MV');
  insert into movements(id, ts, item_id, loc, type, qty, entered_qty, entered_unit,
                        value, source, source_kind, beyond_tolerance, note, user_id)
  values (mid, coalesce(p_ts, now()), p_item_id, p_loc, p_type, p_qty, p_entered_qty, p_entered_unit,
          coalesce(p_value,0), coalesce(p_source,''), p_source_kind, coalesce(p_beyond_tolerance,false), p_note, uid);

  insert into stock(item_id, loc, qty)
  values (p_item_id, p_loc, round(p_qty, 3))
  on conflict (item_id, loc)
  do update set qty = round(stock.qty + excluded.qty, 3);

  return mid;
end $$;

-- Set a new moving-average cost (e.g. after a receipt recomputes the average).
create or replace function set_item_cost(p_item_id text, p_cost numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_manager() or is_finance() or my_role() in ('storekeeper','production','prep')) then
    raise exception 'not permitted to set item cost';
  end if;
  update items set cost = p_cost where id = p_item_id;
end $$;

-- Append an audit entry with a server id + timestamp + caller identity.
create or replace function log_audit(
  p_action text, p_entity text, p_old text default null, p_new text default null, p_module text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare aid text := next_id('AU');
begin
  insert into audit(id, ts, user_id, action, entity, old_value, new_value, module_id)
  values (aid, now(), my_profile_id(), p_action, p_entity, p_old, p_new, p_module);
  return aid;
end $$;

grant execute on function next_id(text)          to authenticated;
grant execute on function set_item_cost(text, numeric) to authenticated;
grant execute on function log_audit(text, text, text, text, text) to authenticated;
grant execute on function post_movement(text, loc_id, movement_type, numeric, numeric, text, source_kind, numeric, text, boolean, text, timestamptz) to authenticated;


-- ===========================================================================
-- migrations/0004_bootstrap.sql
-- ===========================================================================
-- KIS — bootstrap seed (0004)
-- The MINIMUM rows needed to sign in and reach the app on a brand-new project, before the full
-- demo dataset is loaded from inside the app ("Load demo data", owner-only). Without this the app
-- would hydrate from empty tables and there would be no profile to link a login to.
-- Values mirror src/store/seed.ts exactly; the later full push upserts over these rows.

insert into locations (id, en, ar, type, sells, responsibilities, storage_areas, active) values
  ('mk',   'Main Kitchen', 'المطبخ الرئيسي', 'production', false,
     array['receiving','production','transfers-out'], array['Store room','Walk-in fridge','Freezer','Dry store'], true),
  ('rock', 'Rock', 'روك', 'restaurant', true,
     array['service','production','transfers-in','receiving (bread)'], array['Line fridge','Back store'], true),
  ('kad',  'Kaddoum', 'قدّوم', 'juice', true,
     array['service','production','transfers-in'], array['Juice bar fridge','Dry shelf'], true)
on conflict (id) do nothing;

-- Owner + a manager, so the first login can be linked (auth user metadata profile_id = 'U-01').
insert into profiles (id, name, name_ar, ini, role, scope, credential, active) values
  ('U-01', 'Rudy',        'رودي',     'R',  'owner',   '"all"'::jsonb, 'password', true),
  ('U-02', 'Maya Haddad', 'مايا حداد','MH', 'manager', '"all"'::jsonb, 'password', true)
on conflict (id) do nothing;

-- Single settings row (staff_user_id left null until U-03 exists in the full seed).
insert into settings (id, fx_rate, variance_tolerance_pct, waste_auto_approve_usd, ppv_amber_pct,
                      ppv_red_pct, production_gap_alert_pct, cash_tolerance, current_user_id,
                      staff_user_id, period)
values (1, 90000, 5, 10, 3, 7, 8, 5, 'U-01', null, '2026-08')
on conflict (id) do nothing;


-- ===========================================================================
-- migrations/0005_reserve_ids.sql
-- ===========================================================================
-- KIS — atomic id-block reservation (0005)
-- Multi-device id safety: each client reserves a contiguous block of the global sequence in one
-- atomic step, then hands ids out locally from its own range. Because every reserved block is
-- disjoint, two devices can never generate the same id — while the client's nextId() stays
-- synchronous (no per-id round-trip, no module changes).

create or replace function reserve_ids(count integer) returns bigint
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if count is null or count < 1 or count > 100000 then
    raise exception 'reserve_ids: count must be 1..100000';
  end if;
  update counters set value = value + count where name = 'seq' returning value into n;
  return n;  -- the LAST number in the block; the client computes start = n - count + 1
end $$;

grant execute on function reserve_ids(integer) to authenticated;


-- ===========================================================================
-- migrations/0006_realtime.sql
-- ===========================================================================
-- KIS — enable realtime change broadcasting (0006)
-- Adds the operational + master tables to Supabase's realtime publication so every signed-in
-- client is notified when a row changes. The client (src/data/realtime.ts) reacts by re-pulling
-- the shared state, so all three locations converge live without a manual refresh.
-- Realtime respects RLS: each client only receives events for rows its role/scope can see.
-- Idempotent — safe to re-run (already-published tables are skipped).

do $$
declare t text;
begin
  foreach t in array array[
    'items','stock','movements','suppliers','profiles','transfers','transfer_lines','waste',
    'production_plans','batches','deliveries','delivery_lines','purchase_orders','po_lines',
    'supplier_invoices','expenses','shift_closings','fx_rates','alerts','audit','settings','module_state'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;            -- already in the publication
      when others then raise notice 'realtime: could not add % (%)', t, sqlerrm;
    end;
  end loop;
end $$;

