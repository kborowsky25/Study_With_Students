import { useEffect, useState } from 'react'
import { getEvents } from '../api/events'
import HubLayout from '../components/layout/HubLayout'
import EventCard from '../components/features/EventCard'
import toast from 'react-hot-toast'

export default function CalendarTutor() {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const { data } = await getEvents()
      setEvents(data.events ?? [])
    } catch { toast.error('Could not load calendar') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const pending  = events.filter(e => e.status === 'pending')
  const upcoming = events.filter(e => e.status === 'confirmed' && new Date(e.start_time) > new Date())
  const past     = events.filter(e => new Date(e.start_time) <= new Date() && e.status !== 'canceled')

  return (
    <HubLayout initialMode="tutor">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">My Schedule</h1>
        <p className="text-white/50">{pending.length} pending · {upcoming.length} confirmed</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="glass h-32 animate-pulse" />)}
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mb-8">
              <h2 className="text-yellow-400 font-bold mb-4">⏳ Pending requests ({pending.length})</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {pending.map(ev => <EventCard key={ev.id_event} event={ev} onRefresh={load} />)}
              </div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section className="mb-8">
              <h2 className="text-white font-bold mb-4">✅ Confirmed ({upcoming.length})</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {upcoming.map(ev => <EventCard key={ev.id_event} event={ev} onRefresh={load} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-white/50 font-bold mb-4">Past</h2>
              <div className="grid sm:grid-cols-2 gap-4 opacity-60">
                {past.slice(0, 6).map(ev => <EventCard key={ev.id_event} event={ev} />)}
              </div>
            </section>
          )}
          {events.length === 0 && (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">📅</p>
              <p className="text-white/60">No sessions yet</p>
            </div>
          )}
        </>
      )}
    </HubLayout>
  )
}
