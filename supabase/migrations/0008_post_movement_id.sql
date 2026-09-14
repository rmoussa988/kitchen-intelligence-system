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
