import client from './client'

export const getPlan                = ()           => client.get('/membership/plan')
export const getMembershipStatus    = ()           => client.get('/membership/status')
export const createCheckoutSession  = ()           => client.post('/membership/checkout-session')
export const confirmCheckoutSession = (session_id) => client.get('/membership/checkout-success', { params: { session_id } })
export const activateDemoMembership = ()           => client.post('/membership/demo-activate')
export const cancelMembership       = ()           => client.post('/membership/cancel')
export const refreshAuthToken       = ()           => client.post('/auth/refresh')
