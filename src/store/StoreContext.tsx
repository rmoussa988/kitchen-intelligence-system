import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { produce, type Draft } from 'immer';
import type { Alert, AuditEntry, CoreState, Item, LocId, Movement, Scope } from './types';
import { buildInitialState, STORE_VERSION } from './seed';
import { DEMO_TODAY } from '../ui/format';
import { isCloud, supabase } from '../data/supabase';
import { loadCoreState } from '../data/hydrate';
import { pushCoreState, syncDiff } from '../data/persist';
import { initIdAllocator, takeIdNumber } from '../data/ids';
import { startRealtime } from '../data/realtime';

const KEY = 'kis.store.v' + STORE_VERSION;

function load(): CoreState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CoreState;
      if (parsed && parsed.version === STORE_VERSION) return parsed;
    }
  } catch { /* ignore */ }
  return buildInitialState();
}

export type Updater = (draft: Draft<CoreState>) => void;

export interface StoreApi {
  state: CoreState;
  /** Immer-style update of the whole state. */
  update: (fn: Updater, opts?: { silent?: boolean }) => void;
  /** Reset demo data. */
  reset: () => void;
  // ── convenience ──
  scope: Scope;
  setScope: (s: Scope) => void;
  /** Locations in the current scope (all three, or one). */
  scopeLocs: LocId[];
  inScope: (loc: LocId | undefined) => boolean;
  item: (id: string) => Item | undefined;
  itemName: (id: string, isAr: boolean) => string;
  userName: (id: string | undefined, isAr: boolean) => string;
  supplierName: (id: string | undefined) => string;
  /** Generates an id like 'WST-1001' from the monotonic counter. */
  nextId: (prefix: string) => string;
  /** Current demo timestamp (ISO). Advances a few minutes per call so ordering stays sane. */
  now: () => string;
  /** Posts a ledger movement and updates on-hand (qty in BASE unit, signed). */
  postMovement: (m: Omit<Movement, 'id' | 'ts'> & { ts?: string }) => string;
  addAlert: (a: Omit<Alert, 'id' | 'ts'> & { ts?: string }) => string;
  dismissAlert: (id: string) => void;
  logAudit: (a: Omit<AuditEntry, 'id' | 'ts' | 'user'> & { user?: string; ts?: string }) => void;
  /** Sets a new moving-average cost for an item (e.g. from receiving). */
  setItemCost: (itemId: string, cost: number) => void;
  /** True in cloud mode once the state has hydrated from Postgres (always true in local mode). */
  hydrated: boolean;
  /** Uploads the entire current state to the cloud (one-shot seed of an empty project). Cloud mode only. */
  pushToCloud: () => Promise<void>;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Local mode: hydrate synchronously from localStorage (unchanged). Cloud mode: start from a
  // valid placeholder and replace it once loadCoreState() returns — children are gated on `hydrated`.
  const [state, setState] = useState<CoreState>(() => (isCloud ? buildInitialState() : load()));
  const [hydrated, setHydrated] = useState<boolean>(!isCloud);
  const stateRef = useRef(state);
  stateRef.current = state;
  const clock = useRef(0);
  // The last state successfully handed to persistence — the baseline syncDiff() diffs against.
  const lastPersisted = useRef<CoreState>(state);

