// Public tutor directory (/tutors): every tutor with a finished profile, filterable by
// subject, level and university. No login needed, so search engines can index it.
import { useNavigate, useSearch } from '@tanstack/react-router'
import { getPublicSubjects, getPublicTutors } from '../api/public'
import { FindTutor } from '../components/brand/illustrations'
import { Icon } from '../components/ui'
import {
  EmptyBox, Pager, PublicPage, SignUpCta, SubjectChips, TutorGrid, Wave, topicName,
} from '../components/public'
import { BOOKING_FEE_PERCENT } from '../components/features/BookSessionModal'
import { useQuery } from '../lib/query'
import useMeta from '../lib/useMeta'

const LEVELS = ['GCSE', 'A-level', 'IB', 'University']

export default function TutorDirectory() {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const filters = {
    subject:    String(search.subject ?? ''),
    level:      String(search.level ?? ''),
    university: String(search.university ?? ''),
  }
  const page = Math.max(1, Number(search.page) || 1)
  const query = Object.fromEntries(Object.entries({ ...filters, page: page > 1 ? page : '' }).filter(([, v]) => v))
  const { data, error, loading, refetch } = useQuery(`public:tutors:${JSON.stringify(query)}`, () => getPublicTutors(query))
  const { data: subjectData } = useQuery('public:subjects', getPublicSubjects, { staleTime: 60_000 })
  const subjects = subjectData?.subjects ?? []

  const filtered = Boolean(filters.subject || filters.level || filters.university)

  // Filtered views repeat the subject pages, so only the plain listing (and its pages) is indexed
  useMeta({
    title: 'GCSE and A-level tutors from UK universities',
    description: 'Browse tutors who study at UK universities. Filter by subject, level and university, compare rates and reviews, and book online. Tutors keep 100% of their rate.',
    path: page > 1 && !filtered ? `/tutors?page=${page}` : '/tutors',
    noindex: filtered,
  })

  const setFilter = (key, value) =>
    navigate({ to: '/tutors', search: (prev) => ({ ...prev, [key]: value || undefined, page: undefined }), replace: true })
  const clearFilters = () => navigate({ to: '/tutors', search: {}, replace: true })

  const subjectValue = data?.subject?.slug ?? filters.subject
  const universities = data?.universities ?? []
  const topic = topicName(data?.subject, data?.level)
  const heading = [topic ? `${topic} tutors` : 'All tutors', filters.university && `at ${filters.university}`].filter(Boolean).join(' ')

  return (
    <PublicPage>
      <section className="pub-hero">
        <div className="pub-container pub-hero-grid">
          <div>
            <span className="pub-tag"><Icon name="school" />Find a tutor</span>
            <h1 className="pub-h1">GCSE &amp; A-level tutors from <span className="pub-coral">UK universities</span></h1>
            <p className="pub-sub">Learn from students who sat the same exams, not from an agency.</p>
            <p className="pub-lead">
              Every tutor is a UK university student. They set their own rate and keep all of it;
              families pay a {BOOKING_FEE_PERCENT}% booking fee on top.
            </p>
          </div>
          <div className="pub-hero-art"><FindTutor title="" /></div>
        </div>
      </section>

      <section className="pub-section pub-section-tight" aria-labelledby="results-title">
        <div className="pub-container">
          <form className="pub-filters" role="search" aria-label="Filter tutors" onSubmit={(e) => e.preventDefault()}>
            <label className="pub-field">
              <span>Subject</span>
              <select className="pub-select" value={subjectValue} onChange={(e) => setFilter('subject', e.target.value)}>
                <option value="">All subjects</option>
                {subjects.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.tutor_count})</option>)}
                {subjectValue && !subjects.some((s) => s.slug === subjectValue) && <option value={subjectValue}>{subjectValue}</option>}
              </select>
            </label>
            <label className="pub-field">
              <span>Level</span>
              <select className="pub-select" value={data?.level?.name ?? filters.level} onChange={(e) => setFilter('level', e.target.value)}>
                <option value="">All levels</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="pub-field">
              <span>University</span>
              <select className="pub-select" value={filters.university} onChange={(e) => setFilter('university', e.target.value)}>
                <option value="">All universities</option>
                {universities.map((u) => <option key={u.name} value={u.name}>{u.name} ({u.tutor_count})</option>)}
                {filters.university && !universities.some((u) => u.name === filters.university) && (
                  <option value={filters.university}>{filters.university}</option>
                )}
              </select>
            </label>
            <button type="button" className="pub-btn pub-btn-ghost" onClick={clearFilters} disabled={!filtered}>Clear</button>
          </form>

          <div className="pub-results-head">
            <h2 id="results-title" className="pub-h3">{heading}</h2>
            {data && <span className="pub-count" aria-live="polite">{data.total} tutor{data.total === 1 ? '' : 's'}</span>}
          </div>

          {error ? (
            <EmptyBox alert title="We couldn’t load tutors." text="Check your connection and try again."
              actions={<button type="button" className="pub-btn pub-btn-coral" onClick={() => refetch().catch(() => {})}>Try again</button>} />
          ) : data && data.total === 0 ? (
            <EmptyBox title="No tutors match these filters yet." text="Try another subject or university, or see everyone."
              actions={<button type="button" className="pub-btn pub-btn-coral" onClick={clearFilters}>Show all tutors</button>} />
          ) : (
            <TutorGrid tutors={data?.tutors ?? []} loading={loading} />
          )}

          {data && <Pager page={data.page} pages={data.pages} to="/tutors" />}
        </div>
      </section>

      {subjects.length > 0 && (
        <section className="pub-band" aria-labelledby="subjects-title">
          <Wave top />
          <div className="pub-container">
            <h2 id="subjects-title" className="pub-h2">Browse by subject</h2>
            <p className="pub-lead">Each subject page lists its tutors, their rates and how booking works.</p>
            <div style={{ marginTop: 28 }}><SubjectChips subjects={subjects} /></div>
          </div>
          <Wave />
        </section>
      )}

      <SignUpCta />
    </PublicPage>
  )
}
