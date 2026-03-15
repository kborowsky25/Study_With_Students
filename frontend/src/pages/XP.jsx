import { useEffect, useState } from 'react'
import { getEvents } from '../api/events'
import { getActiveTutors, getActiveStudents } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import PageHeader from '../components/features/PageHeader'
import toast from 'react-hot-toast'

// ── Tier definitions ────────────────────────────────────────────────────────────
const STUDENT_TIERS = [
  { name: 'Rookie',   xp: 0,    color: '#94a3b8', emoji: '🌱', reward: 'Access to all basic features' },
  { name: 'Explorer', xp: 500,  color: '#60a5fa', emoji: '🔭', reward: 'Explorer profile badge' },
  { name: 'Scholar',  xp: 1500, color: '#a78bfa', emoji: '📚', reward: 'Priority tutor matching' },
  { name: 'Prodigy',  xp: 3500, color: '#fbbf24', emoji: '⚡', reward: 'Exclusive study room access' },
  { name: 'Elite',    xp: 7000, color: '#ff725e', emoji: '🏆', reward: 'Featured learner status' },
]

const TUTOR_TIERS = [
  { name: 'Guide',    xp: 0,    color: '#94a3b8', emoji: '🌱', reward: 'Access to all tutor features' },
  { name: 'Mentor',   xp: 500,  color: '#60a5fa', emoji: '💡', reward: 'Mentor badge on profile' },
  { name: 'Educator', xp: 1500, color: '#a78bfa', emoji: '🎓', reward: 'Priority search placement' },
  { name: 'Expert',   xp: 3500, color: '#fbbf24', emoji: '⭐', reward: 'Analytics dashboard access' },
  { name: 'Master',   xp: 7000, color: '#ff725e', emoji: '👑', reward: 'Featured tutor status' },
]

const STUDENT_ACTIONS = [
  { icon: 'calendar_month',     label: 'Book a session',       xp: 50,  color: '#60a5fa' },
  { icon: 'check_circle',       label: 'Complete a session',   xp: 100, color: '#34d399' },
  { icon: 'cast_for_education', label: 'Add an active tutor',  xp: 30,  color: '#a78bfa' },
  { icon: 'forum',              label: 'Post in forum',        xp: 20,  color: '#fbbf24' },
  { icon: 'favorite',           label: 'Like a tutor',         xp: 10,  color: '#ff725e' },
]

const TUTOR_ACTIONS = [
  { icon: 'check_circle',  label: 'Confirm a session',   xp: 50,  color: '#34d399' },
  { icon: 'payments',      label: 'Complete a session',  xp: 100, color: '#60a5fa' },
  { icon: 'person_add',    label: 'Get a new student',   xp: 30,  color: '#a78bfa' },
  { icon: 'groups',        label: 'Create a study room', xp: 25,  color: '#fbbf24' },
  { icon: 'star',          label: 'Receive a review',    xp: 40,  color: '#ff725e' },
]

