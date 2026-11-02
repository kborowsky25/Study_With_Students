import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { login as apiLogin } from '../api/auth'
import { useAuth } from '../context/AuthContext'

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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', fontFamily: '"Noto Sans JP", sans-serif' }}>

      {/* Left — illustration */}
      <div className="animate-slide-in-left" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4vw' }}>
        <img
          src="/static/images/login/login.svg"
          alt="Study With Students"
          style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          className="animate-float"
        />
      </div>

      {/* Right — form */}
      <div className="animate-slide-in-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4vw' }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '3vh' }}>
          <span style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text)' }}>
            Study<span style={{ color: '#ff725e' }}>WithStudents</span>
          </span>
        </Link>

        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            LOG IN
          </h1>
          <p style={{ color: '#b0bec5', marginBottom: '32px', fontSize: '15px' }}>
            One day or day one?
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Email"
              className="input-field"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="input-field"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ padding: '14px', fontSize: '16px', marginTop: '4px', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p style={{ color: '#b0bec5', fontSize: '14px', marginTop: '24px', textAlign: 'center' }}>
            Don&apos;t have an account yet?{' '}
            <Link to="/signup" style={{ color: '#ff725e', fontWeight: '600', textDecoration: 'none' }}>
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
