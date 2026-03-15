import { useEffect, useState } from 'react'
import { getEvents } from '../api/events'
import { getActiveTutors, getActiveStudents } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

// ── Tier definitions ──────────────────────────────────────────────────────────
const STUDENT_TIERS = [
  { name: 'Rookie',   xp: 0,    color: '#94a3b8', emoji: '🌱' },
  { name: 'Explorer', xp: 500,  color: '#60a5fa', emoji: '🔭' },
  { name: 'Scholar',  xp: 1500, color: '#a78bfa', emoji: '📚' },
  { name: 'Prodigy',  xp: 3500, color: '#fbbf24', emoji: '⚡' },
  { name: 'Elite',    xp: 7000, color: '#ff725e', emoji: '🏆' },
]
const TUTOR_TIERS = [
  { name: 'Guide',    xp: 0,    color: '#94a3b8', emoji: '🌱' },
  { name: 'Mentor',   xp: 500,  color: '#60a5fa', emoji: '💡' },
  { name: 'Educator', xp: 1500, color: '#a78bfa', emoji: '🎓' },
  { name: 'Expert',   xp: 3500, color: '#fbbf24', emoji: '⭐' },
  { name: 'Master',   xp: 7000, color: '#ff725e', emoji: '👑' },
]

const STUDENT_ACTIONS = [
  { icon: 'calendar_month',     label: 'Book a session',      xp: 50,  color: '#60a5fa' },
  { icon: 'check_circle',       label: 'Complete a session',  xp: 100, color: '#34d399' },
  { icon: 'cast_for_education', label: 'Add an active tutor', xp: 30,  color: '#a78bfa' },
  { icon: 'forum',              label: 'Post in forum',       xp: 20,  color: '#fbbf24' },
  { icon: 'favorite',           label: 'Like a tutor',        xp: 10,  color: '#ff725e' },
]
const TUTOR_ACTIONS = [
  { icon: 'check_circle',  label: 'Confirm a session',   xp: 50,  color: '#34d399' },
  { icon: 'payments',      label: 'Complete a session',  xp: 100, color: '#60a5fa' },
  { icon: 'person_add',    label: 'Get a new student',   xp: 30,  color: '#a78bfa' },
  { icon: 'groups',        label: 'Create a study room', xp: 25,  color: '#fbbf24' },
  { icon: 'star',          label: 'Receive a review',    xp: 40,  color: '#ff725e' },
]