export default function XP() {
  const mode      = localStorage.getItem('sws_hub_mode') ?? 'student'
  const isStudent = mode !== 'tutor'

  const [events,  setEvents]  = useState([])
  const [people,  setPeople]  = useState([])  // active tutors (student) or active students (tutor)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const evFetch  = getEvents().then(r => setEvents(r.data.events ?? []))
    const ppFetch  = (isStudent ? getActiveTutors() : getActiveStudents())
      .then(r => setPeople((r.data.tutors ?? r.data.students ?? [])))
    Promise.allSettled([evFetch, ppFetch])
      .catch(() => toast.error('Could not load progress'))
      .finally(() => {
        setLoading(false)
        setTimeout(() => setMounted(true), 80)
      })
  }, [])

  // ── XP calculation ──────────────────────────────────────────────────────────
  const completed = events.filter(e => e.status === 'paid' || e.status === 'confirmed').length
  const paid      = events.filter(e => e.status === 'paid').length
  const booked    = events.length

  const xp = isStudent
    ? completed * 100 + booked * 50 + people.length * 30
    : paid * 100 + completed * 50 + people.length * 30

  const tiers   = isStudent ? STUDENT_TIERS : TUTOR_TIERS
  const actions = isStudent ? STUDENT_ACTIONS : TUTOR_ACTIONS
  const maxXP   = tiers[tiers.length - 1].xp

  const currentTierIdx = tiers.reduce((ci, tier, i) => (xp >= tier.xp ? i : ci), 0)
  const currentTier    = tiers[currentTierIdx]
  const nextTier       = tiers[currentTierIdx + 1]

  const overallPct = Math.min((xp / maxXP) * 100, 100)
  const tierPct    = nextTier
    ? ((xp - currentTier.xp) / (nextTier.xp - currentTier.xp)) * 100
    : 100

  return (
    <HubLayout>
      <PageTitle title="Battle Pass" icon="military_tech" />
      <style>{`
        @keyframes xpIn {
          from { opacity: 0; transform: translateY(14px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>

      <PageHeader
        icon="military_tech"
        iconColor={currentTier.color}
        title="Battle Pass"
        subtitle={`${isStudent ? 'Student' : 'Tutor'} progression — earn XP to level up`}
      />

      {/* ── Current tier hero ─────────────────────────────────────────────── */}
      <div style={{
        borderRadius: '20px', padding: '24px 28px',
        background: `linear-gradient(135deg, ${currentTier.color}18, ${currentTier.color}06)`,
        border: `1px solid ${currentTier.color}30`,
        marginBottom: '16px',
        animation: 'xpIn 0.4s ease both',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: `${currentTier.color}10`, filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '22px' }}>
          {/* Tier emoji badge */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px', flexShrink: 0,
            background: `${currentTier.color}20`, border: `1px solid ${currentTier.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px',
          }}>
            {currentTier.emoji}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {currentTier.name}
              </h2>
              <span style={{
                fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                background: `${currentTier.color}20`, color: currentTier.color, border: `1px solid ${currentTier.color}35`,
              }}>
                Tier {currentTierIdx + 1}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              {loading ? '…' : `${xp.toLocaleString()} XP`}
              {nextTier && !loading && (
                <span style={{ color: currentTier.color }}>
                  {' '}· {(nextTier.xp - xp).toLocaleString()} XP to {nextTier.name}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Progress bar to next tier */}
        {nextTier ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{currentTier.xp.toLocaleString()} XP</span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: nextTier.color }}>{nextTier.name} at {nextTier.xp.toLocaleString()} XP</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: mounted ? `${tierPct}%` : '0%',
                background: `linear-gradient(90deg, ${currentTier.color}70, ${currentTier.color})`,
                borderRadius: '99px',
                boxShadow: `0 0 14px ${currentTier.color}50`,
                transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.2s',
              }} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '7px', margin: '7px 0 0' }}>
              {Math.round(tierPct)}% progress to <strong style={{ color: nextTier.color }}>{nextTier.name}</strong>
            </p>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${currentTier.color}15`, borderRadius: '12px', padding: '10px 14px' }}>
            <span className="material-symbols-outlined" style={{ color: currentTier.color, fontSize: '18px' }}>stars</span>
            <p style={{ fontSize: '13px', fontWeight: '700', color: currentTier.color, margin: 0 }}>
              Max tier reached! You're at the top 🎉
            </p>
          </div>
        )}
      </div>

      {/* ── All tiers overview ────────────────────────────────────────────────── */}
      <div className="glass" style={{ padding: '24px', marginBottom: '16px', animation: 'xpIn 0.4s ease 0.1s both' }}>
        <h3 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', margin: '0 0 28px' }}>All Tiers</h3>

        {/* Full-span progress track with tier markers */}
        <div style={{ position: 'relative', margin: '0 10px 48px' }}>
          {/* Track */}
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
            <div style={{
              height: '100%',
              width: mounted ? `${overallPct}%` : '0%',
              background: `linear-gradient(90deg, rgba(148,163,184,0.6), ${currentTier.color})`,
              borderRadius: '99px',
              boxShadow: `0 0 10px ${currentTier.color}50`,
              transition: 'width 1.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s',
            }} />
          </div>

          {/* Tier marker circles */}
          {tiers.map((tier, i) => {
            const pct        = i === 0 ? 0 : Math.min((tier.xp / maxXP) * 100, 100)
            const unlocked   = xp >= tier.xp
            const isCurrent  = i === currentTierIdx
            return (
              <div key={tier.name} style={{
                position: 'absolute',
                left: `${pct}%`,
                top: '-10px',
                transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                pointerEvents: 'none',
                gap: '4px',
              }}>
                <div style={{
                  width: isCurrent ? '24px' : '20px',
                  height: isCurrent ? '24px' : '20px',
                  borderRadius: '50%',
                  background: unlocked ? tier.color : 'rgba(255,255,255,0.10)',
                  border: `2px solid ${unlocked ? tier.color : 'rgba(255,255,255,0.20)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isCurrent ? `0 0 14px ${tier.color}70` : 'none',
                  transition: 'all 0.5s',
                  zIndex: 1,
                }}>
                  {unlocked && (
                    <span className="material-symbols-outlined" style={{ fontSize: isCurrent ? '13px' : '11px', color: 'white' }}>
                      {isCurrent ? 'person' : 'check'}
                    </span>
                  )}
                </div>
                {/* Label below marker */}
                <div style={{ position: 'absolute', top: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                  <span style={{ fontSize: '11px', fontWeight: isCurrent ? '800' : '600', color: unlocked ? tier.color : 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                    {tier.name}
                  </span>
                  {tier.xp > 0 && (
                    <span style={{ fontSize: '9px', color: 'var(--text-faint)' }}>{tier.xp.toLocaleString()}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tier cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {tiers.map((tier, i) => {
            const unlocked  = xp >= tier.xp
            const isCurrent = i === currentTierIdx
            return (
              <div key={tier.name} style={{
                borderRadius: '14px', padding: '16px 12px',
                background: isCurrent ? `${tier.color}18` : unlocked ? `${tier.color}0a` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isCurrent ? tier.color + '45' : unlocked ? tier.color + '20' : 'rgba(255,255,255,0.06)'}`,
                textAlign: 'center',
                boxShadow: isCurrent ? `0 0 20px ${tier.color}20` : 'none',
                opacity: unlocked ? 1 : 0.55,
                transition: 'all 0.3s',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{unlocked ? tier.emoji : '🔒'}</div>
                <p style={{ fontSize: '12px', fontWeight: '800', color: unlocked ? tier.color : 'var(--text-faint)', margin: '0 0 2px' }}>
                  {tier.name}
                </p>
                <p style={{ fontSize: '9px', color: 'var(--text-faint)', margin: '0 0 8px' }}>
                  {tier.xp.toLocaleString()} XP
                </p>
                {isCurrent && (
                  <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', background: `${tier.color}25`, color: tier.color, border: `1px solid ${tier.color}35` }}>
                    Current
                  </span>
                )}
                {!isCurrent && unlocked && (
                  <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
                    ✓ Done
                  </span>
                )}
                {!unlocked && (
                  <span style={{ fontSize: '9px', color: 'var(--text-faint)' }}>
                    {(tier.xp - xp).toLocaleString()} XP away
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Rewards + How to earn ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', animation: 'xpIn 0.4s ease 0.2s both' }}>

        {/* Tier rewards */}
        <div className="glass" style={{ padding: '20px' }}>
          <h3 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#fbbf24' }}>emoji_events</span>
            Tier Rewards
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {tiers.map((tier, i) => {
              const unlocked = xp >= tier.xp
              return (
                <div key={tier.name} style={{ display: 'flex', alignItems: 'center', gap: '11px', opacity: unlocked ? 1 : 0.5 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: `${tier.color}15`, border: `1px solid ${tier.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                    {unlocked ? tier.emoji : '🔒'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: unlocked ? tier.color : 'var(--text-faint)', margin: '0 0 1px' }}>
                      {tier.name}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tier.reward}
                    </p>
                  </div>
                  {unlocked && (
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#34d399', flexShrink: 0 }}>check_circle</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* How to earn XP */}
        <div className="glass" style={{ padding: '20px' }}>
          <h3 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#a78bfa' }}>bolt</span>
            Earn XP
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {actions.map(({ icon, label, xp: pts, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color }}>{icon}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '800', color, flexShrink: 0 }}>+{pts} XP</span>
              </div>
            ))}
          </div>

          {/* Current XP stats */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Your stats</p>
            {!loading && [
              isStudent
                ? { label: 'Sessions booked', value: booked }
                : { label: 'Sessions completed', value: paid },
              { label: 'Sessions confirmed', value: completed },
              isStudent
                ? { label: 'Active tutors', value: people.length }
                : { label: 'Active students', value: people.length },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HubLayout>
  )
}
