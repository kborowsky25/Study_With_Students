import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { flatNav, switchableModes } from '../../lib/navigation'
import { Icon, Kbd } from '../ui'

/** ⌘K — jump to any page or run a quick action. */
export default function CommandPalette({ mode, onClose, onSwitchMode }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef(null)

  const commands = useMemo(() => {
    const go = (to) => () => navigate({ to })
    const pages = flatNav(mode).map((item) => ({
      group: 'Go to', icon: item.icon, label: item.label, hint: `g ${item.key}`, run: go(item.to),
    }))
    const actions = [
      mode === 'student' && { icon: 'person_search', label: 'Find a tutor', run: go('/find-tutors') },
      mode === 'student' && { icon: 'event_available', label: 'Book a session', run: go('/active-tutors') },
      { icon: 'edit_square', label: 'New message', run: go('/messages') },
      { icon: dark ? 'light_mode' : 'dark_mode', label: dark ? 'Switch to light mode' : 'Switch to dark mode', run: toggle },
      ...switchableModes(user).filter((m) => m !== mode).map((m) => ({
        icon: 'swap_horiz', label: `Switch to ${m} view`, run: () => onSwitchMode(m),
      })),
      { icon: 'logout', label: 'Log out', run: () => { logout(); navigate({ to: '/login' }) } },
    ].filter(Boolean).map((a) => ({ group: 'Actions', ...a }))
    return [...pages, ...actions]
  }, [mode, dark, user, navigate, toggle, logout, onSwitchMode])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().startsWith(q))
  }, [commands, query])

  useEffect(() => setIndex(0), [query])

  useEffect(() => {
    listRef.current?.querySelector('.palette-item.on')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  function run(cmd) {
    onClose()
    cmd?.run()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[index]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  let lastGroup = null
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="dialog palette" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="palette-input">
          <Icon name="search" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions…"
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="palette-list" ref={listRef}>
          {results.length === 0 && <div className="palette-empty">Nothing matches “{query}”.</div>}
          {results.map((cmd, i) => {
            const header = cmd.group !== lastGroup ? <div className="palette-group">{cmd.group}</div> : null
            lastGroup = cmd.group
            return (
              <div key={`${cmd.group}-${cmd.label}`}>
                {header}
                <div
                  className={`palette-item ${i === index ? 'on' : ''}`}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => run(cmd)}
                >
                  <Icon name={cmd.icon} />
                  <span className="grow">{cmd.label}</span>
                  {cmd.hint && <span style={{ display: 'flex', gap: 3 }}>{cmd.hint.split(' ').map((k) => <Kbd key={k}>{k}</Kbd>)}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div className="palette-foot">
          <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> to move</span>
          <span><Kbd>↵</Kbd> to open</span>
          <span style={{ marginLeft: 'auto' }}><Kbd>?</Kbd> all shortcuts</span>
        </div>
      </div>
    </div>
  )
}
