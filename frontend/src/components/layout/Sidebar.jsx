import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { navFor } from '../../lib/navigation'
import { prefetchRoute } from '../../lib/queries'
import { LogoMark } from '../brand/Logo'
import { Avatar, Icon } from '../ui'

export const SIDEBAR_MIN = 208
export const SIDEBAR_MAX = 360

function UserMenu({ mode, onClose }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const ref = useRef(null)

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [onClose])

  const go = (to) => () => { onClose(); navigate({ to }) }

  return (
    <div className="menu" ref={ref} style={{ bottom: 'calc(100% + 8px)', left: 0, right: 0 }}>
      <button className="menu-item" onClick={go(mode === 'tutor' ? '/tutor-profile' : `/student/${user?.id}`)}><Icon name="person" />Your profile</button>
      {!user?.is_tutor && <button className="menu-item" onClick={go('/become-tutor')}><Icon name="school" />Become a tutor</button>}
      <button className="menu-item" onClick={toggle}><Icon name={dark ? 'light_mode' : 'dark_mode'} />{dark ? 'Light mode' : 'Dark mode'}</button>
      {user?.is_admin && <button className="menu-item" onClick={go('/superadmin')}><Icon name="admin_panel_settings" />Admin</button>}
      <div className="menu-sep" />
      <button className="menu-item danger" onClick={() => { logout(); navigate({ to: '/login' }) }}><Icon name="logout" />Log out</button>
    </div>
  )
}

export default function Sidebar({
  mode, width, collapsed, open, resizing, onResizeStart, onCollapse, onClose, onSwitchMode, onOpenPalette, unread,
}) {
  const { user } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)
  const canTutor = user?.is_tutor && user?.screening_status === 'approved'

  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`)

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''} ${resizing ? 'resizing' : ''}`}
        style={{ width, '--sidebar-w': `${width}px` }}
        aria-hidden={collapsed && !open}
      >
        <div className="sidebar-top">
          <Link to="/" className="sidebar-brand">
            <LogoMark size={18} />
            <span>Study with <em>Students</em></span>
          </Link>
          <button className="icon-btn" onClick={onOpenPalette} title="Search (⌘K)" aria-label="Search"><Icon name="search" /></button>
          <button className="icon-btn hide-mobile" onClick={onCollapse} title="Hide sidebar ( [ )" aria-label="Hide sidebar"><Icon name="sidebar" /></button>
        </div>

        <nav className="sidebar-scroll">
          {navFor(mode).map((group, i) => (
            <div className="sidebar-group" key={group.title ?? i}>
              {group.title && (
                <div className="sidebar-label"><span>{group.title}</span></div>
              )}
              {group.items.map((item) => {
                const badge = item.badge === 'unread' ? unread : 0
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
                    data-tour={item.tour}
                    onMouseEnter={() => prefetchRoute(item.to)}
                    onClick={onClose}
                  >
                    <Icon name={item.icon} />
                    <span className="grow">{item.label}</span>
                    {badge > 0 && <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">

          {canTutor && (
            <button className="mode-btn" onClick={() => onSwitchMode(mode === 'tutor' ? 'student' : 'tutor')}>
              <Icon name="swap_horiz" size={18} />
              {mode === 'tutor' ? 'Switch to student mode' : 'Switch to tutor mode'}
            </button>
          )}

          <div style={{ position: 'relative' }}>
            {menuOpen && <UserMenu mode={mode} onClose={() => setMenuOpen(false)} />}
            <button className="user-row" onClick={() => setMenuOpen((v) => !v)}>
              <Avatar name={user?.name} size={32} />
              <span className="who">
                <div className="name">{user?.name}</div>
                <div className="sub">{mode === 'tutor' ? 'Tutor' : 'Student'}</div>
              </span>
              <Icon name="unfold_more" size={16} />
            </button>
          </div>
        </div>

        <div className="sidebar-resizer" onMouseDown={onResizeStart} onDoubleClick={() => onResizeStart(null)} title="Drag to resize" />
      </aside>
    </>
  )
}
