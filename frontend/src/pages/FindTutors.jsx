import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import TutorCard from '../components/features/TutorCard'
import { Card, Icon, SkeletonRows } from '../components/ui'
import { getActiveTutors, getLikedTutors, getTutorRequestsSent, getTutors, likeTutor } from '../api/tutors'
import { errorMessage } from '../api/client'
import { firstName } from '../lib/format'

const rate = (t) => Number(t.hourly_rate ?? 20)

const SORTS = {
  recommended: { label: 'Recommended', compare: () => 0 }, // API order: verified first, then name
  'price-asc': { label: 'Price: low to high', compare: (a, b) => rate(a) - rate(b) },
  'price-desc': { label: 'Price: high to low', compare: (a, b) => rate(b) - rate(a) },
  name: { label: 'Name', compare: (a, b) => a.name.localeCompare(b.name) },
}

const splitSubjects = (value) => String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const includes = (value, query) => String(value ?? '').toLowerCase().includes(query)

const emptyLine = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 18px', fontSize: 13, color: 'var(--text-faint)' }
const chipOn = { background: 'var(--coral-soft)', borderColor: 'var(--coral)', color: 'var(--coral)' }

function SearchField({ icon, style, ...props }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <Icon name={icon} size={18} style={{
        position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
        color: 'var(--text-faint)', pointerEvents: 'none',
      }} />
      <input className="input" style={{ paddingLeft: 36 }} {...props} />
    </div>
  )
}

export default function FindTutors() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const search = useSearch({ strict: false })
  const [filters, setFilters] = useState(() => ({
    subject: String(search.subject ?? ''),
    university: String(search.university ?? ''),
    sort: Object.hasOwn(SORTS, String(search.sort)) ? String(search.sort) : 'recommended',
  }))
  const [tutors, setTutors] = useState([])
  const [liked, setLiked] = useState(() => new Set())
  const [connected, setConnected] = useState(() => new Set())
  const [requested, setRequested] = useState(() => new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([getTutors(), getLikedTutors(), getActiveTutors(), getTutorRequestsSent()])
      .then(([all, saved, mine, sent]) => {
        const ok = (r, key) => (r.status === 'fulfilled' ? r.value.data[key] ?? [] : [])
        if (all.status === 'rejected') toast.error(errorMessage(all.reason, 'Could not load tutors'))
        setTutors(ok(all, 'tutors'))
        setLiked(new Set(ok(saved, 'tutors').map((t) => t.id_tutor)))
        setConnected(new Set(ok(mine, 'tutors').map((t) => t.id_tutor)))
        setRequested(new Set(ok(sent, 'requests').filter((r) => r.status === 'pending').map((r) => r.tutor_id)))
        setLoading(false)
      })
  }, [])

  // Keep the filters in the URL so coming back from a profile restores them.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = {}
      if (filters.subject.trim()) next.subject = filters.subject.trim()
      if (filters.university.trim()) next.university = filters.university.trim()
      if (filters.sort !== 'recommended') next.sort = filters.sort
      navigate({ to: '/find-tutors', search: next, replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [filters, navigate])

  const popular = useMemo(() => {
    const counts = new Map()
    for (const t of tutors) {
      for (const s of new Set(splitSubjects(t.subjects))) {
        const entry = counts.get(s.toLowerCase()) ?? { label: s, n: 0 }
        entry.n += 1
        counts.set(s.toLowerCase(), entry)
      }
    }
    return [...counts.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).slice(0, 8).map((e) => e.label)
  }, [tutors])

  const subjectQuery = filters.subject.trim().toLowerCase()
  const uniQuery = filters.university.trim().toLowerCase()
  const filtered = Boolean(subjectQuery || uniQuery)
  const results = useMemo(() => tutors
    .filter((t) => !subjectQuery || [t.subjects, t.name, t.course].some((v) => includes(v, subjectQuery)))
    .filter((t) => !uniQuery || includes(t.university, uniQuery))
    .sort(SORTS[filters.sort].compare), [tutors, subjectQuery, uniQuery, filters.sort])

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))
  const clear = () => setFilters((f) => ({ ...f, subject: '', university: '' }))
  const toggleSubject = (s) => setFilters((f) => ({ ...f, subject: f.subject.trim().toLowerCase() === s.toLowerCase() ? '' : s }))

  function relation(t) {
    if (t.id_user === user?.id) return 'self'
    if (connected.has(t.id_tutor)) return 'connected'
    if (requested.has(t.id_tutor)) return 'pending'
    return null
  }

  async function toggleLike(t) {
    const flip = (on) => setLiked((prev) => {
      const next = new Set(prev)
      if (on) next.add(t.id_tutor); else next.delete(t.id_tutor)
      return next
    })
    const was = liked.has(t.id_tutor)
    flip(!was)
    try {
      const { data } = await likeTutor(t.id_tutor)
      flip(data.liked)
      if (data.liked) toast.success(`${firstName(t.name)} saved`)
    } catch (err) {
      flip(was)
      toast.error(errorMessage(err, 'Could not update saved tutors'))
    }
  }

  return (
    <HubLayout initialMode="student">
      <PageTitle title="Find tutors" icon="person_search" />

      <div className="dash-head">
        <h1>Find a tutor</h1>
        <div className="dash-actions">
          <Link to="/liked-tutors" className="btn btn-ghost">
            <Icon name="favorite" />Saved{liked.size ? ` · ${liked.size}` : ''}
          </Link>
          <Link to="/active-tutors" className="btn btn-ghost"><Icon name="cast_for_education" />My tutors</Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <SearchField icon="search" style={{ flex: '2 1 240px' }} value={filters.subject} onChange={set('subject')}
          placeholder="Subject or name" aria-label="Search by subject or name" />
        <SearchField icon="school" style={{ flex: '1 1 200px' }} value={filters.university} onChange={set('university')}
          placeholder="University" aria-label="Filter by university" />
        <select className="input" value={filters.sort} onChange={set('sort')} aria-label="Sort tutors" style={{ flex: '0 1 190px' }}>
          {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
        </select>
      </div>

      {popular.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 18px' }}>
          {popular.map((s) => {
            const on = subjectQuery === s.toLowerCase()
            return (
              <button key={s} type="button" className="btn btn-ghost btn-sm" aria-pressed={on} style={on ? chipOn : undefined}
                onClick={() => toggleSubject(s)}>
                {s}
              </button>
            )
          })}
        </div>
      )}

      <Card
        title="Tutors"
        count={loading ? null : filtered ? `${results.length} of ${tutors.length}` : results.length}
        action={filtered && <button type="button" className="btn btn-quiet btn-sm" onClick={clear}>Clear filters</button>}
        style={popular.length ? undefined : { marginTop: 18 }}
      >
        {loading ? <SkeletonRows rows={5} /> : results.length ? (
          <div className="row-list">
            {results.map((t) => (
              <TutorCard key={t.id_tutor} tutor={t} liked={liked.has(t.id_tutor)} onToggleLike={toggleLike}
                status={relation(t)} highlight={filters.subject} />
            ))}
          </div>
        ) : (
          <div style={emptyLine}>
            {tutors.length ? 'No tutors match these filters.' : 'No tutors yet.'}
            {filtered && <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button>}
          </div>
        )}
      </Card>
    </HubLayout>
  )
}
