// Rules about sessions shared by the dashboards, calendars and session rows.
// The API enforces the same ones (server/scheduling.py, server/routes/events.py).

export const JOIN_EARLY_MS = 15 * 60_000
const HOUR = 3_600_000

/** Students cancel free of charge until this long before; after that the tutor has to agree. */
export const FREE_CANCEL_HOURS = 24
export const INTRO_MINUTES = 15
export const REPEAT_WEEKS = [1, 2, 3, 4, 6, 8, 10, 12]

/**
 * A study room a student saved to their calendar: stored as a free (£0) confirmed event
 * titled "Study Room: …" (server/routes/study_rooms.py). It isn't a 1-to-1 session, so it
 * never counts towards earnings, payments, reviews or session totals.
 */
export const isStudyRoomCopy = (ev) => Number(ev.amount) === 0 && String(ev.title ?? '').startsWith('Study Room: ')

/** The video link opens 15 minutes before a confirmed or paid session and closes when it ends. */
export function canJoin(ev, now = Date.now()) {
  if (!ev.meeting_url || !['confirmed', 'paid'].includes(ev.status)) return false
  return now >= new Date(ev.start_time).getTime() - JOIN_EARLY_MS && now <= new Date(ev.end_time).getTime()
}

/** A student can rate a session once it has happened (and only once). Intro calls and saved study rooms aren't rated. */
export function canReview(ev, now = Date.now()) {
  if (ev.role !== 'student' || ev.my_rating || isIntro(ev) || isStudyRoomCopy(ev)) return false
  const ended = new Date(ev.end_time).getTime() < now
  return ended && (ev.status === 'paid' || ev.status === 'confirmed')
}

/** Free sessions (intro calls, study rooms saved to the calendar) never need paying. */
export const needsPayment = (ev) => ev.status === 'confirmed' && Number(ev.amount) > 0

/** The free 15-minute call before the first paid session with a tutor. */
export const isIntro = (ev) => ev.kind === 'intro'

export const isUpcoming = (ev, now = Date.now()) => new Date(ev.start_time).getTime() > now

/** Inside 24 hours a student can't cancel a confirmed session alone: the tutor has to agree. */
export const isLateCancel = (ev, now = Date.now()) =>
  ev.status === 'confirmed' && new Date(ev.start_time).getTime() - now < FREE_CANCEL_HOURS * HOUR

/** Requests, confirmed and paid sessions can move to a new time until they start. */
export const canReschedule = (ev, now = Date.now()) =>
  ['pending', 'confirmed', 'paid'].includes(ev.status) && isUpcoming(ev, now)

/** A new time the other side proposed, waiting for this person's answer. */
export const awaitsMyAnswer = (ev) => Boolean(ev.proposed_start) && ev.proposed_by !== ev.role

/** Weeks of a series after this one that are still on. */
export const laterWeeks = (ev) => (ev.series_index ? ev.series_size - ev.series_index : 0)

export const canAddToCalendar = (ev, now = Date.now()) =>
  ['confirmed', 'paid'].includes(ev.status) && new Date(ev.end_time).getTime() > now

/** Minutes between start and end. */
export const sessionMinutes = (ev) => Math.round((new Date(ev.end_time) - new Date(ev.start_time)) / 60_000)

// Session times are UK wall-clock times without a zone ("2026-11-12T18:00:00"), so Google gets them as-is
const calendarStamp = (value) => String(value).replace(/[-:]/g, '').slice(0, 15)

/** "Add to Google Calendar" for one session, from the viewer's side. */
export function googleCalendarUrl(ev) {
  const other = ev.role === 'tutor' ? ev.student_name : ev.tutor_name
  const page = `${window.location.origin}/calendar/${ev.role === 'tutor' ? 'tutor' : 'student'}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${ev.title || 'Tutoring session'}${other ? ` with ${other}` : ''}`,
    dates: `${calendarStamp(ev.start_time)}/${calendarStamp(ev.end_time)}`,
    ctz: 'Europe/London',
    details: [ev.meeting_url && `Join: ${ev.meeting_url}`, `Study With Students: ${page}`].filter(Boolean).join('\n'),
  })
  if (ev.meeting_url) params.set('location', ev.meeting_url)
  return `https://calendar.google.com/calendar/render?${params}`
}

/**
 * The booking fee (5% of the price) the family pays on top of the tutor's price. Tutors keep
 * the whole `amount`; sessions booked before the fee existed have none.
 */
export const bookingFee = (ev) => Number(ev.booking_fee) || 0

/** What the family pays for a session: the tutor's price plus the booking fee. */
export const totalPrice = (ev) => (Number(ev.amount) || 0) + bookingFee(ev)
