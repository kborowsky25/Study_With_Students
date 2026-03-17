import { useEffect, useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { getTutors, getLikedTutors, likeTutor, getActiveTutors, requestTutor, getTutorRequestsSent } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import TutorCard from '../components/features/TutorCard'
import toast from 'react-hot-toast'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const BLUE   = '#60a5fa'
const PURPLE = '#a78bfa'
const AMBER  = '#fbbf24'

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

// ── Featured Tutors horizontal strip ─────────────────────────────────────────
function FeaturedStrip({ tutors }) {
  if (!tutors.length) return null

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: CORAL }}>auto_awesome</span>
        <h2 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
          Top Tutors Today
        </h2>
      </div>

      {/* Scrollable row */}
      <div
        className="scrollbar-hide"
        style={{
          display: 'flex', gap: '10px', overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {tutors.map((tutor, i) => {
          const initials = (tutor.name ?? 'TU').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          const subjects = (tutor.subjects ?? '').split(',').map(s => s.trim()).filter(Boolean)
          return (
            <Link
              key={tutor.id_tutor}
              to="/tutor/$tutorId"
              params={{ tutorId: String(tutor.id_tutor) }}
              style={{ textDecoration: 'none', flexShrink: 0 }}
            >
              <div
                style={{
                  width: '200px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  boxShadow: 'var(--shadow-card)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-hover)'
                  e.currentTarget.style.borderColor = `${CORAL}40`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                {/* Avatar + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: TUTOR_GRADS[i % TUTOR_GRADS.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: '900', fontSize: '13px', flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tutor.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tutor.university ?? 'University'}
                    </div>
                  </div>
                </div>

                {/* Subject chips */}
                {subjects.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {subjects.slice(0, 2).map(s => (
                      <span key={s} style={{
                        fontSize: '9px', fontWeight: '700',
                        background: `${CORAL}12`, color: CORAL,
                        border: `1px solid ${CORAL}22`, borderRadius: '20px',
                        padding: '1px 7px',
                      }}>{s}</span>
                    ))}
                    {subjects.length > 2 && (
                      <span style={{ fontSize: '9px', color: 'var(--text-faint)', alignSelf: 'center' }}>+{subjects.length - 2}</span>
                    )}
                  </div>
                )}

                {/* Rate */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>
                    {tutor.hourly_rate ? `£${tutor.hourly_rate}/hr` : 'Ask rate'}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: '700', color: CORAL,
                    background: `${CORAL}12`, border: `1px solid ${CORAL}22`,
                    borderRadius: '20px', padding: '3px 9px',
                  }}>View →</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

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
  const [activated,  setActivated]  = useState(new Set())  // tutor_id → already active (accepted)
  const [pending,    setPending]    = useState(new Set())  // tutor_id → request sent, awaiting response
  const [loading,    setLoading]    = useState(true)
  const [mounted,      setMounted]      = useState(false)
  const [university,   setUniversity]   = useState('')
  const [subject,      setSubject]      = useState('')
  const [priceKey,     setPriceKey]     = useState('any')
  const [sortKey,      setSortKey]      = useState('default')
  const [searchQuery,  setSearchQuery]  = useState('')

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

  async function fetchPending() {
    try {
      const { data } = await getTutorRequestsSent()
      const pendingIds = (data.requests ?? [])
        .filter(r => r.status === 'pending')
        .map(r => r.tutor_id)
      setPending(new Set(pendingIds))
    } catch {}
  }

  useEffect(() => {
    fetchTutors()
    fetchLiked()
    fetchActivated()
    fetchPending()
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
    setSearchQuery('')
    fetchTutors('', '')
  }

  async function handleLike(tutorId) {
    try {
      const { data } = await likeTutor(tutorId)
      setLiked(prev => { const n = new Set(prev); data.liked ? n.add(tutorId) : n.delete(tutorId); return n })
    } catch { toast.error('Failed to update like') }
  }

  async function handleRequest(tutorId) {
    try {
      await requestTutor(tutorId)
      setPending(prev => new Set([...prev, tutorId]))
      toast.success('Request sent! Waiting for the tutor to accept.')
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Could not send request'
      toast.error(msg)
    }
  }

  // Client-side price filter + sort + name search (layered on top of server-side subject/uni)
  const displayTutors = useMemo(() => {
    const price = PRICE_FILTERS.find(p => p.key === priceKey) ?? PRICE_FILTERS[0]
    let list = tutors.filter(t => {
      if (priceKey !== 'any' && t.hourly_rate != null) {
        const r = Number(t.hourly_rate)
        if (r < price.min || r >= price.max) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const haystack = [t.name, t.university, t.course, t.about_me].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    if (sortKey === 'price_asc')  list = [...list].sort((a, b) => (a.hourly_rate ?? 999) - (b.hourly_rate ?? 999))
    if (sortKey === 'price_desc') list = [...list].sort((a, b) => (b.hourly_rate ?? 0)   - (a.hourly_rate ?? 0))
    if (sortKey === 'name_asc')   list = [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    return list
  }, [tutors, priceKey, sortKey, searchQuery])

  const hasFilter = university || subject || priceKey !== 'any' || sortKey !== 'default' || searchQuery

  return (
    <HubLayout>
      <PageTitle title="Find Tutors" icon="search" />

      {/* ── Featured strip ─────────────────────────────────────────────────── */}
      {!loading && tutors.length >= 3 && (
        <div className={mounted ? 'animate-slide-up' : ''}>
          <FeaturedStrip tutors={tutors.slice(0, 8)} />
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          marginBottom: '20px', borderRadius: '16px', padding: '10px 14px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.30)',
        }}
      >
        {/* Header row: title + search + sort + clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ marginRight: 'auto' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>Find a Tutor</h2>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', margin: '1px 0 0' }}>
              {loading ? 'Searching…' : `${displayTutors.length} tutor${displayTutors.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {/* Name search */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '13px', color: 'var(--text-faint)', pointerEvents: 'none',
            }}>search</span>
            <input
              type="text"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '26px', paddingRight: '10px', paddingTop: '5px', paddingBottom: '5px',
                borderRadius: '20px', fontSize: '11px', width: '150px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                color: 'var(--text)', outline: 'none',
              }}
            />
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {SORT_OPTIONS.map(({ label, key }) => {
              const active = sortKey === key
              return (
                <button
                  key={key}
                  onClick={() => setSortKey(key)}
                  style={{
                    fontSize: '11px', fontWeight: active ? '700' : '500',
                    padding: '4px 9px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
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
              style={{ fontSize: '11px', fontWeight: '700', color: CORAL, background: `${CORAL}14`, border: `1px solid ${CORAL}28`, borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
              Clear
            </button>
          )}
        </div>

        {/* University row */}
        <div style={{ marginBottom: '6px' }}>
          <p style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>University</p>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {UNIS.map(u => {
              const active = university === u
              return (
                <button
                  key={u}
                  onClick={() => setUniAndFetch(u)}
                  style={{
                    fontSize: '11px', fontWeight: active ? '700' : '500', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
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

        {/* Subject + Price in one row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>Subject</p>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {SUBJECTS.map((s, i) => {
                const active = subject === s
                const c      = SUBJECT_COLORS[i % SUBJECT_COLORS.length]
                return (
                  <button
                    key={s}
                    onClick={() => setSubjectAndFetch(s)}
                    style={{
                      fontSize: '11px', fontWeight: active ? '700' : '500', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
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

          <div style={{ flexShrink: 0 }}>
            <p style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>Price</p>
            <div style={{ display: 'flex', gap: '5px' }}>
              {PRICE_FILTERS.map(({ label, key }) => {
                const active = priceKey === key
                return (
                  <button
                    key={key}
                    onClick={() => setPriceKey(key)}
                    style={{
                      fontSize: '11px', fontWeight: active ? '700' : '500', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
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
                  onActivate={handleRequest}
                  activated={activated.has(tutor.id_tutor)}
                  pending={!activated.has(tutor.id_tutor) && pending.has(tutor.id_tutor)}
                />
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
