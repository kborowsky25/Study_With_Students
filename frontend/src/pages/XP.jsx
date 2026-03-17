import { useEffect, useState } from 'react'
import { getEvents } from '../api/events'
import { getActiveTutors, getActiveStudents } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import toast from 'react-hot-toast'

const CORAL = '#ff725e'
const RED   = '#e53e3e'

// ── Tier definitions (clean, no emojis) ───────────────────────────────────────
const STUDENT_TIERS = [
  { name: 'Newcomer',  xp: 0    },
  { name: 'Explorer',  xp: 150  },
  { name: 'Scholar',   xp: 400  },
  { name: 'Achiever',  xp: 900  },
  { name: 'Prodigy',   xp: 1800 },
  { name: 'Elite',     xp: 3500 },
  { name: 'Legend',    xp: 6000 },
]
const TUTOR_TIERS = [
  { name: 'Guide',      xp: 0    },
  { name: 'Mentor',     xp: 150  },
  { name: 'Educator',   xp: 400  },
  { name: 'Expert',     xp: 900  },
  { name: 'Professor',  xp: 1800 },
  { name: 'Master',     xp: 3500 },
  { name: 'Grandmaster',xp: 6000 },
]

const STUDENT_ACTIONS = [
  { icon: 'calendar_month',     label: 'Book a session',      xp: 50  },
  { icon: 'check_circle',       label: 'Complete a session',  xp: 100 },
  { icon: 'cast_for_education', label: 'Add an active tutor', xp: 30  },
  { icon: 'forum',              label: 'Post in forum',       xp: 20  },
  { icon: 'favorite',           label: 'Like a tutor',        xp: 10  },
]
const TUTOR_ACTIONS = [
  { icon: 'check_circle',  label: 'Confirm a session',   xp: 50  },
  { icon: 'payments',      label: 'Complete a session',  xp: 100 },
  { icon: 'person_add',    label: 'Get a new student',   xp: 30  },
  { icon: 'groups',        label: 'Create a study room', xp: 25  },
  { icon: 'star',          label: 'Receive a review',    xp: 40  },
]

// ── Animated counter ──────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(0); return }
    const start = performance.now()
    let raf
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - t, 4))))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

