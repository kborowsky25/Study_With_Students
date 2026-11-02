import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Card, EmptyState, Icon, Pill, SkeletonRows } from '../components/ui'
import { errorMessage } from '../api/client'
import {
  ACCEPTED_TYPES, CHECK_TYPES, checkTypeLabel, getBackgroundCheck, parseDay, parseUtc, submitBackgroundCheck,
} from '../api/background'
import { formatDate } from '../lib/format'

const UMBRELLA_BODIES_URL = 'https://www.gov.uk/find-dbs-umbrella-body'
const MAX_SCAN_BYTES = 10 * 1024 * 1024

const STATUS = {
  pending:  { label: 'In review' },
  verified: { label: 'Verified', tone: 'green' },
  rejected: { label: 'Not accepted', tone: 'red' },
  expired:  { label: 'Expired', tone: 'amber' },
}

const EMPTY = {
  check_type: 'enhanced_barred', certificate_number: '', issue_date: '', legal_name: '',
  date_of_birth: '', on_update_service: false, consent: false,
}

const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const yearsAgo = (n) => { const d = new Date(); d.setFullYear(d.getFullYear() - n); return isoDay(d) }
const longDate = (d) => formatDate(d, { year: 'numeric' })

const problemText = { fontSize: 12.5, color: 'var(--red)', marginTop: 6 }
const checkbox = { width: 16, height: 16, marginTop: 2, accentColor: 'var(--coral)', flexShrink: 0 }
const checkLabel = { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer' }

// ── Pieces ────────────────────────────────────────────────────────────────────

function Detail({ label, children }) {
  return (
    <div className="row">
      <span style={{ width: 130, flexShrink: 0, fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500 }}>{children}</span>
    </div>
  )
}

function Setting({ label, htmlFor, top = false, children }) {
  const Label = htmlFor ? 'label' : 'div'
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: top ? 'flex-start' : 'center', gap: '8px 24px',
      padding: '12px 0', borderTop: '1px solid var(--border)',
    }}>
      <Label htmlFor={htmlFor} style={{ flex: '0 0 170px', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', paddingTop: top ? 2 : 0 }}>
        {label}
      </Label>
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>{children}</div>
    </div>
  )
}

function StatusCard({ check }) {
  const status = STATUS[check.status] ?? { label: check.status }
  const recheck = ['verified', 'expired'].includes(check.status) && check.recheck_due
  return (
    <Card title="DBS check" style={{ marginBottom: 28 }}
      action={<Pill tone={status.tone} plain={false} style={{ marginRight: 8 }}>{status.label}</Pill>}>
      <div className="row-list">
        {check.status === 'rejected' && check.reviewer_note && <Detail label="Reason">{check.reviewer_note}</Detail>}
        <Detail label="Type">{checkTypeLabel(check.check_type)}</Detail>
        <Detail label="Certificate">
          <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>{check.certificate_number_masked}</span>
        </Detail>
        <Detail label="Issued">{longDate(parseDay(check.issue_date))}</Detail>
        <Detail label="Update Service">{check.on_update_service ? 'Yes' : 'No'}</Detail>
        {check.status === 'pending' && <Detail label="Submitted">{longDate(parseUtc(check.submitted_at))}</Detail>}
        {check.status === 'verified' && check.verified_at && <Detail label="Verified">{longDate(parseUtc(check.verified_at))}</Detail>}
        {recheck && (
          <Detail label={check.status === 'expired' ? 'Recheck was due' : 'Recheck due'}>{longDate(parseDay(check.recheck_due))}</Detail>
        )}
      </div>
    </Card>
  )
}

