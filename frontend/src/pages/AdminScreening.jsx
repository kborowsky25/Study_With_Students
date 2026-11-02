import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import client from '../api/client'
import { approveScreening, rejectScreening } from '../api/screening'

const CORAL  = '#ff725e'
const TEAL   = '#2dd4bf'
const AMBER  = '#fbbf24'
const GREEN  = '#34d399'
const RED    = '#f87171'

const STATUS_CONFIG = {
  none:     { label: 'No Docs',  color: 'rgb(var(--fg) / 0.35)', bg: 'rgb(var(--fg) / 0.06)' },
  pending:  { label: 'Pending',  color: AMBER,  bg: 'rgba(251,191,36,0.12)' },
  approved: { label: 'Approved', color: GREEN,  bg: 'rgba(52,211,153,0.12)' },
  rejected: { label: 'Rejected', color: RED,    bg: 'rgba(248,113,113,0.12)' },
}

function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.none
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '700', letterSpacing: '0.04em',
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  )
}

// Rejection modal
function RejectModal({ tutor, onReject, onCancel }) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setLoading(true)
    try {
      await onReject(tutor.id_tutor, notes)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', borderRadius: '16px',
        background: '#1e2d45', border: '1px solid rgba(248,113,113,0.25)',
        padding: '24px',
      }}>
        <h3 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '17px', marginBottom: '6px' }}>
          Reject application
        </h3>
        <p style={{ color: 'rgb(var(--fg) / 0.50)', fontSize: '13px', marginBottom: '16px' }}>
          For: <strong style={{ color: 'var(--text)' }}>{tutor.name}</strong> ({tutor.email})
        </p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional: reason for rejection (sent to the tutor by email)"
          rows={4}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px', resize: 'vertical',
            background: 'rgb(var(--fg) / 0.06)', border: '1px solid rgb(var(--fg) / 0.12)',
            color: 'var(--text)', fontSize: '13px', lineHeight: 1.6,
            outline: 'none', fontFamily: '"Noto Sans JP", sans-serif',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
              background: 'rgb(var(--fg) / 0.07)', border: '1px solid rgb(var(--fg) / 0.12)',
              color: 'rgb(var(--fg) / 0.60)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit} disabled={loading}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
              background: `linear-gradient(135deg, ${RED}, #dc2626)`,
              border: 'none', color: 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Rejecting…' : 'Reject & Notify'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Row component
