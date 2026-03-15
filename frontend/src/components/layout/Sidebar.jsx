import { Link, useRouterState } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from '@tanstack/react-router'

const CORAL = '#ff725e'

// ── Section-grouped nav definitions ──────────────────────────────────────────
const studentSections = [
  {
    links: [
      { to: '/hub/student',        label: 'Home',         icon: 'home',              key: 'h' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { to: '/find-tutors',        label: 'Find Tutors',  icon: 'search',            key: 'f' },
      { to: '/active-tutors',      label: 'My Tutors',    icon: 'cast_for_education', key: 't' },
      { to: '/liked-tutors',       label: 'Liked Tutors', icon: 'favorite',          key: 'l' },
    ],
  },
  {
    title: 'Schedule',
    links: [
      { to: '/calendar/student',   label: 'Calendar',     icon: 'calendar_month',    key: 'c' },
      { to: '/study-rooms/student',label: 'Study Rooms',  icon: 'groups',            key: 's' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { to: '/messages',           label: 'Messages',     icon: 'message',           key: 'm' },
      { to: '/forum',              label: 'Forum',        icon: 'forum',             key: 'e' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/dashboard',          label: 'My Stats',     icon: 'bar_chart',         key: 'd' },
      { to: '/payments',           label: 'Payments',     icon: 'payments',          key: 'p' },
      { to: '/xp',                 label: 'Battle Pass',  icon: 'military_tech',     key: 'x' },
    ],
  },
]

const tutorSections = [
  {
    links: [
      { to: '/hub/tutor',          label: 'Home',         icon: 'home',              key: 'h' },
    ],
  },
  {
    title: 'Teach',
    links: [
      { to: '/active-students',    label: 'My Students',  icon: 'people',            key: 'u' },
      { to: '/study-rooms/tutor',  label: 'Study Rooms',  icon: 'groups',            key: 's' },
    ],
  },
  {
    title: 'Schedule',
    links: [
      { to: '/calendar/tutor',     label: 'Calendar',     icon: 'calendar_month',    key: 'c' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { to: '/messages',           label: 'Messages',     icon: 'message',           key: 'm' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/earnings',           label: 'Earnings',     icon: 'payments',          key: 'e' },
      { to: '/xp',                 label: 'Battle Pass',  icon: 'military_tech',     key: 'x' },
      { to: '/tutor-profile',      label: 'My Profile',   icon: 'account_circle',    key: 'p' },
    ],
  },
]

// ── Shortcut badge ────────────────────────────────────────────────────────────
function ShortcutBadge({ keyHint, chordActive }) {
  return (
    <div
      style={{
        marginLeft: 'auto',
        padding: '1px 5px',
        borderRadius: '4px',
        flexShrink: 0,
        background: chordActive ? `${CORAL}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${chordActive ? `${CORAL}30` : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.15s',
      }}
    >
      <span
        style={{
          fontSize: '9px',
          fontFamily: 'monospace',
          fontWeight: '700',
          letterSpacing: '0.04em',
          color: chordActive ? CORAL : 'rgba(255,255,255,0.28)',
          transition: 'color 0.15s',
        }}
      >
        g·{keyHint}
      </span>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ title }) {
  return (
    <div
      style={{
        fontSize: '9px',
        fontWeight: '800',
        color: 'rgba(255,255,255,0.22)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        padding: '10px 12px 4px',
      }}
    >
      {title}
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ mode = 'student', chordActive = false }) {
  const router   = useRouterState()
  const pathname = router.location.pathname
  const sections = mode === 'tutor' ? tutorSections : studentSections
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
      {/* ── Profile section ──────────────────────────────────────────────────── */}
      <Link
        to={mode === 'tutor' ? '/tutor-profile' : '/dashboard'}
        style={{ textDecoration: 'none' }}
        title="View profile"
      >
        <div
          style={{
            padding: '20px 16px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '4px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {/* Avatar */}
          <div
            style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #ff725e, #e05a48)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: '900', fontSize: '18px',
              marginBottom: '10px',
              boxShadow: '0 4px 14px rgba(255,114,94,0.35)',
            }}
          >
            {initials}
          </div>
          {/* Name */}
          <p style={{ color: 'rgba(255,255,255,0.90)', fontWeight: '700', fontSize: '14px', lineHeight: 1.2, marginBottom: '3px' }}>
            {user?.name ?? 'Student'}
          </p>
          {/* Role + premium badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-block',
              background: mode === 'tutor' ? 'rgba(255,114,94,0.15)' : 'rgba(255,255,255,0.08)',
              border: mode === 'tutor' ? '1px solid rgba(255,114,94,0.30)' : '1px solid rgba(255,255,255,0.10)',
              borderRadius: '6px', padding: '2px 8px',
              fontSize: '10px', fontWeight: '700',
              color: mode === 'tutor' ? CORAL : 'rgba(255,255,255,0.50)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {mode === 'tutor' ? 'Tutor' : 'Student'}
            </span>
            {user?.is_premium && (
              <span style={{
                display: 'inline-block',
                background: 'rgba(251,191,36,0.18)',
                border: '1px solid rgba(251,191,36,0.35)',
                borderRadius: '6px', padding: '2px 8px',
                fontSize: '10px', fontWeight: '700',
                color: '#fbbf24', letterSpacing: '0.05em',
              }}>
                Explorer ✦
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Nav sections ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '0 8px 8px' }}>
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && <SectionLabel title={section.title} />}
            {section.links.map(({ to, label, icon, key }) => {
              const active = pathname === to || pathname.startsWith(to + '/')
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '9px',
                    padding: '9px 10px', borderRadius: '10px', marginBottom: '1px',
                    background: active ? 'rgba(255,114,94,0.12)' : 'transparent',
                    border: active ? '1px solid rgba(255,114,94,0.20)' : '1px solid transparent',
                    textDecoration: 'none', transition: 'all 0.15s ease',
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
                    style={{ fontSize: '19px', color: active ? CORAL : 'rgba(255,255,255,0.45)', flexShrink: 0 }}
                  >
                    {icon}
                  </span>
                  <span
                    style={{
                      fontSize: '13px', fontWeight: active ? '700' : '500',
                      color: active ? CORAL : 'rgba(255,255,255,0.60)',
                      letterSpacing: '0.01em', flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                  {key && <ShortcutBadge keyHint={key} chordActive={chordActive} />}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Upgrade CTA (free users only) ────────────────────────────────────── */}
      {!user?.is_premium && (
        <div style={{ padding: '0 8px 8px' }}>
          <Link
            to="/payments"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(255,114,94,0.14), rgba(255,154,60,0.10))',
              border: '1px solid rgba(255,114,94,0.28)',
              textDecoration: 'none', transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,114,94,0.22), rgba(255,154,60,0.16))' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,114,94,0.14), rgba(255,154,60,0.10))' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: CORAL, flexShrink: 0 }}>
              workspace_premium
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: CORAL, lineHeight: 1.2 }}>
                Explorer Plan
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>
                £2/mo · Upgrade now
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ── Logout ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px 12px', borderRadius: '10px',
            background: 'transparent', border: '1px solid transparent',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
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
