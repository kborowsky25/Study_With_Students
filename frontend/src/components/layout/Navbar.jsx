import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Icon } from '../ui'
import { Logo } from '../brand/Logo'

// Public-site navbar, as on the original homepage: logo, three links, Sign up + Log in.
// Styles: styles/marketing.css (.mk-nav).

const LINKS = [
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

  const actions = isAuthenticated ? (
    <>
      <Link to="/hub" className="mk-btn mk-btn-coral mk-btn-sm mk-nav-cta" onClick={close}>Dashboard</Link>
      <button type="button" className="mk-btn mk-btn-slate mk-btn-sm mk-nav-cta" onClick={handleLogout}>Log out</button>
    </>
  ) : (
    <>
      <Link to="/signup" className="mk-btn mk-btn-coral mk-btn-sm mk-nav-cta" onClick={close}>Sign up</Link>
      <Link to="/login" className="mk-btn mk-btn-slate mk-btn-sm mk-nav-cta" onClick={close}>Log in</Link>
    </>
  )

  return (
    <header className={`mk-nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="mk-container mk-nav-inner">
        <Link to="/" className="mk-logo" onClick={close} aria-label="Study with Students, home">
          <Logo size={28} />
        </Link>

        <nav className="mk-nav-links" aria-label="Main">{links}</nav>

        <div className="mk-nav-actions">
          <button
            type="button"
            className="mk-icon-btn"
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            <Icon name={dark ? 'light_mode' : 'dark_mode'} />
          </button>
          {actions}
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
            <div className="mk-mobile-actions">{actions}</div>
          </div>
        </div>
      )}
    </header>
  )
}
