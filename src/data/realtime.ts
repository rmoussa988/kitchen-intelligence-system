/**
 * Realtime multi-location sync (cloud mode only).
 *
 * Subscribes to row changes on the operational + master tables. When another client changes
 * anything this device can see (RLS-filtered by role/scope), `onChange` fires — the store debounces
 * it and re-pulls CoreState, so Main Kitchen / Rock / Kaddoum converge live without a refresh.
 * We don't use the event payload (which is partial); a change is just a signal to re-hydrate.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

const WATCH_TABLES = [
  'items', 'stock', 'movements', 'suppliers', 'profiles', 'transfers', 'transfer_lines', 'waste',
  'production_plans', 'batches', 'deliveries', 'delivery_lines', 'purchase_orders', 'po_lines',
  'supplier_invoices', 'expenses', 'shift_closings', 'fx_rates', 'alerts', 'audit', 'settings', 'module_state',
];

/**
 * Open the realtime subscription. `onChange` is invoked on every remote row change (the store
 * debounces it). Returns an unsubscribe function. No-op / null-safe in local mode.
 */
export function startRealtime(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const sb = supabase;
  const channel: RealtimeChannel = sb.channel('kis-db-changes');
  for (const table of WATCH_TABLES) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange());
  }
  channel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('KIS realtime: subscription', status, '(live updates paused; the app still works)');
    }
  });
  return () => { void sb.removeChannel(channel); };
}
