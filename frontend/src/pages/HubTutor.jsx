import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import { getActiveStudents } from '../api/tutors'
import { getEvents, updateStatus } from '../api/events'
import { getConversations } from '../api/messages'
import { getStudyRooms } from '../api/studyrooms'
import toast from 'react-hot-toast'

const CORAL  = '#2dd4bf'   // tutor hub — neon teal
const GREEN  = '#34d399'
const AMBER  = '#fbbf24'
const BLUE   = '#63b3ed'
const TEAL   = '#2dd4bf'

// ── CountUp hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 750) {
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
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtShort(iso) {
  if (!iso) return null
  const d   = new Date(iso)
  const now = new Date()
  const diff = Math.round((d - now) / 60000)
  if (diff < 60)  return `in ${diff}m`
  if (diff < 1440) return `in ${Math.round(diff / 60)}h`
  return d.toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Earnings Donut ──────────────────────────────────────────────────────────
function EarningsDonut({ thisMonth, goal = 200 }) {
  const r       = 44
  const circum  = 2 * Math.PI * r
  const pct     = Math.min(thisMonth / goal, 1)
  const [offset, setOffset] = useState(circum)

  useEffect(() => {
    const t = setTimeout(() => setOffset(circum - pct * circum), 250)
    return () => clearTimeout(t)
  }, [pct, circum])

  return (
    <div style={{ position: 'relative', width: '108px', height: '108px', flexShrink: 0 }}>
      <svg width="108" height="108" viewBox="0 0 108 108">
        <defs>
          <linearGradient id="earningsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={GREEN} />
            <stop offset="100%" stopColor={CORAL} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx="54" cy="54" r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
        {/* Progress */}
        <circle cx="54" cy="54" r={r} fill="none"
          stroke="url(#earningsGrad)" strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circum}
          strokeDashoffset={offset}
          transform="rotate(-90 54 54)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,.68,0,1.0)' }}
        />
      </svg>
      {/* Centre label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '14px', fontWeight: '900', color: GREEN, lineHeight: 1 }}>
          £{thisMonth.toFixed(0)}
        </span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.38)', marginTop: '2px' }}>
          / £{goal} goal
        </span>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function HubTutor() {
  const { user } = useAuth()

  const [students,      setStudents]      = useState([])
  const [events,        setEvents]        = useState([])
  const [conversations, setConversations] = useState([])
  const [rooms,         setRooms]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [mounted,       setMounted]       = useState(false)

  useEffect(() => {
    Promise.allSettled([
      getActiveStudents().then(r  => setStudents(r.data.students ?? [])),
      getEvents().then(r          => setEvents(r.data.events ?? [])),
      getConversations().then(r   => setConversations(r.data.conversations ?? [])),
      getStudyRooms().then(r      => setRooms(r.data.rooms ?? [])),
    ]).finally(() => setLoading(false))
    // Trigger entrance animations on next frame
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const name     = user?.name?.split(' ')[0] ?? 'Tutor'
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const pending   = events.filter(e => e.status === 'pending')
  const confirmed = events.filter(e => e.status === 'confirmed')
  const paid      = events.filter(e => e.status === 'paid')

  // Earnings calculations — only count sessions the student has actually paid
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthEarnings = paid
    .filter(e => e.amount && new Date(e.start_time) >= monthStart)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const totalEarnings = paid
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)

  // Sessions this week
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const thisWeekSessions = confirmed.filter(e => new Date(e.start_time) >= weekStart).length

  const nextEvent = confirmed.find(e => new Date(e.start_time) > now)
  const nextRoom  = rooms.find(r => new Date(r.start_time) > now)

  async function handleStatus(eventId, status) {
    try {
      await updateStatus(eventId, status)
      setEvents(prev => prev.map(e => e.id_event === eventId ? { ...e, status } : e))
      toast.success(status === 'confirmed' ? 'Session confirmed! 🎉' : 'Session declined')
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <HubLayout initialMode="tutor" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>

        {/* ── Welcome banner ────────────────────────────────────────────── */}
        <div
          className={mounted ? 'animate-slide-up' : ''}
          style={{
            flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(45,212,191,0.10) 0%, rgba(45,212,191,0.03) 55%, rgba(99,179,237,0.06) 100%)',
            border: '1px solid rgba(45,212,191,0.22)',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background glow blobs */}
          <div style={{ position: 'absolute', right: '-20px', top: '-40px', width: '180px', height: '180px', background: 'rgba(45,212,191,0.08)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '30%', bottom: '-30px', width: '120px', height: '120px', background: `${CORAL}06`, borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />

          {/* Left: text + chips */}
          <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>waving_hand</span>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500' }}>{greeting}</p>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text)', marginBottom: '6px', lineHeight: 1.2 }}>
              {pending.length > 0
                ? <>You have <span style={{ color: AMBER }}>{pending.length} new request{pending.length > 1 ? 's' : ''}</span>, {name}!</>
                : `Welcome back, ${name}! 🎓`}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
              {loading
                ? 'Loading your dashboard…'
                : thisMonthEarnings > 0
                ? `You've earned £${thisMonthEarnings.toFixed(2)} this month · ${thisWeekSessions} session${thisWeekSessions !== 1 ? 's' : ''} this week`
                : nextRoom
                ? `Next study room: "${nextRoom.subject}" starting ${fmtShort(nextRoom.start_time)}`
                : 'All caught up — update your profile to attract more students'}
            </p>
            {/* Quick chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {nextEvent && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                  borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', color: GREEN,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>event</span>
                  Next: {fmt(nextEvent.start_time)}
                </span>
              )}
              {students.length > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(99,179,237,0.12)', border: '1px solid rgba(99,179,237,0.20)',
                  borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', color: BLUE,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>people</span>
                  {students.length} active student{students.length !== 1 ? 's' : ''}
                </span>
              )}
              {conversations.length > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.20)',
                  borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', color: AMBER,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>message</span>
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Centre: earnings donut */}
          <div style={{ zIndex: 1, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            {loading
              ? <div style={{ width: '108px', height: '108px', borderRadius: '50%' }} className="skeleton" />
              : <EarningsDonut thisMonth={thisMonthEarnings} goal={200} />
            }
            <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Monthly Goal
            </span>
          </div>

          {/* Right: CTA buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, zIndex: 1 }}>
            <Link to="/tutor-profile" className="btn-primary" style={{ fontSize: '12px', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
              Edit Profile
            </Link>
            <Link to="/study-rooms/tutor" className="btn-secondary" style={{ fontSize: '12px', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>groups</span>
              Study Rooms
            </Link>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div
          className={mounted ? 'animate-slide-up delay-100' : ''}
          style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}
        >
          <StatCard
            icon="payments"
            label="This Month"
            value={loading ? null : `£${thisMonthEarnings.toFixed(2)}`}
            to="/earnings"
            accent={GREEN}
          />
          <StatCard
            icon="savings"
            label="Total Earned"
            value={loading ? null : `£${totalEarnings.toFixed(2)}`}
            to="/earnings"
            accent={CORAL}
          />
          <StatCard
            icon="hourglass_top"
            label="Pending"
            value={loading ? null : pending.length}
            to="/events"
            accent={AMBER}
            highlight={pending.length > 0}
          />
          <StatCard
            icon="people"
            label="Active Students"
            value={loading ? null : students.length}
            to="/active-students"
            accent={BLUE}
          />
        </div>

        {/* ── Main content: 3 columns ─────────────────────────────────── */}
        <div
          className={mounted ? 'animate-slide-up delay-200' : ''}
          style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}
        >

          {/* Col 1 — Session Requests */}
          <Panel
            icon="hourglass_top"
            title="Session Requests"
            subtitle={pending.length > 0 ? `${pending.length} awaiting your response` : 'no pending requests'}
            extra={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {pending.length > 0 && (
                  <span style={{ background: AMBER, color: '#1b263b', fontSize: '9px', fontWeight: '800', padding: '2px 7px', borderRadius: '9px' }}>
                    {pending.length} NEW
                  </span>
                )}
                <Link to="/events" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>View all →</Link>
              </div>
            }
            style={{ minHeight: 0 }}
          >
            {loading ? <SkeletonRows rows={3} /> : pending.length === 0 ? (
              <EmptyState icon="hourglass_empty" text="No pending requests" action={{ to: '/tutor-profile', label: 'Update your profile' }} />
            ) : (
              pending.slice(0, 4).map(ev => (
                <PendingRow key={ev.id_event} event={ev} onAction={handleStatus} />
              ))
            )}
          </Panel>

          {/* Col 2 — Active Students + Confirmed Sessions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
            <Panel
              icon="people"
              title="Active Students"
              subtitle={students.length > 0 ? `${students.length} enrolled with you` : 'no students yet'}
              extra={<Link to="/active-students" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>View all →</Link>}
              style={{ flex: 1, minHeight: 0 }}
            >
              {loading ? <SkeletonRows rows={3} /> : students.length === 0 ? (
                <EmptyState icon="group" text="No active students yet" />
              ) : (
                students.slice(0, 4).map(s => <StudentRow key={s.id_student} student={s} />)
              )}
            </Panel>

            <Panel
              icon="check_circle"
              title="Confirmed Sessions"
              subtitle={confirmed.length > 0 ? `${thisWeekSessions} this week` : 'your teaching schedule'}
              extra={<Link to="/calendar/tutor" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>Calendar →</Link>}
              style={{ flex: 1, minHeight: 0 }}
            >
              {loading ? <SkeletonRows rows={2} /> : confirmed.length === 0 ? (
                <EmptyState icon="event_available" text="No confirmed sessions" />
              ) : (
                confirmed.slice(0, 3).map(ev => <SessionRow key={ev.id_event} event={ev} />)
              )}
            </Panel>
          </div>

          {/* Col 3 — Earnings Graph + Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
            <Panel
              icon="bar_chart"
              title="Earnings"
              subtitle="last 6 months"
              extra={<Link to="/earnings" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>Details →</Link>}
              style={{ flexShrink: 0 }}
            >
              <EarningsGraph
                events={events}
                loading={loading}
                thisMonth={thisMonthEarnings}
                total={totalEarnings}
                thisWeek={thisWeekSessions}
              />
            </Panel>

            <Panel
              icon="message"
              title="Messages"
              subtitle={conversations.length > 0 ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}` : 'no messages yet'}
              extra={<Link to="/messages" style={{ color: CORAL, fontSize: '12px', fontWeight: '600' }}>Open →</Link>}
              style={{ flex: 1, minHeight: 0 }}
            >
              {loading ? <SkeletonRows rows={3} /> : conversations.length === 0 ? (
                <EmptyState icon="chat_bubble_outline" text="No messages yet" />
              ) : (
                conversations.slice(0, 4).map((c, i) => (
                  <ConvoRow key={i} convo={c} />
                ))
              )}
            </Panel>
          </div>

        </div>
      </div>
    </HubLayout>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Panel({ icon, title, subtitle, extra, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {/* Header */}
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
      {/* Body */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '13px',
        padding: '12px 14px',
        backdropFilter: 'blur(10px)',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        boxShadow: 'var(--shadow-card)',
      }}
        className="scrollbar-hide"
      >
        {children}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, to, accent = CORAL, highlight }) {
  const isNum    = typeof value === 'number'
  const animated = useCountUp(isNum ? value : 0, 800)
  const display  = value === null ? null : isNum ? animated : value

  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: highlight ? `${accent}0d` : 'var(--bg-card)',
          border: `1px solid ${highlight ? accent + '35' : 'var(--border)'}`,
          borderRadius: '13px',
          padding: '14px 16px',
          backdropFilter: 'blur(10px)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: 'var(--shadow-card)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = 'var(--shadow-hover)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '11px',
          background: `${accent}1a`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ color: accent, fontSize: '22px' }}>{icon}</span>
        </div>
        <div>
          {display === null
            ? <div className="skeleton" style={{ width: '56px', height: '24px', marginBottom: '4px' }} />
            : <div
                key={value}
                className="animate-number-pop"
                style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}
              >
                {display}
              </div>
          }
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', marginTop: '3px', fontWeight: '600', letterSpacing: '0.03em' }}>
            {label}
          </div>
        </div>
      </div>
    </Link>
  )
}

