import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { getActiveTutors } from '../api/tutors'
import { getEvents } from '../api/events'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const BLUE   = '#60a5fa'
const AMBER  = '#fbbf24'
const PURPLE = '#a78bfa'

const TIERS = [
  { name: 'Rookie',   xp: 0,    color: '#94a3b8', emoji: '🌱' },
  { name: 'Explorer', xp: 500,  color: BLUE,       emoji: '🔭' },
  { name: 'Scholar',  xp: 1500, color: PURPLE,     emoji: '📚' },
  { name: 'Prodigy',  xp: 3500, color: AMBER,      emoji: '⚡' },
  { name: 'Elite',    xp: 7000, color: CORAL,      emoji: '🏆' },
]

const XP_ACTIONS = [
  { icon: 'calendar_month',     label: 'Book a session',      xp: 50,  color: BLUE },
  { icon: 'check_circle',       label: 'Complete a session',  xp: 100, color: GREEN },
  { icon: 'cast_for_education', label: 'Add an active tutor', xp: 30,  color: PURPLE },
  { icon: 'forum',              label: 'Post in forum',       xp: 20,  color: AMBER },
  { icon: 'favorite',           label: 'Like a tutor',        xp: 10,  color: CORAL },
]

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── CountUp hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(target ?? 0); return }
    const start = performance.now()
    let raf
    const step = now => {
      const t = Math.min((now - start) / duration, 1)
      const e = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(target * e))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

