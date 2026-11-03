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

  // Form beside one illustration; the illustration hides on small screens
  return (
    <MarketingPage title="Log in" footer={false}>
      <section className="mk-auth">
        <div className="mk-container mk-auth-grid">
          <div className="mk-auth-panel mk-reveal">
            <h1 className="mk-auth-title">Log in</h1>
            <p className="mk-lead">One day or day one?</p>

            <form onSubmit={handleSubmit} className="mk-form">
              <label className="mk-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mk-input"
                />
              </label>
              <label className="mk-field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="mk-input"
                />
              </label>
              <button type="submit" disabled={loading} className="mk-btn mk-btn-primary mk-btn-block">
                {loading ? 'Signing in…' : 'Log in'}
              </button>
            </form>

            <p className="mk-auth-alt">
              Don&apos;t have an account yet?<Link to="/signup">Sign up</Link>
            </p>
          </div>

          <div className="mk-panel mk-auth-art mk-reveal" style={{ '--i': 2 }}><Art name="login" backdrop={false} /></div>
        </div>
      </section>
    </MarketingPage>
  )
}
