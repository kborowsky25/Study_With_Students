// Public subject page (/subjects/:subject), e.g. /subjects/a-level-physics: the tutors who
// teach it, a short intro built from their profiles, and how booking works with the fee.
// No login needed, so search engines can index it.
import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { getPublicSubjects, getPublicTutors } from '../api/public'
import { Icon } from '../components/ui'
import {
  ART, BookingSteps, Pager, PublicPage, SignUpCta, SubjectChips, TutorGrid,
  clip, hourlyPrice, listText, subjectLink, topicName,
} from '../components/public'
import { formatMoney } from '../lib/format'
import { useQuery } from '../lib/query'
import useMeta, { absoluteUrl } from '../lib/useMeta'

/** "£21 to £23.10" (what families pay an hour, booking fee included) */
function priceRange(rates) {
  const from = formatMoney(hourlyPrice(rates.from).total)
  const to = formatMoney(hourlyPrice(rates.to).total)
  return from === to ? from : `${from} to ${to}`
}

/** One factual paragraph from the listing: how many tutors, where they study, what they charge. */
function introText(data, topic) {
  const n = data.total
  const unis = data.universities
  const where = unis.length === 1 ? ` at ${unis[0].name}` : unis.length > 1 ? ` at ${unis.length} universities` : ''
  const parts = [`${n} university student${n === 1 ? ' teaches' : 's teach'} ${topic} on Study with Students${where}.`]
  if (data.rates) parts.push(`Lessons cost ${priceRange(data.rates)} an hour, booking fee included.`)
  const verified = data.verified_count
  if (verified === n) parts.push(n === 1 ? 'This tutor is verified.' : 'All of them are verified.')
  else if (verified) parts.push(`${verified} ${verified === 1 ? 'is' : 'are'} verified.`)
  return parts.join(' ')
}

