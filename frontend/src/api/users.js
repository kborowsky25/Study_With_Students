import client from './client'

export const searchUsers      = (q)       => client.get('/users/search', { params: { q } })
export const getUserProfile   = (userId)  => client.get(`/users/${userId}/profile`)
export const updateStudentBio = (data)    => client.put('/users/me/student-bio', data)
