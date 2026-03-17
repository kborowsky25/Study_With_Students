import { useState, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from '@tanstack/react-router'

// ── Accent palettes ───────────────────────────────────────────────────────────
const CORAL = '#ff725e'
const TUTOR_RED = '#e53e3e'

const STUDENT_PAL = {
  accent:       CORAL,
  avatarGrad:   'linear-gradient(135deg, #ff725e, #e05a48)',
  avatarShadow: '0 4px 14px rgba(255,114,94,0.38)',
  badgeBg:      'linear-gradient(135deg, rgba(255,114,94,0.14) 0%, rgba(255,114,94,0.04) 100%)',
  badgeBorder:  'rgba(255,114,94,0.20)',
  badgeHover:   'rgba(255,114,94,0.38)',
  glowColor:    'rgba(255,114,94,0.08)',
  activeBg:     'rgba(255,114,94,0.12)',
  activeBorder: 'rgba(255,114,94,0.22)',
  upgradeBg:    'linear-gradient(135deg, rgba(255,114,94,0.14), rgba(255,154,60,0.10))',
  upgradeBgHov: 'linear-gradient(135deg, rgba(255,114,94,0.22), rgba(255,154,60,0.16))',
  upgradeBor:   'rgba(255,114,94,0.28)',
}

const TUTOR_PAL = {
  accent:       'rgba(255,255,255,0.88)',
  avatarGrad:   'linear-gradient(135deg, #e2e8f0, #94a3b8)',
  avatarShadow: '0 4px 14px rgba(255,255,255,0.10)',
  badgeBg:      'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
  badgeBorder:  'rgba(255,255,255,0.12)',
  badgeHover:   'rgba(255,255,255,0.20)',
  glowColor:    'rgba(255,255,255,0.04)',
  activeBg:     'rgba(255,255,255,0.09)',
  activeBorder: 'rgba(255,255,255,0.18)',
  upgradeBg:    'transparent',
  upgradeBgHov: 'transparent',
  upgradeBor:   'transparent',
}

// ── Section-grouped nav definitions ──────────────────────────────────────────
// Student: Home → Connect → Learn → Community → Account
const studentSections = [
  {
    links: [
      { to: '/hub/student',         label: 'Home',         icon: 'home',               key: 'h' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { to: '/calendar/student',    label: 'Calendar',     icon: 'calendar_month',     key: 'c' },
      { to: '/messages',            label: 'Messages',     icon: 'message',            key: 'm', tourId: 'messages' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { to: '/find-tutors',         label: 'Find Tutors',  icon: 'search',             key: 'f', tourId: 'find-tutors' },
      { to: '/active-tutors',       label: 'My Tutors',    icon: 'cast_for_education', key: 't' },
      { to: '/liked-tutors',        label: 'Liked Tutors', icon: 'favorite',           key: 'l' },
    ],
  },
  {
    // Community gated behind Explorer Plan for students
    title: 'Community',
    premium: true,
    links: [
      { to: '/study-rooms/student', label: 'Study Rooms',  icon: 'groups',             key: 's', tourId: 'study-rooms-student' },
      { to: '/classroom',           label: 'Classroom',    icon: 'school',             key: 'r' },
      { to: '/study-notes',         label: 'Study Notes',  icon: 'menu_book',          key: 'n' },
      { to: '/forum',               label: 'Forum',        icon: 'forum',              key: 'e', tourId: 'forum' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/payments',            label: 'Payments',     icon: 'payments',           key: 'p', tourId: 'payments' },
      { to: '/xp',                  label: 'Graduation',   icon: 'military_tech',      key: 'x' },
    ],
  },
]

// Tutor: Home → Connect → Teach → Community → Account
const tutorSections = [
  {
    links: [
      { to: '/hub/tutor',           label: 'Home',         icon: 'home',               key: 'h' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { to: '/calendar/tutor',      label: 'Calendar',     icon: 'calendar_month',     key: 'c', tourId: 'calendar-tutor' },
      { to: '/messages',            label: 'Messages',     icon: 'message',            key: 'm', tourId: 'messages-tutor' },
    ],
  },
  {
    title: 'Teach',
    links: [
      { to: '/active-students',     label: 'My Students',  icon: 'people',             key: 'u', tourId: 'my-students' },
    ],
  },
  {
    // Community is FREE for verified tutors
    title: 'Community',
    links: [
      { to: '/study-rooms/tutor',   label: 'Study Rooms',  icon: 'groups',             key: 's', tourId: 'study-rooms-tutor' },
      { to: '/classroom',           label: 'Classroom',    icon: 'school',             key: 'r' },
      { to: '/study-notes',         label: 'Study Notes',  icon: 'menu_book',          key: 'n' },
      { to: '/forum',               label: 'Forum',        icon: 'forum',              key: 'e' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/earnings',            label: 'Earnings',     icon: 'payments',           key: 'e', tourId: 'earnings' },
      { to: '/xp',                  label: 'Graduation',   icon: 'military_tech',      key: 'x' },
    ],
  },
]

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ title }) {
  return (
    <div style={{
      fontSize: '9px', fontWeight: '800',
      color: 'rgba(255,255,255,0.22)',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      padding: '10px 12px 4px',
    }}>
      {title}
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ mode = 'student' }) {
  const router   = useRouterState()
  const pathname = router.location.pathname
  const sections = mode === 'tutor' ? tutorSections : studentSections
  const pal      = mode === 'tutor' ? TUTOR_PAL : STUDENT_PAL
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = (user?.name ?? '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    // Maintain daily login streak in localStorage for hub pages to read
    try {
      const today     = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const s = JSON.parse(localStorage.getItem('sws_streak') || '{"count":1,"last":""}')
      if (s.last !== today && s.last !== yesterday) {
        localStorage.setItem('sws_streak', JSON.stringify({ count: 1, last: today }))
      } else if (s.last === yesterday) {
        localStorage.setItem('sws_streak', JSON.stringify({ count: s.count + 1, last: today }))
      }
    } catch {}
  }, [])

  function handleLogout() {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <aside
      style={{
        width: '200px', minWidth: '200px', flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column',
        height: '100%', overflowY: 'auto', overflowX: 'hidden',
      }}
      className="scrollbar-hide"
    >
      {/* ── Profile Card ─────────────────────────────────────────────────── */}
      <Link
        to={mode === 'tutor' ? '/tutor-profile' : '/dashboard'}
        style={{ textDecoration: 'none' }}
        title={mode === 'tutor' ? 'Edit profile' : 'View profile'}
      >
        <div
          style={{
            margin: '12px 8px 8px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: pal.badgeBg,
            border: `1px solid ${pal.badgeBorder}`,
            cursor: 'pointer', transition: 'border-color 0.15s',
            position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = pal.badgeHover)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = pal.badgeBorder)}
        >
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: pal.glowColor, filter: 'blur(20px)', pointerEvents: 'none' }} />

          {/* Avatar + name + streak row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Avatar */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
              background: pal.avatarGrad,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: '900', fontSize: '15px',
              boxShadow: pal.avatarShadow,
            }}>
              {initials}
            </div>

            {/* Name + role badge */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: '13px', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name ?? 'Student'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  fontSize: '9px', fontWeight: '700', color: pal.accent,
                  background: `${pal.accent}18`, border: `1px solid ${pal.accent}30`,
                  borderRadius: '6px', padding: '1px 6px', lineHeight: '14px',
                }}>
                  {mode === 'tutor' ? 'Tutor' : 'Student'}
                </span>
                {user?.is_premium && (
                  <span style={{ fontSize: '9px', color: '#fbbf24', background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '6px', padding: '1px 5px', lineHeight: '14px' }}>
                    ✦ Pro
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </Link>

      {/* ── Nav sections ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '0 8px 8px' }}>
        {sections.map((section, si) => {
          // Orange lock on each community link for non-premium students
          const isPremiumLocked = section.premium && !user?.is_premium && mode !== 'tutor'
          return (
            <div key={si}>
              {section.title && <SectionLabel title={section.title} premium={section.premium} />}
              {section.links.map(({ to, label, icon, accent: linkAccent, tourId }) => {
                const active      = pathname === to || pathname.startsWith(to + '/')
                const activeColor = linkAccent ?? pal.accent
                const activeBg    = linkAccent ? `${linkAccent}18` : pal.activeBg
                const activeBdr   = linkAccent ? `${linkAccent}35` : pal.activeBorder
                const idleColor   = linkAccent ? `${linkAccent}90` : 'rgba(255,255,255,0.45)'
                const idleText    = linkAccent ? `${linkAccent}cc` : 'rgba(255,255,255,0.60)'
                return (
                  <Link
                    key={to}
                    to={to}
                    {...(tourId ? { 'data-tour': tourId } : {})}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '9px',
                      padding: '9px 10px', borderRadius: '10px', marginBottom: '1px',
                      background: active ? activeBg : 'transparent',
                      border: `1px solid ${active ? activeBdr : 'transparent'}`,
                      textDecoration: 'none', transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = linkAccent ? `${linkAccent}0d` : 'rgba(255,255,255,0.06)'
                        e.currentTarget.style.border = `1px solid ${linkAccent ? `${linkAccent}25` : 'rgba(255,255,255,0.08)'}`
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = active ? activeBg : 'transparent'
                      e.currentTarget.style.border = `1px solid ${active ? activeBdr : 'transparent'}`
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '19px', color: active ? activeColor : idleColor, flexShrink: 0 }}
                    >
                      {icon}
                    </span>
                    <span style={{
                      fontSize: '13px', fontWeight: active ? '700' : '500',
                      color: active ? activeColor : idleText,
                      letterSpacing: '0.01em', flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Upgrade nudge — only for students not yet on Explorer ────────── */}
      {!user?.is_premium && mode !== 'tutor' && (
        <div style={{ padding: '0 12px 10px' }}>
          <Link
            to="/membership"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '10px', fontWeight: '600',
              color: 'rgba(255,255,255,0.30)', textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = pal.accent }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.30)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>lock</span>
            Unlock Community — £2/mo
          </Link>
        </div>
      )}

      {/* ── Super Admin link (only visible to admin) ─────────────────────────── */}
      {user?.is_admin && (
        <div style={{ padding: '0 8px 6px' }}>
          <Link
            to="/superadmin"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '10px',
              background: 'rgba(229,62,62,0.10)', border: '1px solid rgba(229,62,62,0.22)',
              textDecoration: 'none', transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229,62,62,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(229,62,62,0.10)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#e53e3e', flexShrink: 0 }}>admin_panel_settings</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#e53e3e' }}>Super Admin</span>
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
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'
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
