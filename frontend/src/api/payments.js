import client from './client'

export const getPayments    = ()      => client.get('/payments')
export const setupPayment   = (data)  => client.post('/payments/setup', data)
