// Query keys + fetchers shared by pages, and what to prefetch when a nav link is hovered.
import { getEvents } from '../api/events'
import { getConversations, getMessages, getUnreadCount } from '../api/messages'
import {
  getActiveStudents, getActiveTutors, getTutorProfile, getTutorRequestsRec, getTutorRequestsSent,
} from '../api/tutors'
import { getStudyRooms } from '../api/studyrooms'
import { getCategories, getRecentThreads } from '../api/forum'
import { getLearningProfile, getRecommendedTutors } from '../api/learning'
import { getTutorReviews } from '../api/reviews'
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
  learningProfile:  ['learning:profile', getLearningProfile],
  recommended:      ['tutors:recommended', () => getRecommendedTutors(5)],
  tutorReviews:     (tutorId) => [`reviews:${tutorId}`, () => getTutorReviews(tutorId)],
}

const ROUTES = {
  '/forum':            [Q.forumCategories],
  '/hub/student':      [Q.events, Q.conversations, Q.activeTutors, Q.sentRequests, Q.learningProfile, Q.recommended],
  '/hub/tutor':        [Q.events, Q.activeStudents, Q.conversations, Q.studyRooms, Q.receivedRequests, Q.tutorProfile],
  '/messages':         [Q.conversations],
  '/calendar/student': [Q.events],
  '/calendar/tutor':   [Q.events],
}


export function prefetchRoute(to) {
  ;(ROUTES[to] ?? []).forEach(([key, fetcher]) => prefetchQuery(key, fetcher))
}
