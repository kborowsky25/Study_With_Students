import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getLikedTutors, likeTutor, activateTutor } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import TutorCard from '../components/features/TutorCard'
import toast from 'react-hot-toast'

export default function LikedTutors() {
  const [tutors,  setTutors]  = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const { data } = await getLikedTutors()
      setTutors(data.tutors ?? [])
    } catch { toast.error('Could not load liked tutors') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleLike(id) {
    await likeTutor(id)
    load()
  }

  return (
    <HubLayout>
      <div className="animate-slide-up mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">
            Liked Tutors <span style={{ color: '#ff725e' }}>✦</span>
          </h1>
          <p className="text-white/50">{loading ? '…' : tutors.length} saved</p>
        </div>
        <Link to="/find-tutors" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>explore</span>
          Explore more
        </Link>
      </div>

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
            />
          ))}
        </div>
      )}
    </HubLayout>
  )
}
