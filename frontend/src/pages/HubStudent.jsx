import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import { getActiveTutors } from '../api/tutors'
import { getEvents } from '../api/events'
import { getConversations } from '../api/messages'

const QUICK_ACTIONS = [
  { to: '/find-tutors',       icon: '🔍', label: 'Find Tutors',   color: 'from-coral-400/20 to-coral-400/5',   border: 'border-coral-400/20' },
  { to: '/active-tutors',     icon: '👨‍🏫', label: 'My Tutors',    color: 'from-blue-400/20 to-blue-400/5',     border: 'border-blue-400/20'  },
  { to: '/messages',          icon: '💬', label: 'Messages',      color: 'from-green-400/20 to-green-400/5',   border: 'border-green-400/20' },
  { to: '/calendar/student',  icon: '📅', label: 'Calendar',      color: 'from-purple-400/20 to-purple-400/5', border: 'border-purple-400/20'},
  { to: '/forum',             icon: '🗣️', label: 'Forum',         color: 'from-yellow-400/20 to-yellow-400/5', border: 'border-yellow-400/20'},
  { to: '/study-rooms/student', icon: '📚', label: 'Study Rooms', color: 'from-pink-400/20 to-pink-400/5',     border: 'border-pink-400/20'  },
  { to: '/liked-tutors',      icon: '❤️', label: 'Liked',         color: 'from-red-400/20 to-red-400/5',       border: 'border-red-400/20'   },
  { to: '/payments',          icon: '💳', label: 'Payments',      color: 'from-teal-400/20 to-teal-400/5',     border: 'border-teal-400/20'  },
]

export default function HubStudent() {
  const { user } = useAuth()
  const [activeTutors,    setActiveTutors]    = useState([])
  const [events,          setEvents]          = useState([])
  const [conversations,   setConversations]   = useState([])
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getActiveTutors().then(r => setActiveTutors(r.data.tutors ?? [])),
      getEvents().then(r => setEvents(r.data.events ?? [])),
      getConversations().then(r => setConversations(r.data.conversations ?? [])),
    ]).finally(() => setLoading(false))
  }, [])

  const upcomingSessions = events.filter(e => e.status === 'confirmed' || e.status === 'pending')
  const unreadMessages   = conversations.filter(c => c.unread > 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <HubLayout initialMode="student">
      {/* Welcome banner */}
      <div className="relative overflow-hidden glass p-6 sm:p-8 mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-coral-400/10 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-white/50 text-sm font-medium mb-1">{greeting} 👋</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            {user?.name?.split(' ')[0] ?? 'Student'}
          </h1>
          <p className="text-white/60">Ready to learn something new today?</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="👨‍🏫"
          label="Active Tutors"
          value={loading ? '—' : activeTutors.length}
          sub="connected"
          to="/active-tutors"
        />
        <StatCard
          icon="📅"
          label="Upcoming"
          value={loading ? '—' : upcomingSessions.length}
          sub="sessions"
          to="/calendar/student"
        />
        <StatCard
          icon="💬"
          label="Messages"
          value={loading ? '—' : conversations.length}
          sub={unreadMessages.length > 0 ? `${unreadMessages.length} unread` : 'conversations'}
          to="/messages"
          highlight={unreadMessages.length > 0}
        />
        <StatCard
          icon="🗣️"
          label="Forum"
          value="∞"
          sub="discussions"
          to="/forum"
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

      {/* Upcoming sessions & recent tutors */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming sessions */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">Upcoming sessions</h2>
            <Link to="/calendar/student" className="text-coral-400 text-sm hover:text-coral-300">View all →</Link>
          </div>
          {loading ? (
            <Skeleton rows={3} />
          ) : upcomingSessions.length === 0 ? (
            <Empty text="No upcoming sessions" icon="📅" />
          ) : (
            <div className="space-y-3">
              {upcomingSessions.slice(0, 4).map(ev => (
                <MiniEventRow key={ev.id_event} event={ev} />
              ))}
            </div>
          )}
        </div>

        {/* Active tutors */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">My tutors</h2>
            <Link to="/active-tutors" className="text-coral-400 text-sm hover:text-coral-300">View all →</Link>
          </div>
          {loading ? (
            <Skeleton rows={3} />
          ) : activeTutors.length === 0 ? (
            <Empty text="No active tutors yet" icon="👨‍🏫" action={{ to: '/find-tutors', label: 'Find a tutor' }} />
          ) : (
            <div className="space-y-3">
              {activeTutors.slice(0, 4).map(t => (
                <MiniTutorRow key={t.id_tutor} tutor={t} />
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
  const STATUS = { pending: 'text-yellow-400', confirmed: 'text-green-400', canceled: 'text-red-400', paid: 'text-blue-400' }
  const start = event.start_time ? new Date(event.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm flex-shrink-0">📆</div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{event.title}</p>
        <p className="text-white/40 text-xs">{start}</p>
      </div>
      <span className={`text-xs font-medium flex-shrink-0 ${STATUS[event.status] ?? STATUS.pending}`}>
        {event.status}
      </span>
    </div>
  )
}

function MiniTutorRow({ tutor }) {
  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/tutor/$tutorId" params={{ tutorId: String(tutor.id_tutor) }}
      className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-lg px-1 transition-colors">
      <div className="w-8 h-8 rounded-full bg-coral-400/20 flex items-center justify-center text-coral-400 font-bold text-xs flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{tutor.name}</p>
        <p className="text-white/40 text-xs truncate">{tutor.subjects}</p>
      </div>
    </Link>
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