function EarningsGraph({ events, loading, thisMonth, total, thisWeek }) {
  if (loading) return <SkeletonRows rows={5} />

  // Build last-6-months buckets
  const now    = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-GB', { month: 'short' }), total: 0 }
  })
  for (const ev of events) {
    if (ev.status !== 'paid' || !ev.start_time) continue
    const d = new Date(ev.start_time)
    const bucket = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
    if (bucket) bucket.total += Number(ev.amount || 0)
  }

  const peak   = Math.max(...months.map(m => m.total), 0.01)
  const CHART_H = 64
  const BAR_W   = 28
  const GAP     = 8
  const totalW  = months.length * (BAR_W + GAP) - GAP

  return (
    <div>
      {/* Bar chart */}
      <div style={{ marginBottom: '12px' }}>
        <svg viewBox={`0 0 ${totalW} ${CHART_H + 18}`} width="100%" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor={TEAL} />
              <stop offset="100%" stopColor="rgba(45,212,191,0.5)" />
            </linearGradient>
          </defs>
          {months.map((m, i) => {
            const barH  = Math.max(3, (m.total / peak) * CHART_H)
            const x     = i * (BAR_W + GAP)
            const y     = CHART_H - barH
            const isCur = m.month === now.getMonth() && m.year === now.getFullYear()
            const delay = i * 80
            return (
              <g key={i}>
                <rect
                  x={x} y={y} width={BAR_W} height={barH} rx={5}
                  fill={isCur ? 'url(#barGrad)' : 'rgba(45,212,191,0.20)'}
                  style={{
                    transformOrigin: `${x + BAR_W/2}px ${CHART_H}px`,
                    animation: `barGrow 0.65s cubic-bezier(.22,.68,0,1.0) ${delay}ms both`,
                  }}
                />
                {isCur && m.total > 0 && (
                  <text
                    x={x + BAR_W / 2} y={y - 4}
                    textAnchor="middle" fontSize="7" fontWeight="800"
                    fill={TEAL}
                  >
                    £{m.total.toFixed(0)}
                  </text>
                )}
                <text
                  x={x + BAR_W / 2} y={CHART_H + 14}
                  textAnchor="middle" fontSize="8"
                  fill={isCur ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.30)'}
                  fontWeight={isCur ? '700' : '400'}
                >
                  {m.label}
                </text>
              </g>
            )
          })}
          <line x1={0} y1={CHART_H} x2={totalW} y2={CHART_H} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        </svg>
      </div>

      {/* Summary rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <EarningsRow label="This month"         value={`£${thisMonth.toFixed(2)}`} icon="calendar_month"  color={TEAL} />
        <EarningsRow label="Total earned"       value={`£${total.toFixed(2)}`}     icon="savings"         color={CORAL} />
        <EarningsRow label="Sessions this week" value={String(thisWeek)}           icon="event_available" color={AMBER} />
      </div>
    </div>
  )
}

function EarningsRow({ label, value, icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="material-symbols-outlined" style={{ color, fontSize: '15px', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, color: 'var(--text-muted)', fontSize: '11px' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '800' }}>{value}</span>
    </div>
  )
}

function PendingRow({ event, onAction }) {
  const [acting, setActing] = useState(false)

  async function act(status) {
    setActing(true)
    await onAction(event.id_event, status)
    setActing(false)
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', marginBottom: '8px' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: 'rgba(251,191,36,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ color: AMBER, fontSize: '16px' }}>pending</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.title}
          </div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', marginTop: '1px' }}>
            {event.student_name ?? 'Student'} · {fmt(event.start_time)}
            {event.amount ? ` · £${Number(event.amount).toFixed(2)}` : ''}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', paddingLeft: '39px' }}>
        <button
          onClick={() => act('confirmed')}
          disabled={acting}
          style={{
            flex: 1, padding: '5px 0',
            background: 'rgba(52,211,153,0.14)', color: GREEN,
            border: `1px solid rgba(52,211,153,0.28)`, borderRadius: '8px',
            fontSize: '10px', fontWeight: '800', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
            opacity: acting ? 0.6 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
          Confirm
        </button>
        <button
          onClick={() => act('canceled')}
          disabled={acting}
          style={{
            flex: 1, padding: '5px 0',
            background: 'rgba(248,113,113,0.12)', color: '#f87171',
            border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px',
            fontSize: '10px', fontWeight: '800', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
            opacity: acting ? 0.6 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
          Decline
        </button>
      </div>
    </div>
  )
}

function StudentRow({ student }) {
  const initials = student.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const colors   = ['rgba(99,179,237,0.20)', 'rgba(167,139,250,0.20)', 'rgba(52,211,153,0.18)', 'rgba(251,191,36,0.20)']
  const textCols = [BLUE, '#a78bfa', GREEN, AMBER]
  const idx      = (student.id_student ?? 0) % colors.length
  return (
    <Link to="/messages" style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          padding: '7px 6px', borderBottom: '1px solid var(--border)',
          borderRadius: '8px', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '9px',
          background: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: textCols[idx], fontSize: '11px', fontWeight: '800', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600' }}>{student.name}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {student.email}
          </div>
        </div>
        <span className="material-symbols-outlined" style={{ color: 'var(--text-faint)', fontSize: '14px' }}>chevron_right</span>
      </div>
    </Link>
  )
}

function SessionRow({ event }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: '30px', height: '30px', borderRadius: '8px',
        background: 'rgba(52,211,153,0.14)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span className="material-symbols-outlined" style={{ color: GREEN, fontSize: '15px' }}>check_circle</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.title}
        </div>
        <div style={{ color: 'var(--text-faint)', fontSize: '10px', marginTop: '1px' }}>
          {event.student_name ?? 'Student'} · {fmt(event.start_time)}
          {event.amount ? ` · £${Number(event.amount).toFixed(2)}` : ''}
        </div>
      </div>
    </div>
  )
}

function ConvoRow({ convo }) {
  const initials = convo.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  return (
    <Link to="/messages" style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          padding: '7px 6px', borderBottom: '1px solid var(--border)',
          borderRadius: '8px', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '9px',
          background: `${CORAL}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: CORAL, fontSize: '11px', fontWeight: '800', flexShrink: 0,
          position: 'relative',
        }}>
          {initials}
          <div style={{
            position: 'absolute', bottom: '-1px', right: '-1px',
            width: '9px', height: '9px', borderRadius: '50%',
            background: GREEN, border: '1.5px solid var(--bg-secondary)',
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '700' }}>{convo.name}</div>
          <div style={{ color: 'var(--text-faint)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {convo.last_message ?? 'No messages yet'}
          </div>
        </div>
        <span className="material-symbols-outlined" style={{ color: 'var(--text-faint)', fontSize: '14px' }}>chevron_right</span>
      </div>
    </Link>
  )
}

function EmptyState({ icon, text, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--text-faint)', display: 'block', marginBottom: '8px' }}>{icon}</span>
      <p style={{ color: 'var(--text-faint)', fontSize: '12px', marginBottom: action ? '10px' : 0 }}>{text}</p>
      {action && (
        <Link to={action.to} style={{ color: CORAL, fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}>
          {action.label} →
        </Link>
      )}
    </div>
  )
}

function SkeletonRows({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '34px', borderRadius: '8px' }} />
      ))}
    </div>
  )
}
