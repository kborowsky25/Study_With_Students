// Building blocks for the public tutor pages (TutorDirectory, PublicTutor, SubjectPage):
// the page shell, tutor cards, prices with the booking fee, and "how booking works".
// They share the public site's shell, buttons and type (components/marketing,
// styles/marketing.css); styles/public.css adds the tutor cards, filters and profile.
import { Link } from '@tanstack/react-router'
import { ClosingCta, SiteShell, Steps } from '../marketing'
import { Avatar, Icon } from '../ui'
import { EmptyPeek } from '../brand/illustrations'
import { BOOKING_FEE_PERCENT } from '../../lib/site'
import { useAuth } from '../../context/AuthContext'
import { formatMoney } from '../../lib/format'
import '../../styles/public.css'

/** Empty, error and not-found states: the peeking figure, a heading or line, and actions. */
export function EmptyBox({ title, heading: Heading = 'b', text, actions, alert = false }) {
  return (
    <div className="pub-empty" role={alert ? 'alert' : undefined}>
      <EmptyPeek title="" />
      <Heading className={Heading === 'b' ? undefined : 'mk-h2'}>{title}</Heading>
      {text && <p>{text}</p>}
      {actions && <div className="mk-actions">{actions}</div>}
    </div>
  )
}

/** Navbar, content and footer: the public site's shell. */
export function PublicPage({ children }) {
  return <SiteShell className="pub">{children}</SiteShell>
}

/** What a family pays for an hour: the tutor's whole rate plus the booking fee (rounded as at checkout). */
export function hourlyPrice(rate) {
  const tutor = Number(rate || 0)
  const fee = Math.round(tutor * BOOKING_FEE_PERCENT) / 100
  return { tutor, fee, total: Math.round((tutor + fee) * 100) / 100 }
}

export const tutorLink = (tutor) => ({ to: '/tutors/$slug', params: { slug: tutor.slug } })
export const subjectLink = (slug) => ({ to: '/subjects/$subject', params: { subject: slug } })

/** "A-level Physics" / "Physics" */
export const topicName = (subject, level) => [level?.name, subject?.name].filter(Boolean).join(' ')

/** "Maths, Physics and Chemistry" */
export function listText(items) {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Trim to a meta-description length at a word boundary. */
export function clip(text, limit = 155) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= limit) return clean
  return `${clean.slice(0, limit).replace(/\s+\S*$/, '').replace(/[,.;:–-]$/, '')}…`
}

/** Five coral stars; with `count`, the average and review count too (nothing when there are no reviews). */
export function StarRating({ rating, count }) {
  if (rating == null || count === 0) return null
  const full = Math.round(rating)
  return (
    <span className="pub-rating">
      <span className="pub-stars" role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" fill={i <= full} />)}
      </span>
      {count != null && <span><b>{rating.toFixed(1)}</b> · {count} review{count === 1 ? '' : 's'}</span>}
    </span>
  )
}

