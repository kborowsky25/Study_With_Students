import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTheme } from '../../context/ThemeContext'
import { PageTitleProvider, usePageTitleCtx } from '../../context/PageTitleContext'
import Sidebar from './Sidebar'

const CORAL = '#ff725e'

// ── Keyboard shortcut maps ────────────────────────────────────────────────────
const STUDENT_HOTKEYS = {
  h: '/hub/student',
  d: '/dashboard',
  m: '/messages',
  c: '/calendar/student',
  f: '/find-tutors',
  t: '/active-tutors',
  l: '/liked-tutors',
  s: '/study-rooms/student',
  e: '/forum',
  p: '/payments',
  x: '/xp',
}

const TUTOR_HOTKEYS = {
  h: '/hub/tutor',
  u: '/active-students',
  m: '/messages',
  c: '/calendar/tutor',
  s: '/study-rooms/tutor',
  e: '/earnings',
  x: '/xp',
  p: '/tutor-profile',
}

const STUDENT_SHORTCUTS = [
  { key: 'g h', label: 'Home' },
  { key: 'g d', label: 'My Stats' },
  { key: 'g m', label: 'Messages' },
  { key: 'g c', label: 'Calendar' },
  { key: 'g f', label: 'Find Tutors' },
  { key: 'g t', label: 'My Tutors' },
  { key: 'g l', label: 'Liked Tutors' },
  { key: 'g s', label: 'Study Rooms' },
  { key: 'g e', label: 'Forum' },
  { key: 'g p', label: 'Payments' },
  { key: 'g x', label: 'Battle Pass' },
]

const TUTOR_SHORTCUTS = [
  { key: 'g h', label: 'Home' },
  { key: 'g u', label: 'My Students' },
  { key: 'g m', label: 'Messages' },
  { key: 'g c', label: 'Calendar' },
  { key: 'g s', label: 'Study Rooms' },
  { key: 'g e', label: 'Earnings' },
  { key: 'g x', label: 'Battle Pass' },
  { key: 'g p', label: 'My Profile' },
]

// ── Keyboard help overlay ─────────────────────────────────────────────────────
function ShortcutHelp({ mode, onClose }) {
  const shortcuts = mode === 'student' ? STUDENT_SHORTCUTS : TUTOR_SHORTCUTS

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' || e.key === '?') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease both',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(18px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '28px 32px', width: '420px', maxWidth: '90vw',
          backdropFilter: 'blur(20px)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: CORAL }}>keyboard</span>
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Keyboard Shortcuts</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '2px 0 0' }}>Press <Kbd>g</Kbd> then a key to navigate</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Shortcut grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '18px' }}>
          {shortcuts.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {key.split(' ').map((k, i) => <Kbd key={i}>{k}</Kbd>)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}><Kbd>?</Kbd> toggle help</span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}><Kbd>Esc</Kbd> close</span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-faint)', opacity: 0.6 }}>
            {mode === 'student' ? 'Student' : 'Tutor'} mode
          </span>
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: '22px', height: '20px', padding: '0 5px',
      borderRadius: '5px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace',
      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
      color: 'var(--text)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    }}>
      {children}
    </span>
  )
}

