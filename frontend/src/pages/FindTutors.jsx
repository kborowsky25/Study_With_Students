import { useEffect, useState, useMemo } from 'react'
import { getTutors, getLikedTutors, likeTutor, activateTutor, getActiveTutors } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import TutorCard from '../components/features/TutorCard'
import toast from 'react-hot-toast'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const BLUE   = '#60a5fa'
const PURPLE = '#a78bfa'
const AMBER  = '#fbbf24'

const SUBJECTS = [
  'Maths', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'Economics', 'English', 'History', 'Law', 'Psychology', 'Statistics',
]

const UNIS = ['Oxford', 'Cambridge', 'Imperial', 'UCL', 'KCL', 'NYU', 'NUS', 'LSE', 'Edinburgh']

const SUBJECT_COLORS = [CORAL, BLUE, GREEN, PURPLE, AMBER, '#fb923c', '#22d3ee', '#f472b6']

const PRICE_FILTERS = [
  { label: 'Any price', key: 'any',  min: 0,  max: Infinity },
  { label: '< £25/hr',  key: 'low',  min: 0,  max: 25 },
  { label: '£25–50/hr', key: 'mid',  min: 25, max: 50 },
  { label: '£50+/hr',   key: 'high', min: 50, max: Infinity },
]

const SORT_OPTIONS = [
  { label: 'Featured', key: 'default'    },
  { label: 'Price ↑',  key: 'price_asc'  },
  { label: 'Price ↓',  key: 'price_desc' },
  { label: 'A – Z',    key: 'name_asc'   },
]

