// Public tutor profile (/tutors/:slug, e.g. /tutors/12-oliver-g — the id comes first, so the
// name part can change without breaking links). Only the public fields from /api/public,
// the price with the booking fee, and JSON-LD for search engines.
import { useEffect } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { getPublicTutor } from '../api/public'
import { Icon } from '../components/ui'
import {
  BookingSteps, EmptyBox, Price, PublicPage, SignUpCta, StarRating, TutorAvatar,
  clip, hourlyPrice, listText, subjectLink, tutorLink,
} from '../components/public'
import { BOOKING_FEE_PERCENT } from '../components/features/BookSessionModal'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/format'
import { useQuery } from '../lib/query'
import useMeta, { absoluteUrl } from '../lib/useMeta'

const monthYear = (date) => new Date(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

/** schema.org Service offered by a Person; aggregateRating only once there are reviews. */
function structuredData(tutor) {
  const url = absoluteUrl(`/tutors/${tutor.slug}`)
  const price = hourlyPrice(tutor.hourly_rate)
  const subjects = tutor.subjects.map((s) => s.name)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${url}#tutoring`,
        name: `${listText(subjects)} tutoring with ${tutor.name}`,
        serviceType: 'Private tutoring',
        url,
        description: clip(tutor.about, 300),
        areaServed: { '@type': 'Country', name: 'United Kingdom' },
        provider: {
          '@type': 'Person',
          name: tutor.name,
          image: tutor.avatar_url ? absoluteUrl(tutor.avatar_url) : undefined,
          affiliation: { '@type': 'CollegeOrUniversity', name: tutor.university },
          knowsAbout: subjects,
        },
        offers: {
          '@type': 'Offer',
          price: price.total.toFixed(2),
          priceCurrency: 'GBP',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: price.total.toFixed(2),
            priceCurrency: 'GBP',
            unitCode: 'HUR',
            unitText: 'hour',
          },
          description: `${formatMoney(price.tutor, { decimals: 2 })} an hour to the tutor plus a ${BOOKING_FEE_PERCENT}% booking fee`,
        },
        ...(tutor.review_count > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: tutor.rating,
            reviewCount: tutor.review_count,
            bestRating: 5,
            worstRating: 1,
          },
        }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Tutors', item: absoluteUrl('/tutors') },
          { '@type': 'ListItem', position: 2, name: tutor.name, item: url },
        ],
      },
    ],
  }
}

/** Facts first: subjects, levels, university, price, rating. */
function describe(tutor) {
  const levels = tutor.levels.length ? ` (${tutor.levels.join(', ')})` : ''
  const rated = tutor.review_count ? ` Rated ${tutor.rating.toFixed(1)}/5.` : ''
  return clip(`${tutor.name}: ${listText(tutor.subjects.map((s) => s.name))} tutor${levels} at ${tutor.university}. `
    + `${formatMoney(hourlyPrice(tutor.hourly_rate).total)}/hr incl. booking fee.${rated}`)
}

