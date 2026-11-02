import client from './client'

export const getPayments    = (params)        => client.get('/payments', { params })
export const createCheckout = (eventId)       => client.post(`/payments/checkout/${eventId}`)
export const verifyPayment  = (eventId, sessionId) => client.post(`/payments/verify/${eventId}`, { session_id: sessionId })