function CheckForm({ resubmit, onSubmitted }) {
  const [form, setForm] = useState(EMPTY)
  const [scan, setScan] = useState(null)
  const [busy, setBusy] = useState(false)
  const scanInput = useRef(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const today = isoDay(new Date())
  const latestBirthday = yearsAgo(18)
  const digits = form.certificate_number.replace(/[\s-]/g, '')
  const enhanced = ACCEPTED_TYPES.includes(form.check_type)
  const tooOld = Boolean(form.issue_date) && !form.on_update_service && form.issue_date <= yearsAgo(3)
  const ready = enhanced && !tooOld && /^\d{12}$/.test(digits)
    && Boolean(form.issue_date) && form.issue_date <= today
    && Boolean(form.legal_name.trim())
    && Boolean(form.date_of_birth) && form.date_of_birth <= latestBirthday
    && form.consent

  function pickScan(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_SCAN_BYTES) { toast.error('The scan must be under 10 MB'); return }
    setScan(file)
  }

  async function submit(e) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    const body = new FormData()
    Object.entries({ ...form, certificate_number: digits }).forEach(([key, value]) => body.append(key, String(value)))
    if (scan) body.append('document', scan)
    try {
      const { data } = await submitBackgroundCheck(body)
      toast.success('Submitted for review')
      onSubmitted(data.check)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not submit your check'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{resubmit ? 'Submit again' : 'Your certificate'}</h2>

      <Setting label="Type of check" htmlFor="dbs-type">
        <select id="dbs-type" className="input" value={form.check_type} onChange={set('check_type')}>
          {CHECK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {!enhanced && <div style={problemText}>We can only accept an enhanced check, as most of our students are under 18.</div>}
      </Setting>
      <Setting label="Certificate number" htmlFor="dbs-number">
        <input id="dbs-number" className="input" inputMode="numeric" autoComplete="off" maxLength={16}
          value={form.certificate_number} onChange={set('certificate_number')} placeholder="12 digits" style={{ maxWidth: 220 }} />
      </Setting>
      <Setting label="Issue date" htmlFor="dbs-issued">
        <input id="dbs-issued" className="input" type="date" max={today}
          value={form.issue_date} onChange={set('issue_date')} style={{ maxWidth: 180 }} />
        {tooOld && <div style={problemText}>We need a certificate from the last 3 years, or one on the Update Service.</div>}
      </Setting>
      <Setting label="Name on certificate" htmlFor="dbs-name">
        <input id="dbs-name" className="input" autoComplete="name" maxLength={255}
          value={form.legal_name} onChange={set('legal_name')} placeholder="As printed on it" />
      </Setting>
      <Setting label="Date of birth" htmlFor="dbs-dob">
        <input id="dbs-dob" className="input" type="date" max={latestBirthday} autoComplete="bday"
          value={form.date_of_birth} onChange={set('date_of_birth')} style={{ maxWidth: 180 }} />
      </Setting>
      <Setting label="Update Service">
        <label style={checkLabel}>
          <input type="checkbox" checked={form.on_update_service} onChange={set('on_update_service')} style={checkbox} />
          My certificate is on the DBS Update Service
        </label>
      </Setting>
      <Setting label="Scan (optional)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => scanInput.current?.click()}>
            {scan ? 'Replace' : 'Upload scan'}
          </button>
          {scan && (
            <>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {scan.name}
              </span>
              <button type="button" className="icon-btn" onClick={() => setScan(null)} aria-label="Remove scan"><Icon name="close" /></button>
            </>
          )}
          <input ref={scanInput} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" hidden onChange={pickScan} />
        </div>
      </Setting>
      <Setting label="Consent" top>
        <label style={checkLabel}>
          <input type="checkbox" checked={form.consent} onChange={set('consent')} style={checkbox} />
          I agree to Study With Students checking this certificate, including an online status check with the DBS Update Service.
        </label>
      </Setting>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        paddingTop: 14, borderTop: '1px solid var(--border)',
      }}>
        <span style={{ flex: '1 1 300px', fontSize: 12.5, color: 'var(--text-faint)' }}>
          Only our admin sees these details. We delete the number, date of birth and scan once it’s checked.
        </span>
        <button type="submit" className="btn btn-coral" disabled={!ready || busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
      </div>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BackgroundCheck() {
  const [check, setCheck] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | ready | no-profile | error

  async function load() {
    setPhase('loading')
    try {
      const { data } = await getBackgroundCheck()
      setCheck(data.check)
      setPhase('ready')
    } catch (err) {
      setPhase(err?.response?.data?.code === 'no_tutor_profile' ? 'no-profile' : 'error')
    }
  }

  useEffect(() => { load() }, [])

  const canSubmit = phase === 'ready' && (!check || ['rejected', 'expired'].includes(check.status))

  let body
  if (phase === 'loading') {
    body = <div className="card"><SkeletonRows rows={4} /></div>
  } else if (phase === 'no-profile') {
    body = (
      <Card>
        <EmptyState title="Create your tutor profile first." action={<Link to="/tutor-profile" className="btn btn-ghost btn-sm">Tutor profile</Link>} />
      </Card>
    )
  } else if (phase === 'error') {
    body = (
      <Card>
        <EmptyState title="Couldn’t load your background check." action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
      </Card>
    )
  } else {
    body = (
      <>
        {check && <StatusCard check={check} />}
        {canSubmit && <CheckForm resubmit={Boolean(check)} onSubmitted={setCheck} />}
        {canSubmit && (
          <p style={{ marginTop: 28, fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)' }}>
            No DBS certificate yet? Apply for an enhanced check through a DBS umbrella body. We can’t issue one ourselves.
            Join the Update Service within 30 days of issue so we can recheck it online.{' '}
            <a href={UMBRELLA_BODIES_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--coral)', fontWeight: 500, textDecoration: 'none' }}>
              Find an umbrella body
            </a>
          </p>
        )}
      </>
    )
  }

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="Background check" icon="verified_user" />
      <div style={{ maxWidth: 760 }}>
        <div className="dash-head"><h1>Background check</h1></div>
        {body}
      </div>
    </HubLayout>
  )
}
