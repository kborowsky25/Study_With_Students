import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { login as apiLogin } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import Art from '../components/marketing/Art'
import { MarketingPage } from '../components/marketing'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login }  = useAuth()
  const navigate   = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await apiLogin(email, password)
      login(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate({ to: '/hub' })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MarketingPage title="Log in" footer={false}>
      <section className="mk-auth">
        <div className="mk-container mk-auth-grid">
          <div className="mk-auth-art"><Art name="login" /></div>

          <div className="mk-auth-panel">
            <h1 className="mk-auth-title">Log in</h1>
            <p className="mk-sub">One day or day one?</p>

            <form onSubmit={handleSubmit} className="mk-form">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Email"
                aria-label="Email"
                autoComplete="email"
                className="mk-input"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                className="mk-input"
              />
              <button type="submit" disabled={loading} className="mk-btn mk-btn-coral mk-btn-block">
                {loading ? 'Signing in…' : 'Log in'}
              </button>
            </form>

            <p className="mk-auth-alt">
              Don&apos;t have an account yet? <Link to="/signup">Sign up here</Link>
            </p>
          </div>
        </div>
      </section>
    </MarketingPage>
  )
}
