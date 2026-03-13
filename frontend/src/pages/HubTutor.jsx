import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import { getActiveStudents } from '../api/tutors'
import { getEvents, updateStatus } from '../api/events'
import { getConversations } from '../api/messages'
import { getStudyRooms } from '../api/studyrooms'
import toast from 'react-hot-toast'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const AMBER  = '#fbbf24'

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function HubTutor() {
  const { user } = useAuth()

  const [students,      setStudents]      = useState([])
  const [events,        setEvents]        = useState([])
  const [conversations, setConversations] = useState([])
  const [rooms,         setRooms]         = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getActiveStudents().then(r  => setStudents(r.data.students ?? [])),
      getEvents().then(r          => setEvents(r.data.events ?? [])),
      getConversations().then(r   => setConversations(r.data.conversations ?? [])),
      getStudyRooms().then(r      => setRooms(r.data.rooms ?? [])),
    ]).finally(() => setLoading(false))
  }, [])

  const name     = user?.name?.split(' ')[0] ?? 'Tutor'
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const pending   = events.filter(e => e.status === 'pending')
  const confirmed = events.filter(e => e.status === 'confirmed')
  const paid      = events.filter(e => e.status === 'paid')

  // Earnings calculations
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthEarnings = [...confirmed, ...paid]
    .filter(e => e.amount && new Date(e.start_time) >= monthStart)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const totalEarnings = [...confirmed, ...paid]
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)

  // Sessions this week
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const thisWeekSessions = confirmed.filter(e => new Date(e.start_time) >= weekStart).length

  const nextRoom = rooms.find(r => new Date(r.start_time) > now)

  async function handleStatus(eventId, status) {
    try {
      await updateStatus(eventId, status)
      setEvents(prev => prev.map(e => e.id_event === eventId ? { ...e, status } : e))
      toast.success(status === 'confirmed' ? 'Session confirmed!' : 'Session declined')
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <HubLayout initialMode="tutor" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>

        {/* ── Welcome banner ────────────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          background: `linear-gradient(135deg, ${CORAL}18 0%, rgba(255,114,94,0.03) 60%)`,
          border: `1px solid ${CORAL}28`,
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '140px', height: '140px', background: `${CORAL}0c`, borderRadius: '50%', filter: 'blur(36px)', pointerEvents: 'none' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>waving_hand</span>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{greeting}</p>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)', marginBottom: '3px', lineHeight: 1.2 }}>
              {pending.length > 0
                ? `You have ${pending.length} new request${pending.length > 1 ? 's' : ''}, ${name}!`
                : `Ready to teach, ${name}?`}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              {loading ? 'Loading your dashboard…'
                : thisMonthEarnings > 0
                ? `£${thisMonthEarnings.toFixed(2)} earned this month · ${thisWeekSessions} session${thisWeekSessions !== 1 ? 's' : ''} this week`
                : nextRoom
                ? `Next study room: "${nextRoom.subject}" — ${fmt(nextRoom.start_time)}`
                : 'All caught up — create a study room or update your profile to attract students'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, zIndex: 1 }}>
            <Link to="/tutor-profile" className="btn-primary" style={{ fontSize: '12px', padding: '8px 16px' }}>
              Edit Profile
            </Link>
            <Link to="/study-rooms/tutor" style={{
              fontSize: '12px', padding: '8px 16px', borderRadius: '10px',
              background: 'var(--bg-card)', color: 'var(--text)', fontWeight: '700',
              textDecoration: 'none', border: '1px solid var(--border)',
            }}>
              Study Rooms
            </Link>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <StatCard icon="payments"      label="This Month"       value={loading ? '…' : `£${thisMonthEarnings.toFixed(2)}`} to="/payments"         accent={GREEN} large />
          <StatCard icon="hourglass_top" label="Pending Requests" value={loading ? '…' : pending.length}                    to="/events"           accent={AMBER} highlight={pending.length > 0} />
          <StatCard icon="check_circle"  label="Confirmed"        value={loading ? '…' : confirmed.length}                  to="/calendar/tutor"   accent={GREEN} />
          <StatCard icon="people"        label="Active Students"  value={loading ? '…' : students.length}                   to="/active-students"  accent={CORAL} />
        </div>

        {/* ── Main content: 2 columns ─────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            <Panel
              title="Session Requests"
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {pending.length > 0 && (
                    <span style={{ background: AMBER, color: '#1b263b', fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '9px' }}>
                      {pending.length} new
                    </span>
                  )}
                  <Link to="/events" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>View all →</Link>
                </div>
              }
              style={{ flex: 1, minHeight: 0 }}
            >
              {loading ? <Skeleton rows={3} /> : pending.length === 0 ? (
                <EmptyState icon="hourglass_empty" text="No pending requests" />
              ) : (
                pending.slice(0, 4).map(ev => (
                  <PendingRow key={ev.id_event} event={ev} onAction={handleStatus} />
                ))
              )}
            </Panel>

            <Panel
              title="Active Students"
              extra={<Link to="/active-students" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>View all →</Link>}
              style={{ flex: 1, minHeight: 0 }}
            >
              {loading ? <Skeleton rows={3} /> : students.length === 0 ? (
                <EmptyState icon="group" text="No active students yet" />
              ) : (
                students.slice(0, 5).map(s => <StudentRow key={s.id_student} student={s} />)
              )}
            </Panel>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            <Panel
              title="Confirmed Sessions"
              extra={<Link to="/calendar/tutor" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>Calendar →</Link>}
              style={{ flex: 1, minHeight: 0 }}
            >
              {loading ? <Skeleton rows={3} /> : confirmed.length === 0 ? (
                <EmptyState icon="check_circle" text="No confirmed sessions yet" />
              ) : (
                confirmed.slice(0, 5).map(ev => <SessionRow key={ev.id_event} event={ev} />)
              )}
            </Panel>

            <Panel
              title="Earnings Overview"
              extra={<Link to="/payments" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>Details →</Link>}
              style={{ flexShrink: 0 }}
            >
              <EarningsSummary
                loading={loading}
                thisMonth={thisMonthEarnings}
                total={totalEarnings}
                thisWeek={thisWeekSessions}
              />
            </Panel>
          </div>
        </div>

      </div>
    </HubLayout>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Panel({ title, extra, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexShrink: 0 }}>
        <h2 style={{ color: 'var(--text)', fontWeight: '700', fontSize: '13px' }}>{title}</h2>
        {extra}
      </div>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '13px',
        padding: '12px 14px',
        backdropFilter: 'blur(10px)',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
      }}>
        {children}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, to, accent = CORAL, highlight, large }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: highlight ? `${accent}0d` : 'var(--bg-card)',
          border: `1px solid ${highlight ? accent + '35' : 'var(--border)'}`,
          borderRadius: '12px',
          padding: large ? '14px' : '12px 14px',
          backdropFilter: 'blur(10px)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <div style={{ width: large ? '40px' : '36px', height: large ? '40px' : '36px', borderRadius: '9px', background: `${accent}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ color: accent, fontSize: large ? '22px' : '20px' }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontSize: large ? '18px' : '20px', fontWeight: '900', color: large ? accent : 'var(--text)', lineHeight: 1 }}>{value}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', marginTop: '2px' }}>{label}</div>
        </div>
      </div>
    </Link>
  )
}

function EarningsSummary({ loading, thisMonth, total, thisWeek }) {
  if (loading) return <Skeleton rows={3} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <EarningsRow label="This month"        value={`£${thisMonth.toFixed(2)}`} icon="calendar_month"  color={GREEN} />
      <EarningsRow label="Total earned"      value={`£${total.toFixed(2)}`}     icon="savings"         color={CORAL} />
      <EarningsRow label="Sessions this week" value={String(thisWeek)}          icon="event_available" color={AMBER} />
      <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-faint)', fontSize: '10px', textAlign: 'center' }}>
          Payments released after session completion
        </p>
      </div>
    </div>
  )
}

function EarningsRow({ label, value, icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="material-symbols-outlined" style={{ color, fontSize: '16px', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, color: 'var(--text-muted)', fontSize: '11px' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '800' }}>{value}</span>
    </div>
  )
}

function PendingRow({ event, onAction }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '9px', marginBottom: '9px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '7px' }}>
        <span className="material-symbols-outlined" style={{ color: AMBER, fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>pending</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            {event.student_name ?? 'Student'} · {fmt(event.start_time)}
            {event.amount ? ` · £${Number(event.amount).toFixed(2)}` : ''}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', paddingLeft: '24px' }}>
        <button
          onClick={() => onAction(event.id_event, 'confirmed')}
          style={{ flex: 1, padding: '4px 0', background: '#34d39918', color: GREEN, border: `1px solid ${GREEN}30`, borderRadius: '7px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
        >
          Confirm
        </button>
        <button
          onClick={() => onAction(event.id_event, 'canceled')}
          style={{ flex: 1, padding: '4px 0', background: '#f8717118', color: '#f87171', border: '1px solid #f8717130', borderRadius: '7px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}

function StudentRow({ student }) {
  const initials = student.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/messages" style={{ textDecoration: 'none' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', borderRadius: '6px', transition: 'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99,179,237,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#63b3ed', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600' }}>{student.name}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</div>
        </div>
        <span className="material-symbols-outlined" style={{ color: 'var(--text-faint)', fontSize: '14px' }}>chevron_right</span>
      </div>
    </Link>
  )
}

function SessionRow({ event }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="material-symbols-outlined" style={{ color: GREEN, fontSize: '16px', flexShrink: 0 }}>check_circle</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
        <div style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
          {event.student_name ?? 'Student'} · {fmt(event.start_time)}
          {event.amount ? ` · £${Number(event.amount).toFixed(2)}` : ''}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon, text, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--text-faint)', display: 'block', marginBottom: '6px' }}>{icon}</span>
      <p style={{ color: 'var(--text-faint)', fontSize: '12px', marginBottom: action ? '10px' : 0 }}>{text}</p>
      {action && (
        <Link to={action.to} style={{ color: CORAL, fontSize: '11px', fontWeight: '600', textDecoration: 'none' }}>
          {action.label} →
        </Link>
      )}
    </div>
  )
}

function Skeleton({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} style={{ height: '32px', borderRadius: '7px', background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}
