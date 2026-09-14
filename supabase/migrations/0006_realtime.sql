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
