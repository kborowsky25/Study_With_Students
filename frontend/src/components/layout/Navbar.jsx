import { Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < 60) { setVisible(true); lastY.current = y; return }
      setVisible(y < lastY.current)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleLogout() {
    logout()
    navigate({ to: '/' })
  }

  const linkStyle = {
    color: 'rgba(255,255,255,0.65)',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'color 0.2s',
  }

  return (
    <>
    {/* spacer keeps layout from jumping when nav is fixed */}
    <div style={{ height: '64px', flexShrink: 0 }} />
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'rgba(27,38,59,0.93)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      transition: 'transform 0.30s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
      }}>

        {/* ── Left nav links (desktop) ── */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '28px' }}>
          <Link
            to="/how-it-works"
            style={linkStyle}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
          >
            How It Works
          </Link>
          <Link
            to="/about"
            style={linkStyle}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
          >
            About Us
          </Link>
          <Link
            to="/become-tutor"
            style={linkStyle}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
          >
            Become a Tutor
          </Link>
        </div>

        {/* ── Logo — absolutely centered ── */}
        <Link
          to="/"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '26px', color: '#ff725e' }}
          >
            rocket_launch
          </span>
          <span style={{ fontWeight: 900, fontSize: '18px', color: 'white', letterSpacing: '-0.02em' }}>
            Study<span style={{ color: '#ff725e' }}>WithStudents</span>
          </span>
        </Link>

        {/* ── Right: theme + auth (desktop) ── */}
        <div className="hidden md:flex" style={{ marginLeft: 'auto', alignItems: 'center', gap: '12px' }}>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)' }}
            >
              {dark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {isAuthenticated ? (
            <>
              <Link to="/hub" className="btn-secondary" style={{ fontSize: '13px', padding: '6px 16px', color: '#fff', background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)' }}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className="btn-outline" style={{ fontSize: '13px', padding: '6px 16px' }}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
              >
                Log in
              </Link>
              <Link to="/signup" className="btn-primary" style={{ fontSize: '13px', padding: '7px 18px' }}>
                Get started
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '26px', color: 'rgba(255,255,255,0.7)' }}>
            {mobileOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div
          className="md:hidden animate-fade-in"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(22,31,48,0.98)',
            padding: '16px 24px 20px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
            {[
              { to: '/how-it-works', label: 'How It Works' },
              { to: '/about',        label: 'About Us' },
              { to: '/become-tutor', label: 'Become a Tutor' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                style={{ padding: '10px 12px', borderRadius: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: '500', textDecoration: 'none' }}
              >
                {label}
              </Link>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isAuthenticated ? (
              <>
                <Link to="/hub"  onClick={() => setMobileOpen(false)} className="btn-secondary" style={{ textAlign: 'center' }}>Dashboard</Link>
                <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="btn-outline">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login"  onClick={() => setMobileOpen(false)} className="btn-secondary" style={{ textAlign: 'center' }}>Log in</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="btn-primary"   style={{ textAlign: 'center' }}>Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
    </>
  )
}
