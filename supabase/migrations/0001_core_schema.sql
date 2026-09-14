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