  // Cloud mode: pull the whole CoreState from Postgres once, after mount (i.e. after login).
  useEffect(() => {
    if (!isCloud) return;
    let active = true;
    void loadCoreState()
      .then(async (s) => {
        if (!active) return;
        // Reserve this device's first id block before rendering, so nextId() is collision-safe
        // from the first write. A failure (e.g. migration 0005 not applied) falls back to random ids.
        try { await initIdAllocator(); } catch (err) { console.error('KIS: id allocator init failed', err); }
        if (!active) return;
        lastPersisted.current = s; setState(s); setHydrated(true);
      })
      .catch((err) => { console.error('KIS: failed to hydrate from cloud', err); if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);

  // Persist changes. Local mode → debounced localStorage (unchanged). Cloud mode → debounced
  // syncDiff against the last-persisted baseline; failures are logged, never thrown into render.
  useEffect(() => {
    if (!hydrated) return;
    if (!isCloud) {
      const t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, 150);
      return () => clearTimeout(t);
    }
    const prev = lastPersisted.current;
    if (prev === state) return;
    const t = setTimeout(() => {
      const baseline = prev;
      lastPersisted.current = state;
      void syncDiff(baseline, state).catch((err) => { console.error('KIS: cloud sync failed', err); });
    }, 400);
    return () => clearTimeout(t);
  }, [state, hydrated]);

  // Cloud mode: live multi-location sync. On a remote change, debounce then re-pull CoreState so
  // every device converges. Skip the re-pull while a local edit is still awaiting its own sync
  // (state !== lastPersisted) so we never revert an unsynced change; the next event reconciles it.
  useEffect(() => {
    if (!isCloud || !hydrated) return;
    let timer: number | undefined;
    const stop = startRealtime(() => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (stateRef.current !== lastPersisted.current) return; // local edit pending — don't clobber
        void loadCoreState()
          .then((s) => {
            // Keep this device's own UI state (module_state: in-progress counts, open forms, filters)
            // rather than overwriting it with another user's — only the shared business data syncs live.
            const merged = { ...s, modules: stateRef.current.modules };
            lastPersisted.current = merged; setState(merged);
          })
          .catch((err) => { console.error('KIS: realtime re-hydrate failed', err); });
      }, 800);
    });
    return () => { if (timer) window.clearTimeout(timer); stop(); };
  }, [hydrated]);

  const update = useCallback((fn: Updater) => {
    setState((prev) => produce(prev, fn));
  }, []);

  const reset = useCallback(() => {
    if (isCloud) {
      // In cloud mode "reset" re-pulls the shared DB rather than wiping it back to the demo seed.
      void loadCoreState().then((s) => { lastPersisted.current = s; setState(s); }).catch((err) => console.error('KIS: reload failed', err));
      return;
    }
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setState(buildInitialState());
  }, []);

  // Seed an empty cloud project with the full demo dataset, then reflect it in memory. Uploads
  // buildInitialState() (not the just-hydrated, near-empty state) so "Load demo data" works on a
  // fresh DB; upserts, so re-running reconciles against the bootstrap rows (0004_bootstrap.sql).
  const pushToCloud = useCallback(async () => {
    if (!isCloud) return;
    const seed = buildInitialState();
    await pushCoreState(seed);
    lastPersisted.current = seed;
    setState(seed);
  }, []);

  const now = useCallback(() => {
    clock.current += 3;
    const d = new Date(DEMO_TODAY);
    d.setMinutes(d.getMinutes() + clock.current);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }, []);

  // id generation must be synchronous and unique across rapid calls, so we keep a local counter
  // seeded from state.seq and write it back on every update.
  const seqRef = useRef<number | null>(null);
  const nextId = useCallback((prefix: string) => {
    if (isCloud) {
      // Draw from this device's reserved block (disjoint per device → collision-free). The server
      // owns the counter, so we do NOT touch state.seq here — syncDiff must never write it back down.
      const n = takeIdNumber();
      if (n !== null) return `${prefix}-${n}`;
      // Pool momentarily empty (a burst bigger than a block before the async refill landed): use a
      // high random number so a write is never blocked. Vanishingly unlikely to collide.
      return `${prefix}-${9_000_000_000 + Math.floor(Math.random() * 1_000_000_000)}`;
    }
    if (seqRef.current === null || seqRef.current < stateRef.current.seq) seqRef.current = stateRef.current.seq;
    seqRef.current += 1;
    const n = seqRef.current;
    setState((prev) => (prev.seq >= n ? prev : { ...prev, seq: n }));
    return `${prefix}-${n}`;
  }, []);

  const api = useMemo<StoreApi>(() => {
    const scopeLocs: LocId[] = state.scope === 'all' ? ['mk', 'rock', 'kad'] : [state.scope];
    const itemMap = new Map(state.items.map((i) => [i.id, i]));
    const userMap = new Map(state.users.map((u) => [u.id, u]));
    const supMap = new Map(state.suppliers.map((s) => [s.id, s]));
    const currentUser = state.settings.currentUser;

    const logAudit: StoreApi['logAudit'] = (a) => {
      const id = nextId('AU');
      const ts = a.ts ?? now();
      update((d) => { d.audit.unshift({ id, ts, user: a.user ?? currentUser, action: a.action, entity: a.entity, oldValue: a.oldValue, newValue: a.newValue, moduleId: a.moduleId }); });
    };

    return {
      state, update, reset,
      scope: state.scope,
      setScope: (s) => update((d) => { d.scope = s; }),
      scopeLocs,
      inScope: (loc) => !loc || state.scope === 'all' || state.scope === loc,
      item: (id) => itemMap.get(id),
      itemName: (id, isAr) => { const it = itemMap.get(id); return it ? (isAr ? it.ar : it.en) : id; },
      userName: (id, isAr) => { if (!id) return '—'; const u = userMap.get(id); return u ? (isAr ? u.nameAr : u.name) : id; },
      supplierName: (id) => { if (!id) return '—'; return supMap.get(id)?.name ?? id; },
      nextId, now,
      postMovement: (m) => {
        const id = nextId('MV');
        const ts = m.ts ?? now();
        // Optimistic local update — instant UI, unchanged in both modes.
        update((d) => {
          d.movements.unshift({ ...m, id, ts });
          const it = d.items.find((i) => i.id === m.itemId);
          if (it) it.onHand[m.loc] = Math.round(((it.onHand[m.loc] ?? 0) + m.qty) * 1000) / 1000;
        });
        // Cloud mode: apply the ledger row + stock delta ATOMICALLY on the server (concurrency-safe),
        // reusing the id the UI already showed. syncDiff deliberately skips movements/stock, so this
        // RPC is the single source of truth for them. A failure is logged; realtime re-hydrate then
        // reconciles local state to the server. (Local mode persists via localStorage as before.)
        if (isCloud && supabase) {
          void supabase.rpc('post_movement', {
            p_item_id: m.itemId, p_loc: m.loc, p_type: m.type, p_qty: m.qty,
            p_value: m.value ?? 0, p_source: m.source ?? '', p_source_kind: m.sourceKind ?? null,
            p_entered_qty: m.enteredQty ?? null, p_entered_unit: m.enteredUnit ?? null,
            p_beyond_tolerance: m.beyondTolerance ?? false, p_note: m.note ?? null, p_ts: ts, p_id: id,
          }).then(({ error }) => { if (error) console.error('KIS: post_movement failed', error.message); });
        }
        return id;
      },
      addAlert: (a) => {
        const id = nextId('AL');
        const ts = a.ts ?? now();
        update((d) => { d.alerts.unshift({ ...a, id, ts }); });
        return id;
      },
      dismissAlert: (id) => update((d) => { const a = d.alerts.find((x) => x.id === id); if (a) a.dismissed = true; }),
      logAudit,
      setItemCost: (itemId, cost) => update((d) => { const it = d.items.find((i) => i.id === itemId); if (it) it.cost = cost; }),
      hydrated, pushToCloud,
    };
  }, [state, update, reset, nextId, now, hydrated, pushToCloud]);

  // Cloud mode: hold the UI on a light splash until the first hydrate resolves, so modules never
  // render against the placeholder. Local mode is hydrated from the first frame, so this is skipped.
  if (!hydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFEBDF', color: '#6E7266', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>
        Loading…
      </div>
    );
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

