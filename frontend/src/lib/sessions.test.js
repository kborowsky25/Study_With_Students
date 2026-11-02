import { describe, expect, it } from 'vitest'
import { canJoin, canReview, isStudyRoomCopy, JOIN_EARLY_MS, needsPayment } from './sessions'

const START = new Date(2026, 10, 4, 18, 0).getTime()
const END = START + 3_600_000
const session = (patch = {}) => ({
  start_time: new Date(START).toISOString(),
  end_time: new Date(END).toISOString(),
  status: 'confirmed',
  meeting_url: 'https://meet.jit.si/StudyWithStudents-1-abc',
  amount: 22,
  role: 'student',
  title: 'Mechanics',
  my_rating: null,
  ...patch,
})

describe('canJoin', () => {
  it('opens 15 minutes before the start and closes at the end', () => {
    expect(canJoin(session(), START - JOIN_EARLY_MS - 1)).toBe(false)
    expect(canJoin(session(), START - JOIN_EARLY_MS)).toBe(true)
    expect(canJoin(session(), START + 30 * 60_000)).toBe(true)
    expect(canJoin(session(), END)).toBe(true)
    expect(canJoin(session(), END + 1)).toBe(false)
  })

  it('needs a link and a confirmed or paid session', () => {
    expect(canJoin(session({ meeting_url: null }), START)).toBe(false)
    expect(canJoin(session({ status: 'pending' }), START)).toBe(false)
    expect(canJoin(session({ status: 'canceled' }), START)).toBe(false)
    expect(canJoin(session({ status: 'paid' }), START)).toBe(true)
  })
})

describe('canReview', () => {
  it('lets the student rate a paid session, or a confirmed one once it has ended', () => {
    expect(canReview(session({ status: 'paid' }), START - 86_400_000)).toBe(true)
    expect(canReview(session(), END + 1)).toBe(true)
    expect(canReview(session(), START)).toBe(false)
  })

  it('only once, only students, never pending or cancelled sessions', () => {
    expect(canReview(session({ my_rating: 5 }), END + 1)).toBe(false)
    expect(canReview(session({ role: 'tutor' }), END + 1)).toBe(false)
    expect(canReview(session({ status: 'pending' }), END + 1)).toBe(false)
    expect(canReview(session({ status: 'canceled' }), END + 1)).toBe(false)
  })

  it('never offers to review a study room saved to the calendar', () => {
    expect(canReview(session({ title: 'Study Room: A-level Maths', amount: 0 }), END + 1)).toBe(false)
  })
})

describe('money', () => {
  it('needsPayment: confirmed sessions with a fee', () => {
    expect(needsPayment(session())).toBe(true)
    expect(needsPayment(session({ amount: '22.00' }))).toBe(true)
    expect(needsPayment(session({ amount: 0 }))).toBe(false)
    expect(needsPayment(session({ status: 'paid' }))).toBe(false)
    expect(needsPayment(session({ status: 'pending' }))).toBe(false)
  })

  it('isStudyRoomCopy: free calendar copies of study rooms', () => {
    expect(isStudyRoomCopy(session({ title: 'Study Room: Physics', amount: 0 }))).toBe(true)
    expect(isStudyRoomCopy(session({ title: 'Study Room: Physics', amount: '0.00' }))).toBe(true)
    expect(isStudyRoomCopy(session({ title: 'Study Room: Physics', amount: 22 }))).toBe(false)
    expect(isStudyRoomCopy(session({ title: 'Physics', amount: 0 }))).toBe(false)
    expect(isStudyRoomCopy(session({ title: null, amount: 0 }))).toBe(false)
  })
})
