import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getLikedTutors, likeTutor, activateTutor, getActiveTutors } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import TutorCard from '../components/features/TutorCard'
import PageHeader from '../components/features/PageHeader'
import toast from 'react-hot-toast'

export default function LikedTutors() {
  const [tutors,    setTutors]    = useState([])
  const [activated, setActivated] = useState(new Set())
  const [loading,   setLoading]   = useState(true)

  async function load() {
    try {
      const [likedRes, activeRes] = await Promise.all([getLikedTutors(), getActiveTutors()])
      setTutors(likedRes.data.tutors ?? [])
      setActivated(new Set((activeRes.data.tutors ?? []).map(t => t.id_tutor)))
    } catch { toast.error('Could not load liked tutors') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleLike(id) {
    await likeTutor(id)
    load()
  }

  async function handleActivate(tutorId) {
    try {
      await activateTutor(tutorId)
      setActivated(prev => new Set([...prev, tutorId]))
      toast.success('Tutor added to My Tutors!')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Could not add tutor')
    }
  }

  return (
    <HubLayout>
      <PageTitle title="Saved Tutors" icon="favorite" />
      <PageHeader
        icon="favorite"
        iconColor="#ff725e"
        title="Liked Tutors"
        subtitle={`${loading ? '…' : tutors.length} saved`}
        right={
          <Link to="/find-tutors" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>explore</span>
            Explore more
          </Link>
        }
      />

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
              onActivate={handleActivate}
              activated={activated.has(tutor.id_tutor)}
            />
          ))}
        </div>
      )}
    </HubLayout>
  )
}
