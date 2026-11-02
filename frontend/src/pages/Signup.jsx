import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { register as apiRegister, sendVerification } from '../api/auth'
import { useAuth } from '../context/AuthContext'

const CORAL = '#ff725e'
const GREEN = '#34d399'

// ── 6-box OTP input ───────────────────────────────────────────────────────────
function OTPInput({ value = '', onChange, disabled }) {
  const [digits, setDigits] = useState(Array(6).fill(''))
  const refs = useRef([])

  // Reflect a code set from outside (e.g. the dev-mode autofill)
  useEffect(() => {
    if (value !== digits.join('')) setDigits([...value.slice(0, 6).split(''), ...Array(6).fill('')].slice(0, 6))
  }, [value])

  function handleChange(idx, raw) {
    // Accept only digits; handle paste of full code in one box
    const cleaned = raw.replace(/\D/g, '')
    if (cleaned.length > 1) {
      // Pasted multi-char string — spread across boxes
      const d = [...cleaned.slice(0, 6).split(''), ...Array(6).fill('')].slice(0, 6)
      setDigits(d)
      onChange(d.join(''))
      refs.current[Math.min(cleaned.length, 5)]?.focus()
      return
    }
    const d = [...digits]
    d[idx] = cleaned
    setDigits(d)
    onChange(d.join(''))
    if (cleaned && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const d = [...digits]; d[idx] = ''; setDigits(d); onChange(d.join(''))
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft'  && idx > 0) refs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const d = [...pasted.split(''), ...Array(6).fill('')].slice(0, 6)
    setDigits(d)
    onChange(d.join(''))
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={el => refs.current[idx] = el}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(idx, e.target.value)}
          onKeyDown={e => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          style={{
            width: '50px', height: '60px',
            textAlign: 'center',
            fontSize: '26px', fontWeight: '900',
            borderRadius: '14px',
            border: `2px solid ${d ? CORAL : 'rgb(var(--fg) / 0.14)'}`,
            background: d ? `${CORAL}12` : 'rgb(var(--fg) / 0.04)',
            color: d ? CORAL : 'rgb(var(--fg) / 0.5)',
            outline: 'none',
            transition: 'all 0.15s',
            caretColor: CORAL,
            opacity: disabled ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Signup() {
  const [step,    setStep]    = useState('form')   // 'form' | 'verify'
  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' })
  const [otp,     setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const navigate = useNavigate()
  const { login } = useAuth()

  // Countdown timer for resend button
  useEffect(() => {
    if (step !== 'verify') return
    setResendIn(30)
    const interval = setInterval(() => {
      setResendIn(s => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  // Step 1: validate + send OTP
  async function handleSendCode(e) {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 8)       { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const { data } = await sendVerification(form.email)
      setStep('verify')
      if (data.dev_code) {
        // Local development without SMTP: the API hands the code back directly
        setOtp(data.dev_code)
        toast.success(`Dev mode — code ${data.dev_code} filled in for you`, { duration: 6000 })
      } else {
        toast.success('Verification code sent! Check your email.')
      }
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Could not send code')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: verify OTP + register
  async function handleVerify(e) {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('Enter the full 6-digit code'); return }
    setLoading(true)
    try {
      const { data } = await apiRegister(form.name, form.email, form.password, otp)
      login(data.access_token, data.user)
      toast.success(`Welcome aboard, ${form.name.split(' ')[0]}! 🚀`)
      navigate({ to: '/hub/student' })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0) return
    setLoading(true)
    try {
      const { data } = await sendVerification(form.email)
      if (data.dev_code) setOtp(data.dev_code)
      setResendIn(30)
      toast.success('New code sent!')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Could not resend code')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared layout ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', fontFamily: '"Noto Sans JP", sans-serif' }}>

      {/* Left — form */}
      <div className="animate-slide-in-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4vw' }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '3vh' }}>
          <span style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text)' }}>
            Study<span style={{ color: CORAL }}>WithStudents</span>
          </span>
        </Link>

        <div style={{ width: '100%', maxWidth: '420px' }}>

          {step === 'form' ? (
            /* ── STEP 1: Registration form ──────────────────────────────── */
            <>
              <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                SIGN UP
              </h1>
              <p style={{ color: '#b0bec5', marginBottom: '28px', fontSize: '15px' }}>
                Free forever · 0% commission
              </p>

              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  minLength={8}
                  placeholder="Password (min 8 characters)"
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
                  style={{ padding: '14px', fontSize: '16px', marginTop: '4px', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loading
                    ? 'Sending code…'
                    : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>Send verification code</>
                  }
                </button>
              </form>

              <p style={{ color: '#b0bec5', fontSize: '14px', marginTop: '24px', textAlign: 'center' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: CORAL, fontWeight: '600', textDecoration: 'none' }}>Sign in</Link>
              </p>
            </>
          ) : (
            /* ── STEP 2: OTP verification ───────────────────────────────── */
            <>
              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff', fontVariationSettings: '"FILL" 1' }}>check</span>
                  </div>
                  <span style={{ fontSize: '12px', color: GREEN, fontWeight: '600' }}>Details</span>
                </div>
                <div style={{ flex: 1, height: '2px', background: `${CORAL}40`, borderRadius: '1px' }}>
                  <div style={{ width: '100%', height: '100%', background: CORAL, borderRadius: '1px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: CORAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: '800' }}>2</span>
                  </div>
                  <span style={{ fontSize: '12px', color: CORAL, fontWeight: '600' }}>Verify email</span>
                </div>
              </div>

              <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                Check your inbox
              </h1>
              <p style={{ color: '#b0bec5', marginBottom: '6px', fontSize: '14px', lineHeight: 1.6 }}>
                We sent a 6-digit code to
              </p>
              <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '15px', marginBottom: '32px' }}>
                {form.email}
              </p>

              <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <OTPInput value={otp} onChange={setOtp} disabled={loading} />

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="btn-primary"
                  style={{
                    padding: '14px', fontSize: '16px',
                    opacity: (loading || otp.length < 6) ? 0.55 : 1,
                    cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {loading
                    ? 'Creating account…'
                    : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>verified</span>Verify & Create Account</>
                  }
                </button>
              </form>

              {/* Resend + back */}
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={handleResend}
                  disabled={resendIn > 0 || loading}
                  style={{
                    background: 'none', border: 'none', cursor: resendIn > 0 ? 'default' : 'pointer',
                    color: resendIn > 0 ? '#b0bec5' : CORAL,
                    fontSize: '14px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
                <button
                  onClick={() => setStep('form')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0bec5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_back</span>
                  Change email address
                </button>
              </div>

              {/* Dev hint */}
              <div style={{ marginTop: '20px', padding: '10px 14px', borderRadius: '10px', background: 'rgb(var(--fg) / 0.04)', border: '1px solid rgb(var(--fg) / 0.08)' }}>
                <p style={{ fontSize: '11px', color: '#b0bec5', margin: 0, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: '700', color: 'rgb(var(--fg) / 0.4)' }}>No email?</span>{' '}
                  Check your spam folder. In development, the code is printed to the Flask terminal.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right — illustration */}
      <div className="animate-slide-in-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4vw' }}>
        <img
          src="/static/images/signup/signup.svg"
          alt="Join Study With Students"
          style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          className="animate-float-2"
        />
      </div>

    </div>
  )
}
