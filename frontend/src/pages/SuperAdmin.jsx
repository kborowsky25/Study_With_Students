import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { approveScreening, rejectScreening } from '../api/screening'

const CORAL  = '#ff725e'
const TEAL   = '#2dd4bf'
const AMBER  = '#fbbf24'
const GREEN  = '#34d399'
const RED    = '#f87171'
const PURPLE = '#a78bfa'
const NAVY = 'var(--bg)'
const CARD   = 'rgb(var(--fg) / 0.04)'
const BORDER = 'rgb(var(--fg) / 0.08)'

const SCREENING_STATUS = {
  none:     { label: 'No Docs',  color: 'rgb(var(--fg) / 0.35)', bg: 'rgb(var(--fg) / 0.06)' },
  pending:  { label: 'Pending',  color: AMBER, bg: 'rgba(251,191,36,0.12)' },
  approved: { label: 'Approved', color: GREEN, bg: 'rgba(52,211,153,0.12)' },
  rejected: { label: 'Rejected', color: RED,   bg: 'rgba(248,113,113,0.12)' },
}

function chip(status) {
  const cfg = SCREENING_STATUS[status] ?? SCREENING_STATUS.none
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em',
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = CORAL, sub }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px',
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgb(var(--fg) / 0.40)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '17px', color, fontVariationSettings: '"FILL" 1' }}>{icon}</span>
        </div>
      </div>
      <p style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text)', lineHeight: 1, fontFamily: 'monospace' }}>
        {value ?? '—'}
      </p>
      {sub && <p style={{ fontSize: '11px', color: 'rgb(var(--fg) / 0.35)' }}>{sub}</p>}
    </div>
  )
}

// ── Reject modal ──────────────────────────────────────────────────────────────
function RejectModal({ tutor, onReject, onCancel }) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit() {
    setLoading(true)
    try { await onReject(tutor.id_tutor, notes) }
    finally { setLoading(false) }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px', borderRadius: '16px', background: '#1e2d45', border: '1px solid rgba(248,113,113,0.25)', padding: '24px' }}>
        <h3 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '17px', marginBottom: '6px' }}>Reject application</h3>
        <p style={{ color: 'rgb(var(--fg) / 0.50)', fontSize: '13px', marginBottom: '16px' }}>
          For: <strong style={{ color: 'var(--text)' }}>{tutor.name}</strong> ({tutor.email})
        </p>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Optional reason (sent to tutor by email)"
          rows={4}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', resize: 'vertical', background: 'rgb(var(--fg) / 0.06)', border: '1px solid rgb(var(--fg) / 0.12)', color: 'var(--text)', fontSize: '13px', lineHeight: 1.6, outline: 'none', fontFamily: '"Noto Sans JP", sans-serif', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: 'rgb(var(--fg) / 0.07)', border: '1px solid rgb(var(--fg) / 0.12)', color: 'rgb(var(--fg) / 0.60)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', background: `linear-gradient(135deg, ${RED}, #dc2626)`, border: 'none', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Rejecting…' : 'Reject & Notify'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tutor screening row ───────────────────────────────────────────────────────
