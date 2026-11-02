import client from './client'

export const login             = (email, password) => client.post('/auth/login', { email, password })
// `extra`: account_type ('student' or 'parent'), for students date_of_birth (YYYY-MM-DD),
// and referral_code when they arrived through an invite link
export const register          = (name, email, password, verificationCode, extra = {}) =>
  client.post('/auth/register', { name, email, password, verification_code: verificationCode, ...extra })
export const sendVerification  = (email) => client.post('/auth/send-verification', { email })
export const getMe             = () => client.get('/auth/me')
