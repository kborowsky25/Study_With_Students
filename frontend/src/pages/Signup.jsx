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
    <div className="min-h-screen bg-navy-500 flex items-center justify-center px-4 py-12">
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-coral-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <Link to="/" className="flex justify-center mb-8">
          <span className="text-2xl font-black">
            Study<span className="text-coral-400">WithStudents</span>
          </span>
        </Link>

        <div className="glass p-8">
          <h1 className="text-2xl font-black text-white mb-1">Create your account</h1>
          <p className="text-white/50 mb-8">Free forever · 0% commission</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                required
                placeholder="Jane Smith"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                required
                placeholder="you@university.ac.uk"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={update('confirm')}
                required
                placeholder="••••••••"
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-coral-400 hover:text-coral-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
