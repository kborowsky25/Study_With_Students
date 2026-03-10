import client from './client'

export const getEvents     = ()                         => client.get('/events')
export const createEvent   = (data)                     => client.post('/events', data)
export const updateStatus  = (id, status)               => client.put(`/events/${id}/status`, { status })
