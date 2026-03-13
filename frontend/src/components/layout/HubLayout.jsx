import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from './Sidebar'

export default function HubLayout({ children, initialMode, raw = false, noScroll = false }) {
  const { isTutor } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const [mode, setMode] = useState(initialMode ?? 'student')

  function toggleMode() {
    const next = mode === 'student' ? 'tutor' : 'student'
    setMode(next)
    navigate({ to: next === 'tutor' ? '/hub/tutor' : '/hub/student' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── 56px sticky top bar ────────────────────────────────────── */}
      <div className="hub-topbar" style={{ padding: '0 20px', gap: '0' }}>
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '22px', color: '#ff725e' }}
          >
            rocket_launch
          </span>
          <span style={{ fontWeight: 900, fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Study<span style={{ color: '#ff725e' }}>WithStudents</span>
          </span>
        </Link>

        <div style={{ flex: 1 }} />

        {/* Mode switch — always visible. Shows the mode you're switching TO. */}
        {isTutor ? (
          <button
            onClick={toggleMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,114,94,0.12)',
              border: '1px solid rgba(255,114,94,0.25)',
              borderRadius: '20px',
              padding: '4px 14px',
              cursor: 'pointer',
              marginRight: '12px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,114,94,0.20)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,114,94,0.12)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ff725e' }}>
              swap_horiz
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#ff725e' }}>
              {mode === 'tutor' ? 'Student View' : 'Tutor View'}
            </span>
          </button>
        ) : (
          /* Non-tutors: Tutor View button navigates to become-a-tutor */
          <Link
            to="/become-tutor"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,114,94,0.12)',
              border: '1px solid rgba(255,114,94,0.25)',
              borderRadius: '20px',
              padding: '4px 14px',
              marginRight: '12px',
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,114,94,0.20)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,114,94,0.12)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ff725e' }}>
              swap_horiz
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#ff725e' }}>
              Tutor View
            </span>
          </Link>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '6px',
            cursor: 'pointer',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '20px', color: 'var(--text-muted)' }}
          >
            {dark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      {/* ── Body: sidebar + main content ───────────────────────────── */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        height: 'calc(100vh - 56px)',
      }}>
        <Sidebar mode={mode} />

        <main style={{
          flex: 1,
          overflowY: noScroll ? 'hidden' : 'auto',
          minWidth: 0,
        }}>
          {raw ? children : (
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '20px 24px',
              ...(noScroll ? { height: '100%', boxSizing: 'border-box' } : {}),
            }}>
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
