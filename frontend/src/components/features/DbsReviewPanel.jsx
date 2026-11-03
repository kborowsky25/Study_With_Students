// Admin review of tutor DBS checks. Self-contained: mount it on an admin page.
//
//   <DbsReviewPanel />
//
// Pending checks show everything needed for the GOV.UK Update Service status check.
// Verifying or rejecting deletes the certificate number, date of birth and scan.

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Avatar, EmptyState, Icon, Pill, SkeletonRows } from '../ui'
import { useConfirm } from '../ui/confirm'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { errorMessage } from '../../api/client'
import {
  DBS_STATUS_CHECK_URL, checkTypeLabel, getDbsChecks, getDbsDocument, parseDay, parseUtc, rejectDbsCheck, verifyDbsCheck,
} from '../../api/background'
import { formatDate, timeAgo } from '../../lib/format'

const TABS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired',  label: 'Expired' },
]

const EMPTY_TEXT = {
  pending:  'No checks waiting for review.',
  verified: 'No verified checks yet.',
  rejected: 'No rejected checks.',
  expired:  'No expired checks.',
}

const DAY = 86_400_000
const longDate = (d) => formatDate(d, { year: 'numeric' })
const soon = (iso) => parseDay(iso) - Date.now() < 30 * DAY

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

// ── Pending check: every detail the status check needs ────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 13.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>{children}</div>
    </div>
  )
}

function CopyButton({ value, label }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`, { id: 'dbs-copy' })
    } catch {
      toast.error('Couldn’t copy')
    }
  }
  return (
    <button type="button" className="icon-btn" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`} style={{ width: 22, height: 22 }}>
      <Icon name="content_copy" size={14} />
    </button>
  )
}

function PendingCheck({ check, first, busy, onVerify, onReject, onViewScan }) {
  return (
    <div style={{ borderTop: first ? 0 : '1px solid var(--border)', paddingBottom: 12 }}>
      <div className="row" style={{ borderTop: 0 }}>
        <Avatar name={check.tutor_name || '?'} size={28} />
        <div className="main">
          <div className="title">{check.tutor_name || 'Unknown tutor'}</div>
          <div className="meta">{[check.tutor_email, check.university].filter(Boolean).join(' · ')}</div>
        </div>
        <span className="side">{timeAgo(parseUtc(check.submitted_at))}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px 24px', padding: '4px 16px 14px 56px' }}>
        <Field label="Name on certificate">{check.legal_name}</Field>
        <Field label="Certificate number">
          <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>{check.certificate_number}</span>
          {check.certificate_number && <CopyButton value={check.certificate_number} label="Certificate number" />}
        </Field>
        <Field label="Date of birth">{check.date_of_birth ? longDate(parseDay(check.date_of_birth)) : '—'}</Field>
        <Field label="Issued">{longDate(parseDay(check.issue_date))}</Field>
        <Field label="Type">
          {checkTypeLabel(check.check_type)}
          {check.check_type === 'enhanced' && <Pill tone="amber">No barred list</Pill>}
        </Field>
        <Field label="Update Service">{check.on_update_service ? 'Yes' : 'No'}</Field>
        <Field label="Consent">{longDate(parseUtc(check.consent_at))}</Field>
        <Field label="Recheck if verified">{longDate(parseDay(check.recheck_due_default))}</Field>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '0 16px 0 56px' }}>
        {check.on_update_service && (
          <a className="btn btn-ghost btn-sm" href={DBS_STATUS_CHECK_URL} target="_blank" rel="noreferrer">
            <Icon name="open_in_new" />Status check
          </a>
        )}
        {check.has_document && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onViewScan(check)} disabled={busy}>
            <Icon name="description" />View scan
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onReject(check)} disabled={busy}>Reject</button>
        <button type="button" className="btn btn-coral btn-sm" onClick={() => onVerify(check)} disabled={busy}>Verify</button>
      </div>
    </div>
  )
}

// ── Reviewed checks: one dense row each ───────────────────────────────────────

function ReviewedRow({ check, busy, onRevoke }) {
  let side
  if (check.status === 'verified') {
    side = <span style={soon(check.recheck_due) ? { color: 'var(--amber)' } : undefined}>Recheck {longDate(parseDay(check.recheck_due))}</span>
  } else if (check.status === 'expired') {
    side = `Expired ${longDate(parseDay(check.recheck_due))}`
  } else {
    side = check.reviewed_at ? `Rejected ${longDate(parseUtc(check.reviewed_at))}` : 'Rejected'
  }
  const meta = [checkTypeLabel(check.check_type), `••••${check.certificate_last4}`]
  if (check.status === 'rejected' && check.reviewer_note) meta.push(check.reviewer_note)

  return (
    <div className="row">
      <Avatar name={check.tutor_name || '?'} size={28} />
      <div className="main">
        <div className="title">{check.tutor_name || 'Unknown tutor'}</div>
        <div className="meta" title={meta.join(' · ')}>{meta.join(' · ')}</div>
      </div>
      <span className="side">{side}</span>
      {check.status === 'verified' && (
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onRevoke(check)} disabled={busy}>Revoke</button>
      )}
    </div>
  )
}

// ── Dialogs ───────────────────────────────────────────────────────────────────

