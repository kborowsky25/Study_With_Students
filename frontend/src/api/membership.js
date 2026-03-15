import client from './client'

export const upgradeToExplorer   = ()  => client.post('/membership/upgrade')
export const getMembershipStatus  = ()  => client.get('/membership/status')
export const refreshAuthToken     = ()  => client.post('/auth/refresh')
