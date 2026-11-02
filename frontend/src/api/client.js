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

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    if (status === 401) {
      // Session expired — clear it and send the user to log in
      localStorage.removeItem('sws_token')
      localStorage.removeItem('sws_user')
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login'
    } else if (status === 402 && err.response?.data?.code === 'explorer_required') {
      toast('That’s part of the Explorer plan — £5/month', { icon: '🚀', id: 'explorer-required' })
    }
    return Promise.reject(err)
  },
)

/** Best human-readable message for a failed request. */
export const errorMessage = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.error || err?.response?.data?.message || fallback

export default client
