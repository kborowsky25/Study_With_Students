import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { getTutor, likeTutor, requestTutor, getActiveTutors, getTutorRequestsSent } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const BLUE   = '#60a5fa'
const AMBER  = '#fbbf24'
const PURPLE = '#a78bfa'

const TUTOR_GRADS = [
  `linear-gradient(135deg, ${CORAL} 0%, #ff9a3c 100%)`,
  'linear-gradient(135deg, #60a5fa 0%, #818cf8 100%)',
  'linear-gradient(135deg, #34d399 0%, #059669 100%)',
  'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
  'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #fb923c 0%, #ef4444 100%)',
  'linear-gradient(135deg, #22d3ee 0%, #0284c7 100%)',
]

const SUBJECT_COLORS = [CORAL, BLUE, GREEN, PURPLE, AMBER, '#fb923c', '#22d3ee', '#f472b6']

// Days derived from availability string — a best-effort parse
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function TutorInfo() {
  const { tutorId }  = useParams({ from: '/tutor/$tutorId' })
  const [tutor,      setTutor]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [liked,      setLiked]      = useState(false)
  const [activating, setActivating] = useState(false)
  const [mounted,    setMounted]    = useState(false)
  const [likeAnim,   setLikeAnim]   = useState(false)
  const [activated,  setActivated]  = useState(false)  // already accepted/active
  const [pending,    setPending]    = useState(false)   // request sent, awaiting tutor
  const [aboutOpen,  setAboutOpen]  = useState(false)

  useEffect(() => {
    const id = Number(tutorId)
    Promise.allSettled([
      getTutor(tutorId),
      getActiveTutors(),
      getTutorRequestsSent(),
    ]).then(([tutorRes, activeRes, sentRes]) => {
      if (tutorRes.status === 'fulfilled') {
        setTutor(tutorRes.value.data.tutor)
        setLiked(tutorRes.value.data.liked ?? false)
      } else { toast.error('Could not load tutor') }
      if (activeRes.status === 'fulfilled') {
        const activeIds = (activeRes.value.data.tutors ?? []).map(t => t.id_tutor)
        setActivated(activeIds.includes(id))
      }
      if (sentRes.status === 'fulfilled') {
        const pendingIds = (sentRes.value.data.requests ?? [])
          .filter(r => r.status === 'pending')
          .map(r => r.tutor_id)
        setPending(pendingIds.includes(id))
      }
      setLoading(false)
      setTimeout(() => setMounted(true), 80)
    })
  }, [tutorId])

  async function handleLike() {
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 500)
    try {
      const { data } = await likeTutor(tutorId)
      setLiked(data.liked)
      toast.success(data.liked ? 'Saved to liked tutors ❤️' : 'Removed from liked')
    } catch { toast.error('Failed') }
  }

  async function handleActivate() {
    if (activated || pending || activating) return
    setActivating(true)
    try {
      await requestTutor(tutorId)
      setPending(true)
      toast.success('Request sent! Waiting for the tutor to accept.')
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Failed to send request'
      if (msg.includes('already')) setPending(true)
      else toast.error(msg)
    } finally { setActivating(false) }
  }

  if (loading) return (
    <HubLayout>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '28px', width: '110px', borderRadius: '8px', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '280px', borderRadius: '22px', marginBottom: '14px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '16px' }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="skeleton" style={{ height: '160px', borderRadius: '16px' }} />
          <div className="skeleton" style={{ height: '160px', borderRadius: '16px' }} />
        </div>
      </div>
    </HubLayout>
  )

  if (!tutor) return (
    <HubLayout>
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '56px', color: 'var(--text-faint)', display: 'block', marginBottom: '16px' }}>person_off</span>
        <p style={{ color: 'var(--text-faint)', fontSize: '16px', marginBottom: '20px' }}>Tutor not found</p>
        <Link to="/find-tutors" className="btn-outline">Back to search</Link>
      </div>
    </HubLayout>
  )

  const initials  = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const subjects  = tutor.subjects?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  const gradIdx   = (tutor.id_tutor ?? 0) % TUTOR_GRADS.length
  const aboutLong = (tutor.about_me ?? '').length > 280
  const aboutText = aboutLong && !aboutOpen ? tutor.about_me.slice(0, 280) + '…' : tutor.about_me

  return (
    <HubLayout>
      <style>{`
        @keyframes heartPop {
          0%   { transform: scale(1) }
          40%  { transform: scale(1.45) }
          70%  { transform: scale(0.9) }
          100% { transform: scale(1) }
        }
        @keyframes profileIn {
          from { opacity: 0; transform: translateY(22px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>

      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Back */}
        <Link
          to="/find-tutors"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-faint)', fontSize: '13px', textDecoration: 'none', marginBottom: '20px', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          Back to search
        </Link>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div
          style={{
            borderRadius: '22px', overflow: 'hidden',
            marginBottom: '14px', position: 'relative',
            boxShadow: 'var(--shadow-card)',
            animation: mounted ? 'profileIn 0.4s cubic-bezier(0.22,1,0.36,1) both' : undefined,
          }}
        >
          {/* Hero image / gradient banner */}
          <div style={{ height: '200px', position: 'relative' }}>
            {tutor.image_url
              ? <img src={tutor.image_url} alt={tutor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: TUTOR_GRADS[gradIdx] }} />
            }
            {/* Overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />

            {/* Like button */}
            <button
              onClick={handleLike}
              style={{
                position: 'absolute', top: '14px', right: '14px',
                width: '42px', height: '42px', borderRadius: '12px',
                background: liked ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${liked ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                animation: likeAnim ? 'heartPop 0.45s ease both' : undefined,
                transition: 'background 0.18s, border-color 0.18s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white', fontVariationSettings: liked ? '"FILL" 1' : '"FILL" 0' }}>
                favorite
              </span>
            </button>

            {/* Price badge */}
            {tutor.hourly_rate && (
              <div style={{
                position: 'absolute', bottom: '14px', right: '14px',
                padding: '5px 14px', borderRadius: '20px',
                background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
                <span style={{ fontSize: '16px', fontWeight: '900', color: 'white' }}>
                  £{tutor.hourly_rate}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginLeft: '2px' }}>/hr</span>
              </div>
            )}
          </div>

          {/* Profile info bar */}
          <div style={{
            background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
            padding: '0 28px 24px',
            display: 'flex', alignItems: 'flex-end', gap: '20px',
            position: 'relative',
          }}>
            {/* Avatar overlapping hero */}
            <div style={{
              width: '90px', height: '90px', borderRadius: '20px', flexShrink: 0,
              background: tutor.image_url ? 'rgba(30,30,50,0.65)' : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '3px solid var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '30px', fontWeight: '900',
              boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
              marginTop: '-45px',
              letterSpacing: '-0.02em',
            }}>
              {initials}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {tutor.name}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {tutor.university && (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>school</span>
                        {tutor.university}
                      </span>
                    )}
                    {tutor.course && (
                      <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>· {tutor.course}</span>
                    )}
                  </div>
                  {/* Stars */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className="material-symbols-outlined" style={{ fontSize: '15px', color: AMBER, fontVariationSettings: '"FILL" 1' }}>star</span>
                    ))}
                    <span style={{ fontSize: '12px', color: 'var(--text-faint)', marginLeft: '4px' }}>New tutor · Be the first to review</span>
                  </div>
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignSelf: 'center' }}>
                  <button
                    onClick={handleActivate}
                    disabled={activating || activated || pending}
                    style={{
                      padding: '11px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                      background: activated
                        ? `${GREEN}20`
                        : pending
                        ? `${AMBER}20`
                        : `linear-gradient(135deg, ${CORAL}, #ff9a3c)`,
                      color: activated ? GREEN : pending ? AMBER : 'white',
                      border: activated ? `1px solid ${GREEN}35` : pending ? `1px solid ${AMBER}35` : 'none',
                      cursor: (activated || pending || activating) ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '7px',
                      opacity: activating ? 0.8 : 1,
                      boxShadow: (activated || pending) ? 'none' : `0 4px 14px ${CORAL}40`,
                      transition: 'opacity 0.15s, box-shadow 0.3s',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                      {activated ? 'check_circle' : pending ? 'hourglass_top' : activating ? 'hourglass_empty' : 'person_add'}
                    </span>
                    {activated ? 'Added' : pending ? 'Pending…' : activating ? 'Sending…' : 'Request Tutor'}
                  </button>
                  <Link
                    to="/messages"
                    style={{
                      padding: '11px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                      color: 'var(--text)', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: '7px', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>chat</span>
                    Message
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px',
            animation: mounted ? 'profileIn 0.4s cubic-bezier(0.22,1,0.36,1) 0.08s both' : undefined,
          }}
        >
          <StatPill icon="menu_book" label="Subjects" value={subjects.length > 0 ? subjects.length : '—'} color={CORAL} />
          <StatPill
            icon="schedule"
            label="Availability"
            value={tutor.availability ? 'Available' : 'Contact me'}
            color={GREEN}
          />
          <StatPill
            icon="military_tech"
            label="Platform"
            value="0% commission"
            color={PURPLE}
          />
        </div>

        {/* ── Main grid ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px',
            animation: mounted ? 'profileIn 0.4s cubic-bezier(0.22,1,0.36,1) 0.14s both' : undefined,
          }}
        >
          {/* About */}
          {tutor.about_me && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '18px', padding: '22px', backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-card)', gridColumn: subjects.length > 0 ? '1' : '1 / -1',
            }}>
              <SectionHeader icon="person" label="About" color={BLUE} />
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.75, margin: 0 }}>
                {aboutText}
              </p>
              {aboutLong && (
                <button
                  onClick={() => setAboutOpen(o => !o)}
                  style={{ background: 'none', border: 'none', color: CORAL, fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {aboutOpen ? 'Show less' : 'Read more'}
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', transform: aboutOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
                </button>
              )}
            </div>
          )}

          {/* Subjects */}
          {subjects.length > 0 && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '18px', padding: '22px', backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-card)',
            }}>
              <SectionHeader icon="menu_book" label="Subjects" color={CORAL} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {subjects.map((s, i) => {
                  const c = SUBJECT_COLORS[i % SUBJECT_COLORS.length]
                  return (
                    <span key={s} style={{
                      fontSize: '13px', fontWeight: '700', padding: '6px 14px',
                      borderRadius: '20px', background: `${c}16`, color: c, border: `1px solid ${c}30`,
                      transition: 'transform 0.15s',
                      cursor: 'default',
                    }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {s}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Availability */}
          {tutor.availability && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '18px', padding: '22px', backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-card)',
            }}>
              <SectionHeader icon="event_available" label="Availability" color={GREEN} />
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {WEEKDAYS.map(day => {
                  const avail = tutor.availability.toLowerCase()
                  const active = avail.includes(day.toLowerCase()) || avail.includes('weekday') && ['Mon','Tue','Wed','Thu','Fri'].includes(day) || avail.includes('weekend') && ['Sat','Sun'].includes(day) || avail.includes('anytime') || avail.includes('flexible')
                  return (
                    <div key={day} style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: active ? `${GREEN}18` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? GREEN + '35' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: '700',
                      color: active ? GREEN : 'var(--text-faint)',
                    }}>
                      {day}
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {tutor.availability}
              </p>
            </div>
          )}

          {/* How sessions work */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '18px', padding: '22px', backdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <SectionHeader icon="info" label="How It Works" color={PURPLE} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: 'person_add', text: 'Add tutor to your list', color: CORAL },
                { icon: 'chat',       text: 'Message to discuss goals', color: BLUE },
                { icon: 'event',      text: 'Book your first session', color: GREEN },
                { icon: 'payments',   text: '0% platform commission', color: AMBER },
              ].map(({ icon, text, color }) => (
                <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: `${color}16`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color }}>{icon}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Reviews ────────────────────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '18px', padding: '22px', backdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-card)', marginTop: '14px',
            animation: mounted ? 'profileIn 0.4s cubic-bezier(0.22,1,0.36,1) 0.20s both' : undefined,
          }}
        >
          <SectionHeader icon="star" label="Reviews" color={AMBER} />
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: '10px' }}>
              {[1,2,3,4,5].map(i => (
                <span key={i} className="material-symbols-outlined" style={{ fontSize: '28px', color: 'rgba(251,191,36,0.25)', fontVariationSettings: '"FILL" 1' }}>star</span>
              ))}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '14px' }}>No reviews yet</p>
            <p style={{ color: 'var(--text-faint)', fontSize: '12px' }}>
              Be the first to learn with {tutor.name?.split(' ')[0]} and leave a review
            </p>
          </div>
        </div>

      </div>
    </HubLayout>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '16px 20px',
      backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  )
}

function SectionHeader({ icon, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px', color }}>{icon}</span>
      </div>
      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
    </div>
  )
}
