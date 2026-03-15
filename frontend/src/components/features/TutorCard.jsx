import { useState } from 'react'
import { Link } from '@tanstack/react-router'

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

function calcAge(raw) {
  if (!raw) return null
  const dob = new Date(raw)
  if (isNaN(dob.getTime())) return raw
  const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  return age > 0 && age < 120 ? age : null
}

export default function TutorCard({ tutor, onLike, liked = false, onActivate, activated = false }) {
  const [adding,   setAdding]   = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)
  const [hovered,  setHovered]  = useState(false)

  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const age      = calcAge(tutor.age)
  const subjects = tutor.subjects?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  const gradIdx  = (tutor.id_tutor ?? 0) % TUTOR_GRADS.length

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
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '18px', padding: '20px',
        backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? 'var(--shadow-hover)' : 'var(--shadow-card)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {/* Gradient avatar */}
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
            background: TUTOR_GRADS[gradIdx],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '16px', fontWeight: '900',
            boxShadow: `0 4px 14px rgba(0,0,0,0.2)`,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: '800', color: 'var(--text)', fontSize: '14px', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tutor.name}
            </p>
            <p style={{ color: 'var(--text-faint)', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tutor.university}{tutor.course ? ` · ${tutor.course}` : ''}
            </p>
          </div>
        </div>

        {/* Like button */}
        {onLike && (
          <button
            onClick={handleLike}
            style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: liked ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${liked ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.18s',
              transform: likeAnim ? 'scale(1.3)' : 'scale(1)',
            }}
            title={liked ? 'Unlike' : 'Save tutor'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: liked ? '#ef4444' : 'var(--text-faint)', fontVariationSettings: liked ? '"FILL" 1' : '"FILL" 0' }}>
              favorite
            </span>
          </button>
        )}
      </div>

      {/* Info chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {age && (
          <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-faint)' }}>
            Age {age}
          </span>
        )}
        {tutor.availability && (
          <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: `${GREEN}14`, border: `1px solid ${GREEN}28`, color: GREEN, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>schedule</span>
            {tutor.availability.replace(/â€"/g, '—').replace(/â€˜/g, "'").replace(/â€™/g, "'")}
          </span>
        )}
      </div>

      {/* Subject pills */}
      {subjects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
          {subjects.slice(0, 4).map((s, i) => {
            const c = SUBJECT_COLORS[i % SUBJECT_COLORS.length]
            return (
              <span key={s} style={{ fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px', background: `${c}14`, color: c, border: `1px solid ${c}28` }}>
                {s}
              </span>
            )
          })}
          {subjects.length > 4 && (
            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-faint)', border: '1px solid rgba(255,255,255,0.08)' }}>
              +{subjects.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Bio */}
      {tutor.about_me && (
        <p style={{ fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.6, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {tutor.about_me}
        </p>
      )}

      {/* Actions — pushed to bottom */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: subjects.length === 0 && !tutor.about_me ? '0' : '0' }}>
        <Link
          to="/tutor/$tutorId"
          params={{ tutorId: String(tutor.id_tutor) }}
          style={{
            flex: 1, textAlign: 'center', textDecoration: 'none',
            padding: '9px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        >
          View Profile
        </Link>
        {onActivate && (
          <button
            onClick={handleActivate}
            disabled={activated || adding}
            style={{
              flex: 1, padding: '9px 12px', borderRadius: '10px', border: 'none',
              background: activated ? `${GREEN}20` : 'linear-gradient(135deg,#ff725e,#ff9a3c)',
              color: activated ? GREEN : 'white',
              fontSize: '13px', fontWeight: '700',
              cursor: activated || adding ? 'default' : 'pointer',
              opacity: adding ? 0.75 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              transition: 'opacity 0.15s',
              border: activated ? `1px solid ${GREEN}35` : 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              {activated ? 'check_circle' : adding ? 'hourglass_empty' : 'person_add'}
            </span>
            {activated ? 'Added' : adding ? '…' : 'Add'}
          </button>
        )}
      </div>
    </div>
  )
}
