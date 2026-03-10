import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import { getActiveTutors } from '../api/tutors'
import { getEvents } from '../api/events'
import { getConversations } from '../api/messages'

const CORAL  = '#ff725e'
const NAVY   = '#1b263b'
const GLASS  = 'rgba(255,255,255,0.06)'
const BORDER = 'rgba(255,255,255,0.1)'

// ── Quick navigation cards (SVG background style, original hub inspired) ──────
const QUICK_CARDS = [
  { to: '/find-tutors',         label: 'Find a Tutor',   bg: '/static/images/hub/tutor.svg',          size: '55%' },
  { to: '/active-tutors',       label: 'My Tutors',      bg: '/static/images/hub/student_profile.svg', size: '80%' },
  { to: '/messages',            label: 'Messages',       bg: '/static/images/hub/profile.svg',         size: '65%' },
  { to: '/liked-tutors',        label: 'Liked Tutors',   bg: '/static/images/hub/event.svg',           size: '55%' },
  { to: '/study-rooms/student', label: 'Study Rooms',    bg: '/static/images/hub/students.svg',        size: '60%' },
  { to: '/dashboard',           label: 'Dashboard',      bg: '/static/images/hub/dashboard.svg',       size: '65%' },
  { to: '/calendar/student',    label: 'Calendar',       bg: '/static/images/hub/event.svg',           size: '55%' },
  { to: '/payments',            label: 'Payments',       bg: '/static/images/hub/dashboard.svg',       size: '55%' },
]

