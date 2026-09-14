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
