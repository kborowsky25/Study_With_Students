import client from './client'

// My invite code, credits, rewards and the people who joined with my link
export const getReferrals = () => client.get('/referrals')
// Who sent an invite link: their first name (no login needed)
export const lookupInvite = (code) => client.get('/referrals/lookup', { params: { code } })
