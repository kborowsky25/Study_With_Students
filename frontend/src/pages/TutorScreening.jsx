import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { sendUniCode, verifyUniEmail, uploadProof, getScreeningStatus } from '../api/screening'

const CORAL  = '#ff725e'
const TEAL   = '#2dd4bf'

// ── OTP boxes (same as Signup.jsx) ───────────────────────────────────────────
function OTPInput({ onChange, disabled }) {
  const [digits, setDigits] = useState(Array(6).fill(''))
  const refs = useRef([])

  function handleChange(idx, raw) {
    const cleaned = raw.replace(/\D/g, '')
    if (cleaned.length > 1) {
      const d = [...cleaned.slice(0, 6).split(''), ...Array(6).fill('')].slice(0, 6)
      setDigits(d); onChange(d.join(''))
      refs.current[Math.min(cleaned.length, 5)]?.focus(); return
    }
    const d = [...digits]; d[idx] = cleaned; setDigits(d); onChange(d.join(''))
    if (cleaned && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace') {
      if (digits[idx]) { const d=[...digits]; d[idx]=''; setDigits(d); onChange(d.join('')) }
      else if (idx > 0) refs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft'  && idx > 0) refs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return; e.preventDefault()
    const d = [...pasted.split(''), ...Array(6).fill('')].slice(0, 6)
    setDigits(d); onChange(d.join(''))
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={el => refs.current[idx] = el}
          type="text" inputMode="numeric" maxLength={6} value={d}
          disabled={disabled}
          onChange={e => handleChange(idx, e.target.value)}
          onKeyDown={e => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          style={{
            width: '46px', height: '56px', textAlign: 'center',
            fontSize: '24px', fontWeight: '900', borderRadius: '12px',
            border: `2px solid ${d ? TEAL : 'rgb(var(--fg) / 0.14)'}`,
            background: d ? `${TEAL}14` : 'rgb(var(--fg) / 0.04)',
            color: d ? TEAL : 'rgb(var(--fg) / 0.5)', outline: 'none',
            transition: 'all 0.15s', caretColor: TEAL,
            opacity: disabled ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Verify Uni Email', 'Upload Proof', 'Submitted']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '36px' }}>
      {steps.map((label, i) => {
        const done    = i < current
        const active  = i === current
        const color   = done ? TEAL : active ? CORAL : 'rgb(var(--fg) / 0.20)'
        const bgColor = done ? TEAL : active ? CORAL : 'rgb(var(--fg) / 0.08)'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${color}`,
                transition: 'all 0.25s',
              }}>
                {done
                  ? <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff', fontVariationSettings: '"FILL" 1' }}>check</span>
                  : <span style={{ fontSize: '12px', fontWeight: '800', color: active ? 'white' : 'rgb(var(--fg) / 0.35)' }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: '10px', fontWeight: '600', color, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 6px', marginBottom: '20px',
                background: done ? TEAL : 'rgb(var(--fg) / 0.10)',
                transition: 'background 0.25s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TutorScreening() {
  const { user, updateUser } = useAuth()
  const navigate             = useNavigate()

  const [step,         setStep]         = useState(0)  // 0=email, 1=upload, 2=pending
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState(false)

  // Step 0 — uni email
  const [uniEmail,   setUniEmail]   = useState('')
  const [codeSent,   setCodeSent]   = useState(false)
  const [otp,        setOtp]        = useState('')
  const [resendIn,   setResendIn]   = useState(0)

  // Step 1 — file upload
  const [file,       setFile]       = useState(null)
  const [dragOver,   setDragOver]   = useState(false)
  const fileRef                     = useRef()

  // Step 2 — rejection notes
  const [rejNotes,   setRejNotes]   = useState('')

  // Check current screening status on mount
  useEffect(() => {
    getScreeningStatus()
      .then(({ data }) => {
        const s = data.screening_status
        if (s === 'approved') {
          // Approved — sync localStorage so the guard passes, then redirect
          updateUser({ screening_status: 'approved' })
          navigate({ to: '/hub/tutor' })
        } else if (s === 'pending') {
          setStep(2)
        } else if (s === 'rejected') {
          setRejNotes(data.screening_notes ?? '')
          setStep(0) // Allow resubmit
        }
      })
      .catch(() => {}) // new tutor — no profile yet, stay at step 0
      .finally(() => setLoading(false))
  }, [])

  // Resend countdown
  useEffect(() => {
    if (!codeSent) return
    setResendIn(30)
    const t = setInterval(() => setResendIn(s => s <= 1 ? (clearInterval(t), 0) : s - 1), 1000)
    return () => clearInterval(t)
  }, [codeSent])

  // ── Step 0 handlers ─────────────────────────────────────────────────────────
  async function handleSendCode(e) {
    e.preventDefault()
    if (!uniEmail.trim()) return
    setSubmitting(true)
    try {
      const { data } = await sendUniCode(uniEmail.trim())
      setCodeSent(true)
      toast.success(data.dev_code
        ? `Dev mode — your code is ${data.dev_code}`
        : 'Verification code sent to your university email!', { duration: data.dev_code ? 8000 : 3500 })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Could not send code')
    } finally {
      setSubmitting(false) }
  }

  async function handleVerifyEmail(e) {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('Enter the 6-digit code'); return }
    setSubmitting(true)
    try {
      await verifyUniEmail(uniEmail.trim(), otp)
      toast.success('University email verified!')
      setStep(1)
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Verification failed')
    } finally {
      setSubmitting(false) }
  }

  async function handleResend() {
    if (resendIn > 0) return
    setSubmitting(true)
    try { await sendUniCode(uniEmail.trim()); setResendIn(30); toast.success('New code sent!') }
    catch (err) { toast.error(err.response?.data?.error ?? 'Could not resend') }
    finally { setSubmitting(false) }
  }

  // ── Step 1 handlers ─────────────────────────────────────────────────────────
  function handleFileDrop(e) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer?.files?.[0] ?? null
    if (f) validateAndSetFile(f)
  }

  function validateAndSetFile(f) {
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['png','jpg','jpeg','pdf'].includes(ext)) {
      toast.error('Please upload a PNG, JPG, or PDF'); return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10 MB'); return
    }
    setFile(f)
  }

  async function handleUploadSubmit(e) {
    e.preventDefault()
    if (!file) { toast.error('Please attach your proof of enrolment'); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('proof', file)
      await uploadProof(fd)
      updateUser({ screening_status: 'pending' })
      toast.success('Documents submitted! We\'ll review within 24 hours.')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Upload failed')
    } finally {
      setSubmitting(false) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: TEAL, animation: 'spin 1s linear infinite' }}>progress_activity</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', fontFamily: '"Noto Sans JP", sans-serif' }}>

      {/* Left — form panel */}
      <div className="animate-slide-in-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4vw' }}>

        <Link to="/" style={{ textDecoration: 'none', marginBottom: '32px' }}>
          <span style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text)' }}>
            Study<span style={{ color: CORAL }}>WithStudents</span>
          </span>
        </Link>

        <div style={{ width: '100%', maxWidth: '440px' }}>
          <Steps current={step} />

          {/* ── Step 0: Uni email ────────────────────────────────────────────── */}
          {step === 0 && (
            <>
              {rejNotes && (
                <div style={{
                  padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
                  background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)',
                }}>
                  <p style={{ fontSize: '12px', color: '#f87171', margin: 0, lineHeight: 1.5 }}>
                    <strong>Previous application rejected:</strong> {rejNotes || 'Please resubmit with valid documents.'}
                  </p>
                </div>
              )}

              <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.3px' }}>
                Verify your university email
              </h1>
              <p style={{ color: 'rgb(var(--fg) / 0.50)', fontSize: '14px', lineHeight: 1.65, marginBottom: '28px' }}>
                We need to confirm you're a current university student before you can start tutoring.
              </p>

              {!codeSent ? (
                <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgb(var(--fg) / 0.45)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      University email address
                    </label>
                    <input
                      type="email" required value={uniEmail}
                      onChange={e => setUniEmail(e.target.value)}
                      placeholder="you@university.ac.uk"
                      className="input-field"
                    />
                    <p style={{ fontSize: '11px', color: 'rgb(var(--fg) / 0.30)', marginTop: '5px', lineHeight: 1.4 }}>
                      Use your .ac.uk, .edu, or equivalent institutional email
                    </p>
                  </div>
                  <button
                    type="submit" disabled={submitting || !uniEmail.trim()}
                    className="btn-primary"
                    style={{ padding: '13px', fontSize: '15px', opacity: (submitting || !uniEmail.trim()) ? 0.55 : 1, cursor: (submitting || !uniEmail.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>send</span>
                    {submitting ? 'Sending…' : 'Send verification code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmail} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <p style={{ color: 'rgb(var(--fg) / 0.55)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                    Code sent to <strong style={{ color: 'var(--text)' }}>{uniEmail}</strong>
                  </p>
                  <OTPInput onChange={setOtp} disabled={submitting} />
                  <button
                    type="submit" disabled={submitting || otp.length < 6}
                    className="btn-primary"
                    style={{ padding: '13px', fontSize: '15px', opacity: (submitting || otp.length < 6) ? 0.55 : 1, cursor: (submitting || otp.length < 6) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>verified</span>
                    {submitting ? 'Verifying…' : 'Verify email'}
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                    <button
                      type="button" onClick={handleResend} disabled={resendIn > 0 || submitting}
                      style={{ background: 'none', border: 'none', cursor: resendIn > 0 ? 'default' : 'pointer', color: resendIn > 0 ? '#b0bec5' : TEAL, fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>
                      {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                    </button>
                    <button
                      type="button" onClick={() => { setCodeSent(false); setOtp('') }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--fg) / 0.35)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                      Change email
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ── Step 1: Upload proof ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.3px' }}>
                Upload proof of enrolment
              </h1>
              <p style={{ color: 'rgb(var(--fg) / 0.50)', fontSize: '14px', lineHeight: 1.65, marginBottom: '24px' }}>
                Please attach your current Certificate of Enrolment or Student ID card. Accepted: PNG, JPG, PDF (max 10 MB).
              </p>

              <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? TEAL : file ? TEAL : 'rgb(var(--fg) / 0.15)'}`,
                    borderRadius: '14px',
                    padding: '32px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragOver ? `${TEAL}0a` : file ? `${TEAL}08` : 'rgb(var(--fg) / 0.03)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    ref={fileRef} type="file" style={{ display: 'none' }}
                    accept=".png,.jpg,.jpeg,.pdf"
                    onChange={e => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f) }}
                  />
                  {file ? (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: TEAL, display: 'block', marginBottom: '8px', fontVariationSettings: '"FILL" 1' }}>
                        {file.name.endsWith('.pdf') ? 'picture_as_pdf' : 'image'}
                      </span>
                      <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{file.name}</p>
                      <p style={{ color: 'rgb(var(--fg) / 0.40)', fontSize: '12px' }}>{(file.size / 1024).toFixed(0)} KB · Click to replace</p>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'rgb(var(--fg) / 0.25)', display: 'block', marginBottom: '8px' }}>upload_file</span>
                      <p style={{ color: 'rgb(var(--fg) / 0.50)', fontSize: '14px', marginBottom: '4px' }}>Drop your file here or <span style={{ color: TEAL, fontWeight: '600' }}>browse</span></p>
                      <p style={{ color: 'rgb(var(--fg) / 0.25)', fontSize: '12px' }}>PNG, JPG, PDF · Max 10 MB</p>
                    </>
                  )}
                </div>

                <button
                  type="submit" disabled={submitting || !file}
                  style={{
                    padding: '13px', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
                    background: !file ? 'rgb(var(--fg) / 0.08)' : `linear-gradient(135deg, ${TEAL}, #0d9488)`,
                    border: 'none', color: !file ? 'rgb(var(--fg) / 0.25)' : 'white',
                    cursor: (submitting || !file) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: file ? `0 4px 14px rgba(45,212,191,0.30)` : 'none',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload</span>
                  {submitting ? 'Uploading…' : 'Submit for Review'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Pending / submitted ──────────────────────────────────── */}
          {step === 2 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 24px',
                background: 'rgba(251,191,36,0.12)', border: '2px solid rgba(251,191,36,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#fbbf24', fontVariationSettings: '"FILL" 1' }}>
                  pending
                </span>
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)', marginBottom: '10px' }}>
                Under Review
              </h1>
              <p style={{ color: 'rgb(var(--fg) / 0.50)', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px', maxWidth: '340px', margin: '0 auto 28px' }}>
                We've received your documents and will review your tutor application within <strong style={{ color: 'var(--text)' }}>24 hours</strong>. You'll receive an email once approved.
              </p>
              <div style={{
                padding: '14px 18px', borderRadius: '12px', marginBottom: '24px',
                background: 'rgb(var(--fg) / 0.04)', border: '1px solid rgb(var(--fg) / 0.08)',
                textAlign: 'left',
              }}>
                <p style={{ fontSize: '12px', color: 'rgb(var(--fg) / 0.45)', margin: 0, lineHeight: 1.6 }}>
                  While you wait, you can continue using the platform as a <strong style={{ color: 'var(--text)' }}>student</strong>. Your tutor hub will unlock automatically once approved.
                </p>
              </div>
              <Link
                to="/hub/student"
                className="btn-primary"
                style={{ fontSize: '14px', padding: '12px 28px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>school</span>
                Continue as Student
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right — illustration */}
      <div className="animate-slide-in-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4vw', gap: '24px' }}>
        <div style={{
          padding: '28px', borderRadius: '20px',
          background: 'rgb(var(--fg) / 0.04)', border: '1px solid rgb(var(--fg) / 0.07)',
          maxWidth: '340px', width: '100%',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '16px' }}>Why do we verify tutors?</h3>
          {[
            { icon: 'verified_user',  title: 'Trust & Safety',   body: 'Students deserve to learn from genuine, verified university peers.' },
            { icon: 'school',         title: 'Academic Credibility', body: 'Verified students have up-to-date knowledge in their courses.' },
            { icon: 'shield',         title: 'Platform Integrity',  body: 'Screening keeps the quality high for everyone on the platform.' },
          ].map(({ icon, title, body }) => (
            <div key={title} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: TEAL, fontVariationSettings: '"FILL" 1' }}>{icon}</span>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '2px' }}>{title}</p>
                <p style={{ fontSize: '12px', color: 'rgb(var(--fg) / 0.45)', lineHeight: 1.5 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: 'rgb(var(--fg) / 0.25)', textAlign: 'center', maxWidth: '280px', lineHeight: 1.6 }}>
          Your documents are reviewed privately and never shared. We only confirm current enrolment status.
        </p>
      </div>
    </div>
  )
}