export default function HubStudent() {
  const { user } = useAuth()
  const barRef   = useRef(null)

  const [activeTutors,  setActiveTutors]  = useState([])
  const [events,        setEvents]        = useState([])
  const [conversations, setConversations] = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getActiveTutors().then(r   => setActiveTutors(r.data.tutors ?? [])),
      getEvents().then(r         => setEvents(r.data.events ?? [])),
      getConversations().then(r  => setConversations(r.data.conversations ?? [])),
    ]).finally(() => setLoading(false))
  }, [])

  // Animate progress bar
  useEffect(() => {
    const t = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = '30%'
    }, 300)
    return () => clearTimeout(t)
  }, [])

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name     = user?.name?.split(' ')[0] ?? 'Student'

  const upcoming = events.filter(e => e.status === 'confirmed' || e.status === 'pending')
  const nextSession = upcoming[0]

  return (
    <HubLayout initialMode="student">

      {/* ── Welcome banner ────────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, ${CORAL}22 0%, transparent 60%)`, border: `1px solid ${CORAL}33`, borderRadius: '20px', padding: '28px 32px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
        {/* Coral glow orb */}
        <div style={{ position: 'absolute', right: '-60px', top: '-60px', width: '200px', height: '200px', background: `${CORAL}18`, borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>{greeting} 👋</p>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'white', marginBottom: '6px' }}>
          Ready to study, {name}?
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', marginBottom: '20px' }}>
          {nextSession
            ? `Next session: "${nextSession.title}" — ${fmt(nextSession.start_time)}`
            : 'No upcoming sessions. Find a tutor to get started!'}
        </p>

        {/* XP Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: CORAL, fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Level 1</span>
          <div style={{ flex: 1, maxWidth: '380px', height: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
            <div ref={barRef} style={{ width: '5%', height: '100%', backgroundColor: CORAL, borderRadius: '10px', transition: 'width 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)' }} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>30 / 100 XP</span>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard icon="cast_for_education" label="Active Tutors"    value={loading ? '…' : activeTutors.length}   to="/active-tutors"   />
        <StatCard icon="calendar_clock"     label="Upcoming Sessions" value={loading ? '…' : upcoming.length}       to="/calendar/student"/>
        <StatCard icon="message"            label="Conversations"    value={loading ? '…' : conversations.length}  to="/messages"        />
        <StatCard icon="forum"              label="Forum"            value="∞"                                      to="/forum"           />
      </div>

      {/* ── Main grid: nav cards + recent activity ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>

        {/* Navigation cards (SVG style, original inspired) */}
        <div>
          <SectionTitle>Quick Navigation</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4, 120px)', gap: '12px' }}>
            {QUICK_CARDS.map(c => <SvgNavCard key={c.to} {...c} />)}
          </div>
        </div>

        {/* Right column: upcoming sessions + active tutors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Upcoming sessions */}
          <div>
            <SectionTitle>
              Upcoming Sessions
              <Link to="/calendar/student" style={{ marginLeft: 'auto', color: CORAL, fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>View calendar →</Link>
            </SectionTitle>
            <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              {loading ? (
                <Skeleton rows={3} />
              ) : upcoming.length === 0 ? (
                <EmptyState icon="calendar_clock" text="No upcoming sessions" action={{ to: '/find-tutors', label: 'Book a session' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {upcoming.slice(0, 4).map(ev => (
                    <SessionRow key={ev.id_event} event={ev} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My active tutors */}
          <div>
            <SectionTitle>
              My Tutors
              <Link to="/active-tutors" style={{ marginLeft: 'auto', color: CORAL, fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>View all →</Link>
            </SectionTitle>
            <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              {loading ? (
                <Skeleton rows={3} />
              ) : activeTutors.length === 0 ? (
                <EmptyState icon="cast_for_education" text="No active tutors yet" action={{ to: '/find-tutors', label: 'Find a tutor' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {activeTutors.slice(0, 4).map(t => (
                    <TutorRow key={t.id_tutor} tutor={t} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent messages */}
          <div>
            <SectionTitle>
              Recent Messages
              <Link to="/messages" style={{ marginLeft: 'auto', color: CORAL, fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>Open messages →</Link>
            </SectionTitle>
            <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              {loading ? (
                <Skeleton rows={2} />
              ) : conversations.length === 0 ? (
                <EmptyState icon="message" text="No messages yet" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {conversations.slice(0, 3).map(c => (
                    <ConvoRow key={c.user_id} convo={c} />
                  ))}
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
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
      <h2 style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>{children}</h2>
    </div>
  )
}

function StatCard({ icon, label, value, to }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '18px 16px', backdropFilter: 'blur(10px)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.25)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '26px' }}>{icon}</span>
        <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '6px 0 2px' }}>{value}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{label}</div>
      </div>
    </Link>
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
        borderRadius: '16px',
        backgroundImage: `url(${bg})`,
        backgroundSize: size,
        backgroundPosition: 'center 25%',
        backgroundRepeat: 'no-repeat',
        backgroundColor: GLASS,
        backdropFilter: 'blur(5px)',
        border: `1px solid ${BORDER}`,
        paddingBottom: '10px',
        textDecoration: 'none',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.35)` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <span style={{ color: 'white', fontSize: '12px', fontWeight: '700', background: 'rgba(255,114,94,0.85)', padding: '4px 12px', borderRadius: '8px' }}>{label}</span>
    </Link>
  )
}

function SessionRow({ event }) {
  const STATUS_COLOR = { pending: '#fbbf24', confirmed: '#34d399', canceled: '#f87171', paid: '#60a5fa' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '20px', flexShrink: 0 }}>event</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'white', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{fmt(event.start_time)}</div>
      </div>
      <span style={{ color: STATUS_COLOR[event.status] ?? '#fbbf24', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{event.status}</span>
    </div>
  )
}

function TutorRow({ tutor }) {
  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/tutor/$tutorId" params={{ tutorId: String(tutor.id_tutor) }} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: `${CORAL}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CORAL, fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{tutor.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tutor.subjects}</div>
        </div>
        <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px' }}>chevron_right</span>
      </div>
    </Link>
  )
}

function ConvoRow({ convo }) {
  const initials = convo.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/messages" style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(176,190,197,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0bec5', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{convo.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.last_message ?? 'No messages yet'}</div>
        </div>
      </div>
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
