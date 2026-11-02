import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Card, EmptyState, Icon, SkeletonRows } from '../components/ui'
import { getScreeningStatus, sendUniCode, uploadProof, verifyUniEmail } from '../api/screening'
import { errorMessage } from '../api/client'

const STEPS = ['University email', 'Proof of enrolment', 'Review']
const PROOF_TYPES = ['png', 'jpg', 'jpeg', 'pdf']
const MAX_PROOF_MB = 10
const RESEND_AFTER_S = 30

const WHY = [
  ['verified_user', 'Students learn from real university students.'],
  ['school', 'Current students know today’s courses and exams.'],
  ['lock', 'Your document is only seen by our reviewers.'],
]

const fileSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

// ── One-time code: six boxes; typing, pasting and backspace move between them ──
function CodeInput({ onChange, disabled }) {
  const [digits, setDigits] = useState(() => Array(6).fill(''))
  const refs = useRef([])

  function update(next, focus) {
    setDigits(next)
    onChange(next.join(''))
    if (focus != null) refs.current[focus]?.focus()
  }

  function handleChange(idx, raw) {
    const cleaned = raw.replace(/\D/g, '')
    if (cleaned.length > 1) { // pasted or autofilled into one box
      const next = [...cleaned.slice(0, 6).split(''), ...Array(6).fill('')].slice(0, 6)
      update(next, Math.min(cleaned.length, 5))
      return
    }
    const next = [...digits]
    next[idx] = cleaned
    update(next, cleaned && idx < 5 ? idx + 1 : null)
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) refs.current[idx - 1]?.focus()
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    update([...pasted.split(''), ...Array(6).fill('')].slice(0, 6), Math.min(pasted.length, 5))
  }

  return (
    <div role="group" aria-label="Verification code" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 46px))', gap: 8 }}>
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el }}
          className="input"
          type="text"
          inputMode="numeric"
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          value={d}
          disabled={disabled}
          autoFocus={idx === 0}
          aria-label={`Digit ${idx + 1}`}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          style={{ height: 46, padding: 0, textAlign: 'center', fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
        />
      ))}
    </div>
  )
}

function Steps({ current }) {
  return (
    <ol style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, listStyle: 'none', padding: 0, flexWrap: 'wrap' }}>
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: active || done ? 'var(--text)' : 'var(--text-faint)', fontWeight: active ? 600 : 500 }}
            aria-current={active ? 'step' : undefined}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, flexShrink: 0,
              background: done || active ? 'var(--coral)' : 'rgb(var(--fg) / 0.12)', color: done || active ? '#fff' : 'var(--text-faint)',
            }}>
              {done ? <Icon name="check" size={13} /> : i + 1}
            </span>
            {label}
            {i < STEPS.length - 1 && <span aria-hidden="true" style={{ width: 18, height: 1, background: 'var(--border-strong)' }} />}
          </li>
        )
      })}
    </ol>
  )
}

