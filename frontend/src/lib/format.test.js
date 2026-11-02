import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  firstName, formatDate, formatDay, formatMoney, formatTime, formatWhen, fullDate, greeting, hoursBetween,
  initials, plural, timeAgo, toDate, weekBuckets,
} from './format'

// Dates are built in local time (new Date(y, m, d, h, min)) so the tests pass in any time zone.
const NOW = new Date(2026, 10, 4, 12, 0) // Wednesday 4 November 2026, 12:00

describe('toDate', () => {
  it('passes Date objects through', () => {
    const d = new Date()
    expect(toDate(d)).toBe(d)
  })

  it('reads ISO strings and numbers', () => {
    expect(toDate('2026-11-04T18:30:00').getHours()).toBe(18)
    expect(toDate(NOW.getTime()).getTime()).toBe(NOW.getTime())
  })

  it('reads MySQL-style "YYYY-MM-DD HH:MM:SS" (which Safari cannot parse) as local time', () => {
    const d = toDate('2026-11-04 18:30:00')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 4, 18, 30])
  })
})

describe('formatMoney', () => {
  it('drops pence for whole pounds', () => {
    expect(formatMoney(22)).toBe('£22')
    expect(formatMoney('20.00')).toBe('£20')
  })

  it('shows pence when there are any', () => {
    expect(formatMoney(22.5)).toBe('£22.50')
    expect(formatMoney(7.333)).toBe('£7.33')
  })

  it('groups thousands and treats empty values as zero', () => {
    expect(formatMoney(1234)).toBe('£1,234')
    expect(formatMoney(null)).toBe('£0')
    expect(formatMoney(undefined)).toBe('£0')
  })

  it('can force a number of decimals', () => {
    expect(formatMoney(5, { decimals: 2 })).toBe('£5.00')
  })
})

describe('dates and times', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
  afterEach(() => { vi.useRealTimers() })

  it('formats 24-hour times and short dates in en-GB', () => {
    const d = new Date(2026, 10, 4, 18, 5)
    expect(formatTime(d)).toBe('18:05')
    expect(formatDate(d)).toBe('4 Nov')
    expect(fullDate(d)).toBe('4 Nov 2026, 18:05')
  })

  it('names nearby days and falls back to a date', () => {
    expect(formatDay(new Date(2026, 10, 4, 23, 0))).toBe('Today')
    expect(formatDay(new Date(2026, 10, 5, 9, 0))).toBe('Tomorrow')
    expect(formatDay(new Date(2026, 10, 3, 9, 0))).toBe('Yesterday')
    expect(formatDay(new Date(2026, 10, 7, 9, 0))).toBe('Saturday')
    expect(formatDay(new Date(2026, 10, 20, 9, 0))).toBe('Fri 20 Nov')
    expect(formatDay(new Date(2026, 9, 20, 9, 0))).toBe('Tue 20 Oct')
  })

  it('combines day and time', () => {
    expect(formatWhen(new Date(2026, 10, 5, 17, 0))).toBe('Tomorrow · 17:00')
  })

  it('describes how long ago something happened', () => {
    expect(timeAgo(null)).toBe('')
    expect(timeAgo(new Date(NOW - 20_000))).toBe('just now')
    expect(timeAgo(new Date(NOW - 5 * 60_000))).toBe('5m ago')
    expect(timeAgo(new Date(NOW - 3 * 3_600_000))).toBe('3h ago')
    expect(timeAgo(new Date(NOW - 2 * 86_400_000))).toBe('2d ago')
    expect(timeAgo(new Date(2026, 9, 1, 12, 0))).toBe('1 Oct')
  })

  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 10, 4, 3))).toBe('Up late')
    expect(greeting(new Date(2026, 10, 4, 9))).toBe('Good morning')
    expect(greeting(new Date(2026, 10, 4, 15))).toBe('Good afternoon')
    expect(greeting(new Date(2026, 10, 4, 20))).toBe('Good evening')
  })

  it('buckets the last weeks Monday to Monday, oldest first', () => {
    const weeks = weekBuckets(8)
    expect(weeks).toHaveLength(8)
    const lastWeek = weeks[7]
    expect(lastWeek.start.getDay()).toBe(1) // Monday
    expect(lastWeek.start <= NOW && NOW < lastWeek.end).toBe(true)
    expect(lastWeek.label).toBe('2 Nov')
    for (let i = 1; i < weeks.length; i++) expect(weeks[i].start.getTime()).toBe(weeks[i - 1].end.getTime())
  })
})

describe('text helpers', () => {
  it('hoursBetween never goes negative', () => {
    expect(hoursBetween(new Date(2026, 0, 1, 10), new Date(2026, 0, 1, 11, 30))).toBe(1.5)
    expect(hoursBetween(new Date(2026, 0, 1, 11), new Date(2026, 0, 1, 10))).toBe(0)
  })

  it('firstName and initials', () => {
    expect(firstName('  Maya   Patel ')).toBe('Maya')
    expect(firstName('')).toBe('there')
    expect(initials('Oliver Grant')).toBe('OG')
    expect(initials('maya ann patel')).toBe('MA')
    expect(initials('')).toBe('?')
  })

  it('plural', () => {
    expect(plural(1, 'reply', 'replies')).toBe('1 reply')
    expect(plural(0, 'reply', 'replies')).toBe('0 replies')
    expect(plural(3, 'thread')).toBe('3 threads')
    expect(plural('1', 'thread')).toBe('1 thread')
  })
})
