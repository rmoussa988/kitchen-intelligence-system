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
