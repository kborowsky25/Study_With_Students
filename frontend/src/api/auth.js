import client from './client'

export const login             = (email, password) => client.post('/auth/login', { email, password })
export const register          = (name, email, password, verificationCode, referralCode) =>
  client.post('/auth/register', { name, email, password, verification_code: verificationCode, referral_code: referralCode })
export const sendVerification  = (email) => client.post('/auth/send-verification', { email })
export const getMe             = () => client.get('/auth/me')
