import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { getTutor, likeTutor, activateTutor } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const BLUE   = '#60a5fa'
const AMBER  = '#fbbf24'
const PURPLE = '#a78bfa'

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

const SUBJECT_COLORS = [CORAL, BLUE, GREEN, PURPLE, AMBER, '#fb923c', '#22d3ee', '#f472b6']

export default function TutorInfo() {
  const { tutorId }  = useParams({ from: '/tutor/$tutorId' })
  const [tutor,      setTutor]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [liked,      setLiked]      = useState(false)
  const [activating, setActivating] = useState(false)
  const [mounted,    setMounted]    = useState(false)
  const [likeAnim,   setLikeAnim]   = useState(false)
  const [activated,  setActivated]  = useState(false)

  useEffect(() => {
    getTutor(tutorId)
      .then(({ data }) => { setTutor(data.tutor); setLiked(data.liked ?? false) })
      .catch(() => toast.error('Could not load tutor'))
      .finally(() => { setLoading(false); setTimeout(() => setMounted(true), 80) })
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
    setActivating(true)
    try {
      await activateTutor(tutorId)
      setActivated(true)
      toast.success('Tutor added to your active list!')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to add tutor')
    } finally { setActivating(false) }
  }

  if (loading) return (
    <HubLayout>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '32px', width: '120px', borderRadius: '8px', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: '20px', marginBottom: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div className="skeleton" style={{ height: '150px', borderRadius: '16px' }} />
          <div className="skeleton" style={{ height: '150px', borderRadius: '16px' }} />
        </div>
        <div className="skeleton" style={{ height: '60px', borderRadius: '14px' }} />
      </div>
    </HubLayout>
  )

  if (!tutor) return (
    <HubLayout>
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '52px', color: 'var(--text-faint)', display: 'block', marginBottom: '16px' }}>person_off</span>
        <p style={{ color: 'var(--text-faint)', fontSize: '16px', marginBottom: '20px' }}>Tutor not found</p>
        <Link to="/find-tutors" className="btn-outline">Back to search</Link>
      </div>
    </HubLayout>
  )

  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const subjects = tutor.subjects?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  const gradIdx  = (tutor.id_tutor ?? 0) % TUTOR_GRADS.length

  return (
    <HubLayout>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Back link */}
        <Link
          to="/find-tutors"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-faint)', fontSize: '13px', textDecoration: 'none', marginBottom: '20px', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          Back to search
        </Link>

        {/* ── Hero card ──────────────────────────────────────────────────────── */}
        <div
          className={mounted ? 'animate-slide-up' : ''}
          style={{
            borderRadius: '20px', padding: '28px',
            background: `linear-gradient(135deg, ${CORAL}12, rgba(255,255,255,0.02))`,
            border: `1px solid ${CORAL}22`,
            marginBottom: '12px', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: '-50px', right: '-40px', width: '200px', height: '200px', background: `${CORAL}08`, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '22px', position: 'relative' }}>
            {/* Animated avatar */}
            <div
              className="animate-orbit-1"
              style={{
                width: '84px', height: '84px', borderRadius: '22px', flexShrink: 0,
                background: TUTOR_GRADS[gradIdx],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '30px', fontWeight: '900',
                boxShadow: `0 8px 30px ${CORAL}28`,
              }}
            >
              {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)', margin: '0 0 5px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    {tutor.name}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                </div>

                {/* Like button */}
                <button
                  onClick={handleLike}
                  style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: liked ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${liked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                    transform: likeAnim ? 'scale(1.35)' : 'scale(1)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: liked ? '#ef4444' : 'var(--text-faint)', fontVariationSettings: liked ? '"FILL" 1' : '"FILL" 0' }}>
                    favorite
                  </span>
                </button>
              </div>

              {/* Info chips */}
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {tutor.age && <InfoChip icon="person" text={`Age ${tutor.age}`} />}
                {tutor.availability && <InfoChip icon="schedule" text={tutor.availability} color={GREEN} />}
                {subjects.length > 0 && <InfoChip icon="menu_book" text={`${subjects.length} subject${subjects.length !== 1 ? 's' : ''}`} color={BLUE} />}
              </div>
            </div>
          </div>
        </div>

        {/* ── About + Subjects ───────────────────────────────────────────────── */}
        {(tutor.about_me || subjects.length > 0) && (
          <div
            className={mounted ? 'animate-slide-up delay-100' : ''}
            style={{ display: 'grid', gridTemplateColumns: tutor.about_me && subjects.length > 0 ? '1.2fr 1fr' : '1fr', gap: '12px', marginBottom: '12px' }}
          >
            {tutor.about_me && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)' }}>
                <SectionHeader icon="person" label="About" color={BLUE} />
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>{tutor.about_me}</p>
              </div>
            )}
            {subjects.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)' }}>
                <SectionHeader icon="menu_book" label="Subjects" color={CORAL} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {subjects.map((s, i) => {
                    const c = SUBJECT_COLORS[i % SUBJECT_COLORS.length]
                    return (
                      <span key={s} style={{ fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', background: `${c}18`, color: c, border: `1px solid ${c}30` }}>
                        {s}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Action buttons ─────────────────────────────────────────────────── */}
        <div
          className={mounted ? 'animate-slide-up delay-200' : ''}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
        >
          <button
            onClick={handleActivate}
            disabled={activating || activated}
            className="btn-primary"
            style={{
              padding: '14px', fontSize: '14px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              borderRadius: '14px', opacity: (activating || activated) ? 0.85 : 1,
              background: activated ? `linear-gradient(135deg, ${GREEN}, #059669)` : undefined,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {activated ? 'check_circle' : 'person_add'}
            </span>
            {activating ? 'Adding…' : activated ? 'Added!' : 'Add to My Tutors'}
          </button>
          <Link
            to="/messages"
            className="btn-secondary"
            style={{ padding: '14px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '14px', textDecoration: 'none' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
            Message
          </Link>
        </div>

      </div>
    </HubLayout>
  )
}

function InfoChip({ icon, text, color = 'var(--text-faint)' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color }}>
      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{icon}</span>
      {text}
    </div>
  )
}

function SectionHeader({ icon, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
      <div style={{ width: '24px', height: '24px', borderRadius: '7px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px', color }}>{icon}</span>
      </div>
      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
    </div>
  )
}
