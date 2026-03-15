import client from './client'

export const login             = (email, password) => client.post('/auth/login', { email, password })
export const register          = (name, email, password, verificationCode) =>
  client.post('/auth/register', { name, email, password, verification_code: verificationCode })
export const sendVerification  = (email) => client.post('/auth/send-verification', { email })
export const getMe             = () => client.get('/auth/me')
