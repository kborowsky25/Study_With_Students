import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import client from '../api/client'
import { clearQueries } from '../lib/query'

const AuthContext = createContext(null)

const TOKEN_KEY = 'sws_token'
const USER_KEY  = 'sws_user'

function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(getStoredToken)
  const [user,  setUser]    = useState(getStoredUser)

  const login = useCallback((accessToken, userData) => {
    if (userData?.id !== getStoredUser()?.id) clearQueries()
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(USER_KEY,  JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    clearQueries()
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((partial) => {
    setUser(prev => {
      const updated = { ...prev, ...partial }
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Exchange the stored JWT for fresh claims (plan, tutor approval) — on load and on demand.
  const refreshSession = useCallback(async () => {
    const { data } = await client.post('/auth/refresh')
    login(data.access_token, data.user)
    return data.user
  }, [login])

  useEffect(() => {
    if (getStoredToken()) refreshSession().catch(() => {})
  }, [refreshSession])

  const isAuthenticated = Boolean(token)
  const isTutor    = Boolean(user?.is_tutor)
  const isPremium  = Boolean(user?.is_premium)

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, isTutor, isPremium, login, logout, updateUser, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
