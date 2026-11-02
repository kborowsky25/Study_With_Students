import client from './client'

// Lesson notes (one per session) and progress by exam-spec topic.
// Students are addressed by their user id.
export const getTopicCatalogue  = ()               => client.get('/progress/topics')
export const getLessonNoteIndex = ()               => client.get('/lesson-notes')
export const getLessonNote      = (eventId)        => client.get(`/events/${eventId}/lesson-notes`)
export const createLessonNote   = (eventId, data)  => client.post(`/events/${eventId}/lesson-notes`, data)
export const updateLessonNote   = (eventId, data)  => client.put(`/events/${eventId}/lesson-notes`, data)
export const getStudentNotes    = (userId, params) => client.get(`/students/${userId}/lesson-notes`, { params })
export const getStudentProgress = (userId)         => client.get(`/students/${userId}/progress`)
export const setHomeworkDone    = (id, done)       => client.patch(`/homework/${id}`, { done })
