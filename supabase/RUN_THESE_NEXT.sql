-- KIS — new migrations to run on your EXISTING project (safe & repeatable).
-- Adds: id-block reservation, realtime live sync, file storage (scans/photos),
-- and atomic server-side stock writes. Paste into Supabase SQL Editor and Run.
-- Do NOT re-run 0001-0004 (those tables already exist).

-- ============================================================================
-- migrations/0005_reserve_ids.sql
-- ============================================================================
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


-- ============================================================================
-- migrations/0006_realtime.sql
-- ============================================================================
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


-- ============================================================================
-- migrations/0007_storage.sql
-- ============================================================================
-- KIS — file storage for scans & photos (0007)
-- Two public buckets (unguessable object paths) for supplier-invoice scans and waste photos, plus
-- the columns that hold each file's URL on its record. Public read keeps display simple; uploads
-- require a signed-in user. Tighten to signed URLs later if scans become sensitive.

insert into storage.buckets (id, name, public)
values ('invoice-scans', 'invoice-scans', true),
       ('waste-photos',  'waste-photos',  true)
on conflict (id) do nothing;

-- Upload / modify policies on storage.objects (RLS is already enabled by Supabase). Wrapped so a
-- privilege hiccup on storage.objects doesn't abort the script; public read needs no policy.
do $$
begin
  begin
    create policy "kis upload attachments" on storage.objects
      for insert to authenticated
      with check (bucket_id in ('invoice-scans', 'waste-photos'));
  exception when duplicate_object then null; when others then raise notice 'storage insert policy: %', sqlerrm; end;
  begin
    create policy "kis update attachments" on storage.objects
      for update to authenticated
      using (bucket_id in ('invoice-scans', 'waste-photos'));
  exception when duplicate_object then null; when others then raise notice 'storage update policy: %', sqlerrm; end;
end $$;

-- URL columns on the records that carry a file.
alter table waste             add column if not exists photo_url text;
alter table supplier_invoices add column if not exists scan_url  text;
alter table deliveries        add column if not exists scan_url  text;


-- ============================================================================
-- migrations/0008_post_movement_id.sql
-- ============================================================================
-- KIS — server-authoritative stock, client-chosen id (0008)
-- Redefines post_movement to accept the id the client already reserved from its block (0005), so a
-- movement keeps the same id the UI showed optimistically while stock is applied ATOMICALLY on the
-- server (stock.qty = stock.qty + delta). This is the concurrency fix: two devices adjusting the
-- same item's on-hand can no longer clobber each other, because the delta is added under a row lock
-- rather than written as a client-computed absolute value.
--
-- p_id is optional: when null the server allocates one (back-compat with 0003 callers).

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
  p_ts               timestamptz default null,
  p_id               text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare mid text; uid text := my_profile_id(); rc integer;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not in_my_scope(p_loc) then raise exception 'location % out of scope', p_loc; end if;

  mid := coalesce(nullif(p_id, ''), next_id('MV'));
  insert into movements(id, ts, item_id, loc, type, qty, entered_qty, entered_unit,
                        value, source, source_kind, beyond_tolerance, note, user_id)
  values (mid, coalesce(p_ts, now()), p_item_id, p_loc, p_type, p_qty, p_entered_qty, p_entered_unit,
          coalesce(p_value,0), coalesce(p_source,''), p_source_kind, coalesce(p_beyond_tolerance,false), p_note, uid)
  on conflict (id) do nothing;
  get diagnostics rc = row_count;

  -- Apply the stock delta ONLY when the movement was actually inserted, so a retried post with the
  -- same id (network retry, echo) is fully idempotent and never double-moves stock.
  if rc > 0 then
    insert into stock(item_id, loc, qty)
    values (p_item_id, p_loc, round(p_qty, 3))
    on conflict (item_id, loc)
    do update set qty = round(stock.qty + excluded.qty, 3);
  end if;

  return mid;
end $$;

grant execute on function post_movement(text, loc_id, movement_type, numeric, numeric, text, source_kind, numeric, text, boolean, text, timestamptz, text) to authenticated;

