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

// ── Big animated XP ring ─────────────────────────────────────────────────────
function XPRing({ xp, tierPct, tierColor, level }) {
  const size = 176, r = 76, stroke = 10, cx = 88, cy = 88
  const circum = 2 * Math.PI * r
  const [offset, setOffset] = useState(circum)

  useEffect(() => {
    const t = setTimeout(() => setOffset(circum - (Math.min(tierPct, 100) / 100) * circum), 350)
    return () => clearTimeout(t)
  }, [tierPct, circum])

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="xp-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={tierColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={tierColor} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${tierColor}15`} strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="url(#xp-ring-grad)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circum} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: '9px', fontWeight: '800', color: tierColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Level</span>
        <span style={{ fontSize: '46px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>{level}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '3px' }}>{xp.toLocaleString()} XP</span>
      </div>
    </div>
  )
}

// ── Monthly sessions bar chart ────────────────────────────────────────────────
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
              <span style={{ fontSize: '9px', fontWeight: '700', color: isNow ? CORAL : 'var(--text-faint)' }}>{counts[i]}</span>
            )}
            <div style={{ width: '100%', height: barH, minHeight: '3px', borderRadius: '4px 4px 2px 2px', background: isNow ? `linear-gradient(180deg, ${CORAL}80, ${CORAL})` : `${CORAL}45`, transition: `height 1s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s` }} />
            <span style={{ fontSize: '9px', color: isNow ? CORAL : 'var(--text-faint)', fontWeight: isNow ? '700' : '500' }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const [tutors,  setTutors]  = useState([])
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      getActiveTutors().then(r => setTutors(r.data.tutors ?? [])),
      getEvents().then(r => setEvents(r.data.events ?? [])),
    ]).finally(() => setLoading(false))
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const name      = user?.name?.split(' ')[0] ?? 'Student'
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

  const STATS = [
    { icon: 'check_circle',       label: 'Completed',  value: animCompleted, color: GREEN },
    { icon: 'calendar_month',     label: 'Booked',     value: animBooked,    color: BLUE },
    { icon: 'cast_for_education', label: 'Tutors',     value: animTutors,    color: PURPLE },
    { icon: 'bolt',               label: 'Total XP',   value: animXP,        color: AMBER },
  ]

  return (
    <HubLayout>
      <PageTitle title="My Stats" icon="bar_chart" />

      {/* ── Hero: XP Ring + Tier ───────────────────────────────────────────── */}
      <div
        className={mounted ? 'animate-slide-up' : ''}
        style={{
          borderRadius: '20px', padding: '28px 32px',
          background: `linear-gradient(135deg, ${curTier.color}14 0%, ${curTier.color}04 60%, rgba(255,154,60,0.04) 100%)`,
          border: `1px solid ${curTier.color}28`,
          marginBottom: '14px', position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '240px', height: '240px', background: `${curTier.color}0a`, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', position: 'relative' }}>
          {/* XP ring */}
          <XPRing xp={loading ? 0 : xp} tierPct={mounted && !loading ? tierPct : 0} tierColor={curTier.color} level={level} />

          {/* Tier info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '36px' }}>{curTier.emoji}</span>
              <div>
                <h1 style={{ fontSize: '30px', fontWeight: '900', color: curTier.color, margin: 0, lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {curTier.name}
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {name}'s learning journey
                </p>
              </div>
            </div>

            {nxtTier ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{curTier.xp.toLocaleString()} XP</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: nxtTier.color }}>
                    {nxtTier.emoji} {nxtTier.name} at {nxtTier.xp.toLocaleString()} XP
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{
                    height: '100%',
                    width: mounted && !loading ? `${Math.min(tierPct, 100)}%` : '0%',
                    background: `linear-gradient(90deg, ${curTier.color}70, ${curTier.color})`,
                    borderRadius: '99px', boxShadow: `0 0 12px ${curTier.color}50`,
                    transition: 'width 1.6s cubic-bezier(0.34,1.56,0.64,1) 0.4s',
                  }} />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ color: curTier.color, fontWeight: '700' }}>
                    {(nxtTier.xp - (loading ? 0 : xp)).toLocaleString()} XP
                  </span>{' '}to reach <strong style={{ color: nxtTier.color }}>{nxtTier.name}</strong>
                </p>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${curTier.color}18`, borderRadius: '12px', padding: '12px 16px' }}>
                <span className="material-symbols-outlined" style={{ color: curTier.color }}>workspace_premium</span>
                <p style={{ fontSize: '14px', fontWeight: '700', color: curTier.color, margin: 0 }}>Max tier reached — legendary! 🎉</p>
              </div>
            )}

            {/* Tier chips row */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
              {TIERS.map((t) => {
                const unlocked = xp >= t.xp
                return (
                  <div key={t.name} style={{
                    fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                    background: unlocked ? `${t.color}20` : 'rgba(255,255,255,0.04)',
                    color: unlocked ? t.color : 'var(--text-faint)',
                    border: `1px solid ${unlocked ? t.color + '35' : 'rgba(255,255,255,0.08)'}`,
                    opacity: unlocked ? 1 : 0.5,
                    transition: 'all 0.3s',
                  }}>
                    {t.emoji} {t.name}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
        {STATS.map(({ icon, label, value, color }, i) => (
          <div
            key={label}
            className={mounted ? `animate-slide-up delay-${(i + 1) * 100}` : ''}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '18px 16px',
              backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)',
              display: 'flex', alignItems: 'center', gap: '12px',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color, fontSize: '22px' }}>{icon}</span>
            </div>
            <div>
              <div className="animate-number-pop" style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>
                {loading ? '—' : value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: '600', marginTop: '3px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart + Earn XP (2-col) ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        {/* Monthly chart */}
        <div
          className={mounted ? 'animate-slide-up delay-200' : ''}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Session Activity</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '3px 0 0' }}>Last 6 months</p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: CORAL, background: `${CORAL}15`, border: `1px solid ${CORAL}25`, borderRadius: '20px', padding: '3px 10px' }}>
              {events.length} total
            </span>
          </div>
          {loading
            ? <div className="skeleton" style={{ height: '90px', borderRadius: '8px' }} />
            : <MonthChart events={events} mounted={mounted} />
          }
        </div>

        {/* Earn XP */}
        <div
          className={mounted ? 'animate-slide-up delay-300' : ''}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)' }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: PURPLE }}>bolt</span>
            How to Earn XP
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {XP_ACTIONS.map(({ icon, label, xp: pts, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color }}>{icon}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '800', color, flexShrink: 0 }}>+{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tier progression track ────────────────────────────────────────── */}
      <div
        className={mounted ? 'animate-slide-up delay-400' : ''}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px 26px', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)', marginBottom: '14px' }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)', margin: '0 0 30px' }}>Tier Progression</h3>

        {/* Track */}
        <div style={{ position: 'relative', margin: '0 14px 56px' }}>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px' }}>
            <div style={{
              height: '100%',
              width: mounted && !loading ? `${Math.min((xp / TIERS[TIERS.length - 1].xp) * 100, 100)}%` : '0%',
              background: `linear-gradient(90deg, #94a3b8, ${curTier.color})`,
              borderRadius: '99px', boxShadow: `0 0 10px ${curTier.color}40`,
              transition: 'width 1.8s cubic-bezier(0.34,1.56,0.64,1) 0.5s',
            }} />
          </div>
          {TIERS.map((t, i) => {
            const pct      = i === 0 ? 0 : Math.min((t.xp / TIERS[TIERS.length - 1].xp) * 100, 100)
            const unlocked = xp >= t.xp
            const isCur    = i === curIdx
            return (
              <div key={t.name} style={{ position: 'absolute', left: `${pct}%`, top: '-12px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: isCur ? '28px' : '22px', height: isCur ? '28px' : '22px', borderRadius: '50%', background: unlocked ? t.color : 'rgba(255,255,255,0.08)', border: `2px solid ${unlocked ? t.color : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isCur ? `0 0 18px ${t.color}60` : 'none', transition: 'all 0.5s', zIndex: 1, fontSize: isCur ? '13px' : '11px' }}>
                  {unlocked ? t.emoji : ''}
                </div>
                <div style={{ position: 'absolute', top: '32px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: isCur ? '800' : '600', color: unlocked ? t.color : 'var(--text-faint)', whiteSpace: 'nowrap' }}>{t.name}</div>
                  {t.xp > 0 && <div style={{ fontSize: '8.5px', color: 'var(--text-faint)' }}>{t.xp.toLocaleString()}</div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tier cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {TIERS.map((t, i) => {
            const unlocked = xp >= t.xp
            const isCur    = i === curIdx
            return (
              <div key={t.name} style={{ borderRadius: '12px', padding: '14px 10px', textAlign: 'center', background: isCur ? `${t.color}18` : unlocked ? `${t.color}0a` : 'rgba(255,255,255,0.03)', border: `1px solid ${isCur ? t.color + '45' : unlocked ? t.color + '20' : 'rgba(255,255,255,0.06)'}`, opacity: unlocked ? 1 : 0.5, boxShadow: isCur ? `0 0 20px ${t.color}20` : 'none', transition: 'all 0.3s' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{unlocked ? t.emoji : '🔒'}</div>
                <p style={{ fontSize: '11px', fontWeight: '800', color: unlocked ? t.color : 'var(--text-faint)', margin: '0 0 2px' }}>{t.name}</p>
                <p style={{ fontSize: '9px', color: 'var(--text-faint)', margin: '0 0 7px' }}>{t.xp.toLocaleString()} XP</p>
                {isCur && <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', background: `${t.color}25`, color: t.color, border: `1px solid ${t.color}35` }}>Current</span>}
                {!isCur && unlocked && <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>✓ Done</span>}
                {!unlocked && <span style={{ fontSize: '9px', color: 'var(--text-faint)' }}>{(t.xp - xp).toLocaleString()} XP away</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Quick links ───────────────────────────────────────────────────── */}
      <div className={mounted ? 'animate-slide-up delay-500' : ''} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Link to="/find-tutors" className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>search</span>
          Find Tutors
        </Link>
        <Link to="/active-tutors" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '13px' }}>My Tutors</Link>
        <Link to="/calendar/student" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '13px' }}>Calendar</Link>
        <Link to="/forum" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '13px' }}>Forum</Link>
      </div>
    </HubLayout>
  )
}
