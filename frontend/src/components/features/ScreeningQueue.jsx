// Tutor applications, for admins: filter by status, open one to see its details and
// proof of enrolment, then approve or reject it. Used by /admin and /superadmin.
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import client, { errorMessage } from '../../api/client'
import { approveScreening, rejectScreening } from '../../api/screening'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { useEscape } from '../../hooks/useEscape'
import { Avatar, Card, EmptyState, Icon, Pill, SkeletonRows } from '../ui'
import { useConfirm } from '../ui/confirm'

const STATUS = {
  none:     { tone: '',      label: 'No documents' },
  pending:  { tone: 'amber', label: 'Pending' },
  approved: { tone: 'green', label: 'Approved' },
  rejected: { tone: 'red',   label: 'Rejected' },
}

const FILTERS = [
  ['pending', 'Pending'],
  ['', 'All'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
]

export const ScreeningPill = ({ status }) => {
  const s = STATUS[status] ?? STATUS.none
  return <Pill tone={s.tone}>{s.label}</Pill>
}

/** Label and value side by side; the value drops under its label on narrow screens. */
function Detail({ label, children }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', padding: '6px 0', fontSize: 13 }}>
      <span style={{ flex: '0 0 120px', color: 'var(--text-faint)' }}>{label}</span>
      <span style={{ flex: '1 1 180px', minWidth: 0, overflowWrap: 'anywhere' }}>{children || <span style={{ color: 'var(--text-faint)' }}>—</span>}</span>
    </div>
  )
}

/** Proof documents are admin-only, so they're fetched with the session's token (an <img src> would be refused). */
function ProofDocument({ path }) {
  const [file, setFile] = useState(null) // { url, type }
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let url = null
    let live = true
    client.get(`/uploads/tutor-proofs/${encodeURIComponent(path)}`, { responseType: 'blob' })
      .then(({ data }) => {
        if (!live) return
        url = URL.createObjectURL(data)
        setFile({ url, type: data.type })
      })
      .catch(() => { if (live) setFailed(true) })
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [path])

  if (failed) return <span style={{ color: 'var(--text-faint)' }}>Couldn’t load the document</span>
  if (!file) return <span style={{ color: 'var(--text-faint)' }}>Loading…</span>
  if (file.type.startsWith('image/')) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" title="Open full size">
        <img src={file.url} alt="Proof of enrolment"
          style={{ display: 'block', maxWidth: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
      </a>
    )
  }
  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
      <Icon name="picture_as_pdf" />Open document
    </a>
  )
}

function RejectDialog({ tutor, onDone, onClose }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const notesRef = useAutoFocus()
  useEscape(onClose)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await rejectScreening(tutor.id_tutor, notes.trim())
      toast.success(`${tutor.name}’s application was rejected`)
      onDone(notes.trim())
    } catch (err) {
      toast.error(errorMessage(err, 'Could not reject the application'))
      setSaving(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="reject-title" style={{ maxWidth: 440 }}
        onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="dialog-head">
          <h2 id="reject-title" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Reject {tutor.name}?</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="dialog-body">
          <label className="field">
            <span>Note for the tutor <span style={{ color: 'var(--text-faint)' }}>(optional)</span></span>
            <textarea ref={notesRef} className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000}
              placeholder="The document has expired — please upload a current one." />
          </label>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-danger" disabled={saving}>{saving ? 'Rejecting…' : 'Reject'}</button>
        </div>
      </form>
    </div>
  )
}

