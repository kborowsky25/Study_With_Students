import client from './client'

export const login    = (email, password) => client.post('/auth/login',    { email, password })
export const register = (name, email, password) => client.post('/auth/register', { name, email, password })
export const getMe    = () => client.get('/auth/me')
