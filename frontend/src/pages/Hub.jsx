import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'

export default function Hub() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  return (
    <div style={{
      height: '100vh', width: '100vw',
      backgroundColor: '#1b263b',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '"Noto Sans JP", sans-serif',
    }}>

      {/* ── Thin top bar ─────────────────────────────────────────────── */}
      <nav style={{
        height: '56px',
        background: 'rgba(27,38,59,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center',
        padding: '0 28px',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ color: '#ff725e', fontSize: '22px' }}>rocket_launch</span>
          <span style={{ fontWeight: 900, fontSize: '15px', color: 'white', letterSpacing: '-0.01em' }}>
            Study<span style={{ color: '#ff725e' }}>WithStudents</span>
          </span>
        </Link>

        {user && (
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.42)', fontSize: '13px' }}>
            Welcome back,{' '}
            <strong style={{ color: 'rgba(255,255,255,0.70)', fontWeight: '700' }}>
              {user.name?.split(' ')[0]}
            </strong>
          </span>
        )}
      </nav>

      {/* ── Split panels ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        <HubPanel
          label="STUDENT"
          subtitle="Browse tutors, book sessions & join study rooms"
          img="/static/images/hub/students.svg"
          features={['Find peer tutors', 'Join study rooms', 'Student forum']}
          onClick={() => navigate({ to: '/hub/student' })}
        />

        {/* Centre divider */}
        <div style={{
          width: '1px',
          flexShrink: 0,
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.10) 20%, rgba(255,255,255,0.10) 80%, transparent)',
          zIndex: 1,
        }} />

        <HubPanel
          label="TUTOR"
          subtitle="Share your knowledge & earn 100% commission-free"
          img="/static/images/hub/tutor.svg"
          features={['0% commission', 'Set your own rates', 'Manage students']}
          onClick={() => navigate({ to: '/hub/tutor' })}
        />
      </div>
    </div>
  )
}

function HubPanel({ label, subtitle, img, features, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 48px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        background: hovered ? 'rgba(255,114,94,0.06)' : 'transparent',
        transition: 'background 0.4s ease',
      }}
    >
      {/* Background radial glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, -50%) scale(${hovered ? 1 : 0.4})`,
        width: '500px', height: '500px',
        background: 'radial-gradient(ellipse, rgba(255,114,94,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0,
        transition: 'transform 0.5s ease, opacity 0.4s ease',
      }} />

      {/* SVG illustration */}
      <div style={{
        width: '240px', height: '240px',
        backgroundImage: `url(${img})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        marginBottom: '28px',
        transform: hovered ? 'scale(1.06) translateY(-8px)' : 'scale(1) translateY(0)',
        transition: 'transform 0.5s ease',
        filter: hovered ? 'drop-shadow(0 16px 36px rgba(255,114,94,0.22))' : 'none',
      }} />

      {/* Label */}
      <h2 style={{
        fontSize: 'clamp(30px, 3.5vw, 50px)',
        fontWeight: 900,
        letterSpacing: '0.04em',
        color: hovered ? '#ff725e' : 'rgba(255,255,255,0.88)',
        marginBottom: '8px',
        transition: 'color 0.3s ease, transform 0.3s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}>
        {label}
      </h2>

      {/* Subtitle */}
      <p style={{
        color: 'rgba(255,255,255,0.40)',
        fontSize: '13px',
        textAlign: 'center',
        maxWidth: '260px',
        lineHeight: 1.65,
        marginBottom: '18px',
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 0.3s ease',
      }}>
        {subtitle}
      </p>

      {/* Feature pills */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center',
        marginBottom: '24px',
        opacity: hovered ? 1 : 0.30,
        transition: 'opacity 0.3s ease',
      }}>
        {features.map(f => (
          <span key={f} style={{
            fontSize: '11px', fontWeight: '600',
            color: hovered ? '#ff725e' : 'rgba(255,255,255,0.55)',
            background: hovered ? 'rgba(255,114,94,0.12)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${hovered ? 'rgba(255,114,94,0.30)' : 'rgba(255,255,255,0.10)'}`,
            padding: '4px 12px', borderRadius: '20px',
            transition: 'all 0.3s ease',
          }}>
            {f}
          </span>
        ))}
      </div>

      {/* Enter button */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: hovered ? '#ff725e' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${hovered ? '#ff725e' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: '40px',
        padding: '10px 24px',
        color: 'white',
        fontSize: '14px', fontWeight: '700',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(255,114,94,0.35)' : 'none',
      }}>
        Enter {label.charAt(0) + label.slice(1).toLowerCase()} Hub
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
      </div>
    </div>
  )
}
