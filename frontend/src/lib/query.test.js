// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearQueries, fetchQuery, invalidate, prefetchQuery, setQueryData, useQuery } from './query'

// The cache is module state shared by every test: give each test its own keys
// (created outside renderHook callbacks, which run on every render).
let n = 0
const key = (name) => `${name}#${++n}`
const response = (data) => ({ data, status: 200 }) // what axios resolves with
const deferred = () => {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

beforeEach(() => clearQueries())
afterEach(() => vi.useRealTimers())

describe('fetchQuery', () => {
  it('unwraps axios responses and caches the data', async () => {
    const k = key('events')
    await expect(fetchQuery(k, () => Promise.resolve(response({ events: [1] })))).resolves.toEqual({ events: [1] })
    const { result } = renderHook(() => useQuery(k, () => Promise.resolve(response({ events: [2] })), { staleTime: 60_000 }))
    expect(result.current.data).toEqual({ events: [1] }) // served from the cache, no loading state
    expect(result.current.loading).toBe(false)
  })

  it('accepts fetchers that return plain data', async () => {
    await expect(fetchQuery(key('plain'), () => Promise.resolve([1, 2]))).resolves.toEqual([1, 2])
  })

  it('shares one request between identical calls in flight', async () => {
    const k = key('shared')
    const d = deferred()
    const fetcher = vi.fn(() => d.promise)
    const a = fetchQuery(k, fetcher)
    const b = fetchQuery(k, fetcher)
    expect(b).toBe(a)
    d.resolve(response('ok'))
    await expect(a).resolves.toBe('ok')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('stores the error and rethrows it', async () => {
    const k = key('broken')
    const boom = new Error('boom')
    await expect(fetchQuery(k, () => Promise.reject(boom))).rejects.toBe(boom)
    const { result } = renderHook(() => useQuery(k, () => new Promise(() => {}), { staleTime: 60_000 }))
    expect(result.current.error).toBe(boom)
    expect(result.current.loading).toBe(false)
  })
})

describe('prefetchQuery', () => {
  it('skips fresh entries and refetches stale ones', async () => {
    vi.useFakeTimers()
    const k = key('rooms')
    const fetcher = vi.fn(() => Promise.resolve(response('rooms')))
    await fetchQuery(k, fetcher)
    prefetchQuery(k, fetcher, 15_000)
    expect(fetcher).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(15_001)
    prefetchQuery(k, fetcher, 15_000)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('swallows errors (it is only a warm-up)', async () => {
    expect(() => prefetchQuery(key('fails'), () => Promise.reject(new Error('offline')))).not.toThrow()
  })
})

describe('setQueryData', () => {
  it('replaces or updates the cached value', () => {
    const k = key('list')
    const { result } = renderHook(() => useQuery(k, () => new Promise(() => {}), { enabled: false }))
    act(() => setQueryData(k, [1]))
    expect(result.current.data).toEqual([1])
    act(() => setQueryData(k, (prev) => [...prev, 2]))
    expect(result.current.data).toEqual([1, 2])
    act(() => result.current.mutate((prev) => prev.filter((x) => x !== 1)))
    expect(result.current.data).toEqual([2])
  })
})

describe('invalidate', () => {
  it('refetches matching keys that are on screen, and only those', async () => {
    const shown = key('thread')
    const sub = `${shown}:42`
    const other = `${shown}x` // shares the prefix text but is a different key
    const fetchShown = vi.fn(() => Promise.resolve(response('a')))
    const fetchSub = vi.fn(() => Promise.resolve(response('b')))
    const fetchOther = vi.fn(() => Promise.resolve(response('c')))

    renderHook(() => useQuery(shown, fetchShown, { staleTime: 60_000 }))
    renderHook(() => useQuery(sub, fetchSub, { staleTime: 60_000 }))
    await fetchQuery(other, fetchOther) // cached but nobody is listening
    await waitFor(() => expect(fetchSub).toHaveBeenCalledTimes(1))

    await act(async () => { invalidate(shown) })
    expect(fetchShown).toHaveBeenCalledTimes(2)
    expect(fetchSub).toHaveBeenCalledTimes(2)
    expect(fetchOther).toHaveBeenCalledTimes(1)
  })
})

describe('useQuery', () => {
  it('loads, then renders the data', async () => {
    const k = key('profile')
    const { result } = renderHook(() => useQuery(k, () => Promise.resolve(response({ name: 'Maya' }))))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toEqual({ name: 'Maya' }))
    expect(result.current.loading).toBe(false)
  })

  it('does nothing while disabled', () => {
    const k = key('off')
    const fetcher = vi.fn(() => Promise.resolve(response(1)))
    const { result } = renderHook(() => useQuery(k, fetcher, { enabled: false }))
    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
  })

  it('refetches on mount once the data is stale, showing the cached data meanwhile', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const k = key('stale')
    await fetchQuery(k, () => Promise.resolve(response('old')))
    vi.advanceTimersByTime(10_001)
    const d = deferred()
    const { result } = renderHook(() => useQuery(k, () => d.promise, { staleTime: 10_000 }))
    expect(result.current.data).toBe('old')
    await act(async () => { d.resolve(response('new')) })
    expect(result.current.data).toBe('new')
  })

  it('polls with refreshInterval and stops on unmount', async () => {
    vi.useFakeTimers()
    const k = key('poll')
    const fetcher = vi.fn(() => Promise.resolve(response('tick')))
    const { unmount } = renderHook(() => useQuery(k, fetcher, { refreshInterval: 1000 }))
    expect(fetcher).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(fetcher).toHaveBeenCalledTimes(4)
    unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('refetch() always goes to the network', async () => {
    const k = key('manual')
    const fetcher = vi.fn(() => Promise.resolve(response('x')))
    const { result } = renderHook(() => useQuery(k, fetcher, { staleTime: 60_000 }))
    await waitFor(() => expect(result.current.data).toBe('x'))
    await act(async () => { await result.current.refetch() })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})

describe('clearQueries', () => {
  it('forgets cached data (used on login and logout)', async () => {
    const k = key('private')
    await fetchQuery(k, () => Promise.resolve(response('secret')))
    clearQueries()
    const { result } = renderHook(() => useQuery(k, () => new Promise(() => {})))
    expect(result.current.data).toBeUndefined()
    expect(result.current.loading).toBe(true)
  })
})
