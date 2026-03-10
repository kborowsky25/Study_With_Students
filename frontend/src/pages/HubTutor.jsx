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
const GLASS  = 'rgba(255,255,255,0.06)'
const BORDER = 'rgba(255,255,255,0.1)'

const QUICK_CARDS = [
  { to: '/active-students',   label: 'My Students',   bg: '/static/images/hub/students.svg',       size: '55%' },
  { to: '/messages',          label: 'Messages',      bg: '/static/images/hub/profile.svg',         size: '65%' },
  { to: '/study-rooms/tutor', label: 'Study Rooms',   bg: '/static/images/hub/student_profile.svg', size: '60%' },
  { to: '/calendar/tutor',    label: 'Schedule',      bg: '/static/images/hub/event.svg',           size: '55%' },
  { to: '/tutor-profile',     label: 'My Profile',    bg: '/static/images/hub/tutor-profile.svg',   size: '55%' },
  { to: '/forum',             label: 'Forum',         bg: '/static/images/hub/dashboard.svg',       size: '60%' },
]

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

  const name      = user?.name?.split(' ')[0] ?? 'Tutor'
  const pending   = events.filter(e => e.status === 'pending')
  const confirmed = events.filter(e => e.status === 'confirmed')
  const nextRoom  = rooms.find(r => new Date(r.start_time) > new Date())

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
    <HubLayout initialMode="tutor">

      {/* ── Welcome banner ────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(99,179,237,0.15) 0%, transparent 60%)', border: '1px solid rgba(99,179,237,0.2)', borderRadius: '20px', padding: '28px 32px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-60px', top: '-60px', width: '200px', height: '200px', background: 'rgba(99,179,237,0.1)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>Welcome back, Tutor 🎓</p>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'white', marginBottom: '6px' }}>
          Tutoring time, {name}?
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', marginBottom: '20px' }}>
          {pending.length > 0
            ? `You have ${pending.length} session request${pending.length > 1 ? 's' : ''} waiting for your response.`
            : nextRoom
            ? `Next study room: "${nextRoom.subject}" — ${fmt(nextRoom.start_time)}`
            : 'All caught up! Create a study room or wait for student requests.'}
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/tutor-profile" style={{ textDecoration: 'none', backgroundColor: CORAL, color: 'white', padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '700' }}>
            Edit Profile
          </Link>
          <Link to="/study-rooms/tutor" style={{ textDecoration: 'none', backgroundColor: 'rgba(255,255,255,0.08)', color: 'white', padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', border: `1px solid ${BORDER}` }}>
            Manage Study Rooms
          </Link>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard icon="cast_for_education" label="Active Students"  value={loading ? '…' : students.length}   color="#63b3ed" to="/active-students"  />
        <StatCard icon="hourglass_top"      label="Pending Requests" value={loading ? '…' : pending.length}    color="#fbbf24" to="/events"           highlight={pending.length > 0} />
        <StatCard icon="check_circle"       label="Confirmed"        value={loading ? '…' : confirmed.length}  color="#34d399" to="/calendar/tutor"  />
        <StatCard icon="message"            label="Conversations"    value={loading ? '…' : conversations.length} color={CORAL} to="/messages"        />
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>

        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Pending session requests — with action buttons */}
          <div>
            <SectionTitle>
              Session Requests
              {pending.length > 0 && (
                <span style={{ marginLeft: '8px', backgroundColor: '#fbbf24', color: '#1b263b', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                  {pending.length} new
                </span>
              )}
              <Link to="/events" style={{ marginLeft: 'auto', color: CORAL, fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>View all →</Link>
            </SectionTitle>
            <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              {loading ? (
                <Skeleton rows={3} />
              ) : pending.length === 0 ? (
                <EmptyState icon="hourglass_empty" text="No pending requests" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pending.slice(0, 4).map(ev => (
                    <PendingRow key={ev.id_event} event={ev} onAction={handleStatus} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active students */}
          <div>
            <SectionTitle>
              Active Students
              <Link to="/active-students" style={{ marginLeft: 'auto', color: CORAL, fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>View all →</Link>
            </SectionTitle>
            <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              {loading ? (
                <Skeleton rows={3} />
              ) : students.length === 0 ? (
                <EmptyState icon="group" text="No active students yet" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {students.slice(0, 5).map(s => <StudentRow key={s.id_student} student={s} />)}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Quick navigation cards */}
          <div>
            <SectionTitle>Quick Navigation</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(3, 100px)', gap: '10px' }}>
              {QUICK_CARDS.map(c => <SvgNavCard key={c.to} {...c} />)}
            </div>
          </div>

          {/* Upcoming study rooms */}
          <div>
            <SectionTitle>
              My Study Rooms
              <Link to="/study-rooms/tutor" style={{ marginLeft: 'auto', color: CORAL, fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>Manage →</Link>
            </SectionTitle>
            <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              {loading ? (
                <Skeleton rows={2} />
              ) : rooms.length === 0 ? (
                <EmptyState icon="chair" text="No study rooms yet" action={{ to: '/study-rooms/tutor', label: 'Create your first room' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {rooms.slice(0, 3).map(r => <RoomRow key={r.id} room={r} />)}
                </div>
              )}
            </div>
          </div>

          {/* Confirmed upcoming */}
          <div>
            <SectionTitle>
              Confirmed Sessions
              <Link to="/calendar/tutor" style={{ marginLeft: 'auto', color: CORAL, fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>Calendar →</Link>
            </SectionTitle>
            <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              {loading ? (
                <Skeleton rows={2} />
              ) : confirmed.length === 0 ? (
                <EmptyState icon="check_circle" text="No confirmed sessions yet" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {confirmed.slice(0, 3).map(ev => <SessionRow key={ev.id_event} event={ev} />)}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </HubLayout>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
      <h2 style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>{children}</h2>
    </div>
  )
}

function StatCard({ icon, label, value, color, to, highlight }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{ background: highlight ? `${color}18` : GLASS, border: `1px solid ${highlight ? color + '44' : BORDER}`, borderRadius: '16px', padding: '18px 16px', backdropFilter: 'blur(10px)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.25)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <span className="material-symbols-outlined" style={{ color, fontSize: '26px' }}>{icon}</span>
        <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '6px 0 2px' }}>{value}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{label}</div>
      </div>
    </Link>
  )
}

function PendingRow({ event, onAction }) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
        <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>pending</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
            {event.student_name ?? 'Student'} · {fmt(event.start_time)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', paddingLeft: '30px' }}>
        <button
          onClick={() => onAction(event.id_event, 'confirmed')}
          style={{ flex: 1, padding: '5px 0', backgroundColor: '#34d39920', color: '#34d399', border: '1px solid #34d39940', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
        >
          Confirm
        </button>
        <button
          onClick={() => onAction(event.id_event, 'canceled')}
          style={{ flex: 1, padding: '5px 0', backgroundColor: '#f8717120', color: '#f87171', border: '1px solid #f8717140', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
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
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${BORDER}`, borderRadius: '6px', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(99,179,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#63b3ed', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{student.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</div>
        </div>
        <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px' }}>chevron_right</span>
      </div>
    </Link>
  )
}

function SessionRow({ event }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span className="material-symbols-outlined" style={{ color: '#34d399', fontSize: '20px', flexShrink: 0 }}>check_circle</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'white', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{event.student_name ?? 'Student'} · {fmt(event.start_time)}</div>
      </div>
    </div>
  )
}

function RoomRow({ room }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '20px', flexShrink: 0 }}>chair</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'white', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.subject}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{fmt(room.start_time)}</div>
      </div>
      {room.zoom_link && (
        <a href={room.zoom_link} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontSize: '11px', fontWeight: '700', textDecoration: 'none', flexShrink: 0 }}>Zoom →</a>
      )}
    </div>
  )
}

function SvgNavCard({ to, label, bg, size }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        borderRadius: '14px',
        backgroundImage: `url(${bg})`,
        backgroundSize: size,
        backgroundPosition: 'center 25%',
        backgroundRepeat: 'no-repeat',
        backgroundColor: GLASS,
        backdropFilter: 'blur(5px)',
        border: `1px solid ${BORDER}`,
        paddingBottom: '8px',
        textDecoration: 'none',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <span style={{ color: 'white', fontSize: '11px', fontWeight: '700', background: 'rgba(255,114,94,0.85)', padding: '3px 10px', borderRadius: '6px' }}>{label}</span>
    </Link>
  )
}

function EmptyState({ icon, text, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', textAlign: 'center' }}>
      <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '36px', marginBottom: '8px' }}>{icon}</span>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: action ? '10px' : 0 }}>{text}</p>
      {action && (
        <Link to={action.to} style={{ color: CORAL, fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>{action.label} →</Link>
      )}
    </div>
  )
}

function Skeleton({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '6px', width: '60%' }} />
            <div style={{ height: '8px',  backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px', width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
