/**
 * clientCache.js — simple in-memory TTL cache for client-side API fetches.
 *
 * Why this exists:
 *  - React StrictMode (dev) invokes every effect twice, doubling API calls.
 *  - Next.js client components re-mount on navigation with no built-in cache.
 *  - Result: 3-5 identical requests fire every time the user visits / or /manufacturers.
 *
 * How it works:
 *  - Cache lives in module-level Map (survives re-renders, StrictMode double runs).
 *  - Each entry has a timestamp; entries older than TTL are re-fetched.
 *  - Full page reload (window.location.reload) clears the module, giving fresh data.
 *
 * Usage:
 *   import { fetchWithCache } from "@/lib/clientCache";
 *   const data = await fetchWithCache("/api/some-endpoint?foo=bar");
 */

const _cache = new Map();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch `url` and cache the parsed JSON response.
 * Subsequent calls within `ttlMs` return the cached result immediately
 * without hitting the network.
 *
 * @param {string} url        - Full URL including query string (used as cache key)
 * @param {number} [ttlMs]    - Cache lifetime in milliseconds (default 5 min)
 * @returns {Promise<any>}    - Parsed JSON response
 */
export async function fetchWithCache(url, ttlMs = DEFAULT_TTL_MS) {
  const entry = _cache.get(url);
  if (entry && Date.now() - entry.ts < ttlMs) {
    return entry.data;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const data = await res.json();

  _cache.set(url, { data, ts: Date.now() });
  return data;
}

/**
 * Manually remove cached entries whose key starts with `urlPrefix`.
 * Call this after mutations (e.g., creating a new product) to ensure
 * the next fetch gets fresh data.
 *
 * @param {string} [urlPrefix] - If omitted, clears the entire cache.
 */
export function invalidateCache(urlPrefix) {
  if (!urlPrefix) {
    _cache.clear();
    return;
  }
  for (const key of _cache.keys()) {
    if (key.startsWith(urlPrefix)) {
      _cache.delete(key);
    }
  }
}
