// Small presentational building blocks for hub pages. Styles live in styles/app.css.
import { Link } from '@tanstack/react-router'
import { initials } from '../../lib/format'

export function Icon({ name, size, fill = false, style, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        ...(size ? { fontSize: size } : null),
        ...(fill ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : null),
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
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
  pending:   { tone: 'amber', label: 'Awaiting tutor' },
  confirmed: { tone: 'blue',  label: 'Confirmed' },
  paid:      { tone: 'green', label: 'Paid' },
  canceled:  { tone: '',      label: 'Cancelled' },
  accepted:  { tone: 'green', label: 'Accepted' },
  declined:  { tone: '',      label: 'Declined' },
}

export function StatusPill({ status, label }) {
  const s = STATUS[status] ?? { tone: '', label: status }
  return <span className={`pill ${s.tone ? `pill-${s.tone}` : ''}`}>{label ?? s.label}</span>
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
