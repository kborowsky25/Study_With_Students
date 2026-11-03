// The made-up student, tutors, sessions and messages that the homepage's dashboard preview
// (AppPreview.jsx) shows. None of these people exist; Maya, Kate and Oliver are the demo
// accounts from db/seed.py. Dates are worked out from today, so the preview never looks stale.
import { BOOKING_FEE_PERCENT } from '../../lib/site'

const HOUR = 3_600_000

function at(hour) {
  const d = new Date()
  d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0)
  return d
}

/** The next `weekday` (0 = Sunday) after today, at `hour` (17.5 is 17:30). */
export function next(weekday, hour) {
  const d = at(hour)
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7 || 7))
  return d
}

/** The `weeks`th `weekday` before today: 1 is the most recent one. */
function before(weekday, hour, weeks = 1) {
  const d = at(hour)
  d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7 || 7) - 7 * (weeks - 1))
  return d
}

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000)
const hoursLater = (date, hours) => new Date(date.getTime() + hours * HOUR)

export const longDay = (d) => d.toLocaleDateString('en-GB', { weekday: 'long' })

export const STUDENT = { name: 'Maya Patel', first: 'Maya' }

export const TUTORS = [
  { id: 'oliver', name: 'Oliver Grant', uni: 'UCL', course: 'Mathematics', subjects: ['Maths', 'Further maths', 'Physics'], rate: 22, rating: 4.9, reviews: 14, mine: true },
  { id: 'hannah', name: 'Hannah Osei', uni: 'Imperial College London', course: 'Chemistry', subjects: ['Chemistry', 'Biology'], rate: 24, rating: 5, reviews: 9, mine: true },
  { id: 'leo', name: 'Leo Marchetti', uni: 'University of Cambridge', course: 'Natural Sciences', subjects: ['Physics', 'Maths'], rate: 26, rating: 4.8, reviews: 11, match: 92, reasons: ['A-level Physics', 'Saturday mornings'] },
  { id: 'amara', name: 'Amara Nwosu', uni: 'University of Oxford', course: 'Biomedical Sciences', subjects: ['Biology', 'Chemistry'], rate: 25, rating: 4.9, reviews: 6, match: 85, reasons: ['A-level Biology', 'Weekday evenings'] },
  { id: 'isla', name: 'Isla Fenwick', uni: 'King’s College London', course: 'English', subjects: ['English', 'History'], rate: 20, rating: 4.7, reviews: 8, match: 71, reasons: ['GCSE English'] },
]

export const tutor = (id) => TUTORS.find((t) => t.id === id)

// As in the app: the tutor earns `amount` (rate × hours), the family pays it plus the booking fee
const session = (id, title, tutorId, start, hours, status) => {
  const amount = tutor(tutorId).rate * hours
  const fee = Math.round(amount * BOOKING_FEE_PERCENT) / 100
  return { id, title, tutor: tutor(tutorId).name, start, end: hoursLater(start, hours), hours, status, amount, fee }
}

// Five lessons so far (6.5 hours), two confirmed and one waiting for the tutor
export const SESSIONS = [
  session('s1', 'Integration by parts', 'oliver', before(3, 18, 3), 1.5, 'paid'),
  session('s2', 'Rates of reaction', 'hannah', before(1, 16.5, 2), 1, 'paid'),
  session('s3', 'Mechanics: forces', 'oliver', before(3, 18, 2), 1, 'paid'),
  session('s4', 'Alkenes', 'hannah', before(1, 16.5), 1.5, 'paid'),
  session('s5', 'Differentiation: chain rule', 'oliver', before(3, 18), 1.5, 'paid'),
  session('s6', 'Mechanics: projectiles', 'oliver', next(3, 18), 1, 'confirmed'),
  session('s7', 'Reaction mechanisms', 'hannah', next(1, 16.5), 1, 'confirmed'),
  session('s8', 'Exam technique review', 'oliver', next(6, 17), 1, 'pending'),
].sort((a, b) => a.start - b.start)

const upNext = SESSIONS.find((s) => s.id === 's6')

export const CONVERSATIONS = [
  {
    id: 'oliver',
    unread: 1,
    messages: [
      { mine: true, text: 'Hi Oliver! Could we go over projectiles before my mock?', at: minutesAgo(26 * 60) },
      { text: 'Of course. Bring last week’s past paper and we’ll start with question 4.', at: minutesAgo(25 * 60) },
      { text: `See you on ${longDay(upNext.start)}!`, at: minutesAgo(40) },
    ],
  },
  {
    id: 'hannah',
    messages: [
      { text: 'Good session on alkenes. Try the two practice questions before next time.', at: hoursLater(SESSIONS.find((s) => s.id === 's4').start, 2) },
      { mine: true, text: 'Will do, thank you!', at: hoursLater(SESSIONS.find((s) => s.id === 's4').start, 2.5) },
    ],
  },
  {
    id: 'leo',
    messages: [
      { mine: true, text: 'Hi Leo, do you have any Saturday slots for A-level Physics?', at: minutesAgo(9 * 24 * 60) },
      { text: 'Hi Maya, Saturday mornings work for me. Send me a request and we can set it up.', at: minutesAgo(9 * 24 * 60 - 95) },
    ],
  },
]

