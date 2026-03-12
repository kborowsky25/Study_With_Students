import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import { getActiveTutors } from '../api/tutors'
import { getEvents } from '../api/events'
import { getConversations } from '../api/messages'

const CORAL = '#ff725e'

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function HubStudent() {
  const { user } = useAuth()

  const [activeTutors,  setActiveTutors]  = useState([])
  const [events,        setEvents]        = useState([])
  const [conversations, setConversations] = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getActiveTutors().then(r  => setActiveTutors(r.data.tutors ?? [])),
      getEvents().then(r        => setEvents(r.data.events ?? [])),
      getConversations().then(r => setConversations(r.data.conversations ?? [])),
    ]).finally(() => setLoading(false))
  }, [])

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name     = user?.name?.split(' ')[0] ?? 'Student'

  const upcoming  = events.filter(e => e.status === 'confirmed' || e.status === 'pending')
  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread || 0), 0)

  const quickActions = [
    { to: '/find-tutors',      icon: 'search',           label: 'Find a Tutor', color: CORAL       },
    { to: '/calendar/student', icon: 'calendar_month',   label: 'My Calendar',  color: '#34d399'   },
    { to: '/messages',         icon: 'message',          label: 'Messages',     color: '#60a5fa'   },
    { to: '/forum',            icon: 'forum',            label: 'Forum',        color: '#fbbf24'   },
  ]

  return (
    <HubLayout initialMode="student">

      {/* ── Welcome banner ───────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${CORAL}18 0%, rgba(255,114,94,0.03) 60%)`,
        border: `1px solid ${CORAL}28`,
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '160px', height: '160px', background: `${CORAL}0e`, borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '2px' }}>{greeting} 👋</p>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text)', marginBottom: '4px' }}>
            Ready to study, {name}?
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            {upcoming[0]
              ? `📅 Next: "${upcoming[0].title}" — ${fmt(upcoming[0].start_time)}`
              : activeTutors.length > 0
              ? `You have ${activeTutors.length} active tutor${activeTutors.length > 1 ? 's' : ''} — keep the momentum going!`
              : 'No sessions yet — find a tutor and book your first session'}
          </p>
        </div>
        <Link to="/find-tutors" className="btn-primary" style={{ fontSize: '13px', padding: '9px 18px', flexShrink: 0, zIndex: 1 }}>
          Find a Tutor →
        </Link>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <StatCard icon="cast_for_education" label="Active Tutors"     value={loading ? '…' : activeTutors.length}  to="/active-tutors"    />
        <StatCard icon="calendar_clock"     label="Upcoming Sessions" value={loading ? '…' : upcoming.length}      to="/calendar/student" />
        <StatCard icon="message"            label="Messages"          value={loading ? '…' : conversations.length} to="/messages"         highlight={unreadCount > 0} badge={unreadCount || null} />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {quickActions.map(({ to, icon, label, color }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  backdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = color + '50' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color }}>{icon}</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main content: 2 columns ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Left: Upcoming sessions */}
        <Panel
          title="Upcoming Sessions"
          extra={<Link to="/calendar/student" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>View calendar →</Link>}
        >
          {loading ? <Skeleton rows={4} /> : upcoming.length === 0 ? (
            <EmptyState icon="calendar_clock" text="No upcoming sessions" action={{ to: '/find-tutors', label: 'Book a session' }} />
          ) : (
            upcoming.slice(0, 6).map(ev => <SessionRow key={ev.id_event} event={ev} />)
          )}
        </Panel>

        {/* Right: My tutors + Recent messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <Panel
            title="My Tutors"
            extra={<Link to="/active-tutors" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>View all →</Link>}
          >
            {loading ? <Skeleton rows={3} /> : activeTutors.length === 0 ? (
              <EmptyState icon="cast_for_education" text="No active tutors yet" action={{ to: '/find-tutors', label: 'Find a tutor' }} />
            ) : (
              activeTutors.slice(0, 4).map(t => <TutorRow key={t.id_tutor} tutor={t} />)
            )}
          </Panel>

          <Panel
            title="Recent Messages"
            extra={<Link to="/messages" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>Open →</Link>}
          >
            {loading ? <Skeleton rows={2} /> : conversations.length === 0 ? (
              <EmptyState icon="message" text="No messages yet" />
            ) : (
              conversations.slice(0, 3).map(c => <ConvoRow key={c.user_id} convo={c} />)
            )}
          </Panel>

        </div>
      </div>
    </HubLayout>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Panel({ title, extra, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ color: 'var(--text)', fontWeight: '700', fontSize: '14px' }}>{title}</h2>
        {extra}
      </div>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '14px 16px',
        backdropFilter: 'blur(10px)',
      }}>
        {children}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, to, highlight, badge }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: highlight ? 'rgba(96,165,250,0.07)' : 'var(--bg-card)',
          border: `1px solid ${highlight ? 'rgba(96,165,250,0.25)' : 'var(--border)'}`,
          borderRadius: '14px',
          padding: '14px 16px',
          backdropFilter: 'blur(10px)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'relative',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '22px' }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>{value}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '3px' }}>{label}</div>
        </div>
        {badge && (
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: '#60a5fa', color: 'white',
            fontSize: '10px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {badge}
          </div>
        )}
      </div>
    </Link>
  )
}

function SessionRow({ event }) {
  const STATUS_COLOR = { pending: '#fbbf24', confirmed: '#34d399', canceled: '#f87171', paid: '#60a5fa' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '18px', flexShrink: 0 }}>event</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
        <div style={{ color: 'var(--text-faint)', fontSize: '11px' }}>{fmt(event.start_time)}</div>
      </div>
      <span style={{ color: STATUS_COLOR[event.status] ?? '#fbbf24', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{event.status}</span>
    </div>
  )
}

function TutorRow({ tutor }) {
  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/tutor/$tutorId" params={{ tutorId: String(tutor.id_tutor) }} style={{ textDecoration: 'none' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--border)', borderRadius: '6px', transition: 'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${CORAL}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CORAL, fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '600' }}>{tutor.name}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tutor.subjects}</div>
        </div>
        <span className="material-symbols-outlined" style={{ color: 'var(--text-faint)', fontSize: '16px' }}>chevron_right</span>
      </div>
    </Link>
  )
}

function ConvoRow({ convo }) {
  const initials = convo.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/messages" style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(176,190,197,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0bec5', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '600' }}>{convo.name}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.last_message ?? 'No messages yet'}</div>
        </div>
        {convo.unread > 0 && (
          <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: CORAL, color: 'white', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {convo.unread}
          </span>
        )}
      </div>
    </Link>
  )
}

function EmptyState({ icon, text, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--text-faint)', display: 'block', marginBottom: '8px' }}>{icon}</span>
      <p style={{ color: 'var(--text-faint)', fontSize: '13px', marginBottom: action ? '12px' : 0 }}>{text}</p>
      {action && (
        <Link to={action.to} style={{ color: CORAL, fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
          {action.label} →
        </Link>
      )}
    </div>
  )
}

function Skeleton({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} style={{ height: '38px', borderRadius: '8px', background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}