/** Subject links with tutor counts; `current` is highlighted. */
export function SubjectChips({ subjects, current, label = 'Subjects' }) {
  return (
    <ul className="pub-chips" aria-label={label}>
      {subjects.map((s) => (
        <li key={s.slug}>
          <Link {...subjectLink(s.slug)} className={`pub-chip${s.slug === current ? ' is-active' : ''}`} aria-current={s.slug === current ? 'page' : undefined}>
            {s.name}{s.tutor_count != null && <small>{s.tutor_count}</small>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export const Verified = ({ label = 'Verified' }) => (
  <span className="pub-verified" title="University enrolment checked by Study with Students">
    <Icon name="verified" fill />{label}
  </span>
)

export function Price({ rate, note = true }) {
  const { total } = hourlyPrice(rate)
  return (
    <div className="pub-price">
      <b>{formatMoney(total)}</b><small>/hr</small>
      {note && <span className="pub-price-note">incl. {BOOKING_FEE_PERCENT}% booking fee</span>}
    </div>
  )
}

export function TutorAvatar({ tutor, size = 44 }) {
  return (
    <span className="pub-avatar">
      <Avatar name={tutor.name} src={tutor.avatar_url} size={size} />
    </span>
  )
}

/** One tutor in a grid. The name is the link and stretches over the card. */
export function TutorCard({ tutor, headingLevel = 3 }) {
  const { isAuthenticated } = useAuth()
  const Heading = `h${headingLevel}`
  const place = [tutor.university, tutor.course].filter(Boolean).join(' · ')
  const extra = tutor.subjects.length - 4
  return (
    <article className="pub-card">
      <div className="pub-card-head">
        <TutorAvatar tutor={tutor} />
        <div style={{ minWidth: 0 }}>
          <Heading className="pub-card-name">
            <Link {...tutorLink(tutor)} className="pub-card-link">{tutor.name}</Link>
            {tutor.verified && <Verified />}
          </Heading>
          <p className="pub-card-meta">{place}</p>
        </div>
      </div>
      <StarRating rating={tutor.rating} count={tutor.review_count} />
      <ul className="pub-tags" aria-label="Subjects">
        {tutor.subjects.slice(0, 4).map((s) => <li key={s.slug}>{s.name}</li>)}
        {extra > 0 && <li>+{extra}</li>}
      </ul>
      {tutor.summary && <p className="pub-card-summary">{tutor.summary}</p>}
      <div className="pub-card-foot">
        <Price rate={tutor.hourly_rate} />
        {isAuthenticated ? (
          <Link to="/tutor/$tutorId" params={{ tutorId: String(tutor.id) }} className="pub-card-app">Open in app</Link>
        ) : (
          <span className="pub-card-more" aria-hidden="true">View profile<Icon name="chevron_right" /></span>
        )}
      </div>
    </article>
  )
}

export function TutorGrid({ tutors, loading, headingLevel }) {
  if (loading) {
    return (
      <ul className="pub-grid" aria-busy="true" aria-label="Loading tutors">
        {[0, 1, 2].map((i) => <li key={i} className="pub-skeleton" />)}
      </ul>
    )
  }
  return (
    <ul className="pub-grid">
      {tutors.map((t, i) => (
        <li key={t.id} className="mk-reveal" style={{ '--i': i % 3 }}><TutorCard tutor={t} headingLevel={headingLevel} /></li>
      ))}
    </ul>
  )
}

/** Previous / next links that keep the other search params; plain links, so crawlers can follow them. */
export function Pager({ page, pages, to, params }) {
  if (pages <= 1) return null
  const step = (p, children) => (p < 1 || p > pages
    ? <span className="mk-btn mk-btn-ghost mk-btn-sm" aria-disabled="true">{children}</span>
    : <Link to={to} params={params} search={(prev) => ({ ...prev, page: p > 1 ? p : undefined })} className="mk-btn mk-btn-ghost mk-btn-sm">{children}</Link>)
  return (
    <nav className="pub-pager" aria-label="Pages">
      {step(page - 1, <><Icon name="chevron_left" />Previous</>)}
      <span>Page {page} of {pages}</span>
      {step(page + 1, <>Next<Icon name="chevron_right" /></>)}
    </nav>
  )
}

/** The booking flow and the fee, with a worked example at `rate`. */
export function BookingSteps({ rate = 20, tutorName }) {
  const price = hourlyPrice(rate)
  const who = tutorName || 'your tutor'
  return (
    <section className="mk-section" aria-labelledby="booking-title">
      <div className="mk-container mk-split pub-booking">
        <div className="mk-reveal">
          <h2 id="booking-title" className="mk-h2">How booking works</h2>
          <Steps
            className="pub-booking-steps"
            items={[
              ['Create a free account', 'Sign up as a student or parent. Joining is free and needs no card.'],
              ['Send a request', `Ask ${who} to teach you. Once they accept, you can book sessions with them.`],
              ['Book a time', 'Pick a date and length. You see the full price before you send it.'],
              ['Pay once it’s confirmed', 'The tutor confirms the session, then you pay securely by card through Stripe.'],
            ]}
          />
        </div>
        <div className="pub-example mk-reveal" style={{ '--i': 2 }}>
          <h3>What one hour costs</h3>
          <dl>
            <div><dt>{tutorName ? `${tutorName}’s rate` : 'Tutor’s rate'}</dt><dd>{formatMoney(price.tutor, { decimals: 2 })}</dd></div>
            <div><dt>Booking fee ({BOOKING_FEE_PERCENT}%)</dt><dd>{formatMoney(price.fee, { decimals: 2 })}</dd></div>
            <div className="pub-example-total"><dt>You pay</dt><dd>{formatMoney(price.total, { decimals: 2 })}</dd></div>
          </dl>
          <p>Tutors keep 100% of their rate. The {BOOKING_FEE_PERCENT}% booking fee, paid by families, runs the platform.</p>
        </div>
      </div>
    </section>
  )
}

/** Closing call to action: sign up when logged out, the in-app directory when logged in. */
export function SignUpCta({ title = 'Ready to book?', text }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return (
      <ClosingCta title="Book from your dashboard" text="Request a tutor, book sessions and message them from Find tutors in the app.">
        <Link to="/find-tutors" className="mk-btn mk-btn-primary">Open Find tutors<Icon name="arrow_forward" /></Link>
      </ClosingCta>
    )
  }
  return (
    <ClosingCta title={title} text={text || 'Create a free account to request a tutor and book your first session.'}>
      <Link to="/signup" className="mk-btn mk-btn-primary">Sign up to book</Link>
      <Link to="/login" className="mk-btn mk-btn-ghost">Log in</Link>
    </ClosingCta>
  )
}
