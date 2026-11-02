// Rules about sessions shared by the dashboards, calendars and session rows.

export const JOIN_EARLY_MS = 15 * 60_000

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

/** A student can rate a session once it has happened (and only once). */
export function canReview(ev, now = Date.now()) {
  if (ev.role !== 'student' || ev.my_rating || isStudyRoomCopy(ev)) return false
  const ended = new Date(ev.end_time).getTime() < now
  return ev.status === 'paid' || (ev.status === 'confirmed' && ended)
}

/** Free sessions (e.g. study rooms saved to the calendar) never need paying. */
export const needsPayment = (ev) => ev.status === 'confirmed' && Number(ev.amount) > 0
