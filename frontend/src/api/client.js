import axios from 'axios'
import toast from 'react-hot-toast'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach the JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sws_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Told when the server rejects the saved session: AuthContext clears its state and the
// router re-runs its guards, so pages that need a login go to /login and public pages stay.
const sessionExpiredListeners = new Set()
export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    if (status === 401 && err.config?.url !== '/auth/login' && localStorage.getItem('sws_token')) {
      // An admin suspended the account: say so, once, as it signs out
      if (err.response?.data?.code === 'suspended') toast.error(err.response.data.error, { id: 'suspended', duration: 8000 })
      localStorage.removeItem('sws_token')
      localStorage.removeItem('sws_user')
      sessionExpiredListeners.forEach((listener) => listener())
    } else if (status === 429) {
      // Rate limited (login, sign-up codes, messages, forum posts) — one toast however many requests hit it
      toast.error(err.response?.data?.error || 'Too many attempts — please wait a moment and try again', { id: 'rate-limited' })
    }
    return Promise.reject(err)
  },
)

/** Best human-readable message for a failed request. */
export const errorMessage = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.error || err?.response?.data?.message || fallback

export default client
