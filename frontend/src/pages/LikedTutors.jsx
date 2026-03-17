import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getLikedTutors, likeTutor, requestTutor, getActiveTutors, getTutorRequestsSent } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import TutorCard from '../components/features/TutorCard'
import toast from 'react-hot-toast'

export default function LikedTutors() {
  const [tutors,    setTutors]    = useState([])
  const [activated, setActivated] = useState(new Set())  // already accepted
  const [pending,   setPending]   = useState(new Set())  // request sent
  const [loading,   setLoading]   = useState(true)

  async function load() {
    const [likedRes, activeRes, sentRes] = await Promise.allSettled([
      getLikedTutors(), getActiveTutors(), getTutorRequestsSent(),
    ])
    if (likedRes.status === 'fulfilled')  setTutors(likedRes.value.data.tutors ?? [])
    else toast.error('Could not load liked tutors')
    if (activeRes.status === 'fulfilled') setActivated(new Set((activeRes.value.data.tutors ?? []).map(t => t.id_tutor)))
    if (sentRes.status === 'fulfilled') {
      const pendingIds = (sentRes.value.data.requests ?? [])
        .filter(r => r.status === 'pending').map(r => r.tutor_id)
      setPending(new Set(pendingIds))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleLike(id) {
    await likeTutor(id)
    load()
  }

  async function handleRequest(tutorId) {
    try {
      await requestTutor(tutorId)
      setPending(prev => new Set([...prev, tutorId]))
      toast.success('Request sent! Waiting for the tutor to accept.')
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Could not send request'
      if (msg.includes('already')) setPending(prev => new Set([...prev, tutorId]))
      else toast.error(msg)
    }
  }

  return (
    <HubLayout>
      <PageTitle title="Saved Tutors" icon="favorite" />

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ borderRadius: "12px", height: "200px" }} />)}
        </div>
      ) : tutors.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined" style={{ fontSize: '56px', color: 'rgba(255,255,255,0.15)', display: 'block', marginBottom: '16px' }}>favorite</span>
          <p className="text-white/60 text-lg mb-2">No liked tutors yet</p>
          <p className="text-white/30 text-sm mb-6">Heart a tutor to save them for later</p>
          <Link to="/find-tutors" className="btn-outline">Browse tutors</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {tutors.map(tutor => (
            <TutorCard
              key={tutor.id_tutor}
              tutor={tutor}
              liked
              onLike={handleLike}
              onActivate={handleRequest}
              activated={activated.has(tutor.id_tutor)}
              pending={!activated.has(tutor.id_tutor) && pending.has(tutor.id_tutor)}
            />
          ))}
        </div>
      )}
    </HubLayout>
  )
}
