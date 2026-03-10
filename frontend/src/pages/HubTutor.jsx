import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import { getActiveStudents } from '../api/tutors'
import { getEvents } from '../api/events'
import { getStudyRooms } from '../api/studyrooms'
import { getConversations } from '../api/messages'

const QUICK_ACTIONS = [
  { to: '/active-students',   icon: '👩‍🎓', label: 'My Students',   color: 'from-blue-400/20 to-blue-400/5',     border: 'border-blue-400/20'  },
  { to: '/messages',          icon: '💬', label: 'Messages',      color: 'from-green-400/20 to-green-400/5',   border: 'border-green-400/20' },
  { to: '/study-rooms/tutor', icon: '📚', label: 'Study Rooms',   color: 'from-purple-400/20 to-purple-400/5', border: 'border-purple-400/20'},
  { to: '/calendar/tutor',    icon: '📅', label: 'Calendar',      color: 'from-coral-400/20 to-coral-400/5',   border: 'border-coral-400/20' },
  { to: '/tutor-profile',     icon: '👤', label: 'My Profile',    color: 'from-yellow-400/20 to-yellow-400/5', border: 'border-yellow-400/20'},
  { to: '/forum',             icon: '🗣️', label: 'Forum',         color: 'from-pink-400/20 to-pink-400/5',     border: 'border-pink-400/20'  },
  { to: '/events',            icon: '📆', label: 'Sessions',      color: 'from-teal-400/20 to-teal-400/5',     border: 'border-teal-400/20'  },
  { to: '/find-tutors',       icon: '🔍', label: 'Find Tutors',   color: 'from-red-400/20 to-red-400/5',       border: 'border-red-400/20'   },
]

export default function HubTutor() {
  const { user } = useAuth()
  const [students,      setStudents]      = useState([])
  const [events,        setEvents]        = useState([])
  const [rooms,         setRooms]         = useState([])
  const [conversations, setConversations] = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getActiveStudents().then(r => setStudents(r.data.students ?? [])),
      getEvents().then(r => setEvents(r.data.events ?? [])),
      getStudyRooms().then(r => setRooms(r.data.rooms ?? [])),
      getConversations().then(r => setConversations(r.data.conversations ?? [])),
    ]).finally(() => setLoading(false))
  }, [])

  const pending   = events.filter(e => e.status === 'pending')
  const upcoming  = events.filter(e => e.status === 'confirmed')
  const unread    = conversations.filter(c => c.unread > 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <HubLayout initialMode="tutor">
      {/* Welcome banner */}
      <div className="relative overflow-hidden glass p-6 sm:p-8 mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/50 text-sm font-medium mb-1">{greeting}, Tutor 🎓</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">
              {user?.name?.split(' ')[0] ?? 'Tutor'}
            </h1>
            <p className="text-white/60">Here's your teaching dashboard</p>
          </div>
          <Link to="/tutor-profile" className="btn-primary self-start sm:self-center">
            Edit profile →
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="👩‍🎓"
          label="Active Students"
          value={loading ? '—' : students.length}
          sub="connected"
          to="/active-students"
        />
        <StatCard
          icon="📆"
          label="Pending"
          value={loading ? '—' : pending.length}
          sub={pending.length > 0 ? 'need review' : 'requests'}
          to="/events"
          highlight={pending.length > 0}
        />
        <StatCard
          icon="✅"
          label="Confirmed"
          value={loading ? '—' : upcoming.length}
          sub="sessions"
          to="/calendar/tutor"
        />
        <StatCard
          icon="💬"
          label="Messages"
          value={loading ? '—' : conversations.length}
          sub={unread.length > 0 ? `${unread.length} unread` : 'conversations'}
          to="/messages"
          highlight={unread.length > 0}
        />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ to, icon, label, color, border }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-b ${color} border ${border} hover:scale-105 transition-all duration-200`}
            >
              <span className="text-3xl">{icon}</span>
              <span className="text-white text-sm font-medium text-center">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Sessions & Students */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending requests */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">Session requests</h2>
            <Link to="/events" className="text-coral-400 text-sm hover:text-coral-300">View all →</Link>
          </div>
          {loading ? (
            <Skeleton rows={3} />
          ) : pending.length === 0 ? (
            <Empty text="No pending requests" icon="📆" />
          ) : (
            <div className="space-y-3">
              {pending.slice(0, 4).map(ev => (
                <MiniEventRow key={ev.id_event} event={ev} />
              ))}
            </div>
          )}
        </div>

        {/* Active students */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">Active students</h2>
            <Link to="/active-students" className="text-coral-400 text-sm hover:text-coral-300">View all →</Link>
          </div>
          {loading ? (
            <Skeleton rows={3} />
          ) : students.length === 0 ? (
            <Empty text="No active students yet" icon="👩‍🎓" />
          ) : (
            <div className="space-y-3">
              {students.slice(0, 4).map(s => (
                <MiniStudentRow key={s.id_student} student={s} />
              ))}
            </div>
          )}
        </div>

        {/* Study rooms */}
        <div className="glass p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">My study rooms</h2>
            <Link to="/study-rooms/tutor" className="text-coral-400 text-sm hover:text-coral-300">Manage →</Link>
          </div>
          {loading ? (
            <Skeleton rows={2} />
          ) : rooms.length === 0 ? (
            <Empty text="No study rooms created yet" icon="📚" action={{ to: '/study-rooms/tutor', label: 'Create your first room' }} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {rooms.slice(0, 4).map(room => (
                <MiniRoomRow key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      </div>
    </HubLayout>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, to, highlight }) {
  return (
    <Link to={to} className={`glass-hover p-4 flex flex-col gap-1 ${highlight ? 'border-coral-400/30' : ''}`}>
      <span className="text-2xl">{icon}</span>
      <span className="text-2xl font-black text-white">{value}</span>
      <span className="text-white/40 text-xs">{label}</span>
      {sub && <span className={`text-xs font-medium ${highlight ? 'text-coral-400' : 'text-white/30'}`}>{sub}</span>}
    </Link>
  )
}

function MiniEventRow({ event }) {
  const start = event.start_time ? new Date(event.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-sm flex-shrink-0">📆</div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{event.title}</p>
        <p className="text-white/40 text-xs">{start}</p>
      </div>
      <span className="text-yellow-400 text-xs font-medium flex-shrink-0">pending</span>
    </div>
  )
}

function MiniStudentRow({ student }) {
  const initials = student.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400 font-bold text-xs flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{student.name}</p>
        <p className="text-white/40 text-xs truncate">{student.email}</p>
      </div>
    </div>
  )
}

function MiniRoomRow({ room }) {
  const start = room.start_time ? new Date(room.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
  return (
    <div className="glass p-3 rounded-xl">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-white font-medium text-sm truncate">{room.subject}</p>
        {room.zoom_link && (
          <a href={room.zoom_link} target="_blank" rel="noreferrer"
            className="text-blue-400 text-xs hover:text-blue-300 flex-shrink-0">Zoom →</a>
        )}
      </div>
      <p className="text-white/40 text-xs">{start}</p>
    </div>
  )
}

function Empty({ text, icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <span className="text-3xl mb-2">{icon}</span>
      <p className="text-white/40 text-sm mb-3">{text}</p>
      {action && (
        <Link to={action.to} className="text-coral-400 text-sm hover:text-coral-300 font-medium">
          {action.label} →
        </Link>
      )}
    </div>
  )
}

function Skeleton({ rows }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
            <div className="h-2.5 bg-white/5 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