// ── Inner layout (needs to be inside PageTitleProvider) ───────────────────────
function HubInner({ children, initialMode, raw, noScroll }) {
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const { title: pageTitle, icon: pageIcon } = usePageTitleCtx()

  const [mode, setMode] = useState(() => {
    if (initialMode) {
      localStorage.setItem('sws_hub_mode', initialMode)
      return initialMode
    }
    return localStorage.getItem('sws_hub_mode') ?? 'student'
  })

  // Keyboard chord state
  const chordActiveRef = useRef(false)
  const chordTimerRef  = useRef(null)
  const [chordActive, setChordActive] = useState(false)
  const [showHelp,    setShowHelp]    = useState(false)

  function toggleMode() {
    const next = mode === 'student' ? 'tutor' : 'student'
    setMode(next)
    localStorage.setItem('sws_hub_mode', next)
    navigate({ to: next === 'tutor' ? '/hub/tutor' : '/hub/student' })
  }

  // ── Keyboard shortcut handler ──────────────────────────────────────────────
  useEffect(() => {
    const keymap = mode === 'student' ? STUDENT_HOTKEYS : TUTOR_HOTKEYS

    function onKeyDown(e) {
      // Don't fire when user is typing
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.target.isContentEditable) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // Escape — cancel chord or close help
      if (e.key === 'Escape') {
        if (chordActiveRef.current) {
          clearTimeout(chordTimerRef.current)
          chordActiveRef.current = false
          setChordActive(false)
        }
        setShowHelp(false)
        return
      }

      // ? — toggle help overlay
      if (e.key === '?') {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      if (chordActiveRef.current) {
        // Second key of chord → navigate
        clearTimeout(chordTimerRef.current)
        chordActiveRef.current = false
        setChordActive(false)
        const dest = keymap[e.key.toLowerCase()]
        if (dest) { e.preventDefault(); navigate({ to: dest }) }
      } else if (e.key.toLowerCase() === 'g') {
        // Start chord
        e.preventDefault()
        chordActiveRef.current = true
        setChordActive(true)
        chordTimerRef.current = setTimeout(() => {
          chordActiveRef.current = false
          setChordActive(false)
        }, 700)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(chordTimerRef.current)
    }
  }, [mode, navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes titleAppear {
          from { opacity: 0; transform: translateY(5px) scale(0.95); filter: blur(3px) }
          to   { opacity: 1; transform: translateY(0)   scale(1);    filter: blur(0) }
        }
        @keyframes chordPop {
          0%   { transform: scale(0.8); opacity: 0 }
          60%  { transform: scale(1.08) }
          100% { transform: scale(1);   opacity: 1 }
        }
      `}</style>

      {/* ── 56px sticky top bar ─────────────────────────────────────────────── */}
      <div className="hub-topbar" style={{ padding: '0 20px', gap: '0', position: 'relative' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL }}>rocket_launch</span>
          <span style={{ fontWeight: 900, fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Study<span style={{ color: CORAL }}>WithStudents</span>
          </span>
        </Link>

        {/* Page title — centred */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', alignItems: 'center', gap: '7px',
          pointerEvents: 'none',
          opacity: pageTitle ? 1 : 0,
          animation: pageTitle ? 'titleAppear 0.3s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
          transition: !pageTitle ? 'opacity 0.15s' : undefined,
        }}>
          {pageIcon && (
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: CORAL }}>{pageIcon}</span>
          )}
          <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {pageTitle}
          </span>
          {pageTitle && (
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: CORAL, display: 'inline-block', marginLeft: '2px', flexShrink: 0 }} />
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Chord indicator — shows when g has been pressed */}
        {chordActive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginRight: '12px', padding: '4px 12px',
            background: `${CORAL}18`, border: `1px solid ${CORAL}35`,
            borderRadius: '20px',
            animation: 'chordPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: CORAL, fontFamily: 'monospace', letterSpacing: '0.05em' }}>g</span>
            <span style={{ fontSize: '13px', color: CORAL, opacity: 0.7 }}>→</span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>_</span>
          </div>
        )}

        {/* Shortcut hint */}
        {!chordActive && (
          <button
            onClick={() => setShowHelp(prev => !prev)}
            title="Keyboard shortcuts (?)"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '4px 9px', cursor: 'pointer',
              marginRight: '10px', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-faint)' }}>keyboard</span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'monospace' }}>?</span>
          </button>
        )}

        {/* Mode switch */}
        <button
          onClick={toggleMode}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,114,94,0.12)', border: '1px solid rgba(255,114,94,0.25)',
            borderRadius: '20px', padding: '4px 14px', cursor: 'pointer', marginRight: '12px', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,114,94,0.20)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,114,94,0.12)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: CORAL }}>swap_horiz</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: CORAL }}>
            {mode === 'tutor' ? 'Student View' : 'Tutor View'}
          </span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>
            {dark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
        <Sidebar mode={mode} chordActive={chordActive} />
        <main style={{ flex: 1, height: '100%', overflowY: noScroll ? 'hidden' : 'auto', minWidth: 0 }}>
          {raw ? children : (
            <div style={{
              maxWidth: '1200px', margin: '0 auto', padding: '20px 24px',
              ...(noScroll ? { height: '100%', boxSizing: 'border-box' } : {}),
            }}>
              {children}
            </div>
          )}
        </main>
      </div>

      {/* ── Keyboard shortcut help overlay ────────────────────────────────────── */}
      {showHelp && <ShortcutHelp mode={mode} onClose={() => setShowHelp(false)} />}
    </div>
  )
}

// ── Public export — wraps with the provider ───────────────────────────────────
export default function HubLayout(props) {
  return (
    <PageTitleProvider>
      <HubInner {...props} />
    </PageTitleProvider>
  )
}