export default function XP() {
  const mode      = localStorage.getItem('sws_hub_mode') ?? 'student'
  const isStudent = mode !== 'tutor'
  const accent    = isStudent ? CORAL : RED

  const [events,  setEvents]  = useState([])
  const [people,  setPeople]  = useState([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      getEvents().then(r => setEvents(r.data.events ?? [])),
      (isStudent ? getActiveTutors() : getActiveStudents())
        .then(r => setPeople(r.data.tutors ?? r.data.students ?? [])),
    ])
      .catch(() => toast.error('Could not load progress'))
      .finally(() => { setLoading(false); setTimeout(() => setMounted(true), 60) })
  }, [])

  const completed = events.filter(e => e.status === 'paid' || e.status === 'confirmed').length
  const paid      = events.filter(e => e.status === 'paid').length
  const booked    = events.length

  const xp = isStudent
    ? completed * 100 + booked * 50 + people.length * 30
    : paid * 100 + completed * 50 + people.length * 30

  const tiers          = isStudent ? STUDENT_TIERS : TUTOR_TIERS
  const actions        = isStudent ? STUDENT_ACTIONS : TUTOR_ACTIONS
  const currentTierIdx = tiers.reduce((ci, t, i) => (xp >= t.xp ? i : ci), 0)
  const currentTier    = tiers[currentTierIdx]
  const nextTier       = tiers[currentTierIdx + 1]
  const tierPct        = nextTier
    ? ((xp - currentTier.xp) / (nextTier.xp - currentTier.xp)) * 100
    : 100

  const animXP = useCountUp(loading ? 0 : xp, 1400)

  const statRows = [
    { label: isStudent ? 'Sessions booked' : 'Sessions completed', value: isStudent ? booked : paid,   icon: 'calendar_month' },
    { label: 'Sessions confirmed',                                   value: completed,                   icon: 'check_circle'   },
    { label: isStudent ? 'Active tutors' : 'Active students',       value: people.length,               icon: 'people'         },
  ]

  return (
    <HubLayout>
      <PageTitle title="Progress" icon="military_tech" />
      <style>{`
        @keyframes xpIn { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .xp-card { animation: xpIn .4s ease both }
      `}</style>

      <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '40px' }}>

        {/* ── Hero card ─────────────────────────────────────────────────────── */}
        <div className="xp-card" style={{
          borderRadius: '22px', padding: '28px 32px', marginBottom: '16px',
          background: `linear-gradient(140deg, ${accent}14, ${accent}05, transparent)`,
          border: `1px solid ${accent}28`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position:'absolute', top:'-50px', right:'-50px', width:'220px', height:'220px', borderRadius:'50%', background:`${accent}10`, filter:'blur(55px)', pointerEvents:'none' }} />

          <div style={{ position:'relative', zIndex:1 }}>
            {/* Tier + XP row */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px' }}>
              <div>
                <p style={{ fontSize:'11px', fontWeight:'700', color:accent, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 6px' }}>
                  {isStudent ? 'Student' : 'Tutor'} · Tier {currentTierIdx + 1}/{tiers.length}
                </p>
                <h1 style={{ fontSize:'32px', fontWeight:'900', color:'var(--text)', margin:0, letterSpacing:'-0.03em', lineHeight:1 }}>
                  {currentTier.name}
                </h1>
                {nextTier && (
                  <p style={{ fontSize:'12px', color:'var(--text-muted)', margin:'6px 0 0' }}>
                    Next: <span style={{ color:'var(--text)', fontWeight:'700' }}>{nextTier.name}</span>
                    {' '}· {!loading && `${(nextTier.xp - xp).toLocaleString()} XP to go`}
                  </p>
                )}
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'48px', fontWeight:'900', color:accent, letterSpacing:'-0.04em', lineHeight:1, textShadow:`0 0 28px ${accent}50` }}>
                  {loading ? '—' : animXP.toLocaleString()}
                </div>
                <div style={{ fontSize:'11px', color:'var(--text-faint)', marginTop:'3px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  XP
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ height:'8px', background:'rgba(255,255,255,0.07)', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{
                  height:'100%',
                  width: mounted ? `${Math.min(tierPct, 100)}%` : '0%',
                  background:`linear-gradient(90deg, ${accent}80, ${accent})`,
                  borderRadius:'99px',
                  transition:'width 1.3s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
                  boxShadow:`0 0 12px ${accent}50`,
                }} />
              </div>
              {!nextTier && (
                <p style={{ fontSize:'12px', color:accent, fontWeight:'700', marginTop:'8px' }}>
                  Max tier reached · Legend status
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats + Tier path row ─────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>

          {/* Quick stats */}
          <div className="xp-card" style={{
            background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:'18px', padding:'22px 24px', animationDelay:'0.07s',
          }}>
            <h3 style={{ fontWeight:'800', fontSize:'13px', color:'var(--text)', margin:'0 0 16px' }}>Your Activity</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {statRows.map(({ label, value, icon }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'15px', color:accent }}>{icon}</span>
                    <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>{label}</span>
                  </div>
                  <span style={{ fontSize:'16px', fontWeight:'900', color:'var(--text)' }}>
                    {loading ? '—' : value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tier ladder */}
          <div className="xp-card" style={{
            background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:'18px', padding:'22px 24px', animationDelay:'0.07s',
          }}>
            <h3 style={{ fontWeight:'800', fontSize:'13px', color:'var(--text)', margin:'0 0 16px' }}>Graduation Path</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {tiers.map((tier, i) => {
                const unlocked  = xp >= tier.xp
                const isCurrent = i === currentTierIdx
                return (
                  <div key={tier.name} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    {/* Node dot */}
                    <div style={{
                      width:'8px', height:'8px', borderRadius:'50%', flexShrink:0,
                      background: isCurrent ? accent : unlocked ? `${accent}60` : 'rgba(255,255,255,0.10)',
                      boxShadow: isCurrent ? `0 0 8px ${accent}80` : 'none',
                    }} />
                    <span style={{
                      fontSize:'12px', fontWeight: isCurrent ? '800' : unlocked ? '600' : '400',
                      color: isCurrent ? accent : unlocked ? 'var(--text)' : 'var(--text-faint)',
                      flex:1,
                    }}>
                      {tier.name}
                    </span>
                    <span style={{ fontSize:'10px', color:'var(--text-faint)', fontWeight:'600' }}>
                      {tier.xp === 0 ? 'Start' : `${tier.xp.toLocaleString()} XP`}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize:'9px', fontWeight:'800', color:accent, background:`${accent}14`, border:`1px solid ${accent}30`, borderRadius:'20px', padding:'1px 6px' }}>
                        YOU
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── How to earn XP ───────────────────────────────────────────────── */}
        <div className="xp-card" style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'18px', padding:'22px 24px', animationDelay:'0.14s',
        }}>
          <h3 style={{ fontWeight:'800', fontSize:'13px', color:'var(--text)', margin:'0 0 16px' }}>How to earn XP</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'8px' }}>
            {actions.map(({ icon, label, xp: pts }) => (
              <div key={label} style={{
                display:'flex', alignItems:'center', gap:'10px',
                padding:'11px 13px', borderRadius:'11px',
                background:`${accent}08`, border:`1px solid ${accent}18`,
                transition:'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${accent}38`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${accent}18`}
              >
                <span className="material-symbols-outlined" style={{ fontSize:'16px', color:accent, flexShrink:0 }}>{icon}</span>
                <span style={{ fontSize:'12px', color:'var(--text)', fontWeight:'600', flex:1, minWidth:0, lineHeight:1.3 }}>{label}</span>
                <span style={{ fontSize:'14px', fontWeight:'900', color:accent, flexShrink:0 }}>+{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HubLayout>
  )
}
