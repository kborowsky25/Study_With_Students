import { describe, expect, it } from 'vitest'
import {
  bookingFee, canJoin, canReview, feeWaived, isRefunded, isStudyRoomCopy, JOIN_EARLY_MS, needsPayment, totalPrice,
} from './sessions'

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
  it('lets the student rate a confirmed or paid session once it has ended', () => {
    expect(canReview(session(), END + 1)).toBe(true)
    expect(canReview(session({ status: 'paid' }), END + 1)).toBe(true)
    expect(canReview(session(), START)).toBe(false)
  })

  it('not before it has happened, even when it was paid in advance', () => {
    expect(canReview(session({ status: 'paid' }), START - 86_400_000)).toBe(false)
    expect(canReview(session({ status: 'paid' }), START + 60_000)).toBe(false)
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

  it('bookingFee and totalPrice: the family pays the price plus the fee', () => {
    expect(bookingFee(session({ amount: 22, booking_fee: 1.1 }))).toBe(1.1)
    expect(totalPrice(session({ amount: 22, booking_fee: 1.1 }))).toBeCloseTo(23.1)
    expect(totalPrice(session({ amount: '33.00', booking_fee: '1.65' }))).toBeCloseTo(34.65)
  })

  it('an invite credit pays the fee: the family pays the price alone', () => {
    const waived = session({ amount: '22.00', booking_fee: '0.00', fee_waived: '1.10' })
    expect(bookingFee(waived)).toBe(0)
    expect(feeWaived(waived)).toBe(1.1)
    expect(totalPrice(waived)).toBe(22)
    expect(feeWaived(session({ booking_fee: 1.1 }))).toBe(0)
  })

  it('isRefunded: cancelled because the payment was refunded', () => {
    expect(isRefunded(session({ status: 'canceled', cancel_type: 'refunded' }))).toBe(true)
    expect(isRefunded(session({ status: 'canceled', cancel_type: 'late' }))).toBe(false)
    expect(isRefunded(session({ status: 'paid' }))).toBe(false)
  })

  it('sessions from before the booking fee have none', () => {
    expect(bookingFee(session({ amount: 22 }))).toBe(0)
    expect(bookingFee(session({ booking_fee: null }))).toBe(0)
    expect(totalPrice(session({ amount: 22 }))).toBe(22)
    expect(totalPrice(session({ amount: null }))).toBe(0)
  })

  it('isStudyRoomCopy: free calendar copies of study rooms', () => {
    expect(isStudyRoomCopy(session({ title: 'Study Room: Physics', amount: 0 }))).toBe(true)
    expect(isStudyRoomCopy(session({ title: 'Study Room: Physics', amount: '0.00' }))).toBe(true)
    expect(isStudyRoomCopy(session({ title: 'Study Room: Physics', amount: 22 }))).toBe(false)
    expect(isStudyRoomCopy(session({ title: 'Physics', amount: 0 }))).toBe(false)
    expect(isStudyRoomCopy(session({ title: null, amount: 0 }))).toBe(false)
  })
})
