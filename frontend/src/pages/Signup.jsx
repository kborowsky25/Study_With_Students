import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { register as apiRegister, sendVerification } from '../api/auth'
import { lookupInvite } from '../api/referrals'
import { useAuth } from '../context/AuthContext'
import { currentInvite, forgetInvite } from '../lib/invite'
import { Icon } from '../components/ui'
import Art from '../components/marketing/Art'
import { MarketingPage } from '../components/marketing'
import { toDateInput } from '../lib/dates'

// Students give their date of birth (under-18s link a parent before booking); parents don't.
const ACCOUNTS = [['student', 'Student'], ['parent', 'Parent or guardian']]

// ── 6-box OTP input ───────────────────────────────────────────────────────────
function OTPInput({ value = '', onChange, disabled }) {
  const [digits, setDigits] = useState(Array(6).fill(''))
  const refs = useRef([])

  // Reflect a code set from outside (e.g. the dev-mode autofill)
  useEffect(() => {
    setDigits((current) => (value === current.join('')
      ? current
      : [...value.slice(0, 6).split(''), ...Array(6).fill('')].slice(0, 6)))
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
    <div className="mk-otp">
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
          aria-label={`Digit ${idx + 1}`}
          className={`mk-otp-box${d ? ' is-filled' : ''}`}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Signup() {
  const search = useSearch({ strict: false })
  const [step,    setStep]    = useState('form')   // 'form' | 'verify'
  const [account, setAccount] = useState(search.as === 'parent' ? 'parent' : 'student')
  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '', born: '' })
  const [otp,     setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [invite, setInvite] = useState(currentInvite)  // code from an invite link, kept while they browse
  const [inviter, setInviter] = useState(null)
  const navigate = useNavigate()
  const { login } = useAuth()

  // Who sent the invite link, for the line under the title
  useEffect(() => {
    if (!invite) return
    let live = true
    lookupInvite(invite)
      .then(({ data }) => live && setInviter(data.first_name))
      .catch((err) => {
        if (err.response?.status !== 404) return
        forgetInvite()
        if (live) setInvite(null)
      })
    return () => { live = false }
  }, [invite])

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
      const extra = account === 'parent' ? { account_type: 'parent' } : { account_type: 'student', date_of_birth: form.born }
      const { data } = await apiRegister(form.name, form.email, form.password, otp, { ...extra, referral_code: invite })
      forgetInvite()
      login(data.access_token, data.user)
      const first = form.name.split(' ')[0]
      toast.success(data.invited_by ? `Welcome aboard, ${first}! Your first booking fee is on us.` : `Welcome aboard, ${first}!`)
      navigate({ to: account === 'parent' ? '/hub/parent' : '/hub/student' })
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

  // ── Layout: form left, illustration right (as on the original sign-up page) ──
  return (
    <MarketingPage title="Sign up" footer={false}>
      <section className="mk-auth">
        <div className="mk-container mk-auth-grid">
          <div className="mk-auth-panel">
            {step === 'form' ? (
              /* ── Step 1: registration form ── */
              <>
                <h1 className="mk-auth-title">Create an account</h1>
                <p className="mk-sub">
                  {account === 'parent'
                    ? 'Follow your child’s sessions, progress and payments in one place.'
                    : 'We’re so excited for you to join and kickstart your journey!'}
                </p>
                {inviter && (
                  <p className="mk-invite"><Icon name="redeem" />{inviter} invited you — your first booking fee is on us</p>
                )}

                <form onSubmit={handleSendCode} className="mk-form">
                  <div className="mk-account" role="radiogroup" aria-label="Account type">
                    {ACCOUNTS.map(([key, label]) => (
                      <button key={key} type="button" role="radio" aria-checked={account === key}
                        className={account === key ? 'is-on' : ''} onClick={() => setAccount(key)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={form.name}
                    onChange={update('name')}
                    required
                    placeholder="Full name"
                    aria-label="Full name"
                    autoComplete="name"
                    className="mk-input"
                  />
                  <input
                    type="email"
                    value={form.email}
                    onChange={update('email')}
                    required
                    placeholder="Email"
                    aria-label="Email"
                    autoComplete="email"
                    className="mk-input"
                  />
                  {account === 'student' && (
                    <label className="mk-field">
                      <span>Date of birth</span>
                      <input
                        type="date"
                        value={form.born}
                        onChange={update('born')}
                        required
                        max={toDateInput(new Date())}
                        autoComplete="bday"
                        className="mk-input"
                      />
                    </label>
                  )}
                  <input
                    type="password"
                    value={form.password}
                    onChange={update('password')}
                    required
                    minLength={8}
                    placeholder="Password (at least 8 characters)"
                    aria-label="Password"
                    autoComplete="new-password"
                    className="mk-input"
                  />
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={update('confirm')}
                    required
                    placeholder="Confirm password"
                    aria-label="Confirm password"
                    autoComplete="new-password"
                    className="mk-input"
                  />
                  {account === 'parent' && (
                    <label className="mk-agree">
                      <input type="checkbox" required />
                      <span>I’m a parent or legal guardian, aged 18 or over</span>
                    </label>
                  )}
                  <button type="submit" disabled={loading} className="mk-btn mk-btn-coral mk-btn-block">
                    {loading ? 'Sending code…' : 'Start journey'}
                  </button>
                </form>

                <p className="mk-auth-alt">
                  Have an account already? <Link to="/login">Log in here</Link>
                </p>
              </>
            ) : (
              /* ── Step 2: email code ── */
              <>
                <h1 className="mk-auth-title">Check your inbox</h1>
                <p className="mk-sub">We sent a 6-digit code to <b>{form.email}</b></p>

                <form onSubmit={handleVerify} className="mk-form">
                  <OTPInput value={otp} onChange={setOtp} disabled={loading} />
                  <button type="submit" disabled={loading || otp.length < 6} className="mk-btn mk-btn-coral mk-btn-block">
                    {loading ? 'Creating account…' : 'Verify and create account'}
                  </button>
                </form>

                <div className="mk-auth-links">
                  <button type="button" className="mk-text-btn" onClick={handleResend} disabled={resendIn > 0 || loading}>
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                  </button>
                  <button type="button" className="mk-text-btn" onClick={() => setStep('form')}>
                    Change email address
                  </button>
                </div>
                <p className="mk-auth-note">No email? Check your spam folder.</p>
              </>
            )}
          </div>

          <div className="mk-auth-art"><Art name="signup" /></div>
        </div>
      </section>
    </MarketingPage>
  )
}
