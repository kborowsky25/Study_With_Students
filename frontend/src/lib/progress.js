// Lesson notes and progress: shared labels, rules and query keys.
import {
  getLessonNote, getLessonNoteIndex, getStudentNotes, getStudentProgress, getTopicCatalogue,
} from '../api/progress'
import { invalidate } from './query'

/** Confidence the tutor gives each topic covered, 1–5. */
export const CONFIDENCE = ['', 'Not yet', 'Shaky', 'Getting there', 'Confident', 'Exam-ready']

/** Sessions that can have notes: confirmed or paid, and started (the API enforces the same rule). */
export const notesPossible = (ev, now = Date.now()) =>
  ['confirmed', 'paid'].includes(ev.status) && new Date(ev.start_time).getTime() <= now

/** Only the session's tutor writes the notes. */
export const canWriteNotes = (ev, now = Date.now()) => ev.role === 'tutor' && notesPossible(ev, now)

/** Open homework past its due date (due dates are whole days). */
export function isOverdue(item, today = new Date()) {
  if (!item.due_date || item.done_at) return false
  const day = new Date(today)
  day.setHours(0, 0, 0, 0)
  return new Date(`${item.due_date}T00:00:00`) < day
}

export const NQ = {
  topics:   ['progress:topics', getTopicCatalogue],
  index:    ['lesson-notes:index', getLessonNoteIndex],
  note:     (eventId) => [`lesson-note:${eventId}`, () => getLessonNote(eventId)],
  progress: (userId) => [`progress:${userId}`, () => getStudentProgress(userId)],
  notes:    (userId) => [`lesson-notes:${userId}`, () => getStudentNotes(userId)],
}

/** Refresh everything that shows notes or homework after a change. */
export const refreshProgress = () => invalidate('lesson-notes', 'lesson-note', 'progress')
