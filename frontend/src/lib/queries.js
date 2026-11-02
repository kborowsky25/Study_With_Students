// Query keys + fetchers shared by pages, and what to prefetch when a nav link is hovered.
import { getEvents } from '../api/events'
import { getConversations, getMessages, getUnreadCount } from '../api/messages'
import {
  getActiveStudents, getActiveTutors, getTutorProfile, getTutorRequestsRec, getTutorRequestsSent,
} from '../api/tutors'
import { getStudyRooms } from '../api/studyrooms'
import { getCategories, getRecentThreads } from '../api/forum'
import { prefetchQuery } from './query'

export const Q = {
  events:           ['events', getEvents],
  conversations:    ['conversations', getConversations],
  unread:           ['messages:unread', getUnreadCount],
  thread:           (userId) => [`thread:${userId}`, () => getMessages(userId)],
  activeTutors:     ['tutors:active', getActiveTutors],
  sentRequests:     ['requests:sent', getTutorRequestsSent],
  receivedRequests: ['requests:received', getTutorRequestsRec],
  activeStudents:   ['students:active', getActiveStudents],
  tutorProfile:     ['tutor:profile', getTutorProfile],
  studyRooms:       ['rooms', getStudyRooms],
  forumCategories:  ['forum:categories', getCategories],
  recentThreads:    ['forum:recent', () => getRecentThreads(5)],
}

const ROUTES = {
  '/hub/student':      [Q.events, Q.conversations, Q.activeTutors, Q.sentRequests],
  '/hub/tutor':        [Q.events, Q.activeStudents, Q.conversations, Q.studyRooms, Q.receivedRequests, Q.tutorProfile],
  '/messages':         [Q.conversations],
  '/calendar/student': [Q.events],
  '/calendar/tutor':   [Q.events],
}

// Explorer-only routes are prefetched only for members (avoids 402s for free users)
const EXPLORER_ROUTES = {
  '/forum': [Q.forumCategories],
}

export function prefetchRoute(to, { explorer = false } = {}) {
  const queries = ROUTES[to] ?? (explorer ? EXPLORER_ROUTES[to] : null) ?? []
  queries.forEach(([key, fetcher]) => prefetchQuery(key, fetcher))
}