export default function SubjectPage() {
  const { subject: slug = '' } = useParams({ strict: false })
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const page = Math.max(1, Number(search.page) || 1)
  const query = page > 1 ? { subject: slug, page } : { subject: slug }
  const { data, error, loading, refetch } = useQuery(`public:tutors:${JSON.stringify(query)}`, () => getPublicTutors(query))
  const { data: subjectData } = useQuery('public:subjects', getPublicSubjects, { staleTime: 60_000 })

  const subject = data?.subject
  const level = data?.level
  const topic = topicName(subject, level)
  const canonical = subject ? (level ? `${level.slug}-${subject.slug}` : subject.slug) : null
  const empty = Boolean(data) && data.total === 0
  const missing = Boolean(data) && !subject

  // One URL per page: /subjects/maths → /subjects/mathematics
  useEffect(() => {
    if (canonical && canonical !== slug) navigate({ ...subjectLink(canonical), search: (prev) => prev, replace: true })
  }, [canonical, slug, navigate])

  const entry = subjectData?.subjects.find((s) => s.slug === subject?.slug)
  const levelChips = entry?.levels.length
    ? [{ slug: entry.slug, name: 'All levels', tutor_count: entry.tutor_count },
       ...entry.levels.map((l) => ({ slug: l.slug, name: l.level, tutor_count: l.tutor_count }))]
    : []
  const others = (subjectData?.subjects ?? []).filter((s) => s.slug !== subject?.slug)
  const path = `/subjects/${canonical ?? slug}${page > 1 ? `?page=${page}` : ''}`

  useMeta({
    title: subject ? `${topic} tutors` : missing ? 'Subject not found' : 'Tutors by subject',
    description: data && subject && !empty
      ? clip(`Find ${/^[AEIOU]/i.test(topic) ? 'an' : 'a'} ${topic} tutor who studies at a UK university. `
        + `${data.total} tutor${data.total === 1 ? '' : 's'}, ${priceRange(data.rates)} an hour incl. booking fee. `
        + 'Tutors keep 100% of their rate.')
      : 'Find a tutor who studies at a UK university. Tutors keep 100% of their rate.',
    path,
    noindex: missing || empty,
    jsonLd: subject && {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Tutors', item: absoluteUrl('/tutors') },
        { '@type': 'ListItem', position: 2, name: `${subject.name} tutors`, item: absoluteUrl(`/subjects/${subject.slug}`) },
        ...(level ? [{ '@type': 'ListItem', position: 3, name: `${topic} tutors`, item: absoluteUrl(`/subjects/${canonical}`) }] : []),
      ],
    },
  })

  if (missing) {
    return (
      <PublicPage>
        <section className="pub-hero">
          <div className="pub-container">
            <div className="pub-empty">
              <img src={`${ART}/hub/peaking.png`} alt="" width="220" height="160" />
              <h1 className="pub-h2">No tutors for that subject yet</h1>
              <p>Nobody on Study with Students teaches “{slug.replace(/-/g, ' ')}” at the moment. Browse every tutor, or teach it yourself.</p>
              <div className="pub-actions">
                <Link to="/tutors" className="pub-btn pub-btn-coral">Browse all tutors</Link>
                <Link to="/become-tutor" className="pub-btn pub-btn-slate">Become a tutor</Link>
              </div>
            </div>
          </div>
        </section>
        {others.length > 0 && (
          <section className="pub-section pub-section-tight">
            <div className="pub-container">
              <h2 className="pub-h3" style={{ marginBottom: 16 }}>Subjects with tutors</h2>
              <SubjectChips subjects={others} />
            </div>
          </section>
        )}
      </PublicPage>
    )
  }

  return (
    <PublicPage>
      <section className="pub-hero">
        <div className="pub-container pub-hero-grid">
          <div>
            <nav aria-label="Breadcrumb">
              <ol className="pub-crumbs">
                <li><Link to="/tutors">Tutors</Link></li>
                {level && subject && <li><Link {...subjectLink(subject.slug)}>{subject.name}</Link></li>}
                <li aria-current="page">{topic || '…'}</li>
              </ol>
            </nav>
            <h1 className="pub-h1">{topic ? <>{topic} <span className="pub-coral">tutors</span></> : 'Tutors'}</h1>
            <p className="pub-sub">Taught by university students who know the course.</p>
            {data && subject && (
              <p className="pub-lead">
                {empty
                  ? `Nobody lists ${topic} yet. See every ${subject.name} tutor instead.`
                  : `${introText(data, topic)} Tutors keep 100% of their rate. Sessions run from 30 minutes to 2 hours, and you pay only once your tutor confirms.`}
              </p>
            )}
            {levelChips.length > 0 && (
              <div style={{ marginTop: 26 }}>
                <SubjectChips subjects={levelChips} current={canonical} label={`${subject.name} by level`} />
              </div>
            )}
          </div>
          <div className="pub-hero-art">
            <img src={`${ART}/homepage/subjects.svg`} alt="" width="400" height="400" />
          </div>
        </div>
      </section>

      <section className="pub-section pub-section-tight" aria-labelledby="results-title">
        <div className="pub-container">
          <div className="pub-results-head" style={{ marginTop: 0 }}>
            <h2 id="results-title" className="pub-h3">{topic ? `${topic} tutors` : 'Tutors'}</h2>
            {data && !empty && <span className="pub-count">{data.total} tutor{data.total === 1 ? '' : 's'}</span>}
          </div>
          {error ? (
            <div className="pub-empty" role="alert">
              <b>We couldn&apos;t load tutors.</b>
              <p>Check your connection and try again.</p>
              <div className="pub-actions"><button type="button" className="pub-btn pub-btn-coral" onClick={() => refetch().catch(() => {})}>Try again</button></div>
            </div>
          ) : empty ? (
            <div className="pub-empty">
              <b>No {topic} tutors yet.</b>
              <div className="pub-actions">
                <Link {...subjectLink(subject.slug)} className="pub-btn pub-btn-coral">All {subject.name} tutors<Icon name="arrow_forward" /></Link>
              </div>
            </div>
          ) : (
            <TutorGrid tutors={data?.tutors ?? []} loading={loading} />
          )}
          {data && <Pager page={data.page} pages={data.pages} to="/subjects/$subject" params={{ subject: canonical ?? slug }} />}
        </div>
      </section>

      <BookingSteps rate={data?.rates?.from ?? 20} />

      {others.length > 0 && (
        <section className="pub-section" aria-labelledby="others-title">
          <div className="pub-container">
            <h2 id="others-title" className="pub-h2">Other subjects</h2>
            <p className="pub-lead" style={{ marginBottom: 26 }}>University students tutoring {listText(others.slice(0, 3).map((s) => s.name))}{others.length > 3 ? ' and more' : ''}.</p>
            <SubjectChips subjects={others} />
          </div>
        </section>
      )}

      <SignUpCta text={subject ? `Create a free account to request a ${subject.name} tutor and book your first session.` : undefined} />
    </PublicPage>
  )
}
