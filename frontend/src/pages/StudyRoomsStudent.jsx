import { useEffect, useState } from 'react'
import { getStudyRooms, saveToCalendar } from '../api/studyrooms'
import HubLayout from '../components/layout/HubLayout'
import PaywallGate from '../components/features/PaywallGate'
import toast from 'react-hot-toast'

export default function StudyRoomsStudent() {
  const [rooms,   setRooms]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(null)

  useEffect(() => {
    getStudyRooms()
      .then(({ data }) => setRooms(data.rooms ?? []))
      .catch(() => toast.error('Could not load study rooms'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(roomId) {
    setSaving(roomId)
    try {
      await saveToCalendar(roomId)
      toast.success('Added to your calendar!')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed')
    } finally {
      setSaving(null)
    }
  }

  return (
    <HubLayout>
      <PaywallGate feature="Study Rooms">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Study Rooms</h1>
        <p className="text-white/50">Join group study sessions hosted by tutors</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ borderRadius: "12px", height: "168px" }} />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📚</p>
          <p className="text-white/60 text-lg">No study rooms available right now</p>
          <p className="text-white/40 text-sm mt-2">Check back later — tutors are always creating new sessions</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => {
            const start = room.start_time ? new Date(room.start_time).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
            const end   = room.end_time   ? new Date(room.end_time).toLocaleTimeString('en-GB', { timeStyle: 'short' }) : '—'
            return (
              <div key={room.id} className="glass-hover p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center text-xl mb-2">📚</div>
                    <h3 className="font-bold text-white">{room.subject}</h3>
                  </div>
                </div>

                {room.description && (
                  <p className="text-white/50 text-sm leading-relaxed mb-3 flex-1">{room.description}</p>
                )}

                <div className="space-y-1 mb-4 text-sm">
                  <div className="flex gap-2">
                    <span className="text-white/30 w-12">Start</span>
                    <span className="text-white/70">{start}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-white/30 w-12">End</span>
                    <span className="text-white/70">{end}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  {room.zoom_link && (
                    <a
                      href={room.zoom_link}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary flex-1 text-center text-sm py-2"
                    >
                      Join Zoom
                    </a>
                  )}
                  <button
                    onClick={() => handleSave(room.id)}
                    disabled={saving === room.id}
                    className="btn-secondary flex-1 text-sm py-2 disabled:opacity-50"
                  >
                    {saving === room.id ? 'Saving…' : '+ Calendar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </PaywallGate>
    </HubLayout>
  )
}
