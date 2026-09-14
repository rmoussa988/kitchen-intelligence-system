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