function ScreeningRow({ tutor, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false)
  const proofUrl = tutor.proof_doc_path ? `/api/uploads/tutor-proofs/${tutor.proof_doc_path}` : null
  return (
    <div style={{ background: CARD, borderRadius: '12px', border: `1px solid ${BORDER}`, marginBottom: '8px', overflow: 'hidden' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '15px', color: 'white' }}>
          {tutor.name?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>{tutor.name}</p>
          <p style={{ color: 'rgb(var(--fg) / 0.40)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tutor.email}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          {chip(tutor.screening_status)}
          {tutor.university && <span style={{ fontSize: '10px', color: 'rgb(var(--fg) / 0.30)' }}>{tutor.university}</span>}
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgb(var(--fg) / 0.25)', marginLeft: '4px' }}>
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgb(var(--fg) / 0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '14px', marginBottom: '16px' }}>
            {[
              { label: 'Uni Email', value: tutor.uni_email, verified: tutor.uni_email_verified },
              { label: 'Course', value: tutor.course },
              { label: 'Submitted', value: tutor.created_at ? new Date(tutor.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
            ].map(({ label, value, verified }) => (
              <div key={label}>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(var(--fg) / 0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</p>
                <p style={{ fontSize: '13px', color: value ? 'white' : 'rgb(var(--fg) / 0.25)' }}>
                  {value ?? '—'}
                  {verified && <span className="material-symbols-outlined" style={{ fontSize: '12px', color: GREEN, marginLeft: '4px', verticalAlign: 'middle', fontVariationSettings: '"FILL" 1' }}>verified</span>}
                </p>
              </div>
            ))}
          </div>
          {tutor.subjects && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(var(--fg) / 0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Subjects</p>
              <p style={{ fontSize: '13px', color: 'rgb(var(--fg) / 0.70)' }}>{tutor.subjects}</p>
            </div>
          )}
          {proofUrl && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(var(--fg) / 0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Proof Document</p>
              {tutor.proof_doc_path?.endsWith('.pdf') ? (
                <a href={proofUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: 'rgb(var(--fg) / 0.07)', border: '1px solid rgb(var(--fg) / 0.10)', color: TEAL, fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>picture_as_pdf</span> View PDF
                </a>
              ) : (
                <a href={proofUrl} target="_blank" rel="noreferrer">
                  <img src={proofUrl} alt="Proof" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '10px', border: '1px solid rgb(var(--fg) / 0.10)' }} />
                </a>
              )}
            </div>
          )}
          {tutor.screening_notes && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', color: RED, lineHeight: 1.5 }}><strong>Previous rejection:</strong> {tutor.screening_notes}</p>
            </div>
          )}
          {tutor.screening_status !== 'approved' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => onApprove(tutor.id_tutor)} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', background: `linear-gradient(135deg, ${GREEN}, #059669)`, border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 3px 10px rgba(52,211,153,0.30)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: '"FILL" 1' }}>check_circle</span> Approve
              </button>
              {tutor.screening_status !== 'rejected' && (
                <button onClick={() => onReject(tutor)} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: RED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span> Reject
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ stats, loadingStats }) {
  if (loadingStats) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgb(var(--fg) / 0.20)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
    </div>
  )
  if (!stats) return null
  return (
    <div>
      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginBottom: '32px' }}>
        <StatCard icon="group"          label="Total Users"      value={stats.total_users}         color={CORAL} />
        <StatCard icon="school"         label="Tutors"           value={stats.total_tutors}        color={TEAL}  sub={`${stats.approved_tutors} approved`} />
        <StatCard icon="person"         label="Students"         value={stats.total_students}      color={PURPLE} />
        <StatCard icon="pending"        label="Pending Reviews"  value={stats.pending_screenings}  color={AMBER} />
        <StatCard icon="calendar_month" label="Total Sessions"   value={stats.total_sessions}      color={GREEN} sub={`${stats.completed_sessions} completed`} />
        <StatCard icon="workspace_premium" label="Explorer members" value={stats.premium_users}    color={AMBER} sub="£5 / month each" />
        <StatCard icon="savings"        label="Monthly revenue"  value={`£${(stats.monthly_recurring_revenue ?? 0).toLocaleString('en-GB')}`} color={GREEN} sub="0% commission on sessions" />
      </div>

      {/* Signup sparkline */}
      {stats.signups_last_30d?.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgb(var(--fg) / 0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            New sign-ups — last 30 days
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '60px' }}>
            {(() => {
              const max = Math.max(...stats.signups_last_30d.map(r => r.signups), 1)
              return stats.signups_last_30d.map((r, i) => (
                <div key={i} title={`${r.day}: ${r.signups}`} style={{ flex: 1, background: CORAL, borderRadius: '2px 2px 0 0', height: `${Math.max(4, (r.signups / max) * 60)}px`, opacity: 0.75, cursor: 'default', transition: 'opacity 0.1s' }} />
              ))
            })()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '10px', color: 'rgb(var(--fg) / 0.25)' }}>{stats.signups_last_30d[0]?.day}</span>
            <span style={{ fontSize: '10px', color: 'rgb(var(--fg) / 0.25)' }}>{stats.signups_last_30d[stats.signups_last_30d.length - 1]?.day}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Screening tab ─────────────────────────────────────────────────────────────
function ScreeningTab({ queue, loading, onApprove, onReject }) {
  const [filter, setFilter] = useState('pending')
  const counts = {
    '': queue.length,
    pending:  queue.filter(t => t.screening_status === 'pending').length,
    approved: queue.filter(t => t.screening_status === 'approved').length,
    rejected: queue.filter(t => t.screening_status === 'rejected').length,
  }
  const displayed = filter ? queue.filter(t => t.screening_status === filter) : queue
  const TABS = [
    { key: 'pending', label: 'Pending' },
    { key: '',        label: 'All' },
    { key: 'approved',label: 'Approved' },
    { key: 'rejected',label: 'Rejected' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {TABS.map(({ key, label }) => {
          const active = filter === key
          return (
            <button key={key} onClick={() => setFilter(key)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', background: active ? 'rgba(255,114,94,0.15)' : 'rgb(var(--fg) / 0.06)', border: `1px solid ${active ? 'rgba(255,114,94,0.30)' : BORDER}`, color: active ? CORAL : 'rgb(var(--fg) / 0.50)', cursor: 'pointer', transition: 'all 0.15s' }}>
              {label} {counts[key] > 0 && <span style={{ opacity: 0.65 }}>({counts[key]})</span>}
            </button>
          )
        })}
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgb(var(--fg) / 0.20)' }}>hourglass_empty</span>
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgb(var(--fg) / 0.15)', display: 'block', marginBottom: '10px' }}>inbox</span>
          <p style={{ color: 'rgb(var(--fg) / 0.30)', fontSize: '14px' }}>No applications {filter ? `with status "${filter}"` : 'yet'}</p>
        </div>
      ) : displayed.map(tutor => (
        <ScreeningRow key={tutor.id_tutor} tutor={tutor} onApprove={onApprove} onReject={onReject} />
      ))}
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab({ users, loading }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchText = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchRole = !roleFilter ||
      (roleFilter === 'tutor' && u.is_tutor) ||
      (roleFilter === 'student' && !u.is_tutor) ||
      (roleFilter === 'premium' && u.is_premium)
    return matchText && matchRole
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email…"
          style={{ flex: 1, minWidth: '180px', padding: '9px 14px', borderRadius: '10px', background: CARD, border: `1px solid ${BORDER}`, color: 'var(--text)', fontSize: '13px', outline: 'none', fontFamily: '"Noto Sans JP", sans-serif' }}
        />
        {['', 'tutor', 'student', 'premium'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', background: roleFilter === r ? 'rgba(255,114,94,0.15)' : 'rgb(var(--fg) / 0.06)', border: `1px solid ${roleFilter === r ? 'rgba(255,114,94,0.30)' : BORDER}`, color: roleFilter === r ? CORAL : 'rgb(var(--fg) / 0.50)', cursor: 'pointer' }}>
            {r || 'All'}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgb(var(--fg) / 0.20)' }}>hourglass_empty</span>
        </div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 80px 80px 110px', gap: '0', padding: '10px 16px', borderBottom: '1px solid rgb(var(--fg) / 0.06)' }}>
            {['User', 'Email', 'Role', 'Premium', 'Joined'].map(h => (
              <span key={h} style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(var(--fg) / 0.30)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '32px', color: 'rgb(var(--fg) / 0.25)', fontSize: '13px' }}>No users found</p>
            ) : filtered.map(u => (
              <div key={u.id_user} style={{ display: 'grid', gridTemplateColumns: '1fr 200px 80px 80px 110px', gap: '0', padding: '12px 16px', borderBottom: '1px solid rgb(var(--fg) / 0.04)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: `${CORAL}22`, border: `1px solid ${CORAL}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', color: CORAL }}>
                    {u.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'rgb(var(--fg) / 0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                <div>
                  {u.is_tutor
                    ? <span style={{ fontSize: '10px', fontWeight: '700', color: TEAL, background: 'rgba(45,212,191,0.12)', padding: '2px 8px', borderRadius: '12px' }}>Tutor</span>
                    : <span style={{ fontSize: '10px', fontWeight: '700', color: PURPLE, background: 'rgba(167,139,250,0.12)', padding: '2px 8px', borderRadius: '12px' }}>Student</span>}
                  {u.is_tutor && u.screening_status && (
                    <span style={{ marginLeft: '4px' }}>{chip(u.screening_status)}</span>
                  )}
                </div>
                <div>
                  {u.is_premium
                    ? <span className="material-symbols-outlined" style={{ fontSize: '16px', color: AMBER, fontVariationSettings: '"FILL" 1' }}>workspace_premium</span>
                    : <span style={{ fontSize: '12px', color: 'rgb(var(--fg) / 0.20)' }}>—</span>}
                </div>
                <span style={{ fontSize: '11px', color: 'rgb(var(--fg) / 0.35)' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid rgb(var(--fg) / 0.06)' }}>
            <span style={{ fontSize: '11px', color: 'rgb(var(--fg) / 0.30)' }}>{filtered.length} of {users.length} users</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sessions tab ──────────────────────────────────────────────────────────────
function SessionsTab({ events, loading }) {
  const STATUS_COLOR = { pending: AMBER, confirmed: TEAL, completed: GREEN, cancelled: RED }
  return (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgb(var(--fg) / 0.20)' }}>hourglass_empty</span>
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgb(var(--fg) / 0.15)', display: 'block', marginBottom: '10px' }}>event_busy</span>
          <p style={{ color: 'rgb(var(--fg) / 0.30)', fontSize: '14px' }}>No sessions yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map(ev => {
            const color = STATUS_COLOR[ev.status] ?? 'rgb(var(--fg) / 0.35)'
            return (
              <div key={ev.id_event} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '13px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title || 'Untitled session'}</p>
                  <p style={{ color: 'rgb(var(--fg) / 0.40)', fontSize: '12px' }}>
                    <span style={{ color: TEAL }}>{ev.student_name}</span> with <span style={{ color: CORAL }}>{ev.tutor_name}</span>
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '11px', color: 'rgb(var(--fg) / 0.35)', marginBottom: '4px' }}>
                    {ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </p>
                  <span style={{ fontSize: '10px', fontWeight: '700', color, background: `${color}18`, padding: '2px 8px', borderRadius: '12px', textTransform: 'capitalize' }}>
                    {ev.status}
                  </span>
                </div>
                {ev.amount != null && (
                  <span style={{ fontSize: '13px', fontWeight: '700', color: GREEN, flexShrink: 0 }}>£{ev.amount}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SuperAdmin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]             = useState('overview')
  const [stats, setStats]         = useState(null)
  const [queue, setQueue]         = useState([])
  const [users, setUsers]         = useState([])
  const [events, setEvents]       = useState([])
  const [loadingStats, setLStats] = useState(true)
  const [loadingQueue, setLQueue] = useState(true)
  const [loadingUsers, setLUsers] = useState(true)
  const [loadingEvents, setLEvts] = useState(true)
  const [rejectModal, setRejectModal] = useState(null)

  // Guard: only super-admin
  useEffect(() => {
    if (user !== undefined && !user?.is_admin) {
      navigate({ to: '/hub' })
    }
  }, [user])

  useEffect(() => {
    client.get('/admin/stats').then(r => setStats(r.data.stats)).catch(() => toast.error('Failed to load stats')).finally(() => setLStats(false))
    client.get('/admin/screening-queue').then(r => setQueue(r.data.queue ?? [])).catch(() => {}).finally(() => setLQueue(false))
    client.get('/admin/users').then(r => setUsers(r.data.users ?? [])).catch(() => {}).finally(() => setLUsers(false))
    client.get('/admin/recent-events').then(r => setEvents(r.data.events ?? [])).catch(() => {}).finally(() => setLEvts(false))
  }, [])

  async function handleApprove(tutorId) {
    try {
      await approveScreening(tutorId)
      toast.success('Tutor approved!')
      setQueue(q => q.map(t => t.id_tutor === tutorId ? { ...t, screening_status: 'approved' } : t))
    } catch { toast.error('Failed to approve') }
  }

  async function handleReject(tutorId, notes) {
    try {
      await rejectScreening(tutorId, notes)
      toast.success('Tutor rejected')
      setQueue(q => q.map(t => t.id_tutor === tutorId ? { ...t, screening_status: 'rejected', screening_notes: notes } : t))
      setRejectModal(null)
    } catch { toast.error('Failed to reject') }
  }

  const pendingCount = queue.filter(t => t.screening_status === 'pending').length

  const TABS = [
    { key: 'overview',  label: 'Overview',   icon: 'dashboard' },
    { key: 'screening', label: 'Screening',  icon: 'verified_user', badge: pendingCount },
    { key: 'users',     label: 'Users',      icon: 'group' },
    { key: 'sessions',  label: 'Sessions',   icon: 'calendar_month' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: NAVY, fontFamily: '"Noto Sans JP", sans-serif', color: 'var(--text)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .admin-tab:hover { background: rgb(var(--fg) / 0.08) !important; }
        input::placeholder { color: rgb(var(--fg) / 0.30); }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgb(var(--fg) / 0.12); border-radius: 3px; }
      `}</style>

      {rejectModal && <RejectModal tutor={rejectModal} onReject={handleReject} onCancel={() => setRejectModal(null)} />}

      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, background: NAVY, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `linear-gradient(135deg, ${CORAL}, #e05a47)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text)', fontVariationSettings: '"FILL" 1' }}>shield</span>
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>Super Admin</p>
            <p style={{ fontSize: '11px', color: 'rgb(var(--fg) / 0.35)', lineHeight: 1.2 }}>StudyWithStudents</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {pendingCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: AMBER }}>pending</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: AMBER }}>{pendingCount} pending</span>
            </div>
          )}
          <button onClick={() => navigate({ to: '/hub' })} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', background: 'rgb(var(--fg) / 0.06)', border: `1px solid ${BORDER}`, color: 'rgb(var(--fg) / 0.50)', cursor: 'pointer' }}>
            ← Hub
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>
        {/* Page title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)', marginBottom: '4px' }}>Admin Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'rgb(var(--fg) / 0.35)' }}>Logged in as <span style={{ color: CORAL }}>{user?.email}</span></p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: `1px solid ${BORDER}`, paddingBottom: '0' }}>
          {TABS.map(({ key, label, icon, badge }) => {
            const active = tab === key
            return (
              <button
                key={key}
                className="admin-tab"
                onClick={() => setTab(key)}
                style={{
                  padding: '10px 18px', borderRadius: '10px 10px 0 0', fontSize: '13px', fontWeight: '700',
                  background: active ? 'rgba(255,114,94,0.12)' : 'transparent',
                  border: active ? `1px solid rgba(255,114,94,0.25)` : '1px solid transparent',
                  borderBottom: active ? `1px solid ${NAVY}` : '1px solid transparent',
                  color: active ? CORAL : 'rgb(var(--fg) / 0.45)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginBottom: '-1px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: active ? '"FILL" 1' : '"FILL" 0' }}>{icon}</span>
                {label}
                {badge > 0 && (
                  <span style={{ background: CORAL, color: 'white', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: '800' }}>{badge}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {tab === 'overview'  && <OverviewTab  stats={stats} loadingStats={loadingStats} />}
        {tab === 'screening' && <ScreeningTab queue={queue} loading={loadingQueue} onApprove={handleApprove} onReject={setRejectModal} />}
        {tab === 'users'     && <UsersTab     users={users} loading={loadingUsers} />}
        {tab === 'sessions'  && <SessionsTab  events={events} loading={loadingEvents} />}
      </div>
    </div>
  )
}
