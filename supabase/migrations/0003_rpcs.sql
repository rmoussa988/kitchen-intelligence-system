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
