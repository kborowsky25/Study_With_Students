import { Link, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const studentLinks = [
  { to: '/hub/student',       label: 'Overview',       icon: '🏠' },
  { to: '/find-tutors',       label: 'Find Tutors',    icon: '🔍' },
  { to: '/active-tutors',     label: 'My Tutors',      icon: '👨‍🏫' },
  { to: '/liked-tutors',      label: 'Liked Tutors',   icon: '❤️' },
  { to: '/messages',          label: 'Messages',       icon: '💬' },
  { to: '/dashboard',         label: 'Stats',          icon: '📊' },
  { to: '/calendar/student',  label: 'Calendar',       icon: '📅' },
  { to: '/forum',             label: 'Forum',          icon: '🗣️' },
  { to: '/study-rooms/student', label: 'Study Rooms',  icon: '📚' },
  { to: '/payments',          label: 'Payments',       icon: '💳' },
]

const tutorLinks = [
  { to: '/hub/tutor',         label: 'Overview',       icon: '🏠' },
  { to: '/active-students',   label: 'My Students',    icon: '👩‍🎓' },
  { to: '/messages',          label: 'Messages',       icon: '💬' },
  { to: '/study-rooms/tutor', label: 'Study Rooms',    icon: '📚' },
  { to: '/calendar/tutor',    label: 'Calendar',       icon: '📅' },
  { to: '/tutor-profile',     label: 'My Profile',     icon: '👤' },
  { to: '/forum',             label: 'Forum',          icon: '🗣️' },
  { to: '/events',            label: 'Sessions',       icon: '📆' },
]

export default function Sidebar({ mode = 'student', onToggleMode }) {
  const { user, isTutor, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouterState()
  const pathname = router.location.pathname

  const links = mode === 'tutor' ? tutorLinks : studentLinks

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 bg-navy-600 border-r border-white/5 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Top: Logo + collapse */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 h-16 min-h-[4rem]">
          {!collapsed && (
            <Link to="/hub" className="text-lg font-black">
              Study<span className="text-coral-400">WS</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all ml-auto"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* User badge */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-coral-400/20 flex items-center justify-center text-coral-400 font-bold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{user?.name}</p>
                <p className="text-white/40 text-xs">{mode === 'tutor' ? 'Tutor' : 'Student'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Mode toggle (if user is both) */}
        {isTutor && onToggleMode && !collapsed && (
          <div className="px-4 py-2 border-b border-white/5">
            <button
              onClick={onToggleMode}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all"
            >
              <span>{mode === 'tutor' ? '🎓' : '🏫'}</span>
              <span>Switch to {mode === 'tutor' ? 'Student' : 'Tutor'} view</span>
            </button>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2 space-y-1">
          {links.map(({ to, label, icon }) => {
            const active = pathname === to || pathname.startsWith(to + '/')
            return (
              <Link
                key={to}
                to={to}
                className={`sidebar-link ${active ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? label : undefined}
              >
                <span className="text-lg flex-shrink-0">{icon}</span>
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: logout */}
        <div className="p-2 border-t border-white/5">
          <button
            onClick={logout}
            className={`sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 ${collapsed ? 'justify-center px-2' : ''}`}
            title={collapsed ? 'Log out' : undefined}
          >
            <span className="text-lg">🚪</span>
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy-600/95 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-around px-2 py-2">
          {links.slice(0, 5).map(({ to, label, icon }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
                  active ? 'text-coral-400' : 'text-white/40 hover:text-white'
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-[10px] font-medium">{label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
