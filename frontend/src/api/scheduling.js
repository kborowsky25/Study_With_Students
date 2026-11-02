import client from './client'

// Weekly hours and days off of the signed-in tutor
export const getAvailability  = ()     => client.get('/availability')
export const saveAvailability = (data) => client.put('/availability', data)
export const addDaysOff       = (data) => client.post('/availability/blocked', data)
export const removeDaysOff    = (id)   => client.delete(`/availability/blocked/${id}`)

// Booking: open start times (`minutes`, `weeks`, and `event` when moving a session)
export const getBookingInfo = (tutorId)         => client.get(`/tutors/${tutorId}/booking-info`)
export const getSlots       = (tutorId, params) => client.get(`/tutors/${tutorId}/slots`, { params })

// Changing a session. `scope: 'series'` cancels this week and the later ones.
export const cancelSession     = (id, scope = 'one') => client.put(`/events/${id}/status`, { status: 'canceled', scope })
export const proposeTime       = (id, startTime)     => client.post(`/events/${id}/reschedule`, { start_time: startTime })
export const acceptTime        = (id)                => client.post(`/events/${id}/reschedule/accept`)
export const dropTime          = (id)                => client.delete(`/events/${id}/reschedule`)
export const askToCancel       = (id)                => client.post(`/events/${id}/cancel-request`)
export const dropCancelRequest = (id)                => client.delete(`/events/${id}/cancel-request`)
export const agreeToCancel     = (id)                => client.post(`/events/${id}/cancel-request/accept`)

// Calendar files need the JWT, so they're fetched and saved as a blob rather than linked
async function saveCalendarFile(url, filename) {
  const { data } = await client.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(data)
  const link = Object.assign(document.createElement('a'), { href, download: filename })
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

export const downloadSessionIcs = (id)       => saveCalendarFile(`/events/${id}/ics`, `session-${id}.ics`)
export const downloadSeriesIcs  = (seriesId) => saveCalendarFile(`/series/${seriesId}/ics`, `sessions-${seriesId}.ics`)
