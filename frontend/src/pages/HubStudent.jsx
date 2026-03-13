import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import { getActiveTutors } from '../api/tutors'
import { getEvents } from '../api/events'
import { getConversations } from '../api/messages'

const CORAL = '#ff725e'
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

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

  const upcoming    = events.filter(e => e.status === 'confirmed' || e.status === 'pending')
  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread || 0), 0)

  // XP calculation
  const totalXP    = 30 + activeTutors.length * 10 + upcoming.length * 30
  const level      = Math.floor(totalXP / 100) + 1
  const xpProgress = totalXP % 100

  return (
    <HubLayout initialMode="student" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>

        {/* ── Welcome banner + XP ──────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          background: `linear-gradient(135deg, ${CORAL}18 0%, rgba(255,114,94,0.03) 60%)`,
          border: `1px solid ${CORAL}28`,
          borderRadius: '14px',
          padding: '16px 20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '140px', height: '140px', background: `${CORAL}0c`, borderRadius: '50%', filter: 'blur(36px)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>waving_hand</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{greeting}</p>
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)', lineHeight: 1.2 }}>
                Ready to study, {name}?
              </h1>
            </div>
            <Link to="/find-tutors" className="btn-primary" style={{ fontSize: '12px', padding: '8px 16px', flexShrink: 0, zIndex: 1 }}>
              Find a Tutor
            </Link>
          </div>

          {/* XP Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: CORAL }}>military_tech</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: CORAL }}>Level {level}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{xpProgress} / 100 XP</span>
            </div>
            <div style={{ height: '7px', background: `${CORAL}22`, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${xpProgress}%`,
                background: `linear-gradient(90deg, ${CORAL}, #ff9a3c)`,
                borderRadius: '4px',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px' }}>
              {100 - xpProgress} XP to Level {level + 1} · earn XP by booking sessions and staying active
            </p>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <StatCard icon="cast_for_education" label="Active Tutors"      value={loading ? '…' : activeTutors.length}  to="/active-tutors"    />
          <StatCard icon="calendar_clock"     label="Upcoming Sessions"  value={loading ? '…' : upcoming.length}       to="/calendar/student" />
          <StatCard icon="message"            label="Messages"           value={loading ? '…' : conversations.length}  to="/messages" highlight={unreadCount > 0} badge={unreadCount || null} />
        </div>

        {/* ── Bottom 3-col panels ───────────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>

          {/* Col 1: Upcoming Sessions */}
          <Panel
            title="Upcoming Sessions"
            extra={<Link to="/calendar/student" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>Calendar →</Link>}
          >
            {loading ? <Skeleton rows={5} /> : upcoming.length === 0 ? (
              <EmptyState icon="calendar_clock" text="No upcoming sessions" action={{ to: '/find-tutors', label: 'Book a session' }} />
            ) : (
              upcoming.slice(0, 8).map(ev => <SessionRow key={ev.id_event} event={ev} />)
            )}
          </Panel>

          {/* Col 2: My Tutors + Recent Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            <Panel
              title="My Tutors"
              extra={<Link to="/active-tutors" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>View all →</Link>}
              style={{ flex: 1, minHeight: 0 }}
            >
              {loading ? <Skeleton rows={3} /> : activeTutors.length === 0 ? (
                <EmptyState icon="cast_for_education" text="No active tutors yet" action={{ to: '/find-tutors', label: 'Find one' }} />
              ) : (
                activeTutors.slice(0, 5).map(t => <TutorRow key={t.id_tutor} tutor={t} />)
              )}
            </Panel>

            <Panel
              title="Recent Messages"
              extra={<Link to="/messages" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>Open →</Link>}
              style={{ flex: 1, minHeight: 0 }}
            >
              {loading ? <Skeleton rows={2} /> : conversations.length === 0 ? (
                <EmptyState icon="message" text="No messages yet" />
              ) : (
                conversations.slice(0, 3).map(c => <ConvoRow key={c.user_id} convo={c} />)
              )}
            </Panel>
          </div>

          {/* Col 3: Mini Calendar */}
          <Panel
            title="Calendar"
            extra={<Link to="/calendar/student" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>Full view →</Link>}
            innerStyle={{ display: 'flex', flexDirection: 'column' }}
          >
            <MiniCalendar events={events} />
          </Panel>

        </div>
      </div>
    </HubLayout>
  )
}