export default function PublicTutor() {
  const { slug = '' } = useParams({ strict: false })
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const id = Number.parseInt(slug, 10)
  const valid = Number.isInteger(id) && id > 0
  const { data, error, loading, refetch } = useQuery(valid ? `public:tutor:${id}` : null, () => getPublicTutor(id), { enabled: valid })
  const tutor = data?.tutor
  const notFound = !valid || error?.response?.status === 404

  // /tutors/12 or an old name → /tutors/12-oliver-g
  useEffect(() => {
    if (tutor && tutor.slug !== slug) navigate({ ...tutorLink(tutor), replace: true })
  }, [tutor, slug, navigate])

  useMeta(tutor ? {
    title: `${tutor.name} – ${tutor.subjects.slice(0, 2).map((s) => s.name).join(' & ')} tutor`,
    description: describe(tutor),
    path: `/tutors/${tutor.slug}`,
    image: tutor.avatar_url,
    type: 'profile',
    jsonLd: structuredData(tutor),
  } : {
    title: notFound ? 'Tutor not found' : 'Tutor',
    description: 'Tutors who study at UK universities. Tutors keep 100% of their rate.',
    noindex: notFound,
  })

  if (notFound || (error && !tutor)) {
    return (
      <PublicPage>
        <section className="pub-hero">
          <div className="pub-container">
            {notFound ? (
              <EmptyBox heading="h1" title="This tutor isn’t listed"
                text="The profile may have been taken down or isn’t finished yet. Plenty of other tutors are ready to help."
                actions={<Link to="/tutors" className="pub-btn pub-btn-coral">Browse tutors</Link>} />
            ) : (
              <EmptyBox heading="h1" alert title="We couldn’t load this tutor" text="Check your connection and try again."
                actions={<button type="button" className="pub-btn pub-btn-coral" onClick={() => refetch().catch(() => {})}>Try again</button>} />
            )}
          </div>
        </section>
      </PublicPage>
    )
  }

  if (loading || !tutor) {
    return (
      <PublicPage>
        <section className="pub-hero" aria-busy="true" aria-label="Loading tutor">
          <div className="pub-container pub-profile">
            <div className="pub-skeleton" style={{ minHeight: 360 }} />
            <div className="pub-skeleton" style={{ minHeight: 300 }} />
          </div>
        </section>
      </PublicPage>
    )
  }

  const price = hourlyPrice(tutor.hourly_rate)
  const place = tutor.course ? `${tutor.course} at ${tutor.university}` : `Studies at ${tutor.university}`

  return (
    <PublicPage>
      <section className="pub-hero">
        <div className="pub-container">
          <nav aria-label="Breadcrumb">
            <ol className="pub-crumbs">
              <li><Link to="/tutors">Tutors</Link></li>
              {tutor.subjects[0] && <li><Link {...subjectLink(tutor.subjects[0].slug)}>{tutor.subjects[0].name}</Link></li>}
              <li aria-current="page">{tutor.name}</li>
            </ol>
          </nav>

          <div className="pub-profile">
            <div className="pub-profile-main">
              <div className="pub-profile-head">
                <TutorAvatar tutor={tutor} size={112} />
                <div style={{ minWidth: 0 }}>
                  {tutor.verified && <span className="pub-tag" style={{ marginBottom: 12 }}><Icon name="verified" fill />Verified tutor</span>}
                  <h1 className="pub-h1">{tutor.name}</h1>
                </div>
              </div>
              <p className="pub-profile-place">{place}</p>
              <div className="pub-profile-facts">
                <StarRating rating={tutor.rating} count={tutor.review_count} />
                {tutor.levels.length > 0 && <span className="pub-levels">Teaches {listText(tutor.levels)}</span>}
              </div>
            </div>

            <aside className="pub-box pub-book" aria-label={`Book ${tutor.first_name}`}>
              <Price rate={tutor.hourly_rate} note={false} />
              <dl className="pub-split">
                <div><dt>{tutor.first_name} keeps</dt><dd>{formatMoney(price.tutor, { decimals: 2 })}</dd></div>
                <div><dt>Booking fee ({BOOKING_FEE_PERCENT}%)</dt><dd>{formatMoney(price.fee, { decimals: 2 })}</dd></div>
              </dl>
              <div className="pub-actions">
                {isAuthenticated ? (
                  <Link to="/tutor/$tutorId" params={{ tutorId: String(tutor.id) }} className="pub-btn pub-btn-coral">
                    Request &amp; book in the app<Icon name="arrow_forward" />
                  </Link>
                ) : (
                  <>
                    <Link to="/signup" className="pub-btn pub-btn-coral">Sign up to book</Link>
                    <Link to="/login" className="pub-btn pub-btn-slate">Log in</Link>
                  </>
                )}
              </div>
              <p className="pub-book-note">Free to join. You pay only after {tutor.first_name} confirms a session.</p>
            </aside>

            <div className="pub-profile-details">
              <div className="pub-profile-block">
                <h2 className="pub-h3">Subjects</h2>
                <ul className="pub-chips">
                  {tutor.subjects.map((s) => (
                    <li key={s.slug}><Link {...subjectLink(s.slug)} className="pub-chip">{s.name}</Link></li>
                  ))}
                </ul>
              </div>

              <div className="pub-profile-block">
                <h2 className="pub-h3">About {tutor.first_name}</h2>
                <p className="pub-about">{tutor.about}</p>
              </div>

              {tutor.reviews.length > 0 && (
                <div className="pub-profile-block">
                  <h2 className="pub-h3">What students say</h2>
                  <ul className="pub-reviews">
                    {tutor.reviews.map((r, i) => (
                      <li key={i}>
                        <figure className="pub-review">
                          <StarRating rating={r.rating} />
                          <blockquote>“{r.comment}”</blockquote>
                          <figcaption>{r.reviewer}{r.date && `, ${monthYear(r.date)}`}</figcaption>
                        </figure>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <BookingSteps rate={tutor.hourly_rate} tutorName={tutor.first_name} />

      <SignUpCta title={`Book a session with ${tutor.first_name}`} text={`Create a free account to send ${tutor.first_name} a request and book your first session.`} />
    </PublicPage>
  )
}
