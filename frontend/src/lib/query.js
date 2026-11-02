// Tiny stale-while-revalidate cache for API reads.
//
//   const { data, loading } = useQuery('events', getEvents)
//
// Cached data renders immediately on revisits while a background refetch runs,
// identical requests in flight are shared, and mutations can update the cache
// optimistically with setQueryData() or refresh it with invalidate().

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

const EMPTY = Object.freeze({ data: undefined, error: null, updatedAt: 0 })

const entries = new Map()   // key -> { data, error, updatedAt }
const fetchers = new Map()  // key -> last fetcher used, for invalidate()
const inflight = new Map()  // key -> Promise
const listeners = new Map() // key -> Set<() => void>

function setEntry(key, patch) {
  entries.set(key, { ...(entries.get(key) ?? EMPTY), ...patch })
  listeners.get(key)?.forEach((notify) => notify())
}

/** Fetch (or join an in-flight fetch) and store the result. Fetchers return an axios response. */
export function fetchQuery(key, fetcher) {
  fetchers.set(key, fetcher)
  if (inflight.has(key)) return inflight.get(key)
  const promise = fetcher()
    .then((res) => {
      const data = res && 'data' in res && 'status' in res ? res.data : res
      setEntry(key, { data, error: null, updatedAt: Date.now() })
      return data
    })
    .catch((error) => {
      setEntry(key, { error })
      throw error
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

export const prefetchQuery = (key, fetcher, staleTime = 15_000) => {
  const e = entries.get(key)
  if (e && Date.now() - e.updatedAt < staleTime) return
  fetchQuery(key, fetcher).catch(() => {})
}

export function setQueryData(key, updater) {
  const prev = entries.get(key)?.data
  setEntry(key, { data: typeof updater === 'function' ? updater(prev) : updater, error: null, updatedAt: Date.now() })
}

/** Mark every key starting with `prefix` stale and refetch the ones on screen. */
export function invalidate(...prefixes) {
  for (const key of entries.keys()) {
    if (!prefixes.some((p) => key === p || key.startsWith(`${p}:`))) continue
    setEntry(key, { updatedAt: 0 })
    if (listeners.get(key)?.size && fetchers.has(key)) fetchQuery(key, fetchers.get(key)).catch(() => {})
  }
}

/** Forget everything — call on login/logout so accounts never see each other's data. */
export function clearQueries() {
  entries.clear()
  fetchers.clear()
  inflight.clear()
}

export function useQuery(key, fetcher, { staleTime = 10_000, refreshInterval, enabled = true } = {}) {
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const run = useCallback(() => fetchQuery(key, () => fetcherRef.current()), [key])

  const subscribe = useCallback((notify) => {
    let set = listeners.get(key)
    if (!set) listeners.set(key, (set = new Set()))
    set.add(notify)
    return () => set.delete(notify)
  }, [key])
  const state = useSyncExternalStore(subscribe, () => entries.get(key) ?? EMPTY)

  useEffect(() => {
    if (!enabled || !key) return
    const e = entries.get(key)
    if (!e || Date.now() - e.updatedAt > staleTime) run().catch(() => {})
    if (!refreshInterval) return
    const timer = setInterval(() => run().catch(() => {}), refreshInterval)
    return () => clearInterval(timer)
  }, [key, enabled, staleTime, refreshInterval, run])

  return {
    data: state.data,
    error: state.error,
    loading: enabled && state.data === undefined && !state.error,
    refetch: run,
    mutate: (updater) => setQueryData(key, updater),
  }
}
