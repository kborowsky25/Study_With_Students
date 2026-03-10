import client from './client'

export const getStudyRooms    = ()      => client.get('/study-rooms')
export const createStudyRoom  = (data)  => client.post('/study-rooms', data)
export const saveToCalendar   = (id)    => client.post(`/study-rooms/${id}/calendar`)
