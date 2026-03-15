import client from './client'

export const getPayments     = (params) => client.get('/payments', { params })
export const setupPayment    = (data)   => client.post('/payments/setup', data)
export const createCheckout  = (id)     => client.post(`/payments/checkout/${id}`)
export const verifyPayment   = (id)     => client.post(`/payments/verify/${id}`)