// ── Mini Calendar ───────────────────────────────────────────────────────────

function MiniCalendar({ events }) {
  const now  = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const { year, month } = view

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const eventDays = new Set(
    events.map(e => {
      if (!e.start_time) return null
      const d = new Date(e.start_time)
      return (d.getFullYear() === year && d.getMonth() === month) ? d.getDate() : null
    }).filter(Boolean)
  )

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isToday = d =>
    d === now.getDate() && month === now.getMonth() && year === now.getFullYear()

  function prevMonth() {
    setView(v => v.month === 0
      ? { year: v.year - 1, month: 11 }
      : { ...v, month: v.month - 1 })
  }
  function nextMonth() {
    setView(v => v.month === 11
      ? { year: v.year + 1, month: 0 }
      : { ...v, month: v.month + 1 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', borderRadius: '6px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
        </button>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', borderRadius: '6px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: '700', color: 'var(--text-faint)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', flex: 1 }}>
        {cells.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: d && isToday(d) ? '900' : '500',
              color: d
                ? isToday(d) ? 'white'
                : eventDays.has(d) ? CORAL
                : 'var(--text-muted)'
                : 'transparent',
              background: d && isToday(d) ? CORAL : 'transparent',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              position: 'relative',
              cursor: d ? 'pointer' : 'default',
            }}
          >
            {d}
            {d && eventDays.has(d) && !isToday(d) && (
              <span style={{
                position: 'absolute',
                bottom: '2px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: CORAL,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Event count hint */}
      {events.length > 0 && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '10px', color: 'var(--text-faint)', textAlign: 'center' }}>
            <span style={{ color: CORAL, fontWeight: '700' }}>{eventDays.size}</span> day{eventDays.size !== 1 ? 's' : ''} with sessions this month
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Panel({ title, extra, children, style, innerStyle }) {
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
        ...innerStyle,
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
          borderRadius: '12px',
          padding: '12px 14px',
          backdropFilter: 'blur(10px)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          position: 'relative',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '20px' }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>{value}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', marginTop: '2px' }}>{label}</div>
        </div>
        {badge && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            width: '17px', height: '17px', borderRadius: '50%',
            background: '#60a5fa', color: 'white',
            fontSize: '9px', fontWeight: '700',
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '16px', flexShrink: 0 }}>event</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
        <div style={{ color: 'var(--text-faint)', fontSize: '10px' }}>{fmt(event.start_time)}</div>
      </div>
      <span style={{ color: STATUS_COLOR[event.status] ?? '#fbbf24', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>{event.status}</span>
    </div>
  )
}

function TutorRow({ tutor }) {
  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/tutor/$tutorId" params={{ tutorId: String(tutor.id_tutor) }} style={{ textDecoration: 'none' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', borderRadius: '6px', transition: 'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${CORAL}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CORAL, fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600' }}>{tutor.name}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tutor.subjects}</div>
        </div>
        <span className="material-symbols-outlined" style={{ color: 'var(--text-faint)', fontSize: '14px' }}>chevron_right</span>
      </div>
    </Link>
  )
}

function ConvoRow({ convo }) {
  const initials = convo.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/messages" style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(176,190,197,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0bec5', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600' }}>{convo.name}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.last_message ?? 'No messages yet'}</div>
        </div>
        {convo.unread > 0 && (
          <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: CORAL, color: 'white', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {convo.unread}
          </span>
        )}
      </div>
    </Link>
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
