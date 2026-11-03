import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Icon } from '../ui'
import { Logo } from '../brand/Logo'

// Public-site navbar: logo, four links, the theme switch, Log in and Sign up (or the
// dashboard once signed in). Below 900px the links move into a menu.
// Styles: styles/marketing.css (.mk-nav).

const LINKS = [
  { to: '/tutors',       label: 'Find a tutor' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about',        label: 'About us' },
  { to: '/become-tutor', label: 'Become a tutor' },
]

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => setOpen(false)

  function handleLogout() {
    logout()
    close()
    navigate({ to: '/' })
  }

  const links = LINKS.map(({ to, label }) => (
    <Link key={to} to={to} className="mk-nav-link" activeProps={{ className: 'is-active' }} onClick={close}>
      {label}
    </Link>
  ))

  const themeLabel = dark ? 'Switch to light mode' : 'Switch to dark mode'
  const primary = isAuthenticated
    ? <Link to="/hub" className="mk-btn mk-btn-primary mk-btn-sm" onClick={close}>Dashboard</Link>
    : <Link to="/signup" className="mk-btn mk-btn-primary mk-btn-sm" onClick={close}>Sign up</Link>
  const secondary = isAuthenticated
    ? <button type="button" className="mk-nav-text" onClick={handleLogout}>Log out</button>
    : <Link to="/login" className="mk-nav-text" onClick={close}>Log in</Link>

  return (
    <header className={`mk-nav${scrolled || open ? ' is-raised' : ''}`}>
      <div className="mk-container mk-nav-inner">
        <Link to="/" className="mk-logo" onClick={close} aria-label="Study with Students, home">
          <Logo size={22} />
        </Link>

        <nav className="mk-nav-links" aria-label="Main">{links}</nav>

        <div className="mk-nav-actions">
          <button type="button" className="mk-icon-btn mk-theme-btn" onClick={toggle} aria-label={themeLabel} title={themeLabel}>
            <Icon name={dark ? 'light_mode' : 'dark_mode'} />
          </button>
          {secondary}
          <span className="mk-nav-cta">{primary}</span>
          <button
            type="button"
            className="mk-icon-btn mk-menu-btn"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mk-mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {open && (
        <div id="mk-mobile-menu" className="mk-mobile-menu">
          <div className="mk-container">
            <nav aria-label="Main">{links}</nav>
            {/* The bar keeps Sign up (or Dashboard); the menu repeats it only where the bar hides it */}
            <div className="mk-mobile-foot">
              {isAuthenticated ? (
                <>
                  <Link to="/hub" className="mk-btn mk-btn-primary mk-menu-primary" onClick={close}>Dashboard</Link>
                  <button type="button" className="mk-btn mk-btn-ghost" onClick={handleLogout}>Log out</button>
                </>
              ) : (
                <>
                  <Link to="/signup" className="mk-btn mk-btn-primary mk-menu-primary" onClick={close}>Sign up</Link>
                  <Link to="/login" className="mk-btn mk-btn-ghost" onClick={close}>Log in</Link>
                </>
              )}
              <button type="button" className="mk-btn mk-btn-ghost" onClick={toggle}>
                <Icon name={dark ? 'light_mode' : 'dark_mode'} />{dark ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
