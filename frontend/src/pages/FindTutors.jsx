import { useEffect, useState } from 'react'
import { getTutors, getLikedTutors, likeTutor } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import TutorCard from '../components/features/TutorCard'
import toast from 'react-hot-toast'

const SUBJECTS = [
  'Maths', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'Economics', 'English', 'History', 'Law', 'Psychology', 'Statistics',
]

const UNIS = ['Oxford', 'Cambridge', 'Imperial', 'UCL', 'KCL', 'NYU', 'NUS', 'LSE', 'Edinburgh']

export default function FindTutors() {
  const [tutors,     setTutors]     = useState([])
  const [liked,      setLiked]      = useState(new Set())
  const [loading,    setLoading]    = useState(true)
  const [mounted,    setMounted]    = useState(false)
  const [university, setUniversity] = useState('')
  const [subject,    setSubject]    = useState('')

  async function fetchTutors() {
    setLoading(true)
    try {
      const params = {}
      if (university) params.university = university
      if (subject)    params.subject    = subject
      const { data } = await getTutors(params)
      setTutors(data.tutors ?? [])
    } catch {
      toast.error('Could not load tutors')
    } finally {
      setLoading(false)
    }
  }

  async function fetchLiked() {
    try {
      const { data } = await getLikedTutors()
      setLiked(new Set((data.tutors ?? []).map(t => t.id_tutor)))
    } catch {}
  }

  useEffect(() => {
    fetchTutors()
    fetchLiked()
    requestAnimationFrame(() => setMounted(true))
  }, [])

  function handleFilter(e) {
    e.preventDefault()
    fetchTutors()
  }

  function clearFilters() {
    setUniversity('')
    setSubject('')
    setTimeout(fetchTutors, 0)
  }

  async function handleLike(tutorId) {
    try {
      const { data } = await likeTutor(tutorId)
      setLiked(prev => {
        const next = new Set(prev)
        if (data.liked) next.add(tutorId)
        else            next.delete(tutorId)
        return next
      })
    } catch { toast.error('Failed to update like') }
  }

  return (
    <HubLayout>
      <div className={`mb-8 ${mounted ? 'animate-slide-up' : ''}`}>
        <h1 className="text-3xl font-black text-white mb-1">
          Find Tutors <span style={{ color: '#ff725e' }}>✦</span>
        </h1>
        <p className="text-white/50">Browse {loading ? '…' : tutors.length} peer tutors from top universities — 0% commission</p>
      </div>

      {/* Filters — sticky so it stays visible while scrolling results */}
      <form
        onSubmit={handleFilter}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          marginBottom: '24px',
          borderRadius: '16px',
          padding: '14px 16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={university}
            onChange={e => setUniversity(e.target.value)}
            className="input-field sm:max-w-[200px]"
          >
            <option value="">All universities</option>
            {UNIS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="input-field sm:max-w-[200px]"
          >
            <option value="">All subjects</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex gap-2 sm:ml-auto">
            <button type="submit" className="btn-primary flex-1 sm:flex-none">Search</button>
            {(university || subject) && (
              <button type="button" onClick={clearFilters} className="btn-secondary">Clear</button>
            )}
          </div>
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass p-5" style={{ height: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="skeleton" style={{ height: '14px', borderRadius: '6px', width: '70%' }} />
                  <div className="skeleton" style={{ height: '11px', borderRadius: '6px', width: '50%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: '11px', borderRadius: '6px' }} />
              <div className="skeleton" style={{ height: '11px', borderRadius: '6px', width: '80%' }} />
              <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                <div className="skeleton" style={{ height: '32px', borderRadius: '8px', flex: 1 }} />
              </div>
            </div>
          ))}
        </div>
      ) : tutors.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined" style={{ fontSize: '52px', color: 'rgba(255,255,255,0.2)', display: 'block', marginBottom: '16px' }}>search</span>
          <p className="text-white/60 text-lg mb-2">No tutors found</p>
          <p className="text-white/30 text-sm mb-6">Try adjusting your filters</p>
          <button onClick={clearFilters} className="btn-outline">Clear filters</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {tutors.map((tutor, i) => {
            const DELAYS = ['', 'delay-50', 'delay-100', 'delay-150', 'delay-200', 'delay-300']
            const delay  = DELAYS[Math.min(i, DELAYS.length - 1)]
            return (
              <div key={tutor.id_tutor} className={mounted ? `animate-slide-up ${delay}` : ''}>
                <TutorCard
                  tutor={tutor}
                  liked={liked.has(tutor.id_tutor)}
                  onLike={handleLike}
                />
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
