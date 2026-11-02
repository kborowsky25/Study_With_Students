import client from './client'

export const getTutors      = (params)  => client.get('/tutors', { params })
export const getTutor       = (id)      => client.get(`/tutors/${id}`)
export const likeTutor      = (id)      => client.post(`/tutors/${id}/like`)
export const getLikedTutors = ()        => client.get('/liked-tutors')
export const deactivateTutor= (id)      => client.delete(`/tutors/${id}/activate`)
export const getActiveTutors= ()        => client.get('/active-tutors')

export const getTutorProfile = ()       => client.get('/tutor-profile')
export const saveTutorProfile= (data)  => client.post('/tutor-profile', data)

export const getActiveStudents = ()     => client.get('/active-students')

// Tutor invite / request system
export const requestTutor           = (id)         => client.post(`/tutors/${id}/request`)
export const getTutorRequestsSent   = ()           => client.get('/tutor-requests/sent')
export const getTutorRequestsRec    = ()           => client.get('/tutor-requests/received')
export const respondTutorRequest    = (id, action) => client.patch(`/tutor-requests/${id}`, { action })
