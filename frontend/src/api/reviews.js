import client from './client'

export const reviewSession   = (eventId, data) => client.post(`/events/${eventId}/review`, data)
export const getTutorReviews = (tutorId)       => client.get(`/tutors/${tutorId}/reviews`)
