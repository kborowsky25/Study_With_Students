import { describe, expect, it } from 'vitest'
import { levelFor, THRESHOLDS, TIERS, xpFor, xpSessions } from './xp'

const ev = (role, status, patch = {}) => ({ role, status, amount: 22, title: 'Mechanics', ...patch })

describe('xpFor', () => {
  const events = [
    ev('student', 'pending'),
    ev('student', 'confirmed'),
    ev('student', 'paid'),
    ev('student', 'canceled'),
    ev('tutor', 'paid'),
    ev('student', 'confirmed', { title: 'Study Room: A-level Maths', amount: 0 }),
  ]

  it('students: 50 per booking, 100 per confirmed or paid session, 30 per tutor', () => {
    // 3 live (pending, confirmed, paid) × 50 + 2 done × 100 + 1 tutor × 30
    expect(xpFor('student', events, 1)).toBe(150 + 200 + 30)
  })

  it('tutors: 50 per confirmed or paid session, 100 per paid one, 30 per student', () => {
    expect(xpFor('tutor', events, 2)).toBe(50 + 100 + 60)
  })

  it('ignores cancelled sessions and study rooms saved to the calendar', () => {
    expect(xpSessions('student', events).map((e) => e.status)).toEqual(['pending', 'confirmed', 'paid'])
    expect(xpFor('student', [ev('student', 'canceled'), events[5]])).toBe(0)
  })
})

describe('levelFor', () => {
  it('names the tier and the progress to the next one', () => {
    expect(levelFor('student', 0)).toEqual({ index: 0, name: 'Newcomer', next: 150, progress: 0 })
    expect(levelFor('student', 275)).toMatchObject({ index: 1, name: 'Explorer', next: 400, progress: 0.5 })
    expect(levelFor('tutor', 400).name).toBe('Educator')
  })

  it('tops out at the last tier', () => {
    expect(levelFor('student', 99_999)).toEqual({ index: 6, name: 'Legend', next: null, progress: 1 })
  })

  it('has a name for every threshold', () => {
    expect(TIERS.student).toHaveLength(THRESHOLDS.length)
    expect(TIERS.tutor).toHaveLength(THRESHOLDS.length)
  })
})
