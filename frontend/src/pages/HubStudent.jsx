import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import { getActiveTutors, getTutors } from '../api/tutors'
import { getEvents } from '../api/events'
import { getConversations } from '../api/messages'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const BLUE   = '#60a5fa'
const AMBER  = '#fbbf24'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TUTOR_GRADS = [
  `linear-gradient(135deg, ${CORAL}, #ff9a3c)`,
  'linear-gradient(135deg, #60a5fa, #818cf8)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #f472b6, #ec4899)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #fb923c, #ef4444)',
  'linear-gradient(135deg, #22d3ee, #0284c7)',
]

// ── CountUp hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(target ?? 0); return }
    const start = performance.now()
    let raf
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Animated XP Donut ────────────────────────────────────────────────────────
function XpDonut({ xpProgress, level }) {
  const size   = 96
  const radius = 36
  const stroke = 5
  const cx     = 48
  const cy     = 48
  const circum = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circum)

  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(circum - (xpProgress / 100) * circum)
    }, 300)
    return () => clearTimeout(t)
  }, [xpProgress, circum])

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="donut-grad-student" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={CORAL} />
            <stop offset="100%" stopColor={AMBER} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={`${CORAL}1a`} strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="url(#donut-grad-student)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circum}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>{level}</span>
        <span style={{ fontSize: '8px', fontWeight: '700', color: CORAL, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>Level</span>
        <span style={{ fontSize: '8px', color: 'var(--text-faint)', marginTop: '1px' }}>
          {xpProgress}<span style={{ opacity: 0.6 }}>/100</span>
        </span>
      </div>
    </div>
  )
}

