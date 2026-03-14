import { Link, useRouterState } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from '@tanstack/react-router'

const studentLinks = [
  { to: '/hub/student',         label: 'Home',        icon: 'home' },
  { to: '/messages',            label: 'Messages',    icon: 'message' },
  { to: '/calendar/student',    label: 'Calendar',    icon: 'calendar_month' },
  { to: '/active-tutors',       label: 'My Tutors',   icon: 'cast_for_education' },
  { to: '/study-rooms/student', label: 'Study Rooms', icon: 'groups' },
  { to: '/classroom',           label: 'Classroom',   icon: 'school' },
  { to: '/forum',               label: 'Forum',       icon: 'forum' },
  { to: '/payments',            label: 'Payments',    icon: 'payments' },
]

const tutorLinks = [
  { to: '/hub/tutor',           label: 'Home',        icon: 'home' },
  { to: '/active-students',     label: 'Students',    icon: 'people' },
  { to: '/messages',            label: 'Messages',    icon: 'message' },
  { to: '/calendar/tutor',      label: 'Calendar',    icon: 'calendar_month' },
  { to: '/study-rooms/tutor',   label: 'Study Rooms', icon: 'groups' },
  { to: '/classroom',           label: 'Classroom',   icon: 'school' },
  { to: '/payments',            label: 'Earnings',    icon: 'payments' },
  { to: '/tutor-profile',       label: 'My Profile',  icon: 'account_circle' },
]

export default function Sidebar({ mode = 'student' }) {
  const router    = useRouterState()
  const pathname  = router.location.pathname
  const links     = mode === 'tutor' ? tutorLinks : studentLinks
  const { user, logout } = useAuth()
  const navigate  = useNavigate()

  const initials = (user?.name ?? '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function handleLogout() {
    logout()
    navigate({ to: '/login' })
  }

  return (
    /* ── Sidebar (always visible, sticky, full height) ── */
    <aside
      style={{
        width: '200px',
        minWidth: '200px',
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      className="scrollbar-hide"
    >
      {/* ── Profile section ──────────────────────────── */}
      <Link
        to={mode === 'tutor' ? '/tutor-profile' : '/dashboard'}
        style={{ textDecoration: 'none' }}
        title="View profile"
      >
        <div
          style={{
            padding: '20px 16px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '8px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {/* Avatar */}
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #ff725e, #e05a48)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: '900', fontSize: '18px',
            marginBottom: '10px',
            boxShadow: '0 4px 14px rgba(255,114,94,0.35)',
          }}>
            {initials}
          </div>
          {/* Name */}
          <p style={{ color: 'rgba(255,255,255,0.90)', fontWeight: '700', fontSize: '14px', lineHeight: 1.2, marginBottom: '3px' }}>
            {user?.name ?? 'Student'}
          </p>
          {/* Role badge + premium badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-block',
              background: mode === 'tutor' ? 'rgba(255,114,94,0.15)' : 'rgba(255,255,255,0.08)',
              border: mode === 'tutor' ? '1px solid rgba(255,114,94,0.30)' : '1px solid rgba(255,255,255,0.10)',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '10px', fontWeight: '700',
              color: mode === 'tutor' ? '#ff725e' : 'rgba(255,255,255,0.50)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {mode === 'tutor' ? 'Tutor' : 'Student'}
            </span>
            {user?.is_premium && (
              <span style={{
                display: 'inline-block',
                background: 'rgba(251,191,36,0.18)',
                border: '1px solid rgba(251,191,36,0.35)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '10px', fontWeight: '700',
                color: '#fbbf24',
                letterSpacing: '0.05em',
              }}>
                Explorer ✦
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Nav links ───────────────────────────────── */}
      <div style={{ flex: 1, padding: '4px 8px' }}>
        {links.map(({ to, label, icon }) => {
          const active = pathname === to || pathname.startsWith(to + '/')
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                marginBottom: '2px',
                background: active ? 'rgba(255,114,94,0.12)' : 'transparent',
                border: active ? '1px solid rgba(255,114,94,0.20)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = active ? 'rgba(255,114,94,0.12)' : 'transparent'
                e.currentTarget.style.border = active ? '1px solid rgba(255,114,94,0.20)' : '1px solid transparent'
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', color: active ? '#ff725e' : 'rgba(255,255,255,0.45)', flexShrink: 0 }}
              >
                {icon}
              </span>
              <span style={{
                fontSize: '13px',
                fontWeight: active ? '700' : '500',
                color: active ? '#ff725e' : 'rgba(255,255,255,0.60)',
                letterSpacing: '0.01em',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* ── Switch to Tutor Hub (student view, is_tutor only) ─── */}
      {user?.is_tutor && mode === 'student' && (
        <div style={{ padding: '0 8px 8px' }}>
          <Link
            to="/hub/tutor"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(255,114,94,0.08)',
              border: '1px solid rgba(255,114,94,0.18)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,114,94,0.16)'
              e.currentTarget.style.border = '1px solid rgba(255,114,94,0.30)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,114,94,0.08)'
              e.currentTarget.style.border = '1px solid rgba(255,114,94,0.18)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ff725e', flexShrink: 0 }}>
              swap_horiz
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#ff725e', lineHeight: 1.2 }}>
                Switch to Tutor Hub
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', marginTop: '1px' }}>
                Manage your students
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ── Upgrade CTA (free users only) ───────────── */}
      {!user?.is_premium && (
        <div style={{ padding: '0 8px 8px' }}>
          <Link
            to="/payments"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(255,114,94,0.14), rgba(255,154,60,0.10))',
              border: '1px solid rgba(255,114,94,0.28)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,114,94,0.22), rgba(255,154,60,0.16))' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,114,94,0.14), rgba(255,154,60,0.10))' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ff725e', flexShrink: 0 }}>
              workspace_premium
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#ff725e', lineHeight: 1.2 }}>
                Explorer Plan
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>
                £2/mo · Upgrade now
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ── Logout ──────────────────────────────────── */}
      <div style={{ padding: '0 8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px 12px', borderRadius: '10px',
            background: 'transparent', border: '1px solid transparent',
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,114,94,0.08)'
            e.currentTarget.style.border = '1px solid rgba(255,114,94,0.15)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.border = '1px solid transparent'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
            logout
          </span>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.40)' }}>
            Log out
          </span>
        </button>
      </div>
    </aside>
  )
}
