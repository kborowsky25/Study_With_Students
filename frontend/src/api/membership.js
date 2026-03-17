import client from './client'

export const upgradeToExplorer      = ()           => client.post('/membership/upgrade')
export const getMembershipStatus    = ()           => client.get('/membership/status')
export const refreshAuthToken       = ()           => client.post('/auth/refresh')
export const createCheckoutSession  = ()           => client.post('/membership/checkout-session')
export const confirmCheckoutSession = (session_id) => client.get('/membership/checkout-success', { params: { session_id } })