/**
 * Module-private persisted state. `seed` is used the first time (or after reset).
 * Returns [state, setState] where setState accepts an immer recipe OR a full value.
 */
export function useModuleState<T>(moduleId: string, seed: T | (() => T)): [T, (recipe: ((draft: Draft<T>) => void) | T) => void] {
  const store = useStore();
  const existing = store.state.modules[moduleId] as T | undefined;
  const seeded = useRef(false);
  useEffect(() => {
    if (existing === undefined && !seeded.current) {
      seeded.current = true;
      const v = typeof seed === 'function' ? (seed as () => T)() : seed;
      store.update((d) => { (d.modules as Record<string, unknown>)[moduleId] = v as unknown; });
    }
  }, [existing, moduleId, seed, store]);
  const value = existing !== undefined ? existing : (typeof seed === 'function' ? (seed as () => T)() : seed);
  const set = useCallback((recipe: ((draft: Draft<T>) => void) | T) => {
    store.update((d) => {
      const mods = d.modules as Record<string, unknown>;
      const cur = (mods[moduleId] as T | undefined) ?? (typeof seed === 'function' ? (seed as () => T)() : seed);
      mods[moduleId] = typeof recipe === 'function' ? produce(cur, recipe as (draft: Draft<T>) => void) : recipe;
    });
  }, [store, moduleId, seed]);
  return [value, set];
}
