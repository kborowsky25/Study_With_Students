import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./query', () => ({ prefetchQuery: vi.fn() }))

const { prefetchQuery } = await import('./query')
const { prefetchRoute, Q } = await import('./queries')

const prefetchedKeys = () => prefetchQuery.mock.calls.map(([k]) => k)

describe('prefetchRoute', () => {
  beforeEach(() => prefetchQuery.mockClear())

  it('warms the data a page needs', () => {
    prefetchRoute('/messages')
    expect(prefetchedKeys()).toEqual([Q.conversations[0]])
  })

  it('never prefetches Explorer-only data for free accounts (that would be a 402)', () => {
    prefetchRoute('/forum')
    expect(prefetchQuery).not.toHaveBeenCalled()
    prefetchRoute('/forum', { explorer: true })
    expect(prefetchedKeys()).toEqual([Q.forumCategories[0]])
  })

  it('ignores routes without prefetch data', () => {
    prefetchRoute('/xp')
    expect(prefetchQuery).not.toHaveBeenCalled()
  })

  it('query keys are unique', () => {
    const keys = Object.values(Q).filter(Array.isArray).map(([k]) => k)
    expect(new Set(keys).size).toBe(keys.length)
    expect(Q.thread(7)[0]).toBe('thread:7')
  })
})
