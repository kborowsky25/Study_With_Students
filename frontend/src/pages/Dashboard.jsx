import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { getActiveTutors } from '../api/tutors'
import { getEvents } from '../api/events'
import HubLayout from '../components/layout/HubLayout'

const XP_ACTIONS = [
  { icon: '📅', label: 'Book a session',    xp: 50 },
  { icon: '✅', label: 'Complete a session', xp: 100 },
  { icon: '🗣️', label: 'Post in forum',     xp: 20 },
  { icon: '❤️', label: 'Like a tutor',       xp: 10 },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [tutors,  setTutors]  = useState([])
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getActiveTutors().then(r => setTutors(r.data.tutors ?? [])),
      getEvents().then(r => setEvents(r.data.events ?? [])),
    ]).finally(() => setLoading(false))
  }, [])

  const completed = events.filter(e => e.status === 'confirmed' || e.status === 'paid').length
  const xp        = completed * 100 + tutors.length * 10
  const level     = Math.floor(xp / 500) + 1
  const progress  = ((xp % 500) / 500) * 100

  return (
    <HubLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">My Stats</h1>
        <p className="text-white/50">Track your learning progress</p>
      </div>

      {/* XP / Level */}
      <div className="glass p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-coral-400/10 to-purple-400/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/50 text-sm">Current level</p>
              <p className="text-4xl font-black text-coral-400">Lv. {level}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-sm">Total XP</p>
              <p className="text-2xl font-black text-white">{xp}</p>
            </div>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-coral-400 to-orange-400 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-white/30">
            <span>{xp % 500} XP</span>
            <span>500 XP to next level</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '👨‍🏫', label: 'Active Tutors',     value: loading ? '—' : tutors.length },
          { icon: '📅', label: 'Sessions Booked',  value: loading ? '—' : events.length },
          { icon: '✅', label: 'Completed',         value: loading ? '—' : completed },
          { icon: '⭐', label: 'XP Earned',         value: xp },
        ].map(({ icon, label, value }) => (
          <div key={label} className="glass p-4 text-center">
            <div className="text-3xl mb-2">{icon}</div>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-white/40 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* How to earn XP */}
      <div className="glass p-6 mb-6">
        <h2 className="font-bold text-white mb-4">Earn XP</h2>
        <div className="space-y-3">
          {XP_ACTIONS.map(({ icon, label, xp: pts }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span>{icon}</span>
                <span className="text-white/70 text-sm">{label}</span>
              </div>
              <span className="text-coral-400 font-bold text-sm">+{pts} XP</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link to="/find-tutors"     className="btn-primary">Find Tutors</Link>
        <Link to="/active-tutors"   className="btn-secondary">My Tutors</Link>
        <Link to="/calendar/student"className="btn-secondary">Calendar</Link>
      </div>
    </HubLayout>
  )
}
