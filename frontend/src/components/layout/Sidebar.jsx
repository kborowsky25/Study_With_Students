import { Link, useRouterState } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'

const studentLinks = [
  { to: '/hub/student',         label: 'Home',          icon: 'home' },
  { to: '/payments',            label: 'Payments',      icon: 'payments' },
  { to: '/study-rooms/student', label: 'Study Rooms',   icon: 'chair' },
  { to: '/forum',               label: 'Forum',         icon: 'forum' },
  { to: '/messages',            label: 'Messages',      icon: 'message' },
  { to: '/calendar/student',    label: 'Calendar',      icon: 'calendar_clock' },
  { to: '/active-tutors',       label: 'My Tutors',     icon: 'cast_for_education' },
  { to: '/liked-tutors',        label: 'Liked',         icon: 'favorite' },
]

const tutorLinks = [
  { to: '/hub/tutor',           label: 'Home',          icon: 'home' },
  { to: '/payments',            label: 'Payments',      icon: 'payments' },
  { to: '/active-students',     label: 'Students',      icon: 'cast_for_education' },
  { to: '/study-rooms/tutor',   label: 'Study Rooms',   icon: 'chair' },
  { to: '/forum',               label: 'Forum',         icon: 'forum' },
  { to: '/messages',            label: 'Messages',      icon: 'message' },
  { to: '/calendar/tutor',      label: 'Calendar',      icon: 'calendar_clock' },
  { to: '/tutor-profile',       label: 'Account',       icon: 'account_circle' },
]

export default function Sidebar({ mode = 'student', onToggleMode }) {
  const { logout } = useAuth()
  const router = useRouterState()
  const pathname = router.location.pathname

  const links = mode === 'tutor' ? tutorLinks : studentLinks

  return (
    <>
      {/* Desktop sidebar — white, narrow, original style */}
      <aside
        className="hidden lg:flex flex-col bg-white border-r border-gray-200 sticky top-0 h-screen overflow-y-auto"
        style={{ width: '7vw', minWidth: '80px' }}
      >
        {/* Mode toggle */}
        {onToggleMode && (
          <button
            onClick={onToggleMode}
            title={`Switch to ${mode === 'tutor' ? 'Student' : 'Tutor'} view`}
            className="flex flex-col items-center justify-center gap-1 py-3 px-1 hover:bg-gray-100 transition-all border-b border-gray-200"
            style={{ height: '70px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#ff725e' }}>
              swap_horiz
            </span>
            <span className="font-medium text-center" style={{ color: '#1b263b', fontSize: '10px' }}>
              {mode === 'tutor' ? 'Student' : 'Tutor'}
            </span>
          </button>
        )}

        {/* Nav links */}
        <nav className="flex-1 flex flex-col">
          {links.map(({ to, label, icon }) => {
            const active = pathname === to || pathname.startsWith(to + '/')
            return (
              <Link
                key={to}
                to={to}
                title={label}
                className="flex flex-col items-center justify-center gap-1 py-3 px-1 transition-all duration-200 cursor-pointer"
                style={{
                  height: '80px',
                  backgroundColor: active ? '#fff5f4' : 'transparent',
                  borderLeft: active ? '3px solid #ff725e' : '3px solid transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.backgroundColor = '#fff5f4'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.backgroundColor = active ? '#fff5f4' : 'transparent'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#ff725e' }}>
                  {icon}
                </span>
                <span className="text-center font-medium" style={{ color: '#1b263b', fontSize: '10px' }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={logout}
          title="Log out"
          className="flex flex-col items-center justify-center gap-1 py-3 px-1 border-t border-gray-200 hover:bg-red-50 transition-all w-full"
          style={{ height: '70px' }}
        >
          <span className="material-symbols-outlined text-red-400" style={{ fontSize: '26px' }}>logout</span>
          <span className="font-medium text-red-400" style={{ fontSize: '10px' }}>Logout</span>
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around px-2 py-1">
          {links.slice(0, 5).map(({ to, label, icon }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '24px', color: active ? '#ff725e' : '#b0bec5' }}
                >
                  {icon}
                </span>
                <span
                  className="font-medium"
                  style={{ fontSize: '10px', color: active ? '#ff725e' : '#b0bec5' }}
                >
                  {label.split(' ')[0]}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
