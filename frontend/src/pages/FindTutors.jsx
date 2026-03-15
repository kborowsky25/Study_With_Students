import { useEffect, useState } from 'react'
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

export default function FindTutors() {
  const [tutors,     setTutors]     = useState([])
  const [liked,      setLiked]      = useState(new Set())
  const [activated,  setActivated]  = useState(new Set())
  const [loading,    setLoading]    = useState(true)
  const [mounted,    setMounted]    = useState(false)
  const [university, setUniversity] = useState('')
  const [subject,    setSubject]    = useState('')

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

  const hasFilter = university || subject

  return (
    <HubLayout>
      <PageTitle title="Find Tutors" icon="search" />

      {/* ── Search / Filter bar ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          marginBottom: '22px', borderRadius: '18px', padding: '16px 18px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 4px 28px rgba(0,0,0,0.28)',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Find a Tutor</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '2px 0 0' }}>
              {loading ? 'Searching…' : `${tutors.length} tutor${tutors.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          {hasFilter && (
            <button
              onClick={clearAll}
              style={{ fontSize: '12px', fontWeight: '700', color: CORAL, background: `${CORAL}14`, border: `1px solid ${CORAL}28`, borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
              Clear filters
            </button>
          )}
        </div>

        {/* University row */}
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>University</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {UNIS.map(u => {
              const active = university === u
              return (
                <button
                  key={u}
                  onClick={() => setUniAndFetch(u)}
                  style={{
                    fontSize: '12px', fontWeight: active ? '700' : '600', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? BLUE : 'rgba(255,255,255,0.05)',
                    color: active ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${active ? BLUE : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: active ? `0 2px 8px ${BLUE}40` : 'none',
                    transform: active ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  {u}
                </button>
              )
            })}
          </div>
        </div>

        {/* Subject row */}
        <div>
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
                    fontSize: '12px', fontWeight: active ? '700' : '600', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? c : 'rgba(255,255,255,0.05)',
                    color: active ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${active ? c : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: active ? `0 2px 8px ${c}40` : 'none',
                    transform: active ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '240px', borderRadius: '18px' }} />
          ))}
        </div>

      ) : tutors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--text-faint)' }}>search_off</span>
          </div>
          <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>No tutors found</p>
          <p style={{ color: 'var(--text-faint)', fontSize: '14px', marginBottom: '24px' }}>Try a different subject or university</p>
          <button onClick={clearAll} className="btn-outline">Clear filters</button>
        </div>

      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {tutors.map((tutor, i) => {
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