// ── Top Tutors Trio — mini cards, centre dominant ─────────────────────────────
function TopTutorsTrio({ tutors }) {
  const trio = [
    { tutor: tutors[1], isCenter: false, gradIdx: 1, animCls: 'animate-orbit-3' },
    { tutor: tutors[0], isCenter: true,  gradIdx: 0, animCls: 'animate-orbit-1' },
    { tutor: tutors[2], isCenter: false, gradIdx: 2, animCls: 'animate-orbit-5' },
  ]

  return (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '11px', color: CORAL }}>auto_awesome</span>
        <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          Top Tutors Today
        </span>
      </div>

      {/* Three mini-cards in a row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
        {trio.map(({ tutor, isCenter, gradIdx, animCls }) => {
          const nameParts = (tutor?.name ?? 'Unknown Tutor').split(' ')
          const initials  = nameParts.map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
          const firstName = nameParts[0] ?? 'Tutor'
          const lastName  = nameParts[1]?.[0] ? nameParts[1][0] + '.' : ''
          const subjects  = tutor?.subjects?.split(',').map(s => s.trim()).filter(Boolean) ?? []
          const uni       = tutor?.university ?? ''
          const opacity   = isCenter ? 1 : 0.55

          return (
            <Link
              key={tutor?.id_tutor ?? gradIdx}
              to="/tutor/$tutorId"
              params={{ tutorId: String(tutor?.id_tutor ?? '') }}
              style={{ textDecoration: 'none', opacity, transition: 'opacity 0.25s', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = String(opacity)}
            >
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                padding: isCenter ? '9px 11px' : '7px 8px',
                background: isCenter ? `${CORAL}0d` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isCenter ? CORAL + '30' : 'rgba(255,255,255,0.09)'}`,
                borderRadius: '12px',
                width: isCenter ? '108px' : '80px',
                backdropFilter: 'blur(8px)',
              }}>
                {/* Avatar */}
                <div
                  className={animCls}
                  style={{
                    width: isCenter ? '42px' : '32px',
                    height: isCenter ? '42px' : '32px',
                    borderRadius: '50%',
                    background: TUTOR_GRADS[gradIdx],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white',
                    fontSize: isCenter ? '14px' : '11px',
                    fontWeight: '900',
                    boxShadow: isCenter ? `0 4px 14px ${CORAL}38` : '0 2px 8px rgba(0,0,0,0.2)',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div style={{ textAlign: 'center', width: '100%', minWidth: 0 }}>
                  {/* Name */}
                  <p style={{
                    color: 'var(--text)', fontWeight: '700',
                    fontSize: isCenter ? '11px' : '9.5px',
                    lineHeight: 1.2, margin: '0 0 2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {`${firstName} ${lastName}`.trim()}
                  </p>

                  {/* Subjects */}
                  {subjects.length > 0 ? (
                    subjects.slice(0, isCenter ? 2 : 1).map((sub, i) => (
                      <p key={sub} style={{
                        fontSize: '8px', fontWeight: '600', margin: '0 0 1px',
                        color: isCenter ? CORAL : `${CORAL}cc`,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        opacity: i === 1 ? 0.75 : 1,
                      }}>
                        {sub}
                      </p>
                    ))
                  ) : (
                    <p style={{ fontSize: '8px', color: 'var(--text-faint)', margin: '0 0 1px' }}>Tutor</p>
                  )}

                  {/* University — all cards */}
                  {uni ? (
                    <p style={{
                      fontSize: '7.5px', color: 'var(--text-faint)', margin: '2px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}>
                      {uni}
                    </p>
                  ) : null}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <Link to="/find-tutors" style={{ color: CORAL, fontSize: '9px', fontWeight: '600', textDecoration: 'none', opacity: 0.75 }}>
        See all →
      </Link>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HubStudent() {
  const { user } = useAuth()

  const [activeTutors,  setActiveTutors]  = useState([])
  const [topTutors,     setTopTutors]     = useState([])
  const [events,        setEvents]        = useState([])
  const [conversations, setConversations] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [mounted,       setMounted]       = useState(false)

  useEffect(() => {
    Promise.allSettled([
      getActiveTutors().then(r  => setActiveTutors(r.data.tutors ?? [])),
      getEvents().then(r        => setEvents(r.data.events ?? [])),
      getConversations().then(r => setConversations(r.data.conversations ?? [])),
      getTutors().then(r        => setTopTutors((r.data.tutors ?? []).slice(0, 8))),
    ]).finally(() => setLoading(false))

    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name     = user?.name?.split(' ')[0] ?? 'Student'

  const upcoming    = events.filter(e => e.status === 'confirmed' || e.status === 'pending')
  const nextSession = [...upcoming].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0] ?? null
  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread || 0), 0)

  // XP calculation
  const totalXP    = 30 + activeTutors.length * 10 + upcoming.length * 30
  const level      = Math.floor(totalXP / 100) + 1
  const xpProgress = totalXP % 100

  return (
    <HubLayout initialMode="student" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>

        {/* ── Welcome banner ─────────────────────────────────────────────── */}
        <div
          className={mounted ? 'animate-slide-up' : ''}
          style={{
            flexShrink: 0,
            background: `linear-gradient(135deg, ${CORAL}14 0%, rgba(255,114,94,0.03) 55%, rgba(255,154,60,0.06) 100%)`,
            border: `1px solid ${CORAL}24`,
            borderRadius: '16px',
            padding: '12px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient blobs */}
          <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '200px', height: '200px', background: `${CORAL}08`, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '30%', bottom: '-20px', width: '120px', height: '120px', background: 'rgba(255,154,60,0.06)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>

            {/* Left: greeting — takes all space but stops before the trio */}
            <div style={{ flex: 1, minWidth: 0, maxWidth: 'calc(50% - 150px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>waving_hand</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500' }}>{greeting}</p>
              </div>
              <h1 style={{ fontSize: '23px', fontWeight: '900', color: 'var(--text)', lineHeight: 1.15, marginBottom: '8px' }}>
                {name},<br />
                <span style={{ color: CORAL }}>Ready to learn?</span>
              </h1>

              {/* Next session chip */}
              {!loading && nextSession ? (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  background: `${CORAL}10`, border: `1px solid ${CORAL}28`,
                  borderRadius: '20px', padding: '4px 11px',
                  marginBottom: '10px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: CORAL }}>schedule</span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>
                    Next: <span style={{ color: 'var(--text)' }}>{nextSession.title}</span>
                    <span style={{ color: 'var(--text-faint)', marginLeft: '6px' }}>{fmtShort(nextSession.start_time)}</span>
                  </span>
                </div>
              ) : !loading && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  borderRadius: '20px', padding: '4px 11px',
                  marginBottom: '10px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--text-faint)' }}>calendar_clock</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>No upcoming sessions</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Link to="/find-tutors" className="btn-primary" style={{ fontSize: '12px', padding: '7px 16px' }}>
                  Find a Tutor
                </Link>
                <Link to="/calendar/student" className="btn-secondary" style={{ fontSize: '12px', padding: '7px 16px' }}>
                  My Calendar
                </Link>
              </div>
            </div>

            {/* Centre: Top Tutors Trio — absolutely centred in the banner, floats above flex flow */}
            {topTutors.length >= 3 && (
              <div style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none', zIndex: 1,
              }}>
                <div style={{ pointerEvents: 'auto' }}>
                  <TopTutorsTrio tutors={topTutors.slice(0, 3)} />
                </div>
              </div>
            )}

            {/* Right: XP section — sits at the right edge naturally */}
            <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              {/* XP Donut */}
              <XpDonut xpProgress={xpProgress} level={level} />

              {/* XP progress bar */}
              <div style={{ width: '96px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '8px', color: 'var(--text-faint)', fontWeight: '600' }}>Lv {level}</span>
                  <span style={{ fontSize: '8px', color: 'var(--text-faint)', fontWeight: '600' }}>Lv {level + 1}</span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: `${CORAL}1a`, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${xpProgress}%`,
                    background: `linear-gradient(90deg, ${CORAL}, ${AMBER})`,
                    borderRadius: '2px',
                    transition: 'width 1.5s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>
                <p style={{ fontSize: '8px', color: 'var(--text-faint)', textAlign: 'center', marginTop: '3px' }}>
                  {100 - xpProgress} XP to Lv {level + 1}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <StatCard
            icon="cast_for_education"
            label="Active Tutors"
            value={loading ? null : activeTutors.length}
            to="/active-tutors"
            animClass={mounted ? 'animate-slide-up delay-150' : ''}
          />
          <StatCard
            icon="calendar_clock"
            label="Upcoming Sessions"
            value={loading ? null : upcoming.length}
            to="/calendar/student"
            animClass={mounted ? 'animate-slide-up delay-200' : ''}
          />
          <StatCard
            icon="message"
            label="Messages"
            value={loading ? null : conversations.length}
            to="/messages"
            highlight={unreadCount > 0}
            badge={unreadCount || null}
            animClass={mounted ? 'animate-slide-up delay-300' : ''}
          />
        </div>

        {/* ── 3-col panels ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>

          {/* Col 1: Upcoming Sessions */}
          <Panel
            title="My Schedule"
            subtitle={`${upcoming.length} upcoming session${upcoming.length !== 1 ? 's' : ''}`}
            icon="event"
            extra={<Link to="/calendar/student" style={{ color: CORAL, fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>Calendar →</Link>}
            animClass={mounted ? 'animate-slide-up delay-200' : ''}
          >
            {loading ? <SkeletonList rows={5} /> : upcoming.length === 0 ? (
              <EmptyState icon="calendar_clock" text="No upcoming sessions" action={{ to: '/find-tutors', label: 'Book a session' }} />
            ) : (
              upcoming.slice(0, 8).map(ev => <SessionRow key={ev.id_event} event={ev} />)
            )}
          </Panel>

          {/* Col 2: My Tutors + Recent Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            <Panel
              title="My Tutors"
              subtitle={activeTutors.length > 0 ? `${activeTutors.length} active` : 'add your first tutor'}
              icon="cast_for_education"
              extra={<Link to="/active-tutors" style={{ color: CORAL, fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>View all →</Link>}
              style={{ flex: 1, minHeight: 0 }}
              animClass={mounted ? 'animate-slide-up delay-300' : ''}
            >
              {loading ? <SkeletonList rows={3} /> : activeTutors.length === 0 ? (
                <EmptyState icon="cast_for_education" text="No active tutors yet" action={{ to: '/find-tutors', label: 'Find one' }} />
              ) : (
                activeTutors.slice(0, 5).map(t => <TutorRow key={t.id_tutor} tutor={t} />)
              )}
            </Panel>

            <Panel
              title="Recent Messages"
              subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'all caught up'}
              icon="chat"
              extra={<Link to="/messages" style={{ color: CORAL, fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>Open →</Link>}
              style={{ flex: 1, minHeight: 0 }}
              animClass={mounted ? 'animate-slide-up delay-400' : ''}
            >
              {loading ? <SkeletonList rows={2} /> : conversations.length === 0 ? (
                <EmptyState icon="message" text="No messages yet" />
              ) : (
                conversations.slice(0, 3).map(c => <ConvoRow key={c.user_id} convo={c} />)
              )}
            </Panel>
          </div>

          {/* Col 3: Mini Calendar */}
          <Panel
            title="Calendar"
            subtitle="this month at a glance"
            icon="calendar_month"
            extra={<Link to="/calendar/student" style={{ color: CORAL, fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>Full view →</Link>}
            innerStyle={{ display: 'flex', flexDirection: 'column' }}
            animClass={mounted ? 'animate-slide-up delay-300' : ''}
          >
            <MiniCalendar events={events} />
          </Panel>

        </div>
      </div>
    </HubLayout>
  )
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
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

      {events.length > 0 && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '10px', color: 'var(--text-faint)', textAlign: 'center' }}>
            <span style={{ color: CORAL, fontWeight: '700' }}>{eventDays.size}</span>{' '}
            day{eventDays.size !== 1 ? 's' : ''} with sessions this month
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Panel({ title, subtitle, icon, extra, children, style, innerStyle, animClass }) {
  return (
    <div className={animClass} style={{ display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {icon && (
              <div style={{
                width: '22px', height: '22px', borderRadius: '6px',
                background: `${CORAL}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px', color: CORAL }}>{icon}</span>
              </div>
            )}
            <h2 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '13px', letterSpacing: '-0.01em' }}>{title}</h2>
          </div>
          {subtitle && (
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '1px', marginLeft: icon ? '29px' : '0' }}>
              {subtitle}
            </p>
          )}
        </div>
        {extra}
      </div>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '12px 14px',
        backdropFilter: 'blur(12px)',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        boxShadow: 'var(--shadow-card)',
        ...innerStyle,
      }}>
        {children}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, to, highlight, badge, animClass }) {
  const isNum    = typeof value === 'number'
  const animated = useCountUp(isNum ? value : 0, 800)
  const display  = value === null ? null : isNum ? animated : value

  return (
    <Link to={to} style={{ textDecoration: 'none' }} className={animClass}>
      <div
        style={{
          background: highlight ? 'rgba(96,165,250,0.07)' : 'var(--bg-card)',
          border: `1px solid ${highlight ? 'rgba(96,165,250,0.25)' : 'var(--border)'}`,
          borderRadius: '14px',
          padding: '14px 16px',
          backdropFilter: 'blur(12px)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'relative',
          boxShadow: 'var(--shadow-card)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
      >
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px',
          background: `${CORAL}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '24px' }}>{icon}</span>
        </div>
        <div>
          {display === null ? (
            <div className="skeleton" style={{ width: '36px', height: '26px', borderRadius: '6px', marginBottom: '4px' }} />
          ) : (
            <div key={value} className="animate-number-pop" style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>
              {display}
            </div>
          )}
          <div style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '2px', fontWeight: '600' }}>{label}</div>
        </div>
        {badge && (
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            minWidth: '18px', height: '18px', borderRadius: '9px',
            background: '#60a5fa', color: 'white',
            fontSize: '9px', fontWeight: '700', padding: '0 4px',
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '15px', flexShrink: 0 }}>event</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
        <div style={{ color: 'var(--text-faint)', fontSize: '10px', marginTop: '1px' }}>{fmt(event.start_time)}</div>
      </div>
      <span style={{
        background: `${STATUS_COLOR[event.status] ?? '#fbbf24'}18`,
        color: STATUS_COLOR[event.status] ?? '#fbbf24',
        fontSize: '10px', fontWeight: '700',
        padding: '2px 8px', borderRadius: '20px',
        flexShrink: 0,
      }}>
        {event.status}
      </span>
    </div>
  )
}

function TutorRow({ tutor }) {
  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/tutor/$tutorId" params={{ tutorId: String(tutor.id_tutor) }} style={{ textDecoration: 'none' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 6px', borderBottom: '1px solid var(--border)', borderRadius: '8px', transition: 'background 0.15s', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `${CORAL}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CORAL, fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(176,190,197,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0bec5', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600' }}>{convo.name}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.last_message ?? 'No messages yet'}</div>
        </div>
        {convo.unread > 0 && (
          <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: CORAL, color: 'white', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {convo.unread}
          </span>
        )}
      </div>
    </Link>
  )
}

function EmptyState({ icon, text, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '18px 0' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '26px', color: 'var(--text-faint)', display: 'block', marginBottom: '7px' }}>{icon}</span>
      <p style={{ color: 'var(--text-faint)', fontSize: '12px', marginBottom: action ? '10px' : 0 }}>{text}</p>
      {action && (
        <Link to={action.to} style={{ color: CORAL, fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}>
          {action.label} →
        </Link>
      )}
    </div>
  )
}

function SkeletonList({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '32px', borderRadius: '8px' }} />
      ))}
    </div>
  )
}
