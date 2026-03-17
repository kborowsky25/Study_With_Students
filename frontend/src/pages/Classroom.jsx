import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import { useAuth } from '../context/AuthContext'
import {
  getClassrooms, getMyClassrooms, createClassroom,
  payAndEnroll, unenrollClassroom,
} from '../api/classroom'

const CORAL = '#ff725e'
const GREEN = '#34d399'
const AMBER = '#fbbf24'
const BLUE  = '#60a5fa'

const SUBJECT_ICONS = {
  math: 'calculate', maths: 'calculate', calculus: 'calculate', algebra: 'calculate',
  chemistry: 'science', biology: 'biotech', physics: 'bolt',
  english: 'edit_note', writing: 'edit_note', essay: 'edit_note',
  history: 'history_edu', economics: 'trending_up', psychology: 'psychology',
  programming: 'code', cs: 'code', coding: 'code', python: 'code',
}

function getSubjectIcon(subject = '') {
  const s = subject.toLowerCase()
  for (const [key, icon] of Object.entries(SUBJECT_ICONS)) {
    if (s.includes(key)) return icon
  }
  return 'school'
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function isLive(start, end) {
  const now = new Date()
  return start && end && new Date(start) <= now && new Date(end) >= now
}

function isSoon(start) {
  if (!start) return false
  const diff = new Date(start) - new Date()
  return diff > 0 && diff < 60 * 60 * 1000
}

// ── Join modal ────────────────────────────────────────────────────────────────
function JoinModal({ classroom, isPremium, freeUsed, onClose, onJoin }) {
  const [loading, setLoading] = useState(false)
  const canUseFree = isPremium && !freeUsed

  async function handleJoin(useFree) {
    setLoading(true)
    try {
      await onJoin(classroom.id, useFree)
      onClose()
    } catch {
      /* error toasted in parent */
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(7px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '22px', padding: '28px 28px 24px',
          maxWidth: '420px', width: '100%',
          boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px', color: CORAL }}>
              {getSubjectIcon(classroom.subject)}
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
              {classroom.title}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
              {classroom.subject} · {classroom.tutor_name}
            </p>
          </div>
        </div>

        {/* Info row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
          {[
            { icon: 'group', label: `${classroom.enrolled_count ?? 0} / ${classroom.capacity} students` },
            { icon: 'schedule', label: formatDateTime(classroom.start_time) },
          ].map(({ icon, label }) => (
            <div key={icon} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 12px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{icon}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{label}</span>
            </div>
          ))}
        </div>

        <p style={{
          fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px',
        }}>
          Choose payment
        </p>

        {canUseFree && (
          <button
            onClick={() => handleJoin(true)}
            disabled={loading}
            style={{
              width: '100%', marginBottom: '10px',
              padding: '13px 16px', borderRadius: '12px',
              background: `${AMBER}14`, border: `1.5px solid ${AMBER}50`,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = AMBER }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${AMBER}50` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: AMBER }}>workspace_premium</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: AMBER }}>Use free credit</div>
                <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '1px' }}>1 free classroom / month with Explorer ✦</div>
              </div>
            </div>
            <span style={{ fontSize: '14px', fontWeight: '900', color: AMBER }}>Free</span>
          </button>
        )}

        <button
          onClick={() => handleJoin(false)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '13px 16px', borderRadius: '12px',
            background: loading ? 'rgba(255,255,255,0.05)' : `${CORAL}14`,
            border: `1.5px solid ${CORAL}35`,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = CORAL }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${CORAL}35` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: CORAL }}>payments</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: CORAL }}>Pay to join</div>
              <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '1px' }}>Simulation only · no real charge</div>
            </div>
          </div>
          {loading
            ? <span className="material-symbols-outlined" style={{ fontSize: '16px', color: CORAL, animation: 'spin 1s linear infinite' }}>progress_activity</span>
            : <span style={{ fontSize: '14px', fontWeight: '900', color: CORAL }}>£2</span>
          }
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: '10px', padding: '10px',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: '10px', cursor: 'pointer',
            fontSize: '13px', color: 'var(--text-muted)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Create modal (tutor) ──────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '', subject: '', description: '',
    start_time: '', end_time: '', zoom_link: '', capacity: 20,
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.subject || !form.start_time) {
      toast.error('Title, subject, and start time are required')
      return
    }
    setLoading(true)
    try {
      await onCreate(form)
      onClose()
    } catch { /* toasted in parent */ } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '10px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '13px', outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px', display: 'block',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(7px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '22px', padding: '28px',
          maxWidth: '500px', width: '100%',
          boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL }}>add_circle</span>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Create Classroom</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '2px 0 0' }}>Up to 20 students · students pay £2 to join</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: '4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Session Title *</label>
            <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Advanced Calculus — Chapter 5" required />
          </div>
          <div>
            <label style={labelStyle}>Subject *</label>
            <input style={inputStyle} value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Mathematics" required />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What will students learn in this session?"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Start *</label>
              <input type="datetime-local" style={inputStyle} value={form.start_time} onChange={e => set('start_time', e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>End</label>
              <input type="datetime-local" style={inputStyle} value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Zoom / Meeting Link</label>
            <input style={inputStyle} value={form.zoom_link} onChange={e => set('zoom_link', e.target.value)} placeholder="https://zoom.us/j/..." />
          </div>
          <div>
            <label style={labelStyle}>Max Students (1–20)</label>
            <input
              type="number" min="1" max="20" style={inputStyle}
              value={form.capacity}
              onChange={e => set('capacity', Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: '11px', borderRadius: '11px',
                background: 'transparent', border: '1px solid var(--border)',
                cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="btn-primary"
              style={{
                flex: 2, padding: '11px', fontSize: '14px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              }}
            >
              {loading
                ? <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              }
              Create Classroom
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Classroom card ────────────────────────────────────────────────────────────
function ClassroomCard({ room, onJoin, onUnenroll, isEnrolled, tutorView }) {
  const [hovered, setHovered] = useState(false)
  const live     = isLive(room.start_time, room.end_time)
  const soon     = isSoon(room.start_time)
  const fillPct  = ((room.enrolled_count ?? 0) / (room.capacity || 20)) * 100
  const full     = (room.enrolled_count ?? 0) >= (room.capacity || 20)

  const statusColor = live ? GREEN : soon ? AMBER : BLUE
  const statusLabel = live ? 'Live Now' : soon ? 'Starting soon' : formatDateTime(room.start_time)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? CORAL + '55' : 'var(--border)'}`,
        borderRadius: '16px', padding: '18px 20px',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? `0 8px 30px rgba(255,114,94,0.12)` : '0 2px 8px rgba(0,0,0,0.06)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '16px',
          background: `linear-gradient(135deg, ${CORAL}09 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: CORAL }}>
              {getSubjectIcon(room.subject)}
            </span>
          </div>
          <div>
            <div style={{ color: 'var(--text)', fontSize: '14px', fontWeight: '700', lineHeight: 1.2 }}>{room.title}</div>
            <div style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '2px' }}>
              {tutorView ? room.subject : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '11px', verticalAlign: 'middle', marginRight: '3px' }}>person</span>
                  {room.tutor_name}
                </>
              )}
            </div>
          </div>
        </div>

        <span style={{
          background: `${statusColor}18`, color: statusColor,
          border: `1px solid ${statusColor}35`,
          fontSize: '10px', fontWeight: '700',
          padding: '4px 10px', borderRadius: '20px',
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          {live && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: statusColor, display: 'inline-block',
              animation: 'classroomPulse 1.5s infinite',
            }} />
          )}
          {statusLabel}
        </span>
      </div>

      {/* Capacity bar */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>group</span>
            {room.enrolled_count ?? 0} / {room.capacity} students
          </span>
          <span style={{ fontSize: '10px', color: full ? '#f87171' : 'var(--text-faint)' }}>
            {full ? 'Full' : `${(room.capacity || 20) - (room.enrolled_count ?? 0)} spots left`}
          </span>
        </div>
        <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${fillPct}%`,
            background: fillPct > 80
              ? 'linear-gradient(90deg, #f87171, #ef4444)'
              : fillPct > 50
              ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
              : `linear-gradient(90deg, ${CORAL}, #ff9a3c)`,
            borderRadius: '3px', transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Student footer */}
      {!tutorView && (
        isEnrolled ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            {room.zoom_link ? (
              <a href={room.zoom_link} target="_blank" rel="noopener noreferrer" style={{ flex: 2, textDecoration: 'none' }}>
                <button
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '13px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>videocam</span>
                  Join Session
                </button>
              </a>
            ) : (
              <div style={{
                flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: `${GREEN}14`, border: `1px solid ${GREEN}30`,
                borderRadius: '10px', padding: '9px', fontSize: '12px', color: GREEN, fontWeight: '600',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                Enrolled
              </div>
            )}
            <button
              className="btn-secondary"
              onClick={() => onUnenroll(room.id)}
              style={{ flex: 1, fontSize: '12px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>logout</span>
              Leave
            </button>
          </div>
        ) : (
          <button
            className={full ? 'btn-secondary' : 'btn-primary'}
            onClick={() => !full && onJoin(room)}
            disabled={full}
            style={{
              width: '100%', fontSize: '13px', padding: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              opacity: full ? 0.5 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{full ? 'block' : 'payments'}</span>
            {full ? 'Classroom Full' : 'Join · £2'}
          </button>
        )
      )}

      {/* Tutor footer */}
      {tutorView && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: '9px', padding: '8px 12px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: CORAL }}>group</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{room.enrolled_count ?? 0} enrolled</span>
          </div>
          {room.zoom_link && (
            <a href={room.zoom_link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button
                className="btn-primary"
                style={{ fontSize: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>videocam</span>
                Start
              </button>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Classroom() {
  const { isTutor, isPremium, user } = useAuth()
  const mode = localStorage.getItem('sws_hub_mode') ?? (isTutor ? 'tutor' : 'student')
  const isApproved = user?.screening_status === 'approved'

  const [classrooms,   setClassrooms]   = useState([])
  const [myClassrooms, setMyClassrooms] = useState([])
  const [freeUsed,     setFreeUsed]     = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('browse')
  const [joinTarget,   setJoinTarget]   = useState(null)
  const [showCreate,   setShowCreate]   = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      if (mode === 'tutor') {
        const r = await getMyClassrooms()
        setMyClassrooms(r.data.classrooms ?? [])
      } else {
        const r = await getClassrooms()
        setClassrooms(r.data.classrooms ?? [])
        setFreeUsed(r.data.free_classroom_used ?? false)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [mode])

  async function handleJoin(classroomId, useFree) {
    await payAndEnroll(classroomId, { use_free: useFree })
    toast.success(useFree ? 'Free credit used — enrolled! ✨' : 'Payment simulated — enrolled! 🎉')
    if (useFree) setFreeUsed(true)
    setClassrooms(prev => prev.map(c =>
      c.id === classroomId
        ? { ...c, enrolled: true, enrolled_count: (c.enrolled_count ?? 0) + 1 }
        : c
    ))
  }

  async function handleUnenroll(classroomId) {
    try {
      await unenrollClassroom(classroomId)
      toast.success('Left classroom')
      setClassrooms(prev => prev.map(c =>
        c.id === classroomId
          ? { ...c, enrolled: false, enrolled_count: Math.max(0, (c.enrolled_count ?? 1) - 1) }
          : c
      ))
    } catch {
      toast.error('Could not leave — try again')
    }
  }

  async function handleCreate(formData) {
    await createClassroom({ ...formData, capacity: Math.min(20, parseInt(formData.capacity) || 20) })
    toast.success('Classroom created!')
    loadData()
  }

  const enrolledClassrooms = classrooms.filter(c => c.enrolled)
  const browseClassrooms   = classrooms.filter(c => !c.enrolled)

  // ── Tutor view ──────────────────────────────────────────────────────────────
  if (mode === 'tutor') {
    const totalEnrolled = myClassrooms.reduce((s, c) => s + (c.enrolled_count ?? 0), 0)
    const upcoming      = myClassrooms.filter(c => !isLive(c.start_time, c.end_time))

    return (
      <HubLayout mode="tutor">
        <PageTitle title="Classroom" icon="school" />
        <div style={{ width: '100%' }}>

          {/* Pending approval banner */}
          {!isApproved && (
            <div style={{
              marginBottom: '20px', padding: '14px 18px', borderRadius: '14px',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: AMBER, flexShrink: 0 }}>lock</span>
              <p style={{ fontSize: '13px', color: AMBER, margin: 0, lineHeight: 1.5 }}>
                <strong>Pending approval</strong> — you can browse classrooms, but creating sessions is locked until your tutor profile is approved.
              </p>
            </div>
          )}

          {/* Top action row */}
          <div className="animate-slide-up" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', flexWrap: 'wrap', marginBottom: '20px',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
              Create and manage group sessions · students pay £2 to join
            </p>
            <button
              className="btn-primary"
              onClick={() => isApproved && setShowCreate(true)}
              disabled={!isApproved}
              title={!isApproved ? 'Available once your profile is approved' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', padding: '9px 18px', flexShrink: 0, opacity: isApproved ? 1 : 0.45, cursor: isApproved ? 'pointer' : 'not-allowed' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{isApproved ? 'add' : 'lock'}</span>
              Create Classroom
            </button>
          </div>

          {/* Stats row */}
          <div className="animate-slide-up delay-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { icon: 'school',           label: 'Total Classrooms', value: myClassrooms.length, color: CORAL },
              { icon: 'group',            label: 'Total Enrolled',   value: totalEnrolled,        color: GREEN },
              { icon: 'pending_actions',  label: 'Upcoming',         value: upcoming.length,      color: BLUE  },
            ].map(({ icon, label, value, color }) => (
              <div key={icon} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color }}>{icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Classrooms grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)' }}>Loading…</div>
          ) : myClassrooms.length === 0 ? (
            <EmptyState
              icon="school"
              title="No classrooms yet"
              desc="Create your first group session to get started"
              action={<button className="btn-primary" onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>Create First Classroom</button>}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {myClassrooms.map(room => (
                <ClassroomCard key={room.id} room={room} tutorView />
              ))}
            </div>
          )}
        </div>

        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
        <Styles />
      </HubLayout>
    )
  }

  // ── Student view ────────────────────────────────────────────────────────────
  return (
    <HubLayout>
      <PageTitle title="Classroom" icon="school" />
      <div style={{ width: '100%' }}>

        {/* Top action row */}
        <div className="animate-slide-up" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', flexWrap: 'wrap', marginBottom: '18px',
        }}>
          <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
            Live group sessions · up to 20 students · £2 to join
          </p>
          {/* Free credit indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            background: isPremium && !freeUsed ? `${AMBER}12` : 'transparent',
            border: `1px solid ${isPremium && !freeUsed ? AMBER + '35' : 'transparent'}`,
            borderRadius: '10px', padding: isPremium ? '5px 11px' : '0', flexShrink: 0,
          }}>
            {isPremium && (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: freeUsed ? 'var(--text-faint)' : AMBER }}>workspace_premium</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: freeUsed ? 'var(--text-faint)' : AMBER }}>
                  {freeUsed ? 'Credit used' : 'Free credit available'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="animate-slide-up delay-100" style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {[
            { id: 'browse',   label: 'Browse',        icon: 'explore', count: browseClassrooms.length },
            { id: 'enrolled', label: 'My Classrooms',  icon: 'school',  count: enrolledClassrooms.length },
          ].map(({ id, label, icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 16px', borderRadius: '11px',
                background: tab === id ? `${CORAL}18` : 'transparent',
                border: `1px solid ${tab === id ? CORAL + '40' : 'var(--border)'}`,
                cursor: 'pointer', fontSize: '13px',
                fontWeight: tab === id ? '700' : '500',
                color: tab === id ? CORAL : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{icon}</span>
              {label}
              <span style={{
                background: tab === id ? CORAL : 'var(--bg-secondary)',
                color: tab === id ? 'white' : 'var(--text-faint)',
                borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: '700',
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)' }}>Loading…</div>
        ) : tab === 'browse' ? (
          browseClassrooms.length === 0 ? (
            <EmptyState
              icon="school"
              title="No classrooms available yet"
              desc="Check back soon — tutors will be posting sessions here."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {browseClassrooms.map(room => (
                <ClassroomCard
                  key={room.id} room={room}
                  isEnrolled={false} onJoin={setJoinTarget} onUnenroll={handleUnenroll}
                />
              ))}
            </div>
          )
        ) : (
          enrolledClassrooms.length === 0 ? (
            <EmptyState
              icon="school"
              title="You haven't joined any classrooms yet"
              desc="Browse available sessions and join one for just £2."
              action={
                <button className="btn-primary" onClick={() => setTab('browse')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>explore</span>
                  Browse Classrooms
                </button>
              }
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {enrolledClassrooms.map(room => (
                <ClassroomCard
                  key={room.id} room={room}
                  isEnrolled onJoin={setJoinTarget} onUnenroll={handleUnenroll}
                />
              ))}
            </div>
          )
        )}
      </div>

      {joinTarget && (
        <JoinModal
          classroom={joinTarget}
          isPremium={isPremium}
          freeUsed={freeUsed}
          onClose={() => setJoinTarget(null)}
          onJoin={handleJoin}
        />
      )}
      <Styles />
    </HubLayout>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="animate-slide-up delay-200" style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '18px', padding: '52px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '18px',
        background: `${CORAL}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '34px', color: `${CORAL}80` }}>{icon}</span>
      </div>
      <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>{title}</p>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: action ? '20px' : 0 }}>{desc}</p>
      {action}
    </div>
  )
}

function Styles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes classroomPulse { 0%,100% { opacity:1 } 50% { opacity:0.35 } }
    `}</style>
  )
}
