// Small presentational building blocks for hub pages. Styles live in styles/app.css.
import { Link } from '@tanstack/react-router'
import { initials } from '../../lib/format'
import { BrandIcon } from '../brand/icons'

// Filled variants for icons that have one
const FILLED = { star: 'star_filled', favorite: 'heart_filled' }

/** Our own icon set (components/brand/icons.jsx). Sized by CSS font-size — 1em square. */
export function Icon({ name, size, fill = false, style, className = '', title }) {
  return (
    <BrandIcon
      name={(fill && FILLED[name]) || name}
      size="1em"
      title={title}
      className={`icon ${className}`}
      style={size ? { fontSize: size, ...style } : style}
    />
  )
}

export const Kbd = ({ children }) => <kbd className="kbd">{children}</kbd>

// Muted, flat tones — one per person, derived from their name
const AVATAR_TONES = ['#c8664f', '#4f6aa8', '#3f8f74', '#7d68c4', '#b98a3c', '#3f86b0', '#a15b86', '#5f7a8c']

export function Avatar({ name = '?', src, size = 28 }) {
  const tone = AVATAR_TONES[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length]
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: tone }}>
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  )
}

/** A bordered panel with an optional header row. `icon` is accepted but not drawn. */
export function Card({ title, count, action, children, className = '', style }) {
  return (
    <section className={`card ${className}`} style={style}>
      {title && (
        <header className="card-head">
          <h3>{title}</h3>
          {count != null && <span className="count">{count}</span>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function CardLink({ to, search, children = 'View all' }) {
  return (
    <Link to={to} search={search} className="card-link">
      {children}<Icon name="chevron_right" />
    </Link>
  )
}

export function Stat({ label, value, unit }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}{unit && <small>{unit}</small>}</div>
    </div>
  )
}

const STATUS = {
  pending:   'Awaiting tutor',
  confirmed: 'Confirmed',
  paid:      'Paid',
  canceled:  'Cancelled',
  accepted:  'Accepted',
  declined:  'Declined',
}

// Small state glyphs (like Linear's issue states), coloured by --status in app.css
const GLYPHS = {
  pending:   <circle cx="7" cy="7" r="5.25" fill="none" stroke="var(--status)" strokeWidth="1.5" strokeDasharray="2.4 1.8" />,
  confirmed: (
    <>
      <circle cx="7" cy="7" r="5.25" fill="none" stroke="var(--status)" strokeWidth="1.5" />
      <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="var(--status)" />
    </>
  ),
  paid: (
    <>
      <circle cx="7" cy="7" r="6" fill="var(--status)" />
      <path d="M4.4 7.2l1.8 1.8 3.4-3.6" fill="none" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  canceled: (
    <>
      <circle cx="7" cy="7" r="6" fill="var(--status)" />
      <path d="M5 5l4 4M9 5l-4 4" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
}
GLYPHS.accepted = GLYPHS.paid
GLYPHS.declined = GLYPHS.canceled

/** Session/request state: a glyph + label, never a coloured pill. */
export function StatusPill({ status, label }) {
  return (
    <span className={`status ${status}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">{GLYPHS[status] ?? GLYPHS.pending}</svg>
      {label ?? STATUS[status] ?? status}
    </span>
  )
}

/** Star rating summary: ★ 4.8 (12). */
export function Stars({ rating, count }) {
  if (!count) return null
  return (
    <span className="stars" title={`${Number(rating).toFixed(1)} from ${count} review${count > 1 ? 's' : ''}`}>
      <Icon name="star" fill size={13} />
      {Number(rating).toFixed(1)}
      <span style={{ color: 'var(--text-faint)' }}>({count})</span>
    </span>
  )
}

export function Pill({ tone, children, plain = true, style }) {
  return <span className={`pill ${tone ? `pill-${tone}` : ''} ${plain ? 'plain' : ''}`} style={style}>{children}</span>
}

/** Fixed-width date column for lists: "Wed 4 Nov". */
export function DateChip({ value, time = false }) {
  const d = new Date(value)
  return (
    <span className="date-col">
      {d.toLocaleDateString('en-GB', { weekday: 'short' })} <b>{d.getDate()} {d.toLocaleDateString('en-GB', { month: 'short' })}</b>
      {time && <> · {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>}
    </span>
  )
}

/** One quiet line, optionally with an action. Extra description is intentionally not shown. */
export function EmptyState({ title, action }) {
  return (
    <div className="empty">
      <span>{title}</span>
      {action}
    </div>
  )
}

export function SkeletonRows({ rows = 3 }) {
  return (
    <div className="row-list" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="row" key={i}>
          <div className="main">
            <div className="skeleton skeleton-line" style={{ width: `${55 - i * 9}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
