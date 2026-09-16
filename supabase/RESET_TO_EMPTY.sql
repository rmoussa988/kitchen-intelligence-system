-- KIS — wipe demo data for a fresh, real start.
-- Run ONCE in the Supabase SQL Editor. Clears all items, suppliers, and every transaction
-- (ledger, counts, transfers, waste, production, receiving, invoices, accounting, alerts, audit).
-- KEEPS: the schema, your login, the three locations, and settings — so you can log in and begin
-- entering your own items, suppliers, recipes, deliveries, etc. through the app.

begin;

-- Drop settings' pointer to a demo staff user before removing demo staff; keep you as current user.
update settings set staff_user_id = null, current_user_id = 'U-01' where id = 1;

-- All transactional + line data (one statement so inter-table FKs are satisfied).
truncate table
  audit, alerts, module_state, fx_rates, shift_closings, expenses,
  supplier_invoices, po_lines, purchase_orders, delivery_lines, deliveries,
  batches, production_plans, waste, transfer_lines, transfers, movements, stock
  restart identity;

-- Master data you'll re-enter yourself.
delete from items;
delete from suppliers;

-- Remove the demo staff, keep your owner login (U-01, linked to your email).
delete from profiles where id <> 'U-01';

-- Start ids fresh (all demo rows are gone, so there's nothing to collide with).
update counters set value = 1000 where name = 'seq';

commit;

-- Sanity check (should show: items 0, suppliers 0, movements 0, locations 3, profiles 1):
select
  (select count(*) from items)     as items,
  (select count(*) from suppliers) as suppliers,
  (select count(*) from movements) as movements,
  (select count(*) from locations) as locations,
  (select count(*) from profiles)  as profiles;
