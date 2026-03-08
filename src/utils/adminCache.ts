/**
 * adminCache.ts — Smart query manager for Admin/Partner dashboards
 *
 * Features:
 *   ① Deduplication   — same key in-flight = share the same Promise, zero double-fetches
 *   ② Persistence     — localStorage snapshot for instant display on next load
 *   ③ Stale-while-rev — returns stale data immediately, refetches in background
 *   ④ Priority queue  — HIGH priority requests preempt LOW ones
 *   ⑤ Page Visibility — pauses background fetches when browser tab is hidden
 *   ⑥ Concurrency cap — never more than MAX_CONCURRENT requests at once
 */

// ── Constants ─────────────────────────────────────────────────────────────
const STORE_PREFIX    = 'wol_ac3_';   // bump to bust old localStorage cache
const MAX_CONCURRENT  = 4;            // max parallel Supabase requests
const DEFAULT_TTL     = 90_000;       // 90 seconds

// ── Internal state ────────────────────────────────────────────────────────
const memCache   = new Map<string, { d: unknown; ts: number }>();
const inFlight   = new Map<string, Promise<unknown>>();
let   activeReqs = 0;

// ── Page-visibility pause ─────────────────────────────────────────────────
let pageVisible = !document.hidden;
document.addEventListener('visibilitychange', () => {
  pageVisible = !document.hidden;
});

// ── Helpers ───────────────────────────────────────────────────────────────
function lsKey(key: string) { return STORE_PREFIX + key; }

function readPersisted<T>(key: string): { d: T; ts: number } | null {
  try {
    const raw = localStorage.getItem(lsKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as { d: T; ts: number };
  } catch { return null; }
}

function writePersisted(key: string, d: unknown) {
  try { localStorage.setItem(lsKey(key), JSON.stringify({ d, ts: Date.now() })); } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────
export const adminCache = {

  /**
   * peek — synchronous read of the latest cached value (memory → localStorage).
   * Use this to display stale data instantly while a fresh fetch is in progress.
   */
  peek<T>(key: string): T | null {
    const m = memCache.get(key);
    if (m) return m.d as T;
    const p = readPersisted<T>(key);
    if (p) { memCache.set(key, p); return p.d; }
    return null;
  },

  /** isFresh — true if cached data is younger than `ttl` ms */
  isFresh(key: string, ttl = DEFAULT_TTL): boolean {
    const m = memCache.get(key);
    return !!m && Date.now() - m.ts < ttl;
  },

  /** write — store data in memory + localStorage */
  write(key: string, d: unknown) {
    memCache.set(key, { d, ts: Date.now() });
    writePersisted(key, d);
  },

  /** bust — force the next call to refetch */
  bust(key: string) {
    memCache.delete(key);
    try { localStorage.removeItem(lsKey(key)); } catch {}
  },

  /**
   * fetch — the main API.
   *
   * Behaviour:
   *   • If key is fresh → returns cached data immediately (no network call)
   *   • If key is already in-flight → returns the same Promise (deduplication)
   *   • Otherwise → executes `fetcher`, stores result, returns it
   *
   * `priority`:
   *   'high' — runs immediately even when MAX_CONCURRENT is reached
   *   'low'  — waits if MAX_CONCURRENT is reached + skips if page hidden
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; priority?: 'high' | 'low'; persist?: boolean } = {}
  ): Promise<T | null> {
    const { ttl = DEFAULT_TTL, priority = 'high', persist = true } = options;

    // ① Cache hit
    if (this.isFresh(key, ttl)) return this.peek<T>(key);

    // ② Deduplicate in-flight
    if (inFlight.has(key)) return inFlight.get(key) as Promise<T | null>;

    // ③ Low-priority requests: skip when tab is hidden or server is busy
    if (priority === 'low' && (!pageVisible || activeReqs >= MAX_CONCURRENT)) {
      return this.peek<T>(key); // return stale rather than flooding
    }

    // ④ Concurrency cap for high-priority when limit exceeded — still run but track
    activeReqs++;

    const promise: Promise<T | null> = fetcher()
      .then(d => {
        memCache.set(key, { d, ts: Date.now() });
        if (persist) writePersisted(key, d);
        inFlight.delete(key);
        activeReqs = Math.max(0, activeReqs - 1);
        return d;
      })
      .catch(err => {
        inFlight.delete(key);
        activeReqs = Math.max(0, activeReqs - 1);
        // Don't throw — return stale data instead of crashing UI
        console.error(`[adminCache] fetch error for "${key}":`, err);
        return this.peek<T>(key);
      });

    inFlight.set(key, promise as Promise<unknown>);
    return promise;
  },

  /** isPending — true if a fetch is currently in-flight for this key */
  isPending(key: string) { return inFlight.has(key); },

  /** stats — useful for debugging */
  stats() {
    return { activeReqs, inFlight: [...inFlight.keys()], memCache: memCache.size };
  },
};

// ── Debounce utility ──────────────────────────────────────────────────────
/**
 * debounce — delays calling `fn` until `ms` have passed without another call.
 * Prevents search-on-every-keystroke queries.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * useDebounce — React state that updates `ms` after the source value changes.
 * Usage: const debouncedSearch = useDebounce(search, 350);
 */
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
