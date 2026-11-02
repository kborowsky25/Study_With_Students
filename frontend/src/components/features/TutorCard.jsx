// Tutor pieces shared by the student-side tutoring pages: the directory row (Find tutors,
// Saved tutors), subject pills, and the "Book a session" button that lets a student pick
// which of their tutors to book.
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { formatMoney } from '../../lib/format'
import { Avatar, Icon, Pill, StatusPill } from '../ui'
import BookSessionModal from './BookSessionModal'

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

const splitSubjects = (value) =>
  [...new Set(String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean))]

/** Comma-separated subjects as pills; subjects matching `highlight` turn coral. */
export function SubjectPills({ subjects, highlight = '', max = Infinity }) {
  const list = splitSubjects(subjects)
  if (!list.length) return null
  const query = highlight.trim().toLowerCase()
  const shown = list.slice(0, max)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {shown.map((s) => (
        <Pill key={s} tone={query && s.toLowerCase().includes(query) ? 'coral' : undefined}>{s}</Pill>
      ))}
      {list.length > shown.length && <Pill>+{list.length - shown.length}</Pill>}
    </div>
  )
}

export const VerifiedPill = () => <Pill tone="green">Verified</Pill>
export const DbsPill = () => <Pill tone="green">DBS checked</Pill>

/** Where the viewer stands with this tutor. */
export function RelationPill({ status }) {
  if (status === 'self') return <Pill tone="coral">You</Pill>
  if (status === 'connected') return <StatusPill status="accepted" label="Your tutor" />
  if (status === 'pending') return <StatusPill status="pending" label="Requested" />
  return null
}

/**
 * One tutor as a list row (use inside a `.row-list`).
 * status:  'self' | 'connected' | 'pending' | null
 * actions: buttons on the right (defaults to "View profile")
 */
export default function TutorCard({ tutor, liked = false, onToggleLike, status, highlight, actions }) {
  const profile = { to: '/tutor/$tutorId', params: { tutorId: String(tutor.id_tutor) } }
  const place = [tutor.university, tutor.course].filter(Boolean).join(' · ')

  return (
    <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-start', rowGap: 10, padding: '12px 18px' }}>
      <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar name={tutor.name || '?'} src={tutor.avatar_url} size={36} />
        <div className="main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Link {...profile} className="title" style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
              {tutor.name}
            </Link>
            {tutor.verified && <VerifiedPill />}
            {tutor.dbs_verified && <DbsPill />}
            <RelationPill status={status} />
          </div>
          {place && <div className="meta">{place}</div>}
          {tutor.subjects && (
            <div style={{ marginTop: 8 }}>
              <SubjectPills subjects={tutor.subjects} highlight={highlight} max={4} />
            </div>
          )}
        </div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', marginRight: 4 }}>
          {formatMoney(tutor.hourly_rate ?? 20)}<span style={{ fontWeight: 500, color: 'var(--text-faint)' }}>/hr</span>
        </span>
        {onToggleLike && status !== 'self' && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => onToggleLike(tutor)}
            aria-pressed={liked}
            aria-label={liked ? `Remove ${tutor.name} from saved tutors` : `Save ${tutor.name}`}
            title={liked ? 'Saved' : 'Save'}
          >
            <Icon name="favorite" fill={liked} style={liked ? { color: 'var(--coral)' } : undefined} />
          </button>
        )}
        {actions ?? <Link {...profile} className="btn btn-ghost btn-sm">View profile</Link>}
      </div>
    </div>
  )
}

/**
 * Opens BookSessionModal. With one tutor it books them straight away; with several it first
 * shows a menu to choose who. Disabled until the student has a connected tutor.
 */
export function BookSessionButton({ tutors, onBooked, label = 'Book a session', className = 'btn btn-coral', icon = 'add' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [tutor, setTutor] = useState(null)
  const wrap = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  if (!tutors.length) {
    return (
      <button type="button" className={className} disabled title="Available once a tutor accepts your request">
        <Icon name={icon} />{label}
      </button>
    )
  }

  const several = tutors.length > 1
  return (
    <span ref={wrap} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className={className}
        aria-haspopup={several ? 'menu' : undefined}
        aria-expanded={several ? menuOpen : undefined}
        onClick={() => (several ? setMenuOpen((v) => !v) : setTutor(tutors[0]))}
      >
        <Icon name={icon} />{label}{several && <Icon name="expand_more" />}
      </button>

      {menuOpen && (
        <div className="menu" role="menu" style={{ top: 'calc(100% + 6px)', right: 0 }}>
          {tutors.map((t) => (
            <button key={t.id_tutor} type="button" role="menuitem" className="menu-item"
              onClick={() => { setMenuOpen(false); setTutor(t) }}>
              <Avatar name={t.name} src={t.avatar_url} size={22} />
              <span style={{ flex: 1, textAlign: 'left', ...ellipsis }}>{t.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{formatMoney(t.hourly_rate ?? 20)}/hr</span>
            </button>
          ))}
        </div>
      )}

      {tutor && <BookSessionModal tutor={tutor} onClose={() => setTutor(null)} onBooked={onBooked} />}
    </span>
  )
}
