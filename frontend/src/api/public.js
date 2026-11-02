import client from './client'

// Public tutor pages — no login needed (server/routes/public.py)
export const getPublicTutors   = (params) => client.get('/public/tutors', { params })
export const getPublicTutor    = (id)     => client.get(`/public/tutors/${id}`)
export const getPublicSubjects = ()       => client.get('/public/subjects')
