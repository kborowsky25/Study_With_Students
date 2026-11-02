import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { PageTitleProvider, usePageTitleCtx } from '../../context/PageTitleContext'
import { useUnreadCount } from '../../hooks/useUnreadCount'
import { flatNav, matchNav } from '../../lib/navigation'
import { Icon, Kbd } from '../ui'
import CommandPalette from './CommandPalette'
import Sidebar, { SIDEBAR_MAX, SIDEBAR_MIN } from './Sidebar'

const MODE_KEY = 'sws_hub_mode'
const WIDTH_KEY = 'sws_sidebar_w'
const COLLAPSED_KEY = 'sws_sidebar_collapsed'
const DEFAULT_WIDTH = 248

const readNumber = (key, fallback) => {
  try { return Number(localStorage.getItem(key)) || fallback } catch { return fallback }
}
const clampWidth = (w) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(w)))

function ShortcutHelp({ mode, onClose }) {
  const rows = [
    { label: 'Search', keys: ['⌘', 'K'] },
    { label: 'Hide / show sidebar', keys: ['['] },
    ...flatNav(mode).map((i) => ({ label: i.label, keys: ['g', i.key] })),
  ]
  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="dialog-head">
          <h2>Shortcuts</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="dialog-body" style={{ gap: 2 }}>
          {rows.map(({ label, keys }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '6px 0' }}>
              {label}
              <span style={{ display: 'flex', gap: 4 }}>{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function useStreak() {
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
      const s = JSON.parse(localStorage.getItem('sws_streak') || '{"count":1,"last":""}')
      if (s.last === today) return
      localStorage.setItem('sws_streak', JSON.stringify({ count: s.last === yesterday ? s.count + 1 : 1, last: today }))
    } catch { /* storage unavailable */ }
  }, [])
}

function HubInner({ children, initialMode, raw, noScroll }) {
  const { user } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { title: pageTitle, icon: pageIcon } = usePageTitleCtx()
  const unread = useUnreadCount()
  useStreak()

  const [mode, setMode] = useState(() => {
    if (!user?.is_tutor) return 'student'
    return initialMode ?? localStorage.getItem(MODE_KEY) ?? 'student'
  })
  const [width, setWidth] = useState(() => clampWidth(readNumber(WIDTH_KEY, DEFAULT_WIDTH)))
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1')
  const [resizing, setResizing] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const [help, setHelp] = useState(false)
  const goto = useRef({ active: false, timer: null })

  useEffect(() => { if (initialMode && user?.is_tutor) setMode(initialMode) }, [initialMode, user?.is_tutor])
  useEffect(() => { localStorage.setItem(MODE_KEY, mode) }, [mode])
  useEffect(() => { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0') }, [collapsed])
  useEffect(() => { setDrawer(false) }, [pathname])

  const switchMode = useCallback((next) => {
    setMode(next)
    navigate({ to: next === 'tutor' ? '/hub/tutor' : '/hub/student' })
  }, [navigate])

  // Drag the sidebar edge to resize; double-click resets
  const startResize = useCallback((e) => {
    if (!e) { setWidth(DEFAULT_WIDTH); localStorage.setItem(WIDTH_KEY, DEFAULT_WIDTH); return }
    e.preventDefault()
    setResizing(true)
    let latest = width
    const onMove = (ev) => { latest = clampWidth(ev.clientX); setWidth(latest) }
    const onUp = () => {
      setResizing(false)
      localStorage.setItem(WIDTH_KEY, latest)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width])

  // ⌘K search, [ sidebar, ? help, and "g then key" navigation
  useEffect(() => {
    const keymap = Object.fromEntries(flatNav(mode).map((i) => [i.key, i.to]))
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); return }
      const t = e.target
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '[') { e.preventDefault(); setCollapsed((v) => !v); return }
      if (e.key === '?') { e.preventDefault(); setHelp((v) => !v); return }
      if (e.key === 'Escape') { setHelp(false); return }
      const g = goto.current
      if (g.active) {
        g.active = false
        clearTimeout(g.timer)
        const dest = keymap[e.key.toLowerCase()]
        if (dest) { e.preventDefault(); navigate({ to: dest }) }
        return
      }
      if (e.key.toLowerCase() === 'g') {
        g.active = true
        g.timer = setTimeout(() => { g.active = false }, 1200)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, navigate])

  const match = matchNav(mode, pathname)
  const title = pageTitle || match?.item.label || ''
  const icon = pageIcon || match?.item.icon

  return (
    <div className="shell">
      <Sidebar
        mode={mode}
        width={width}
        collapsed={collapsed}
        open={drawer}
        resizing={resizing}
        onResizeStart={startResize}
        onCollapse={() => setCollapsed(true)}
        onClose={() => setDrawer(false)}
        onSwitchMode={switchMode}
        onOpenPalette={() => { setDrawer(false); setPalette(true) }}
        unread={unread}
      />

      <div className="shell-main">
        <header className="shell-header">
          <button
            className="icon-btn"
            onClick={() => (window.innerWidth <= 900 ? setDrawer(true) : setCollapsed(false))}
            aria-label="Show sidebar"
            title="Show sidebar ( [ )"
            style={{ display: collapsed ? undefined : 'var(--menu-btn-display, none)' }}
            data-menu-btn
          >
            <Icon name={collapsed ? 'sidebar' : 'menu'} />
          </button>
          <div className="shell-title">
            {icon && <Icon name={icon} className="title-icon" />}
            <span>{title}</span>
          </div>
          <div style={{ flex: 1 }} />
          <Link to="/messages" className="icon-btn" title="Messages" aria-label="Messages">
            <Icon name="chat" />
            {unread > 0 && <span className="dot" />}
          </Link>
          <button className="icon-btn" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'} aria-label="Toggle theme">
            <Icon name={dark ? 'light_mode' : 'dark_mode'} />
          </button>
        </header>

        <main className={`shell-scroll ${noScroll ? 'no-scroll' : ''}`}>
          {raw ? children : <div className={`shell-content ${noScroll ? 'fill' : ''}`}>{children}</div>}
        </main>
      </div>

      {palette && <CommandPalette mode={mode} onClose={() => setPalette(false)} onSwitchMode={switchMode} />}
      {help && <ShortcutHelp mode={mode} onClose={() => setHelp(false)} />}
    </div>
  )
}

export default function HubLayout(props) {
  return (
    <PageTitleProvider>
      <HubInner {...props} />
    </PageTitleProvider>
  )
}
