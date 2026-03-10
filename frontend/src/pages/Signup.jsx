import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { register as apiRegister } from '../api/auth'

export default function Signup() {
  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await apiRegister(form.name, form.email, form.password)
      toast.success('Account created! Please log in.')
      navigate({ to: '/login' })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1b263b', display: 'flex', fontFamily: '"Noto Sans JP", sans-serif' }}>

      {/* Left — form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4vw' }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '3vh' }}>
          <span style={{ fontSize: '22px', fontWeight: '900', color: 'white' }}>
            Study<span style={{ color: '#ff725e' }}>WithStudents</span>
          </span>
        </Link>

        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'white', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            SIGN UP
          </h1>
          <p style={{ color: '#b0bec5', marginBottom: '28px', fontSize: '15px' }}>
            Free forever · 0% commission
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="text"
              value={form.name}
              onChange={update('name')}
              required
              placeholder="Full name"
              className="input-field"
            />
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              required
              placeholder="Email"
              className="input-field"
            />
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
              placeholder="Password (min 6 characters)"
              className="input-field"
            />
            <input
              type="password"
              value={form.confirm}
              onChange={update('confirm')}
              required
              placeholder="Confirm password"
              className="input-field"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ padding: '14px', fontSize: '16px', marginTop: '4px', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p style={{ color: '#b0bec5', fontSize: '14px', marginTop: '24px', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#ff725e', fontWeight: '600', textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right — illustration */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4vw' }}>
        <img
          src="/static/images/signup/signup.svg"
          alt="Join Study With Students"
          style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
        />
      </div>

    </div>
  )
}
