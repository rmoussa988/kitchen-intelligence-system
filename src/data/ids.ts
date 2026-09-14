/**
 * Cloud-mode id allocator.
 *
 * Reserves contiguous blocks of the global sequence from the server (the `reserve_ids` RPC), then
 * hands ids out synchronously from this device's own blocks. Every device gets a disjoint range,
 * so ids can never collide across devices — and nextId() in the store stays synchronous, so none
 * of the feature modules change. Local-only mode does not use this (it keeps its localStorage seq).
 */
import { supabase } from './supabase';

const BLOCK = 500;       // numbers reserved per server round-trip
const LOW_WATER = 100;   // start an async refill once fewer than this remain

type Range = { next: number; end: number };
let ranges: Range[] = [];
let refilling: Promise<void> | null = null;

function remaining(): number {
  return ranges.reduce((a, r) => a + Math.max(0, r.end - r.next + 1), 0);
}

async function reserve(size = BLOCK): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.rpc('reserve_ids', { count: size });
  if (error) throw new Error('reserve_ids failed: ' + error.message);
  const end = Number(data);
  ranges.push({ next: end - size + 1, end });   // append; never disturbs the in-use range
}

/**
 * Reserve the first block. Call during cloud hydration, before the app renders, so nextId()
 * always has numbers to hand out. Resets any prior allocator state (e.g. after re-login).
 */
export async function initIdAllocator(): Promise<void> {
  ranges = [];
  refilling = null;
  await reserve(BLOCK);
}

function maybeRefill(): void {
  if (refilling || remaining() >= LOW_WATER) return;
  refilling = reserve(BLOCK)
    .then(() => { refilling = null; })
    .catch((err) => { refilling = null; console.error('KIS: id block refill failed', err); });
}

/**
 * Synchronously return the next reserved number, or null if the pool is momentarily empty
 * (a burst larger than a block before the async refill lands — the store falls back to a
 * high random id in that rare case so a write is never blocked).
 */
export function takeIdNumber(): number | null {
  while (ranges.length && ranges[0].next > ranges[0].end) ranges.shift();
  if (ranges.length === 0) { maybeRefill(); return null; }
  const n = ranges[0].next++;
  maybeRefill();
  return n;
}