export default function FindTutors() {
  const [tutors,     setTutors]     = useState([])
  const [liked,      setLiked]      = useState(new Set())
  const [activated,  setActivated]  = useState(new Set())
  const [loading,    setLoading]    = useState(true)
  const [mounted,    setMounted]    = useState(false)
  const [university, setUniversity] = useState('')
  const [subject,    setSubject]    = useState('')
  const [priceKey,   setPriceKey]   = useState('any')
  const [sortKey,    setSortKey]    = useState('default')

  async function fetchTutors(uni = university, sub = subject) {
    setLoading(true)
    try {
      const params = {}
      if (uni) params.university = uni
      if (sub) params.subject    = sub
      const { data } = await getTutors(params)
      setTutors(data.tutors ?? [])
    } catch { toast.error('Could not load tutors') }
    finally  { setLoading(false) }
  }

  async function fetchLiked() {
    try { const { data } = await getLikedTutors(); setLiked(new Set((data.tutors ?? []).map(t => t.id_tutor))) }
    catch {}
  }

  async function fetchActivated() {
    try { const { data } = await getActiveTutors(); setActivated(new Set((data.tutors ?? []).map(t => t.id_tutor))) }
    catch {}
  }

  useEffect(() => {
    fetchTutors()
    fetchLiked()
    fetchActivated()
    requestAnimationFrame(() => setMounted(true))
  }, [])

  function setSubjectAndFetch(s) {
    const next = subject === s ? '' : s
    setSubject(next)
    fetchTutors(university, next)
  }

  function setUniAndFetch(u) {
    const next = university === u ? '' : u
    setUniversity(next)
    fetchTutors(next, subject)
  }

  function clearAll() {
    setUniversity('')
    setSubject('')
    setPriceKey('any')
    setSortKey('default')
    fetchTutors('', '')
  }

  async function handleLike(tutorId) {
    try {
      const { data } = await likeTutor(tutorId)
      setLiked(prev => { const n = new Set(prev); data.liked ? n.add(tutorId) : n.delete(tutorId); return n })
    } catch { toast.error('Failed to update like') }
  }

  async function handleActivate(tutorId) {
    try {
      await activateTutor(tutorId)
      setActivated(prev => new Set([...prev, tutorId]))
      toast.success('Tutor added to My Tutors!')
    } catch (err) { toast.error(err.response?.data?.error ?? 'Could not add tutor') }
  }

  // Client-side price filter + sort (layered on top of server-side subject/uni)
  const displayTutors = useMemo(() => {
    const price = PRICE_FILTERS.find(p => p.key === priceKey) ?? PRICE_FILTERS[0]
    let list = tutors.filter(t => {
      if (priceKey === 'any' || t.hourly_rate == null) return true
      const r = Number(t.hourly_rate)
      return r >= price.min && r < price.max
    })
    if (sortKey === 'price_asc')  list = [...list].sort((a, b) => (a.hourly_rate ?? 999) - (b.hourly_rate ?? 999))
    if (sortKey === 'price_desc') list = [...list].sort((a, b) => (b.hourly_rate ?? 0)   - (a.hourly_rate ?? 0))
    if (sortKey === 'name_asc')   list = [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    return list
  }, [tutors, priceKey, sortKey])

  const hasFilter = university || subject || priceKey !== 'any' || sortKey !== 'default'

  return (
    <HubLayout>
      <PageTitle title="Find Tutors" icon="search" />

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          marginBottom: '24px', borderRadius: '18px', padding: '18px 20px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.30)',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Find a Tutor</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '2px 0 0' }}>
              {loading ? 'Searching…' : `${displayTutors.length} tutor${displayTutors.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Sort */}
            <div style={{ display: 'flex', gap: '5px' }}>
              {SORT_OPTIONS.map(({ label, key }) => {
                const active = sortKey === key
                return (
                  <button
                    key={key}
                    onClick={() => setSortKey(key)}
                    style={{
                      fontSize: '11px', fontWeight: active ? '700' : '500',
                      padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                      background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                      color: active ? 'var(--text)' : 'var(--text-faint)',
                      border: `1px solid ${active ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {hasFilter && (
              <button
                onClick={clearAll}
                style={{ fontSize: '12px', fontWeight: '700', color: CORAL, background: `${CORAL}14`, border: `1px solid ${CORAL}28`, borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* University row */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>University</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {UNIS.map(u => {
              const active = university === u
              return (
                <button
                  key={u}
                  onClick={() => setUniAndFetch(u)}
                  style={{
                    fontSize: '12px', fontWeight: active ? '700' : '500', padding: '5px 13px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? BLUE : 'rgba(255,255,255,0.05)',
                    color: active ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${active ? BLUE : 'rgba(255,255,255,0.09)'}`,
                    boxShadow: active ? `0 2px 10px ${BLUE}40` : 'none',
                    transform: active ? 'scale(1.04)' : 'scale(1)',
                  }}
                >
                  {u}
                </button>
              )
            })}
          </div>
        </div>

        {/* Subject row */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Subject</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SUBJECTS.map((s, i) => {
              const active = subject === s
              const c      = SUBJECT_COLORS[i % SUBJECT_COLORS.length]
              return (
                <button
                  key={s}
                  onClick={() => setSubjectAndFetch(s)}
                  style={{
                    fontSize: '12px', fontWeight: active ? '700' : '500', padding: '5px 13px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? c : 'rgba(255,255,255,0.05)',
                    color: active ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${active ? c : 'rgba(255,255,255,0.09)'}`,
                    boxShadow: active ? `0 2px 10px ${c}40` : 'none',
                    transform: active ? 'scale(1.04)' : 'scale(1)',
                  }}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Price row */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Price per hour</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PRICE_FILTERS.map(({ label, key }) => {
              const active = priceKey === key
              return (
                <button
                  key={key}
                  onClick={() => setPriceKey(key)}
                  style={{
                    fontSize: '12px', fontWeight: active ? '700' : '500', padding: '5px 13px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? GREEN : 'rgba(255,255,255,0.05)',
                    color: active ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${active ? GREEN : 'rgba(255,255,255,0.09)'}`,
                    boxShadow: active ? `0 2px 10px ${GREEN}40` : 'none',
                    transform: active ? 'scale(1.04)' : 'scale(1)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '360px', borderRadius: '20px' }} />
          ))}
        </div>

      ) : displayTutors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--text-faint)' }}>search_off</span>
          </div>
          <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>No tutors found</p>
          <p style={{ color: 'var(--text-faint)', fontSize: '14px', marginBottom: '24px' }}>Try adjusting your filters</p>
          <button onClick={clearAll} className="btn-outline">Clear all filters</button>
        </div>

      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {displayTutors.map((tutor, i) => {
            const DELAYS = ['', 'delay-50', 'delay-100', 'delay-150', 'delay-200', 'delay-300']
            const delay  = DELAYS[Math.min(i, DELAYS.length - 1)]
            return (
              <div key={tutor.id_tutor} className={mounted ? `animate-slide-up ${delay}` : ''}>
                <TutorCard
                  tutor={tutor}
                  liked={liked.has(tutor.id_tutor)}
                  onLike={handleLike}
                  onActivate={handleActivate}
                  activated={activated.has(tutor.id_tutor)}
                />
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