function Application({ tutor, open, onToggle, busy, onApprove, onReject }) {
  return (
    <>
      <button type="button" className="row" onClick={onToggle} aria-expanded={open}>
        <Avatar name={tutor.name || '?'} size={30} />
        <div className="main">
          <div className="title">{tutor.name}</div>
          <div className="meta">{[tutor.university, tutor.email].filter(Boolean).join(' · ')}</div>
        </div>
        <ScreeningPill status={tutor.screening_status} />
        <Icon name={open ? 'expand_less' : 'expand_more'} size={18} style={{ color: 'var(--text-faint)' }} />
      </button>
      {open && (
        <div style={{ padding: '6px 16px 14px', borderTop: '1px solid var(--border)', background: 'rgb(var(--fg) / 0.025)' }}>
          <Detail label="University">{tutor.university}</Detail>
          <Detail label="Course">{tutor.course}</Detail>
          <Detail label="Subjects">{tutor.subjects}</Detail>
          <Detail label="University email">
            {tutor.uni_email && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {tutor.uni_email}
                <Pill tone={tutor.uni_email_verified ? 'green' : ''}>{tutor.uni_email_verified ? 'Verified' : 'Not verified'}</Pill>
              </span>
            )}
          </Detail>
          <Detail label="Proof">{tutor.proof_doc_path && <ProofDocument path={tutor.proof_doc_path} />}</Detail>
          {tutor.screening_notes && <Detail label="Last note">{tutor.screening_notes}</Detail>}
          {tutor.screening_status !== 'approved' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-coral" onClick={() => onApprove(tutor)} disabled={busy}>
                <Icon name="check" />Approve
              </button>
              {tutor.screening_status !== 'rejected' && (
                <button type="button" className="btn btn-danger" onClick={() => onReject(tutor)} disabled={busy}>Reject</button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

/**
 * `queue` comes from GET /api/admin/screening-queue. `onChange(id, patch)` lets the parent
 * update its copy after an approval or rejection.
 */
export default function ScreeningQueue({ queue, loading, failed, onReload, onChange }) {
  const confirm = useConfirm()
  const [filter, setFilter] = useState('pending')
  const [openId, setOpenId] = useState(null)
  const [busy, setBusy] = useState(null)
  const [rejecting, setRejecting] = useState(null)

  const count = (key) => (key ? queue.filter((t) => t.screening_status === key).length : queue.length)
  const shown = filter ? queue.filter((t) => t.screening_status === filter) : queue

  async function approve(tutor) {
    const ok = await confirm({ title: `Approve ${tutor.name}?`, body: 'They can start tutoring straight away.', confirmLabel: 'Approve' })
    if (!ok) return
    setBusy(tutor.id_tutor)
    try {
      await approveScreening(tutor.id_tutor)
      onChange(tutor.id_tutor, { screening_status: 'approved', screening_notes: null })
      toast.success(`${tutor.name} is now a verified tutor`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not approve the application'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <div className="tabs" role="tablist" aria-label="Applications">
        {FILTERS.map(([key, label]) => (
          <button key={label} role="tab" aria-selected={filter === key} className={filter === key ? 'on' : ''} onClick={() => setFilter(key)}>
            {label}{!loading && <span className="count">{count(key)}</span>}
          </button>
        ))}
      </div>
      <Card>
        {loading ? <SkeletonRows rows={3} /> : failed ? (
          <EmptyState title="Couldn’t load applications." action={onReload && <button className="btn btn-ghost btn-sm" onClick={onReload}>Try again</button>} />
        ) : shown.length ? (
          <div className="row-list">
            {shown.map((t) => (
              <Application key={t.id_tutor} tutor={t} open={openId === t.id_tutor} busy={busy === t.id_tutor}
                onToggle={() => setOpenId((id) => (id === t.id_tutor ? null : t.id_tutor))}
                onApprove={approve} onReject={setRejecting} />
            ))}
          </div>
        ) : (
          <EmptyState title={filter ? `No ${filter} applications.` : 'No applications yet.'} />
        )}
      </Card>
      {rejecting && (
        <RejectDialog
          tutor={rejecting}
          onClose={() => setRejecting(null)}
          onDone={(notes) => {
            onChange(rejecting.id_tutor, { screening_status: 'rejected', screening_notes: notes || null })
            setRejecting(null)
          }}
        />
      )}
    </section>
  )
}