// ── XP Ring with outer pulse ──────────────────────────────────────────────────
function XPRing({ xp, tierPct, tierColor, level }) {
  const size = 180, r = 76, stroke = 10, cx = 90, cy = 90
  const circum = 2 * Math.PI * r
  const [offset, setOffset] = useState(circum)

  useEffect(() => {
    const t = setTimeout(() => setOffset(circum - (Math.min(tierPct, 100) / 100) * circum), 350)
    return () => clearTimeout(t)
  }, [tierPct, circum])

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      {/* Outer pulse ring */}
      <div style={{
        position: 'absolute', inset: '-8px', borderRadius: '50%',
        border: `2px solid ${tierColor}30`,
        animation: 'outerRingPulse 2.8s ease-in-out infinite',
      }} />
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
        <defs>
          <linearGradient id="xp-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={tierColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={tierColor} />
          </linearGradient>
          <filter id="xp-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${tierColor}12`} strokeWidth={stroke} />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="url(#xp-ring-grad)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circum} strokeDashoffset={offset}
          filter="url(#xp-glow)"
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      {/* Center content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ fontSize: '9px', fontWeight: '600', color: tierColor, letterSpacing: '0.06em', marginBottom: '2px' }}>Level</span>
        <span style={{ fontSize: '48px', fontWeight: '900', color: 'var(--text)', lineHeight: 1, textShadow: `0 0 30px ${tierColor}60` }}>{level}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>{xp.toLocaleString()} XP</span>
      </div>
    </div>
  )
}

// ── Monthly bar chart ─────────────────────────────────────────────────────────
function MonthChart({ events, mounted }) {
  const now    = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { label: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), month: d.getMonth() }
  })
  const counts   = months.map(({ year, month }) =>
    events.filter(e => { if (!e.start_time) return false; const d = new Date(e.start_time); return d.getFullYear() === year && d.getMonth() === month }).length
  )
  const maxCount = Math.max(...counts, 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '90px' }}>
      {months.map(({ label }, i) => {
        const pct   = (counts[i] / maxCount) * 100
        const isNow = i === 5
        const barH  = mounted ? `${Math.max(pct, counts[i] > 0 ? 10 : 3)}%` : '3%'
        return (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', height: '100%', justifyContent: 'flex-end' }}>
            {counts[i] > 0 && (
              <span style={{ fontSize: '9px', fontWeight: '700', color: isNow ? CORAL : 'var(--text-faint)', fontFamily: 'monospace' }}>{counts[i]}</span>
            )}
            <div style={{
              width: '100%', height: barH, minHeight: '3px', borderRadius: '4px 4px 2px 2px',
              background: isNow ? `linear-gradient(180deg, ${CORAL}80, ${CORAL})` : `${CORAL}40`,
              boxShadow: isNow ? `0 0 10px ${CORAL}50` : 'none',
              transition: `height 1s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s`,
            }} />
            <span style={{ fontSize: '9px', color: isNow ? CORAL : 'var(--text-faint)', fontWeight: isNow ? '700' : '500', fontFamily: 'monospace' }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const [tutors,  setTutors]  = useState([])
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [bootDone, setBootDone] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      getActiveTutors().then(r => setTutors(r.data.tutors ?? [])),
      getEvents().then(r => setEvents(r.data.events ?? [])),
    ]).finally(() => {
      setLoading(false)
      setTimeout(() => setBootDone(true), 400)
    })
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const name      = user?.name?.split(' ')[0] ?? 'Player'
  const completed = events.filter(e => e.status === 'confirmed' || e.status === 'paid').length
  const booked    = events.length
  const xp        = completed * 100 + booked * 50 + tutors.length * 30

  const curIdx  = TIERS.reduce((ci, t, i) => (xp >= t.xp ? i : ci), 0)
  const curTier = TIERS[curIdx]
  const nxtTier = TIERS[curIdx + 1]
  const level   = curIdx + 1
  const tierPct = nxtTier ? ((xp - curTier.xp) / (nxtTier.xp - curTier.xp)) * 100 : 100

  const animXP        = useCountUp(mounted && !loading ? xp : 0, 1200)
  const animCompleted = useCountUp(mounted && !loading ? completed : 0, 900)
  const animBooked    = useCountUp(mounted && !loading ? booked : 0, 900)
  const animTutors    = useCountUp(mounted && !loading ? tutors.length : 0, 900)

  // Write stats to localStorage so the Sidebar can read level/tier
  useEffect(() => {
    if (!loading && mounted) {
      localStorage.setItem('sws_user_stats', JSON.stringify({
        level,
        xp,
        tierName:  curTier.name,
        tierColor: curTier.color,
        tierEmoji: curTier.emoji,
        tierPct:   Math.round(tierPct),
      }))
    }
  }, [loading, mounted, xp, level, curTier.name, tierPct])

  const STATS = [
    { icon: 'check_circle',       label: 'Completed',  value: animCompleted, color: GREEN,  tag: 'Sessions' },
    { icon: 'calendar_month',     label: 'Booked',     value: animBooked,    color: BLUE,   tag: 'Booked' },
    { icon: 'cast_for_education', label: 'Tutors',     value: animTutors,    color: PURPLE, tag: 'Active' },
    { icon: 'bolt',               label: 'Total XP',   value: animXP,        color: AMBER,  tag: 'Points' },
  ]

  // Motivational message based on activity
  const motivMsg = completed >= 10 ? { text: "Excellent progress", color: CORAL }
    : completed >= 5  ? { text: "Building momentum", color: AMBER }
    : booked >= 1     ? { text: "Session in progress", color: BLUE }
    : { text: "Ready to begin", color: '#94a3b8' }

  return (
    <HubLayout>
      <style>{`
        @keyframes outerRingPulse {
          0%,100% { opacity:0.4; transform:scale(1) }
          50%      { opacity:0.9; transform:scale(1.03) }
        }
        @keyframes neonFlicker {
          0%,100% { opacity:1 }
          92%     { opacity:1 }
          94%     { opacity:0.5 }
          96%     { opacity:1 }
          98%     { opacity:0.7 }
        }
        @keyframes scanBoot {
          from { opacity:0; transform:translateY(10px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes hudSlide {
          from { opacity:0; transform:translateX(-8px) }
          to   { opacity:1; transform:translateX(0) }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 12px var(--gc)40 }
          50%     { box-shadow: 0 0 24px var(--gc)70, 0 0 40px var(--gc)20 }
        }
        @keyframes badgePop {
          from { opacity:0; transform:scale(0.7) }
          to   { opacity:1; transform:scale(1) }
        }
        @keyframes scanLine {
          0%   { transform:translateY(-100%) }
          100% { transform:translateY(200%) }
        }
        .hud-card { animation: scanBoot 0.4s ease both }
        .hud-card:hover .hud-corner { opacity:1 !important }
      `}</style>

      <PageTitle title="My Stats" icon="bar_chart" />

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '55vh', gap: '16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: CORAL, animation: 'neonFlicker 2s infinite' }}>progress_activity</span>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Loading your profile…</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ── PLAYER PROFILE hero ──────────────────────────────────────────── */}
          <div
            className="hud-card"
            style={{
              borderRadius: '20px', padding: '28px 32px',
              background: `linear-gradient(135deg, ${curTier.color}16 0%, ${curTier.color}06 55%, rgba(0,0,0,0) 100%)`,
              border: `1px solid ${curTier.color}30`,
              marginBottom: '12px', position: 'relative', overflow: 'hidden',
              animationDelay: '0s',
            }}
          >
            {/* Scanline overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
            }} />
            {/* Glow blob */}
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', background: `${curTier.color}0a`, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', position: 'relative', zIndex: 1 }}>
              {/* XP ring */}
              <XPRing xp={xp} tierPct={mounted ? tierPct : 0} tierColor={curTier.color} level={level} />

              {/* Info panel */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.03em' }}>Performance Overview</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize: '11px', color: motivMsg.color, fontWeight: '600' }}>{motivMsg.text}</span>
                </div>

                {/* Name + tier */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '32px', lineHeight: 1 }}>{curTier.emoji}</span>
                  <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: curTier.color, margin: 0, lineHeight: 1, letterSpacing: '-0.03em', textShadow: `0 0 20px ${curTier.color}40` }}>
                      {curTier.name}
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                      {name} · Level {level} of {TIERS.length}
                    </p>
                  </div>
                </div>

                {/* Progress to next tier */}
                {nxtTier ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{curTier.xp.toLocaleString()} XP</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: nxtTier.color }}>
                        {nxtTier.emoji} {nxtTier.name} — {nxtTier.xp.toLocaleString()} XP
                      </span>
                    </div>
                    <div style={{ height: '7px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{
                        height: '100%',
                        width: mounted ? `${Math.min(tierPct, 100)}%` : '0%',
                        background: `linear-gradient(90deg, ${curTier.color}60, ${curTier.color})`,
                        borderRadius: '99px',
                        boxShadow: `0 0 14px ${curTier.color}50`,
                        transition: 'width 1.6s cubic-bezier(0.34,1.56,0.64,1) 0.4s',
                      }} />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span style={{ color: curTier.color, fontWeight: '700' }}>
                        {(nxtTier.xp - xp).toLocaleString()} XP
                      </span>{' '}to unlock {nxtTier.name}
                    </p>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${curTier.color}18`, borderRadius: '10px', padding: '10px 14px' }}>
                    <span className="material-symbols-outlined" style={{ color: curTier.color, fontSize: '18px' }}>workspace_premium</span>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: curTier.color, margin: 0 }}>Top level reached</p>
                  </div>
                )}

                {/* Level badges row */}
                <div style={{ display: 'flex', gap: '5px', marginTop: '14px', flexWrap: 'wrap' }}>
                  {TIERS.map(t => {
                    const unlocked = xp >= t.xp
                    return (
                      <div key={t.name} style={{
                        fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px',
                        background: unlocked ? `${t.color}20` : 'rgba(255,255,255,0.04)',
                        color: unlocked ? t.color : 'var(--text-faint)',
                        border: `1px solid ${unlocked ? t.color + '35' : 'rgba(255,255,255,0.07)'}`,
                        opacity: unlocked ? 1 : 0.4,
                        animation: unlocked ? 'badgePop 0.4s ease both' : 'none',
                      }}>
                        {t.emoji} {t.name}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── MISSION STATS ─────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.04em' }}>Activity Summary</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {STATS.map(({ icon, label, value, color, tag }, i) => (
                <div
                  key={label}
                  className="hud-card"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${color}25`,
                    borderRadius: '14px', padding: '16px 14px',
                    backdropFilter: 'blur(12px)',
                    boxShadow: `0 0 0 1px ${color}08, inset 0 1px 0 ${color}10`,
                    position: 'relative', overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                    animationDelay: `${i * 0.07}s`,
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${color}30, 0 8px 28px ${color}20`
                    e.currentTarget.style.borderColor = `${color}45`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${color}08, inset 0 1px 0 ${color}10`
                    e.currentTarget.style.borderColor = `${color}25`
                  }}
                >
                  {/* Corner accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '28px', height: '28px', borderRight: `1px solid ${color}30`, borderBottom: `1px solid ${color}30`, borderRadius: '0 0 10px 0', opacity: 0.6 }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderLeft: `1px solid ${color}20`, borderTop: `1px solid ${color}20`, borderRadius: '4px 0 0 0' }} />

                  {/* Tag */}
                  <div style={{ fontSize: '9px', fontWeight: '600', color: `${color}70`, letterSpacing: '0.02em', marginBottom: '8px' }}>{tag}</div>

                  {/* Value */}
                  <div style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text)', lineHeight: 1, textShadow: `0 0 20px ${color}40`, marginBottom: '6px' }}>
                    {value}
                  </div>

                  {/* Label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color }}>{icon}</span>
                    <span style={{ fontSize: '10px', fontWeight: '600', color }}>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── MISSION LOG + AVAILABLE MISSIONS (2-col) ─────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Session log */}
            <div
              className="hud-card"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', backdropFilter: 'blur(12px)', animationDelay: '0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '18px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: CORAL }}>bar_chart</span>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Session History</h3>
                <div style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '700', color: CORAL, background: `${CORAL}15`, border: `1px solid ${CORAL}25`, borderRadius: '20px', padding: '2px 9px' }}>
                  {events.length} total
                </div>
              </div>
              <MonthChart events={events} mounted={mounted} />
            </div>

            {/* Available missions (earn XP) */}
            <div
              className="hud-card"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', backdropFilter: 'blur(12px)', animationDelay: '0.28s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: PURPLE }}>bolt</span>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Earn XP</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {XP_ACTIONS.map(({ icon, label, xp: pts, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}18`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color }}>{icon}</span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color, flexShrink: 0, fontFamily: 'monospace' }}>+{pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RANK PROGRESSION ──────────────────────────────────────────────── */}
          <div
            className="hud-card"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 24px', backdropFilter: 'blur(12px)', marginBottom: '12px', animationDelay: '0.36s' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: AMBER }}>military_tech</span>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Level Progression</h3>
            </div>

            {/* Track bar */}
            <div style={{ position: 'relative', margin: '0 14px 52px' }}>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px' }}>
                <div style={{
                  height: '100%',
                  width: mounted ? `${Math.min((xp / TIERS[TIERS.length - 1].xp) * 100, 100)}%` : '0%',
                  background: `linear-gradient(90deg, #94a3b8, ${curTier.color})`,
                  borderRadius: '99px',
                  boxShadow: `0 0 12px ${curTier.color}50`,
                  transition: 'width 1.8s cubic-bezier(0.34,1.56,0.64,1) 0.5s',
                }} />
              </div>
              {TIERS.map((t, i) => {
                const pct      = i === 0 ? 0 : Math.min((t.xp / TIERS[TIERS.length - 1].xp) * 100, 100)
                const unlocked = xp >= t.xp
                const isCur    = i === curIdx
                return (
                  <div key={t.name} style={{ position: 'absolute', left: `${pct}%`, top: '-11px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: isCur ? '26px' : '20px', height: isCur ? '26px' : '20px', borderRadius: '50%',
                      background: unlocked ? t.color : 'rgba(255,255,255,0.07)',
                      border: `2px solid ${unlocked ? t.color : 'rgba(255,255,255,0.12)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isCur ? `0 0 18px ${t.color}60` : 'none',
                      transition: 'all 0.5s', zIndex: 1, fontSize: isCur ? '12px' : '10px',
                    }}>
                      {unlocked ? t.emoji : ''}
                    </div>
                    <div style={{ position: 'absolute', top: '30px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', fontWeight: isCur ? '700' : '500', color: unlocked ? t.color : 'var(--text-faint)', whiteSpace: 'nowrap' }}>{t.name}</div>
                      {t.xp > 0 && <div style={{ fontSize: '8px', color: 'var(--text-faint)' }}>{t.xp.toLocaleString()}</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rank cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {TIERS.map((t, i) => {
                const unlocked = xp >= t.xp
                const isCur    = i === curIdx
                return (
                  <div key={t.name} style={{
                    borderRadius: '10px', padding: '12px 8px', textAlign: 'center',
                    background: isCur ? `${t.color}18` : unlocked ? `${t.color}0a` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isCur ? t.color + '40' : unlocked ? t.color + '18' : 'rgba(255,255,255,0.05)'}`,
                    opacity: unlocked ? 1 : 0.5,
                    boxShadow: isCur ? `0 0 18px ${t.color}20` : 'none',
                    transition: 'all 0.3s',
                  }}>
                    <div style={{ fontSize: '18px', marginBottom: '5px' }}>{unlocked ? t.emoji : '🔒'}</div>
                    <p style={{ fontSize: '10px', fontWeight: '700', color: unlocked ? t.color : 'var(--text-faint)', margin: '0 0 2px' }}>{t.name}</p>
                    <p style={{ fontSize: '8px', color: 'var(--text-faint)', margin: '0 0 6px' }}>{t.xp.toLocaleString()} XP</p>
                    {isCur && <span style={{ fontSize: '8px', fontWeight: '700', padding: '2px 6px', borderRadius: '20px', background: `${t.color}25`, color: t.color, border: `1px solid ${t.color}35` }}>◀ You</span>}
                    {!isCur && unlocked && <span style={{ fontSize: '8px', fontWeight: '700', padding: '2px 6px', borderRadius: '20px', background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>✓</span>}
                    {!unlocked && <span style={{ fontSize: '8px', color: 'var(--text-faint)' }}>{(t.xp - xp).toLocaleString()}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Quick links ───────────────────────────────────────────────────── */}
          <div className="hud-card" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', animationDelay: '0.44s' }}>
            <Link to="/find-tutors" className="btn-primary" style={{ padding: '9px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>search</span>
              Find Tutors
            </Link>
            <Link to="/active-tutors" className="btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}>My Tutors</Link>
            <Link to="/calendar/student" className="btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}>Calendar</Link>
            <Link to="/forum" className="btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}>Forum</Link>
          </div>
        </>
      )}
    </HubLayout>
  )
}
