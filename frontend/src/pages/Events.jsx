import { useEffect, useState } from 'react'
import { getEvents } from '../api/events'
import HubLayout from '../components/layout/HubLayout'
import EventCard from '../components/features/EventCard'
import toast from 'react-hot-toast'

const FILTERS = ['all', 'pending', 'confirmed', 'canceled', 'paid']

export default function Events() {
  const [events,  setEvents]  = useState([])
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const { data } = await getEvents()
      setEvents(data.events ?? [])
    } catch { toast.error('Could not load events') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? events : events.filter(e => e.status === filter)

  return (
    <HubLayout>
      <div className="animate-slide-up mb-8">
        <h1 className="text-3xl font-black text-white mb-1">
          Sessions <span style={{ color: '#ff725e' }}>✦</span>
        </h1>
        <p className="text-white/50">{loading ? '…' : events.length} total sessions</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize border ${
              filter === f
                ? 'bg-coral-400/20 text-coral-400 border-coral-400/30'
                : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
            }`}
          >
            {f}
            {f !== 'all' && (
              <span className="ml-1.5 text-xs opacity-60">
                ({events.filter(e => e.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ borderRadius: "12px", height: "132px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📆</p>
          <p className="text-white/60">No {filter === 'all' ? '' : filter} sessions</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(ev => (
            <EventCard key={ev.id_event} event={ev} onRefresh={load} />
          ))}
        </div>
      )}
    </HubLayout>
  )
}
