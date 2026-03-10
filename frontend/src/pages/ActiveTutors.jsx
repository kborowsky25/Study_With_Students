import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getActiveTutors, deactivateTutor } from '../api/tutors'
import { getEvents } from '../api/events'
import HubLayout from '../components/layout/HubLayout'
import EventCard from '../components/features/EventCard'
import toast from 'react-hot-toast'

export default function ActiveTutors() {
  const [tutors,  setTutors]  = useState([])
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState(null)

  async function load() {
    try {
      const [{ data: td }, { data: ed }] = await Promise.all([
        getActiveTutors(),
        getEvents(),
      ])
      setTutors(td.tutors ?? [])
      setEvents(ed.events ?? [])
    } catch { toast.error('Could not load tutors') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleRemove(id) {
    if (!confirm('Remove this tutor from your active list?')) return
    try {
      await deactivateTutor(id)
      toast.success('Tutor removed')
      load()
    } catch { toast.error('Failed') }
  }

  const tutorEvents = (tutorId) =>
    events.filter(e => String(e.tutor_id) === String(tutorId))

  return (
    <HubLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">My Tutors</h1>
          <p className="text-white/50">{tutors.length} active tutor{tutors.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/find-tutors" className="btn-primary">Find more</Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="glass h-48 animate-pulse" />)}
        </div>
      ) : tutors.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">👨‍🏫</p>
          <p className="text-white/60 text-lg mb-4">No active tutors yet</p>
          <Link to="/find-tutors" className="btn-primary">Find a tutor</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {tutors.map(tutor => {
            const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            const myEvents = tutorEvents(tutor.id_tutor)
            return (
              <div key={tutor.id_tutor} className="glass p-5">
                {/* Tutor header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-coral-400/20 flex items-center justify-center text-coral-400 font-bold">
                      {initials}
                    </div>
                    <div>
                      <p className="font-bold text-white">{tutor.name}</p>
                      <p className="text-white/50 text-sm">{tutor.university}</p>
                      {tutor.subjects && (
                        <p className="text-white/30 text-xs mt-0.5">{tutor.subjects}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to="/messages"
                      className="btn-secondary text-sm py-1.5"
                    >
                      💬 Message
                    </Link>
                    <button
                      onClick={() => handleRemove(tutor.id_tutor)}
                      className="text-sm py-1.5 px-3 rounded-xl border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Sessions */}
                {myEvents.length > 0 && (
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Sessions</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {myEvents.slice(0, 4).map(ev => (
                        <EventCard key={ev.id_event} event={ev} onRefresh={load} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
