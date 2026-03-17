import { useState, useEffect } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'

const CORAL = '#ff725e'
const BLUE  = '#60a5fa'
const BG    = '#1b263b'

export default function Hub() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      height: '100vh', width: '100vw',
      backgroundColor: BG,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '"Noto Sans JP", sans-serif',
      position: 'relative',
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dividerGrow {
          from { scaleY: 0; opacity: 0; }
          to   { scaleY: 1; opacity: 1; }
        }
      `}</style>

      {/* ── Full-page grid ─────────────────────────────────────────────── */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, black 20%, transparent 80%)',
      }} />

      {/* ── Ambient glows ─────────────────────────────────────────────── */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-5%', left: '5%', width: '45vw', height: '60vh', borderRadius: '50%', background: `radial-gradient(circle, ${CORAL}07 0%, transparent 70%)`, filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '5%', width: '45vw', height: '60vh', borderRadius: '50%', background: `radial-gradient(circle, ${BLUE}07 0%, transparent 70%)`, filter: 'blur(60px)' }} />
      </div>

      {/* ── Top nav ────────────────────────────────────────────────────── */}
      <nav style={{
        height: '52px', flexShrink: 0,
        background: 'rgba(27,38,59,0.80)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', zIndex: 10, position: 'relative',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '20px' }}>rocket_launch</span>
          <span style={{ fontWeight: 900, fontSize: '14px', color: 'white', letterSpacing: '-0.01em' }}>
            Study<span style={{ color: CORAL }}>WithStudents</span>
          </span>
        </Link>

        {user && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
              Hey, {user.name?.split(' ')[0]}
            </span>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: `${CORAL}20`, border: `1.5px solid ${CORAL}45`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 800, color: CORAL,
            }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
          </div>
        )}
      </nav>

      {/* ── Heading ───────────────────────────────────────────────────── */}
      <div style={{
        textAlign: 'center',
        padding: '32px 0 16px',
        position: 'relative', zIndex: 1,
        animation: mounted ? 'fadeUp 0.45s ease both' : 'none',
        opacity: mounted ? undefined : 0,
      }}>
        <p style={{
          fontSize: '10px', fontWeight: 700,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          Choose your view
        </p>
        <h1 style={{
          fontSize: 'clamp(22px, 2.8vw, 32px)',
          fontWeight: 900, letterSpacing: '-0.025em',
          color: 'white', margin: 0,
        }}>
          Where are you heading?
        </h1>
      </div>

      {/* ── Split panels ──────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative', zIndex: 1,
        padding: '8px 20px 20px',
        gap: 0,
      }}>

        <HubPanel
          label="Student"
          subtitle="Find your perfect tutor and book sessions"
          img="/static/images/hub/students.svg"
          features={['Find peer tutors', 'Book sessions', 'Study rooms', 'Forum']}
          accentColor={CORAL}
          mounted={mounted}
          animDelay="0.05s"
          onClick={() => navigate({ to: '/hub/student' })}
          side="left"
        />

        {/* Center divider */}
        <div aria-hidden="true" style={{
          width: '1px',
          alignSelf: 'stretch',
          margin: '40px 0',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.10) 70%, transparent 100%)',
          flexShrink: 0,
          position: 'relative',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.6s ease 0.3s',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '28px', height: '28px',
            borderRadius: '50%',
            background: BG,
            border: '1px solid rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', color: 'rgba(255,255,255,0.25)',
            fontWeight: 700, letterSpacing: '0.05em',
          }}>
            or
          </div>
        </div>

        <HubPanel
          label="Tutor"
          subtitle="Share knowledge and earn 100% commission-free"
          img="/static/images/hub/tutor.svg"
          features={['0% commission', 'Set your rates', 'Manage students', 'Earn XP']}
          accentColor={BLUE}
          mounted={mounted}
          animDelay="0.12s"
          onClick={() => navigate({ to: '/hub/tutor' })}
          side="right"
        />
      </div>
    </div>
  )
}

function HubPanel({ label, subtitle, img, features, accentColor, onClick, mounted, animDelay, side }) {
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
        padding: '28px 32px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        margin: side === 'left' ? '0 8px 0 0' : '0 0 0 8px',
        border: `1px solid ${hovered ? accentColor + '30' : 'rgba(255,255,255,0.06)'}`,
        background: hovered ? `${accentColor}08` : 'rgba(255,255,255,0.015)',
        backdropFilter: 'blur(12px)',
        transition: 'border-color 0.35s ease, background 0.35s ease, box-shadow 0.35s ease',
        boxShadow: hovered ? `0 24px 64px ${accentColor}14` : 'none',
        animation: mounted ? `panelIn 0.5s ease ${animDelay} both` : 'none',
        opacity: mounted ? undefined : 0,
      }}
    >
      {/* Panel grid overlay */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '20px',
        backgroundImage: `linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        maskImage: `radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 100%)`,
        WebkitMaskImage: `radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 100%)`,
        opacity: hovered ? 0.7 : 0.3,
        transition: 'opacity 0.4s ease',
      }} />

      {/* Corner "Enter →" badge */}
      <div style={{
        position: 'absolute', top: '14px', right: '14px',
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.85)',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        background: accentColor,
        borderRadius: '20px', padding: '3px 10px',
        fontSize: '10px', fontWeight: 800, color: 'white', letterSpacing: '0.05em',
      }}>
        Enter →
      </div>

      {/* Radial glow on hover */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, -50%) scale(${hovered ? 1.1 : 0.2})`,
        width: '400px', height: '400px',
        background: `radial-gradient(ellipse, ${accentColor}12 0%, transparent 65%)`,
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0,
        transition: 'transform 0.6s ease, opacity 0.4s ease',
      }} />

      {/* Illustration */}
      <div style={{
        width: 'clamp(140px, 18vw, 200px)',
        height: 'clamp(140px, 18vw, 200px)',
        backgroundImage: `url(${img})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        marginBottom: '20px',
        transform: hovered ? 'scale(1.07) translateY(-8px)' : 'scale(1) translateY(0)',
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        filter: hovered
          ? `drop-shadow(0 16px 32px ${accentColor}30)`
          : 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))',
      }} />

      {/* Label */}
      <h2 style={{
        fontSize: 'clamp(32px, 4vw, 52px)',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        color: hovered ? accentColor : 'rgba(255,255,255,0.88)',
        marginBottom: '4px',
        transition: 'color 0.3s ease, transform 0.35s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}>
        {label}
      </h2>

      {/* Subtitle */}
      <p style={{
        color: 'rgba(255,255,255,0.35)',
        fontSize: '12px',
        textAlign: 'center',
        maxWidth: '220px',
        lineHeight: 1.7,
        marginBottom: '18px',
        transition: 'color 0.3s ease, transform 0.35s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}>
        {subtitle}
      </p>

      {/* Feature pills */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center',
        marginBottom: '24px',
        opacity: hovered ? 1 : 0.2,
        transform: hovered ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.3s ease, transform 0.35s ease',
      }}>
        {features.map(f => (
          <span key={f} style={{
            fontSize: '10px', fontWeight: 600,
            color: hovered ? accentColor : 'rgba(255,255,255,0.50)',
            background: hovered ? `${accentColor}12` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${hovered ? accentColor + '30' : 'rgba(255,255,255,0.08)'}`,
            padding: '3px 10px', borderRadius: '20px',
            transition: 'all 0.3s ease',
            letterSpacing: '0.02em',
          }}>
            {f}
          </span>
        ))}
      </div>

      {/* CTA button */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        background: hovered ? accentColor : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hovered ? accentColor : 'rgba(255,255,255,0.10)'}`,
        borderRadius: '40px',
        padding: '9px 22px',
        color: 'white',
        fontSize: '13px', fontWeight: 700,
        letterSpacing: '-0.01em',
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        transform: hovered ? 'translateY(-3px) scale(1.04)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? `0 8px 24px ${accentColor}38` : 'none',
      }}>
        Enter {label} Hub
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
      </div>
    </div>
  )
}