export const HOMEWORK = [
  { id: 'hw1', task: 'Past paper, question 4: projectiles', subject: 'Maths', due: upNext.start },
  { id: 'hw2', task: 'Two practice questions on alkenes', subject: 'Chemistry', due: next(1, 9) },
  { id: 'hw3', task: 'Chain rule worksheet', subject: 'Maths', done: true },
]

// Confidence the tutor gave each topic, 1–5 (lib/progress.js), with the rating before it
export const CONFIDENCE = ['', 'Not yet', 'Shaky', 'Getting there', 'Confident', 'Exam-ready']

export const SUBJECTS = [
  {
    key: 'maths',
    name: 'Maths',
    total: 14,
    lessons: ['s1', 's3', 's5'],
    topics: [
      { name: 'Differentiation: chain rule', confidence: 5, lesson: 's5' },
      { name: 'Integration by parts', confidence: 4, previous: 2, lesson: 's5' },
      { name: 'Forces and Newton’s laws', confidence: 3, lesson: 's3' },
      { name: 'Kinematics: suvat', confidence: 2, lesson: 's3' },
      { name: 'Projectiles' },
      { name: 'Vectors' },
      { name: 'Binomial expansion' },
    ],
    growth: [1, 3, 4],
  },
  {
    key: 'chemistry',
    name: 'Chemistry',
    total: 12,
    lessons: ['s2', 's4'],
    topics: [
      { name: 'Rates of reaction', confidence: 4, lesson: 's2' },
      { name: 'Alkenes', confidence: 3, lesson: 's4' },
      { name: 'Isomerism', confidence: 2, lesson: 's4' },
      { name: 'Reaction mechanisms' },
      { name: 'Equilibria' },
    ],
    growth: [1, 3],
  },
]

export const THREADS = [
  { title: 'Planning revision for three A-levels?', category: 'Exam prep', by: 'Ella Morgan', replies: 12, at: minutesAgo(130) },
  { title: 'Best way into integration by parts?', category: 'Maths', by: 'Sam Okoye', replies: 6, at: minutesAgo(5 * 60) },
  { title: 'How do you remember organic mechanisms?', category: 'Sciences', by: 'Ruby Chen', replies: 9, at: minutesAgo(21 * 60) },
  { title: 'Past papers or topic questions first?', category: 'Exam prep', by: 'Noah Fraser', replies: 4, at: minutesAgo(27 * 60) },
  { title: 'Unseen poetry: where do you start?', category: 'English', by: 'Aisha Rahman', replies: 7, at: minutesAgo(50 * 60) },
  { title: 'When do you use suvat?', category: 'Maths', by: STUDENT.name, replies: 3, at: minutesAgo(75 * 60) },
]

export const NOTES = [
  { title: 'Mechanics: suvat summary', kind: 'pdf', subject: 'Maths', by: 'Oliver Grant', at: minutesAgo(2 * 24 * 60) },
  { title: 'Organic mechanisms map', kind: 'slides', subject: 'Chemistry', by: 'Hannah Osei', at: minutesAgo(4 * 24 * 60) },
  { title: 'Chain rule worked examples', kind: 'doc', subject: 'Maths', by: STUDENT.name, mine: true, at: minutesAgo(6 * 24 * 60) },
  { title: 'Macbeth: key quotes by theme', kind: 'pdf', subject: 'English', by: 'Isla Fenwick', at: minutesAgo(9 * 24 * 60) },
  { title: 'Cell biology flashcards', kind: 'doc', subject: 'Biology', by: 'Amara Nwosu', at: minutesAgo(12 * 24 * 60) },
]

// Study rooms and classes are free; tutors host them
export const ROOMS = [
  { id: 'r1', subject: 'A-level Maths', note: 'Silent study', host: 'Oliver Grant', start: next(2, 19), hours: 2 },
  { id: 'r2', subject: 'Chemistry', note: 'Past paper night', host: 'Hannah Osei', start: next(4, 18), hours: 1.5 },
  { id: 'r3', subject: 'GCSE English', note: 'Essay sprint', host: 'Isla Fenwick', start: next(0, 15), hours: 1 },
]

export const CLASS_SIZE = 20

export const CLASSES = [
  { id: 'c1', title: 'Exam technique: mechanics', subject: 'Maths', host: 'Oliver Grant', start: next(4, 18), hours: 1, taken: 14 },
  { id: 'c2', title: 'Organic chemistry in an hour', subject: 'Chemistry', host: 'Hannah Osei', start: next(6, 11), hours: 1, taken: 17 },
  { id: 'c3', title: 'Essay plans that score', subject: 'English', host: 'Isla Fenwick', start: next(1, 17), hours: 1, taken: 20 },
]