function RejectDialog({ check, busy, onSubmit, onClose }) {
  const noteRef = useAutoFocus()
  const [note, setNote] = useState('')
  useEscape(onClose)
  const revoking = check.status === 'verified'
  const verb = revoking ? 'Revoke' : 'Reject'

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="dbs-reject-title" style={{ maxWidth: 440 }}
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (note.trim()) onSubmit(note.trim()) }}>
        <div className="dialog-head">
          <h2 id="dbs-reject-title">{verb} {check.tutor_name || 'this tutor'}’s check</h2>
        </div>
        <div className="dialog-body">
          <label className="field">
            <span>Note to the tutor</span>
            <textarea className="input" rows={4} maxLength={1000} ref={noteRef} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={revoking ? 'e.g. We need to look into something before you can take bookings.' : 'e.g. The details don’t match the Update Service record.'} />
          </label>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-danger" disabled={!note.trim() || busy}>
            {busy ? (revoking ? 'Revoking…' : 'Rejecting…') : verb}
          </button>
        </div>
      </form>
    </div>
  )
}

function ScanDialog({ scan, onClose }) {
  useEscape(onClose)
  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dbs-scan-title" style={{ maxWidth: 860 }}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2 id="dbs-scan-title">{scan.name}’s certificate</h2>
          <a className="icon-btn" href={scan.url} target="_blank" rel="noreferrer" aria-label="Open in a new tab"><Icon name="open_in_new" /></a>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="dialog-body">
          {scan.type === 'application/pdf'
            ? <iframe src={scan.url} title="DBS certificate scan" style={{ width: '100%', height: '70vh', border: 0, borderRadius: 'var(--radius-sm)' }} />
            : <img src={scan.url} alt="DBS certificate scan" style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 'var(--radius-sm)' }} />}
        </div>
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function DbsReviewPanel() {
  const confirm = useConfirm()
  const [tab, setTab] = useState('pending')
  const [checks, setChecks] = useState([])
  const [counts, setCounts] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | ready | error | forbidden
  const [busy, setBusy] = useState(null)        // id of the check being changed
  const [rejecting, setRejecting] = useState(null)
  const [scan, setScan] = useState(null)        // { url, type, name }

  const load = useCallback(async (status) => {
    setPhase('loading')
    try {
      const { data } = await getDbsChecks(status)
      setChecks(data.checks)
      setCounts(data.counts)
      setPhase('ready')
    } catch (err) {
      setPhase(err?.response?.status === 403 ? 'forbidden' : 'error')
    }
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  async function verify(check) {
    const ok = await confirm({
      title: `Verify ${check.tutor_name || 'this tutor'}’s DBS check?`,
      body: `Recheck due ${longDate(parseDay(check.recheck_due_default))}. The certificate number, date of birth and scan are deleted once it’s verified.`,
      confirmLabel: 'Verify',
    })
    if (!ok) return
    setBusy(check.id)
    try {
      await verifyDbsCheck(check.id)
      toast.success('Check verified')
      load(tab)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not verify this check'))
    } finally {
      setBusy(null)
    }
  }

  async function reject(note) {
    const check = rejecting
    setBusy(check.id)
    try {
      await rejectDbsCheck(check.id, note)
      toast.success(check.status === 'verified' ? 'Check revoked' : 'Check rejected')
      setRejecting(null)
      load(tab)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update this check'))
    } finally {
      setBusy(null)
    }
  }

  async function viewScan(check) {
    setBusy(check.id)
    try {
      const { data } = await getDbsDocument(check.id)
      setScan({ url: URL.createObjectURL(data), type: data.type, name: check.tutor_name || 'Tutor' })
    } catch (err) {
      toast.error(err?.response?.status === 404 ? 'No scan on file' : 'Couldn’t open the scan')
    } finally {
      setBusy(null)
    }
  }

  const closeScan = useCallback(() => {
    setScan((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
  }, [])
  const closeReject = useCallback(() => setRejecting(null), [])

  let body
  if (phase === 'loading') {
    body = <SkeletonRows rows={3} />
  } else if (phase === 'forbidden') {
    body = <EmptyState title="Only admins can review background checks." />
  } else if (phase === 'error') {
    body = <EmptyState title="Couldn’t load background checks." action={<button className="btn btn-ghost btn-sm" onClick={() => load(tab)}>Try again</button>} />
  } else if (checks.length === 0) {
    body = <EmptyState title={EMPTY_TEXT[tab]} />
  } else if (tab === 'pending') {
    body = checks.map((c, i) => (
      <PendingCheck key={c.id} check={c} first={i === 0} busy={busy === c.id}
        onVerify={verify} onReject={setRejecting} onViewScan={viewScan} />
    ))
  } else {
    body = (
      <div className="row-list">
        {checks.map((c) => <ReviewedRow key={c.id} check={c} busy={busy === c.id} onRevoke={setRejecting} />)}
      </div>
    )
  }

  return (
    <section>
      <div className="section-head">
        <h2>Background checks</h2>
        <a className="card-link" href={DBS_STATUS_CHECK_URL} target="_blank" rel="noreferrer">
          DBS Update Service<Icon name="open_in_new" />
        </a>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={tab === t.value}
            className={tab === t.value ? 'on' : ''} onClick={() => setTab(t.value)}>
            {t.label}{counts?.[t.value] ? <span className="count">{counts[t.value]}</span> : null}
          </button>
        ))}
      </div>
      <div className="card">{body}</div>

      {rejecting && <RejectDialog check={rejecting} busy={busy === rejecting.id} onSubmit={reject} onClose={closeReject} />}
      {scan && <ScanDialog scan={scan} onClose={closeScan} />}
    </section>
  )
}