function TutorRow({ tutor, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false)
  const proofUrl = tutor.proof_doc_path
    ? `/api/uploads/tutor-proofs/${tutor.proof_doc_path}`
    : null

  return (
    <div style={{
      background: 'rgb(var(--fg) / 0.04)', borderRadius: '12px',
      border: '1px solid rgb(var(--fg) / 0.07)',
      marginBottom: '10px', overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', cursor: 'pointer',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '900', fontSize: '15px', color: 'var(--text)',
        }}>
          {tutor.name?.charAt(0).toUpperCase() ?? '?'}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>
            {tutor.name}
          </p>
          <p style={{ color: 'rgb(var(--fg) / 0.45)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tutor.email}
          </p>
        </div>

        {/* Status + toggle */}
        <Badge status={tutor.screening_status} />
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgb(var(--fg) / 0.30)', marginLeft: '4px' }}>
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgb(var(--fg) / 0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(var(--fg) / 0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Uni Email</p>
              <p style={{ fontSize: '13px', color: 'var(--text)' }}>
                {tutor.uni_email ?? <span style={{ color: 'rgb(var(--fg) / 0.30)' }}>—</span>}
                {tutor.uni_email_verified && (
                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: GREEN, marginLeft: '4px', verticalAlign: 'middle', fontVariationSettings: '"FILL" 1' }}>verified</span>
                )}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(var(--fg) / 0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Submitted</p>
              <p style={{ fontSize: '13px', color: 'var(--text)' }}>
                {tutor.created_at ? new Date(tutor.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>

          {/* Proof document */}
          {proofUrl && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(var(--fg) / 0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Proof Document
              </p>
              {tutor.proof_doc_path?.endsWith('.pdf') ? (
                <a
                  href={proofUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: 'rgb(var(--fg) / 0.07)', border: '1px solid rgb(var(--fg) / 0.10)', color: TEAL, fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>picture_as_pdf</span>
                  View PDF
                </a>
              ) : (
                <a href={proofUrl} target="_blank" rel="noreferrer">
                  <img
                    src={proofUrl} alt="Proof of enrolment"
                    style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '10px', border: '1px solid rgb(var(--fg) / 0.10)' }}
                  />
                </a>
              )}
            </div>
          )}

          {tutor.screening_notes && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', color: '#f87171', lineHeight: 1.5 }}>
                <strong>Previous rejection note:</strong> {tutor.screening_notes}
              </p>
            </div>
          )}

          {/* Action buttons */}
          {tutor.screening_status !== 'approved' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => onApprove(tutor.id_tutor)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                  background: `linear-gradient(135deg, ${GREEN}, #059669)`,
                  border: 'none', color: 'var(--text)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: '0 3px 10px rgba(52,211,153,0.30)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                Approve
              </button>
              {tutor.screening_status !== 'rejected' && (
                <button
                  onClick={() => onReject(tutor)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                    background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
                    color: RED, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                  Reject
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminScreening() {
  const [queue,       setQueue]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('')   // '' | 'pending' | 'approved' | 'rejected'
  const [rejectModal, setRejectModal] = useState(null) // tutor object

  async function load(status) {
    setLoading(true)
    try {
      const params = status ? { status } : {}
      const { data } = await client.get('/admin/screening-queue', { params })
      setQueue(data.queue ?? [])
    } catch {
      toast.error('Could not load screening queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('') }, [])

  async function handleApprove(tutorId) {
    try {
      await approveScreening(tutorId)
      toast.success('Tutor approved and notified!')
      setQueue(q => q.map(t => t.id_tutor === tutorId ? { ...t, screening_status: 'approved' } : t))
    } catch {
      toast.error('Failed to approve')
    }
  }

  async function handleReject(tutorId, notes) {
    try {
      await rejectScreening(tutorId, notes)
      toast.success('Tutor rejected and notified')
      setQueue(q => q.map(t => t.id_tutor === tutorId ? { ...t, screening_status: 'rejected', screening_notes: notes } : t))
      setRejectModal(null)
    } catch {
      toast.error('Failed to reject')
    }
  }

  const counts = {
    '':         queue.length,
    pending:    queue.filter(t => t.screening_status === 'pending').length,
    approved:   queue.filter(t => t.screening_status === 'approved').length,
    rejected:   queue.filter(t => t.screening_status === 'rejected').length,
  }

  const displayed = filter ? queue.filter(t => t.screening_status === filter) : queue

  const TABS = [
    { key: '',         label: 'All' },
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '"Noto Sans JP", sans-serif', padding: '32px' }}>
      {rejectModal && (
        <RejectModal
          tutor={rejectModal}
          onReject={handleReject}
          onCancel={() => setRejectModal(null)}
        />
      )}

      {/* Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text)', marginBottom: '4px' }}>
              Tutor Screening Queue
            </h1>
            <p style={{ color: 'rgb(var(--fg) / 0.40)', fontSize: '13px' }}>
              Review and approve tutor applications
            </p>
          </div>
          <div style={{
            padding: '10px 16px', borderRadius: '10px',
            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: AMBER }}>pending</span>
            <span style={{ fontSize: '20px', fontWeight: '900', color: AMBER }}>{counts.pending}</span>
            <span style={{ fontSize: '12px', color: 'rgb(var(--fg) / 0.40)' }}>pending</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {TABS.map(({ key, label }) => {
            const active = filter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  background: active ? 'rgba(255,114,94,0.15)' : 'rgb(var(--fg) / 0.06)',
                  border: `1px solid ${active ? 'rgba(255,114,94,0.30)' : 'rgb(var(--fg) / 0.08)'}`,
                  color: active ? CORAL : 'rgb(var(--fg) / 0.50)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {label} {counts[key] > 0 && <span style={{ marginLeft: '4px', opacity: 0.65 }}>({counts[key]})</span>}
              </button>
            )
          })}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgb(var(--fg) / 0.20)' }}>hourglass_empty</span>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgb(var(--fg) / 0.15)', display: 'block', marginBottom: '10px' }}>inbox</span>
            <p style={{ color: 'rgb(var(--fg) / 0.30)', fontSize: '14px' }}>No applications {filter ? `with status "${filter}"` : 'yet'}</p>
          </div>
        ) : (
          displayed.map(tutor => (
            <TutorRow
              key={tutor.id_tutor}
              tutor={tutor}
              onApprove={handleApprove}
              onReject={setRejectModal}
            />
          ))
        )}
      </div>
    </div>
  )
}
