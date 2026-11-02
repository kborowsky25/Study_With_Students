import { describe, expect, it } from 'vitest'
import { byStart, sameDay, startOfDay, startOfMonth, toDateInput, toLocalISO } from './dates'

describe('dates', () => {
  it('startOfDay and startOfMonth', () => {
    const d = new Date(2026, 10, 4, 18, 45, 12)
    expect(startOfDay(d)).toEqual(new Date(2026, 10, 4))
    expect(startOfMonth(d)).toEqual(new Date(2026, 10, 1))
    expect(d.getHours()).toBe(18) // the input is not mutated
  })

  it('sameDay ignores the time', () => {
    expect(sameDay(new Date(2026, 10, 4, 0, 1), new Date(2026, 10, 4, 23, 59))).toBe(true)
    expect(sameDay(new Date(2026, 10, 4), new Date(2026, 10, 5))).toBe(false)
    expect(sameDay(new Date(2026, 10, 4), new Date(2025, 10, 4))).toBe(false)
  })

  it('byStart sorts earliest first', () => {
    const list = [{ start_time: '2026-11-05T10:00:00' }, { start_time: '2026-11-04T10:00:00' }, { start_time: '2026-11-04T09:00:00' }]
    expect([...list].sort(byStart).map((e) => e.start_time)).toEqual([
      '2026-11-04T09:00:00', '2026-11-04T10:00:00', '2026-11-05T10:00:00',
    ])
  })

  it('formats values for date inputs and the API, padded and in local time', () => {
    const d = new Date(2026, 0, 5, 7, 3)
    expect(toDateInput(d)).toBe('2026-01-05')
    expect(toLocalISO(d)).toBe('2026-01-05T07:03:00')
  })
})
