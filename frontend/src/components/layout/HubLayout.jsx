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
}

const TUTOR_HOTKEYS = {
  h: '/hub/tutor',
  u: '/active-students',
  m: '/messages',
  c: '/calendar/tutor',
  s: '/study-rooms/tutor',
  e: '/earnings',
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
]

const TUTOR_SHORTCUTS = [
  { key: 'g h', label: 'Home' },
  { key: 'g u', label: 'My Students' },
  { key: 'g m', label: 'Messages' },
  { key: 'g c', label: 'Calendar' },
  { key: 'g s', label: 'Study Rooms' },
  { key: 'g e', label: 'Earnings' },
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
              <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '2px 0 0' }}>Press <Kbd>g</Kbd> then a key to jump anywhere</p>
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
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}><Kbd>g</Kbd> goto mode · <Kbd>?</Kbd> toggle help</span>
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

  const [showHelp, setShowHelp] = useState(false)
  const [gActive, setGActive]   = useState(false)
  const gModeRef  = useRef(false)
  const gTimerRef = useRef(null)

  function toggleMode() {
    const next = mode === 'student' ? 'tutor' : 'student'
    setMode(next)
    localStorage.setItem('sws_hub_mode', next)
    navigate({ to: next === 'tutor' ? '/hub/tutor' : '/hub/student' })
  }

  // ── g → letter shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const keymap = mode === 'student' ? STUDENT_HOTKEYS : TUTOR_HOTKEYS

    function onKeyDown(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.target.isContentEditable) return

      // Escape — close overlays, cancel g-mode
      if (e.key === 'Escape') {
        setShowHelp(false)
        gModeRef.current = false
        setGActive(false)
        clearTimeout(gTimerRef.current)
        return
      }

      // ? — toggle help overlay
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      // g — enter goto mode
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        gModeRef.current = true
        setGActive(true)
        clearTimeout(gTimerRef.current)
        gTimerRef.current = setTimeout(() => {
          gModeRef.current = false
          setGActive(false)
        }, 1500)
        return
      }

      // Second key after g — navigate
      if (gModeRef.current) {
        clearTimeout(gTimerRef.current)
        gModeRef.current = false
        setGActive(false)
        const dest = keymap[e.key.toLowerCase()]
        if (dest) {
          e.preventDefault()
          navigate({ to: dest })
        }
        return
      }

    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <style>{`
        @keyframes signFall {
          0%   { opacity: 0; transform: translateY(-20px) rotate(-2deg) }
          55%  { transform: translateY(6px) rotate(0.6deg) }
          75%  { transform: translateY(-3px) rotate(0deg) }
          100% { opacity: 1; transform: translateY(0) rotate(0deg) }
        }
        @keyframes gModePop {
          from { opacity: 0; transform: translateY(8px) scale(0.94) }
          to   { opacity: 1; transform: translateY(0)  scale(1) }
        }
      `}</style>

      {/* ── Crossed grid background ──────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
        }}
      />


      {/* ── 56px sticky top bar ─────────────────────────────────────────────── */}
      <div className="hub-topbar" style={{ padding: '0 20px', gap: '0', position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL }}>rocket_launch</span>
          <span style={{ fontWeight: 900, fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Study<span style={{ color: CORAL }}>WithStudents</span>
          </span>
        </Link>

        {/* Page title — truly centred via absolute positioning */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          {pageTitle && (
            <div
              key={pageTitle}
              style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '12px',
                padding: '5px 14px 5px 7px',
                backdropFilter: 'blur(8px)',
                animation: 'signFall 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
                whiteSpace: 'nowrap',
              }}
            >
              {pageIcon && (
                <div style={{
                  width: '26px', height: '26px', borderRadius: '8px',
                  background: `${CORAL}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: CORAL }}>{pageIcon}</span>
                </div>
              )}
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {pageTitle}
              </span>
            </div>
          )}
        </div>

        {/* Spacer — pushes right-side controls to the right */}
        <div style={{ flex: 1 }} />

        {/* Shortcut hint */}
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

        {/* Mode switch */}
        {(() => {
          const isTutor = mode === 'tutor'
          const btnBg  = isTutor ? 'rgba(255,255,255,0.08)' : 'rgba(255,114,94,0.12)'
          const btnBdr = isTutor ? 'rgba(255,255,255,0.18)' : 'rgba(255,114,94,0.25)'
          const btnClr = isTutor ? 'rgba(255,255,255,0.82)' : CORAL
          return (
            <button
              onClick={toggleMode}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: btnBg, border: `1px solid ${btnBdr}`,
                borderRadius: '20px', padding: '4px 14px', cursor: 'pointer', marginRight: '12px', transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = isTutor ? 'rgba(255,255,255,0.14)' : 'rgba(255,114,94,0.20)'}
              onMouseLeave={e => e.currentTarget.style.background = btnBg}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: btnClr }}>swap_horiz</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: btnClr }}>
                {isTutor ? 'Student View' : 'Tutor View'}
              </span>
            </button>
          )
        })()}

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
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)', position: 'relative', zIndex: 1 }}>
        <Sidebar mode={mode} />
        <main style={{ flex: 1, height: '100%', overflowY: noScroll ? 'hidden' : 'auto', minWidth: 0 }}>
          {raw ? children : (
            <div style={{
              maxWidth: '1200px', margin: '0 auto', padding: '20px 24px',
              minHeight: noScroll ? undefined : '100%',
              boxSizing: 'border-box',
              ...(noScroll ? { height: '100%' } : {}),
            }}>
              {children}
            </div>
          )}
        </main>
      </div>

      {/* ── Keyboard shortcut help overlay ────────────────────────────────────── */}
      {showHelp && <ShortcutHelp mode={mode} onClose={() => setShowHelp(false)} />}

      {/* ── g-mode indicator ──────────────────────────────────────────────────── */}
      {gActive && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: 'rgba(22,31,48,0.97)',
          border: `1px solid ${CORAL}45`,
          borderRadius: '14px', padding: '10px 18px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          animation: 'gModePop 0.15s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <Kbd>g</Kbd>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>→</span>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', fontWeight: '600' }}>type a key to navigate</span>
        </div>
      )}
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
