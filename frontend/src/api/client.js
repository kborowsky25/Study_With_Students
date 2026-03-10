import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT before every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sws_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global error handling
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired — clear storage and redirect
      localStorage.removeItem('sws_token')
      localStorage.removeItem('sws_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default client
