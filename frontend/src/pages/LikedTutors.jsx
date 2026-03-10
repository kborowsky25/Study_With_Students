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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Liked Tutors</h1>
          <p className="text-white/50">{tutors.length} saved</p>
        </div>
        <Link to="/find-tutors" className="btn-primary">Explore more</Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="glass h-52 animate-pulse" />)}
        </div>
      ) : tutors.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">❤️</p>
          <p className="text-white/60 text-lg mb-4">No liked tutors yet</p>
          <Link to="/find-tutors" className="btn-outline">Find tutors to like</Link>
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
