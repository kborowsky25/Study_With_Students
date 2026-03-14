import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { getTutor, likeTutor, activateTutor } from '../api/tutors'
import { sendMessage } from '../api/messages'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

export default function TutorInfo() {
  const { tutorId } = useParams({ from: '/tutor/$tutorId' })
  const navigate    = useNavigate()
  const [tutor,   setTutor]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked,   setLiked]   = useState(false)
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    getTutor(tutorId)
      .then(({ data }) => { setTutor(data.tutor); setLiked(data.liked ?? false) })
      .catch(() => toast.error('Could not load tutor'))
      .finally(() => setLoading(false))
  }, [tutorId])

  async function handleLike() {
    try {
      const { data } = await likeTutor(tutorId)
      setLiked(data.liked)
      toast.success(data.liked ? 'Added to liked tutors' : 'Removed from liked')
    } catch { toast.error('Failed') }
  }

  async function handleActivate() {
    setActivating(true)
    try {
      await activateTutor(tutorId)
      toast.success('Tutor added to your active list!')
      navigate({ to: '/active-tutors' })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to add tutor')
    } finally {
      setActivating(false)
    }
  }

  if (loading) return (
    <HubLayout>
      <div className="skeleton" style={{ borderRadius: "16px", height: "256px" }} />
    </HubLayout>
  )

  if (!tutor) return (
    <HubLayout>
      <div className="text-center py-20">
        <p className="text-white/60">Tutor not found</p>
        <Link to="/find-tutors" className="btn-outline mt-4 inline-block">Back to search</Link>
      </div>
    </HubLayout>
  )

  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const subjects = tutor.subjects?.split(',').map(s => s.trim()) ?? []

  return (
    <HubLayout>
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link to="/find-tutors" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          ← Back to search
        </Link>

        {/* Profile card */}
        <div className="glass p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-coral-400 to-orange-400 flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-black text-white">{tutor.name}</h1>
                  <p className="text-white/50">{tutor.university} · {tutor.course}</p>
                </div>
                <button
                  onClick={handleLike}
                  className={`p-2.5 rounded-xl border transition-all ${liked ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-white/30 border-white/10 hover:text-red-400 hover:bg-red-400/10'}`}
                >
                  {liked ? '❤️' : '🤍'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <InfoItem label="Age"       value={tutor.age} />
                <InfoItem label="Available" value={tutor.availability} />
              </div>
            </div>
          </div>

          {/* About */}
          {tutor.about_me && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">About</p>
              <p className="text-white/70 leading-relaxed">{tutor.about_me}</p>
            </div>
          )}

          {/* Subjects */}
          {subjects.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Subjects</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                  <span key={s} className="badge bg-coral-400/10 text-coral-400 border border-coral-400/20 text-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleActivate}
            disabled={activating}
            className="btn-primary flex-1 py-3 text-base disabled:opacity-50"
          >
            {activating ? 'Adding…' : '➕ Add to my tutors'}
          </button>
          <Link
            to="/messages"
            className="btn-secondary flex-1 py-3 text-base text-center"
          >
            💬 Message
          </Link>
        </div>
      </div>
    </HubLayout>
  )
}

function InfoItem({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-white/30 text-xs mb-0.5">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  )
}
