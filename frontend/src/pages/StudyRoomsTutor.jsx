import { useEffect, useState } from 'react'
import { getStudyRooms, createStudyRoom } from '../api/studyrooms'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const EMPTY_FORM = { subject: '', description: '', start_time: '', end_time: '', zoom_link: '' }

export default function StudyRoomsTutor() {
  const [rooms,   setRooms]   = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [creating,setCreating]= useState(false)
  const [showForm,setShowForm]= useState(false)

  async function load() {
    try {
      const { data } = await getStudyRooms()
      setRooms(data.rooms ?? [])
    } catch { toast.error('Could not load rooms') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function update(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      await createStudyRoom(form)
      toast.success('Study room created!')
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <HubLayout initialMode="tutor">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Study Rooms</h1>
          <p className="text-white/50">Manage your group study sessions</p>
        </div>
        <button onClick={() => setShowForm(f => !f)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Create room'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass p-6 mb-8 animate-slide-up">
          <h2 className="font-bold text-white mb-5">New study room</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/50 mb-1.5">Subject *</label>
                <input type="text" value={form.subject} onChange={update('subject')} required placeholder="e.g. Advanced Maths" className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1.5">Zoom link</label>
                <input type="url" value={form.zoom_link} onChange={update('zoom_link')} placeholder="https://zoom.us/j/…" className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1.5">Start time *</label>
                <input type="datetime-local" value={form.start_time} onChange={update('start_time')} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1.5">End time *</label>
                <input type="datetime-local" value={form.end_time} onChange={update('end_time')} required className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Description</label>
              <textarea value={form.description} onChange={update('description')} rows={3} placeholder="What will you cover in this session?" className="input-field resize-none" />
            </div>
            <button type="submit" disabled={creating} className="btn-primary disabled:opacity-50">
              {creating ? 'Creating…' : 'Create room →'}
            </button>
          </form>
        </div>
      )}

      {/* Rooms list */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="glass h-44 animate-pulse" />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📚</p>
          <p className="text-white/60 mb-4">No study rooms yet</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Create your first room</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => {
            const start = room.start_time ? new Date(room.start_time).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
            return (
              <div key={room.id} className="glass p-5">
                <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center text-xl mb-3">📚</div>
                <h3 className="font-bold text-white mb-1">{room.subject}</h3>
                {room.description && <p className="text-white/50 text-sm mb-3">{room.description}</p>}
                <div className="text-sm text-white/40 mb-3">📅 {start}</div>
                {room.zoom_link && (
                  <a href={room.zoom_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm">
                    Zoom link →
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
