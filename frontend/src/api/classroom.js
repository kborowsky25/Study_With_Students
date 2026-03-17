import client from './client'

export const getClassrooms         = ()         => client.get('/classrooms')
export const getMyClassrooms       = ()         => client.get('/classrooms/mine')
export const createClassroom       = (data)     => client.post('/classrooms', data)
export const payAndEnroll          = (id, data) => client.post(`/classrooms/${id}/pay`, data)
export const unenrollClassroom     = (id)       => client.delete(`/classrooms/${id}/enroll`)
export const getClassroomStudents  = (id)       => client.get(`/classrooms/${id}/students`)
