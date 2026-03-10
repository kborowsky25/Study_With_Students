import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate({ to: '/' })
  }

  return (
    <nav className="sticky top-0 z-50 bg-navy-500/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">
              Study<span className="text-coral-400">WithStudents</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/about"       className="text-white/70 hover:text-white transition-colors font-medium">About</Link>
            <Link to="/how-it-works"className="text-white/70 hover:text-white transition-colors font-medium">How It Works</Link>
            <Link to="/become-tutor"className="text-white/70 hover:text-white transition-colors font-medium">Become a Tutor</Link>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/hub" className="btn-secondary text-sm py-2">Dashboard</Link>
                <button onClick={handleLogout} className="btn-outline text-sm py-2">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login"  className="text-white/70 hover:text-white font-medium transition-colors">Log in</Link>
                <Link to="/signup" className="btn-primary text-sm py-2">Get started</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-navy-600/95 backdrop-blur-md animate-fade-in">
          <div className="px-4 py-4 space-y-2">
            <Link to="/about"        onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 font-medium">About</Link>
            <Link to="/how-it-works" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 font-medium">How It Works</Link>
            <Link to="/become-tutor" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 font-medium">Become a Tutor</Link>
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link to="/hub" onClick={() => setMobileOpen(false)} className="btn-secondary text-center">Dashboard</Link>
                  <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="btn-outline">Log out</button>
                </>
              ) : (
                <>
                  <Link to="/login"  onClick={() => setMobileOpen(false)} className="btn-secondary text-center">Log in</Link>
                  <Link to="/signup" onClick={() => setMobileOpen(false)} className="btn-primary text-center">Get started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
