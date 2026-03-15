import { useState } from 'react'
import { Link } from '@tanstack/react-router'

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

// Accent colours matching each gradient for hover glow
const GRAD_GLOWS = [
  CORAL, '#60a5fa', '#34d399', '#f472b6',
  '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee',
]

const SUBJECT_COLORS = [CORAL, BLUE, GREEN, PURPLE, AMBER, '#fb923c', '#22d3ee', '#f472b6']

export default function TutorCard({ tutor, onLike, liked = false, onActivate, activated = false }) {
  const [adding,   setAdding]   = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)
  const [hovered,  setHovered]  = useState(false)

  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const subjects = tutor.subjects?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  const gradIdx  = (tutor.id_tutor ?? 0) % TUTOR_GRADS.length
  const glow     = GRAD_GLOWS[gradIdx]

  async function handleActivate(e) {
    e.preventDefault()
    if (activated || adding || !onActivate) return
    setAdding(true)
    try { await onActivate(tutor.id_tutor) }
    finally { setAdding(false) }
  }

  function handleLike(e) {
    e.preventDefault()
    if (!onLike) return
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 450)
    onLike(tutor.id_tutor)
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? glow + '30' : 'var(--border)'}`,
        borderRadius: '20px', overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        boxShadow: hovered
          ? `0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px ${glow}18`
          : 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease, border-color 0.22s ease',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Hero area ─────────────────────────────────────────────────────── */}
      <div style={{ height: '148px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {/* Gradient background or photo */}
        {tutor.image_url
          ? <img src={tutor.image_url} alt={tutor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: TUTOR_GRADS[gradIdx] }} />
        }

        {/* Bottom fade overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.50) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Like button — top right */}
        {onLike && (
          <button
            onClick={handleLike}
            style={{
              position: 'absolute', top: '12px', right: '12px', zIndex: 2,
              width: '34px', height: '34px', borderRadius: '10px',
              background: liked ? 'rgba(239,68,68,0.80)' : 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${liked ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transform: likeAnim ? 'scale(1.35)' : 'scale(1)',
              transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.18s',
            }}
            title={liked ? 'Unlike' : 'Save tutor'}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', color: 'white', fontVariationSettings: liked ? '"FILL" 1' : '"FILL" 0' }}
            >
              favorite
            </span>
          </button>
        )}

        {/* Floating avatar — overlaps hero bottom */}
        <div style={{
          position: 'absolute', bottom: '-26px', left: '18px', zIndex: 2,
          width: '58px', height: '58px', borderRadius: '16px',
          background: tutor.image_url ? 'rgba(30,30,50,0.65)' : 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(10px)',
          border: '2.5px solid var(--bg-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '18px', fontWeight: '900',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          letterSpacing: '-0.02em',
        }}>
          {initials}
        </div>

        {/* Price badge — bottom right of hero */}
        {tutor.hourly_rate && (
          <div style={{
            position: 'absolute', bottom: '10px', right: '12px', zIndex: 2,
            padding: '3px 9px', borderRadius: '20px',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
              £{tutor.hourly_rate}<span style={{ fontSize: '10px', fontWeight: '500', opacity: 0.75 }}>/hr</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '34px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Name + university */}
        <div>
          <h3 style={{
            fontWeight: '800', color: 'var(--text)', fontSize: '16px',
            margin: '0 0 3px', letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>
            {tutor.name}
          </h3>
          {(tutor.university || tutor.course) && (
            <p style={{ color: 'var(--text-faint)', fontSize: '12px', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px', flexShrink: 0 }}>school</span>
              {[tutor.university, tutor.course].filter(Boolean).join(' · ')}
            </p>
          )}
          {/* Star rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} className="material-symbols-outlined" style={{ fontSize: '13px', color: AMBER, fontVariationSettings: '"FILL" 1' }}>star</span>
            ))}
            <span style={{ fontSize: '11px', color: 'var(--text-faint)', marginLeft: '3px' }}>New tutor</span>
          </div>
        </div>

        {/* Subject pills */}
        {subjects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {subjects.slice(0, 3).map((s, i) => {
              const c = SUBJECT_COLORS[i % SUBJECT_COLORS.length]
              return (
                <span key={s} style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: `${c}14`, color: c, border: `1px solid ${c}28` }}>
                  {s}
                </span>
              )
            })}
            {subjects.length > 3 && (
              <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-faint)', border: '1px solid rgba(255,255,255,0.08)' }}>
                +{subjects.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bio snippet */}
        {tutor.about_me && (
          <p style={{
            fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.65, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            flex: 1,
          }}>
            {tutor.about_me}
          </p>
        )}

        {/* Availability */}
        {tutor.availability && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
            <span style={{ fontSize: '11px', color: GREEN, fontWeight: '600' }}>
              {tutor.availability}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: tutor.availability ? '0' : 'auto' }}>
          <Link
            to="/tutor/$tutorId"
            params={{ tutorId: String(tutor.id_tutor) }}
            style={{
              flex: 1, textAlign: 'center', textDecoration: 'none',
              padding: '10px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '700',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--text)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          >
            View Profile
          </Link>
          {onActivate && (
            <button
              onClick={handleActivate}
              disabled={activated || adding}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: '12px',
                background: activated ? `${GREEN}20` : `linear-gradient(135deg, ${CORAL}, #ff9a3c)`,
                color: activated ? GREEN : 'white',
                fontSize: '13px', fontWeight: '700',
                cursor: activated || adding ? 'default' : 'pointer',
                border: activated ? `1px solid ${GREEN}35` : 'none',
                opacity: adding ? 0.75 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                transition: 'opacity 0.15s, transform 0.15s',
                boxShadow: activated ? 'none' : `0 4px 14px ${CORAL}40`,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {activated ? 'check_circle' : adding ? 'hourglass_empty' : 'person_add'}
              </span>
              {activated ? 'Added' : adding ? '…' : 'Add Tutor'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