// ── Animated XP counter ───────────────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(0); return }
    const start = performance.now()
    let raf
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4)
      setVal(Math.round(target * eased))
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

  // ── XP calc ─────────────────────────────────────────────────────────────────
  const completed = events.filter(e => e.status === 'paid' || e.status === 'confirmed').length
  const paid      = events.filter(e => e.status === 'paid').length
  const booked    = events.length

  const xp = isStudent
    ? completed * 100 + booked * 50 + people.length * 30
    : paid * 100 + completed * 50 + people.length * 30

  const tiers          = isStudent ? STUDENT_TIERS : TUTOR_TIERS
  const actions        = isStudent ? STUDENT_ACTIONS : TUTOR_ACTIONS
  const maxXP          = tiers[tiers.length - 1].xp

  const currentTierIdx = tiers.reduce((ci, t, i) => (xp >= t.xp ? i : ci), 0)
  const currentTier    = tiers[currentTierIdx]
  const nextTier       = tiers[currentTierIdx + 1]
  const tierPct        = nextTier
    ? ((xp - currentTier.xp) / (nextTier.xp - currentTier.xp)) * 100
    : 100

  const animatedXP = useCountUp(loading ? 0 : xp, 1400)

  const C = currentTier.color

  return (
    <HubLayout>
      <style>{`
        @keyframes bpIn  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes glowP { 0%,100%{opacity:.5} 50%{opacity:1} }
        .bp-card { animation: bpIn .45s ease both }
      `}</style>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 0 40px' }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="bp-card" style={{
          borderRadius: '24px',
          background: `linear-gradient(140deg, ${C}22, ${C}08, rgba(0,0,0,0))`,
          border: `1px solid ${C}35`,
          padding: '32px',
          marginBottom: '16px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Radial glow blobs */}
          <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'260px', height:'260px', borderRadius:'50%', background:`${C}18`, filter:'blur(60px)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'-40px', left:'-40px', width:'180px', height:'180px', borderRadius:'50%', background:`${C}10`, filter:'blur(50px)', pointerEvents:'none' }} />

          <div style={{ position:'relative', zIndex:1 }}>
            {/* Top row: tier badge + label */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
              <div style={{
                width:'56px', height:'56px', borderRadius:'16px', flexShrink:0,
                background:`${C}25`, border:`1.5px solid ${C}45`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px',
                boxShadow:`0 0 24px ${C}40`,
              }}>
                {currentTier.emoji}
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <h2 style={{ fontSize:'26px', fontWeight:'900', color:'var(--text)', margin:0, letterSpacing:'-0.03em', lineHeight:1 }}>
                    {currentTier.name}
                  </h2>
                  <span style={{ fontSize:'11px', fontWeight:'700', padding:'3px 9px', borderRadius:'20px', background:`${C}20`, color:C, border:`1px solid ${C}35` }}>
                    Tier {currentTierIdx + 1}/{tiers.length}
                  </span>
                </div>
                <p style={{ fontSize:'13px', color:'var(--text-muted)', margin:'4px 0 0' }}>
                  {isStudent ? 'Student' : 'Tutor'} Graduation
                </p>
              </div>

              {/* XP count — right side */}
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <div style={{ fontSize:'44px', fontWeight:'900', color:C, lineHeight:1, letterSpacing:'-0.04em', textShadow:`0 0 30px ${C}60` }}>
                  {loading ? '—' : animatedXP.toLocaleString()}
                </div>
                <div style={{ fontSize:'12px', fontWeight:'700', color:'var(--text-faint)', marginTop:'2px' }}>XP earned</div>
              </div>
            </div>

            {/* Progress bar */}
            {nextTier ? (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                  <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>
                    {currentTier.xp.toLocaleString()} XP
                  </span>
                  <span style={{ fontSize:'12px', fontWeight:'700', color:nextTier.color }}>
                    {nextTier.emoji} {nextTier.name} · {nextTier.xp.toLocaleString()} XP
                  </span>
                </div>
                <div style={{ height:'12px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', overflow:'hidden', position:'relative' }}>
                  <div style={{
                    height:'100%',
                    width: mounted ? `${Math.min(tierPct, 100)}%` : '0%',
                    background:`linear-gradient(90deg, ${C}80, ${C})`,
                    borderRadius:'99px',
                    boxShadow:`0 0 16px ${C}60`,
                    transition:'width 1.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s',
                  }} />
                </div>
                <p style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'6px' }}>
                  <span style={{ color:C, fontWeight:'700' }}>{Math.round(tierPct)}%</span>
                  {' '}to next tier · {nextTier && !loading ? `${(nextTier.xp - xp).toLocaleString()} XP remaining` : ''}
                </p>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:'8px', background:`${C}18`, borderRadius:'12px', padding:'10px 14px' }}>
                <span className="material-symbols-outlined" style={{ color:C, fontSize:'18px' }}>stars</span>
                <p style={{ fontSize:'13px', fontWeight:'700', color:C, margin:0 }}>Max tier reached! You're at the top 🎉</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Tier road map ─────────────────────────────────────────────────── */}
        <div className="bp-card" style={{
          display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'10px',
          marginBottom:'16px', animationDelay:'0.08s',
        }}>
          {tiers.map((tier, i) => {
            const unlocked  = xp >= tier.xp
            const isCurrent = i === currentTierIdx
            return (
              <div key={tier.name} style={{
                borderRadius:'16px', padding:'16px 10px',
                background: isCurrent ? `${tier.color}20` : unlocked ? `${tier.color}0c` : 'rgba(255,255,255,0.03)',
                border:`1px solid ${isCurrent ? tier.color + '50' : unlocked ? tier.color + '22' : 'rgba(255,255,255,0.06)'}`,
                textAlign:'center',
                boxShadow: isCurrent ? `0 0 28px ${tier.color}28` : 'none',
                opacity: unlocked ? 1 : 0.45,
                transition:'all 0.3s',
                position:'relative',
              }}>
                {isCurrent && (
                  <div style={{ position:'absolute', top:'8px', right:'8px', width:'7px', height:'7px', borderRadius:'50%', background:tier.color, boxShadow:`0 0 8px ${tier.color}`, animation:'glowP 2s ease infinite' }} />
                )}
                <div style={{ fontSize:'28px', marginBottom:'8px', filter: unlocked ? 'none' : 'grayscale(1)' }}>
                  {unlocked ? tier.emoji : '🔒'}
                </div>
                <p style={{ fontSize:'12px', fontWeight:'800', color: unlocked ? tier.color : 'var(--text-faint)', margin:'0 0 2px' }}>
                  {tier.name}
                </p>
                <p style={{ fontSize:'9px', color:'var(--text-faint)', margin:'0 0 8px' }}>
                  {tier.xp === 0 ? 'Start' : `${tier.xp.toLocaleString()} XP`}
                </p>
                {isCurrent && (
                  <span style={{ fontSize:'9px', fontWeight:'800', padding:'2px 8px', borderRadius:'20px', background:`${tier.color}28`, color:tier.color, border:`1px solid ${tier.color}40` }}>
                    YOU ARE HERE
                  </span>
                )}
                {!isCurrent && unlocked && (
                  <span style={{ fontSize:'9px', fontWeight:'700', padding:'2px 8px', borderRadius:'20px', background:'rgba(52,211,153,0.15)', color:'#34d399', border:'1px solid rgba(52,211,153,0.30)' }}>
                    ✓ Unlocked
                  </span>
                )}
                {!unlocked && tier.xp > 0 && (
                  <span style={{ fontSize:'9px', color:'var(--text-faint)' }}>
                    {(tier.xp - xp).toLocaleString()} XP
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Earn XP ───────────────────────────────────────────────────────── */}
        <div className="bp-card" style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'20px', padding:'24px',
          animationDelay:'0.16s',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'18px' }}>
            <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'#a78bfa' }}>bolt</span>
            <h3 style={{ fontWeight:'800', fontSize:'14px', color:'var(--text)', margin:0 }}>How to earn XP</h3>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'10px' }}>
            {actions.map(({ icon, label, xp: pts, color }) => (
              <div key={label} style={{
                display:'flex', alignItems:'center', gap:'10px',
                padding:'12px 14px', borderRadius:'12px',
                background:`${color}0c`, border:`1px solid ${color}20`,
                transition:'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${color}40`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${color}20`}
              >
                <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'16px', color }}>{icon}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:'12px', color:'var(--text)', fontWeight:'600', margin:0, lineHeight:1.3 }}>{label}</p>
                </div>
                <span style={{ fontSize:'13px', fontWeight:'900', color, flexShrink:0 }}>+{pts}</span>
              </div>
            ))}
          </div>

          {/* Quick stats strip */}
          {!loading && (
            <div style={{ display:'flex', gap:'10px', marginTop:'18px', paddingTop:'18px', borderTop:'1px solid var(--border)', flexWrap:'wrap' }}>
              {[
                { label: isStudent ? 'Sessions booked' : 'Sessions completed', value: isStudent ? booked : paid, color:'#60a5fa' },
                { label: 'Sessions confirmed', value: completed, color:'#34d399' },
                { label: isStudent ? 'Active tutors' : 'Active students', value: people.length, color:'#a78bfa' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', borderRadius:'10px', background:`${color}0c`, border:`1px solid ${color}18`, flex:'1 0 auto' }}>
                  <span style={{ fontSize:'18px', fontWeight:'900', color }}>{value}</span>
                  <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </HubLayout>
  )
}