export default function TutorScreening() {
  const { user, updateUser, refreshSession } = useAuth()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('loading') // loading | no-profile | ready
  const [step, setStep] = useState(0)           // 0 email, 1 upload, 2 in review
  const [rejected, setRejected] = useState(null) // { notes } after a rejection
  const [submitting, setSubmitting] = useState(false)

  const [uniEmail, setUniEmail] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useState(0)

  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    let live = true
    getScreeningStatus()
      .then(async ({ data }) => {
        if (!live) return
        const s = data.screening_status
        if (s === 'approved') {
          // Fresh claims so the route guards let the tutor hub through.
          await refreshSession().catch(() => updateUser({ screening_status: 'approved' }))
          navigate({ to: '/hub/tutor', replace: true })
          return
        }
        setUniEmail(data.uni_email ?? '')
        if (s === 'pending') setStep(2)
        else setStep(data.uni_email_verified ? 1 : 0) // a verified email doesn't need verifying again
        if (s === 'rejected') setRejected({ notes: data.screening_notes ?? '' })
        setPhase('ready')
      })
      .catch((err) => {
        if (!live) return
        if (err?.response?.status === 404) { setPhase('no-profile'); return }
        toast.error(errorMessage(err, 'Could not load your verification status'))
        setPhase('ready')
      })
    return () => { live = false }
  }, [navigate, refreshSession, updateUser])

  // "Resend in 30s" countdown
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  async function requestCode() {
    const email = uniEmail.trim()
    if (!email) return
    setSubmitting(true)
    try {
      const { data } = await sendUniCode(email)
      setCodeSent(true)
      setCode('')
      setResendIn(RESEND_AFTER_S)
      if (data.dev_code) toast.success(`Dev mode: your code is ${data.dev_code}`, { duration: 8000 })
      else toast.success(`Code sent to ${email}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the code'))
    } finally {
      setSubmitting(false)
    }
  }

  async function verify(e) {
    e.preventDefault()
    if (code.length !== 6) { toast.error('Enter the 6-digit code'); return }
    setSubmitting(true)
    try {
      await verifyUniEmail(uniEmail.trim(), code)
      toast.success('University email verified')
      setStep(1)
    } catch (err) {
      toast.error(errorMessage(err, 'That code didn’t work'))
    } finally {
      setSubmitting(false)
    }
  }

  function pickFile(f) {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!PROOF_TYPES.includes(ext)) { toast.error('Use a PNG, JPG or PDF'); return }
    if (f.size > MAX_PROOF_MB * 1024 * 1024) { toast.error(`Files can be up to ${MAX_PROOF_MB} MB`); return }
    setFile(f)
  }

  async function submitProof(e) {
    e.preventDefault()
    if (!file) { toast.error('Attach your proof of enrolment'); return }
    setSubmitting(true)
    try {
      const body = new FormData()
      body.append('proof', file)
      await uploadProof(body)
      updateUser({ screening_status: 'pending' })
      setRejected(null)
      setStep(2)
      toast.success('Submitted for review')
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed'))
    } finally {
      setSubmitting(false)
    }
  }

  let content
  if (phase === 'loading') {
    content = <Card><SkeletonRows rows={3} /></Card>
  } else if (phase === 'no-profile') {
    content = (
      <Card>
        <EmptyState title="Create your tutor profile first."
          action={<Link to="/tutor-profile" className="btn btn-coral btn-sm">Create profile</Link>} />
      </Card>
    )
  } else if (step === 0) {
    content = (
      <Card title="Verify your university email">
        {codeSent ? (
          <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 16px' }}>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
              Enter the code we sent to <b style={{ color: 'var(--text)', fontWeight: 600 }}>{uniEmail}</b>.
            </p>
            <CodeInput onChange={setCode} disabled={submitting} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-coral" disabled={submitting || code.length < 6}>
                {submitting ? 'Verifying…' : 'Verify'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={requestCode} disabled={resendIn > 0 || submitting}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => { setCodeSent(false); setCode('') }} disabled={submitting}>
                Change email
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); requestCode() }} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 16px' }}>
            <label className="field">
              <span>University email</span>
              <input className="input" type="email" required value={uniEmail} autoComplete="email"
                onChange={(e) => setUniEmail(e.target.value)} placeholder="you@university.ac.uk" />
            </label>
            <div>
              <button type="submit" className="btn btn-coral" disabled={submitting || !uniEmail.trim()}>
                {submitting ? 'Sending…' : 'Send code'}
              </button>
            </div>
          </form>
        )}
      </Card>
    )
  } else if (step === 1) {
    content = (
      <Card title="Upload proof of enrolment">
        <form onSubmit={submitProof} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 16px' }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            A current certificate of enrolment or student ID card. PNG, JPG or PDF, up to {MAX_PROOF_MB} MB.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer?.files?.[0]) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 64, padding: '12px 14px',
              border: `1px dashed ${dragOver ? 'var(--coral)' : 'var(--border-strong)'}`, borderRadius: 'var(--radius)',
              background: dragOver ? 'var(--coral-soft)' : 'transparent', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer',
            }}
          >
            <Icon name={file ? (file.name.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'image') : 'upload_file'} size={22}
              style={{ color: file ? 'var(--coral)' : 'var(--text-faint)', flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file ? file.name : 'Choose a file or drop it here'}
              </span>
              {file && <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{fileSize(file.size)} · tap to replace</span>}
            </span>
          </button>
          <input ref={fileRef} type="file" hidden accept={PROOF_TYPES.map((x) => `.${x}`).join(',')}
            onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-coral" disabled={submitting || !file}>
              {submitting ? 'Uploading…' : 'Submit for review'}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => { setStep(0); setCodeSent(false) }} disabled={submitting}>
              Use a different email
            </button>
          </div>
        </form>
      </Card>
    )
  } else {
    content = (
      <Card title="In review">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 16px' }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-muted)' }}>
            We check every application by hand. Your tutor tools unlock as soon as you’re approved; until then you can use
            Study With Students as a student.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/hub/student" className="btn btn-coral">Continue as a student</Link>
            <Link to="/tutor-profile" className="btn btn-ghost">Edit tutor profile</Link>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <HubLayout initialMode={user?.is_tutor ? 'tutor' : 'student'}>
      <PageTitle title="Verification" icon="verified_user" />

      <div style={{ maxWidth: 640 }}>
        <div className="dash-head"><h1>Tutor verification</h1></div>

        {phase === 'ready' && <Steps current={step} />}

        {phase === 'ready' && rejected && step < 2 && (
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: 14, overflowWrap: 'anywhere' }}>
            <b style={{ color: 'var(--red)', fontWeight: 600 }}>Your last application wasn’t approved.</b>{' '}
            {rejected.notes || 'Please send a clearer, current proof of enrolment.'}
          </p>
        )}

        {content}

        {phase === 'ready' && step < 2 && (
          <Card title="Why we verify tutors" style={{ marginTop: 18 }}>
            <div className="row-list">
              {WHY.map(([icon, text]) => (
                <div key={icon} className="row">
                  <Icon name={icon} size={18} style={{ color: 'var(--text-faint)' }} />
                  <div className="main" style={{ fontSize: 13.5 }}>{text}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </HubLayout>
  )
}
