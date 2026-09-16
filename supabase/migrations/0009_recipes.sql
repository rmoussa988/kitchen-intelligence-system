-- KIS — recipes as a first-class table (0009). Safe & repeatable.
-- Recipes were frontend-only; this makes them real rows so they empty on a fresh database and the
-- ones you create persist and sync. Lines/versions are display-shaped value objects read & written
-- whole, so they're jsonb (same precedent as batches.stages) rather than child tables.
-- No FK to items: some recipes have no stocked item twin, and new recipes are created before any
-- item exists. RLS mirrors items (read for signed-in, write for managers). Added to realtime.

create table if not exists recipes (
  id         text primary key,
  en         text not null,
  ar         text not null,
  type       text not null,                 -- sub | recipe | prep | menu
  yield      text not null default '1 PCS',
  price      numeric(14,4),                  -- selling price (menu items)
  threshold  numeric(6,2),                   -- food-cost % threshold (default 30 in the app)
  transfer   numeric(14,4),                  -- optional transfer price
  prev_cost  numeric(14,4) not null default 0,
  food       jsonb not null default '[]'::jsonb,   -- RecipeLine[]
  pkg        jsonb not null default '[]'::jsonb,    -- RecipeLine[]
  versions   jsonb not null default '[]'::jsonb,    -- RecipeVersion[]
  meta       jsonb,
  updated_at timestamptz not null default now()
);

alter table recipes enable row level security;

do $$
begin
  begin create policy recipes_read  on recipes for select using (is_signed_in());               exception when duplicate_object then null; end;
  begin create policy recipes_write on recipes for all using (is_manager()) with check (is_manager()); exception when duplicate_object then null; end;
  begin create trigger recipes_set_updated before update on recipes for each row execute function set_updated_at(); exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table recipes; exception when duplicate_object then null; when others then raise notice 'realtime recipes: %', sqlerrm; end;
end $$;
