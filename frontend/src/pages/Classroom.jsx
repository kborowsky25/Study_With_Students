import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'react-hot-toast'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import PaywallGate from '../components/features/PaywallGate'
import { useAuth } from '../context/AuthContext'

const CORAL = '#ff725e'

const PLACEHOLDER_ROOMS = [
  {
    id: 1,
    subject: 'Advanced Calculus',
    icon: 'calculate',
    tutor: 'Dr. S. Mitchell',
    joined: 8,
    max: 20,
    status: 'live',
    statusLabel: 'Live Now',
    color: '#34d399',
  },
  {
    id: 2,
    subject: 'Organic Chemistry',
    icon: 'science',
    tutor: 'Ms. A. Patel',
    joined: 14,
    max: 20,
    status: 'soon',
    statusLabel: 'Starting in 12m',
    color: '#fbbf24',
  },
  {
    id: 3,
    subject: 'Machine Learning',
    icon: 'model_training',
    tutor: 'Mr. J. Okafor',
    joined: 5,
    max: 20,
    status: 'live',
    statusLabel: 'Live Now',
    color: '#34d399',
  },
  {
    id: 4,
    subject: 'Essay Writing',
    icon: 'edit_note',
    tutor: 'Dr. R. Clarke',
    joined: 11,
    max: 20,
    status: 'soon',
    statusLabel: 'Starting in 30m',
    color: '#fbbf24',
  },
]

const HOW_IT_WORKS = [
  {
    icon: 'cast_for_education',
    title: 'Live Instruction',
    desc: 'Tutors broadcast in real-time to up to 20 students at once',
  },
  {
    icon: 'group',
    title: 'Interactive Q&A',
    desc: 'Raise your hand, answer polls, and collaborate on problems together',
  },
  {
    icon: 'payments',
    title: 'Fair Pricing',
    desc: 'Split session costs across all attendees — a fraction of 1-to-1 cost',
  },
]

export default function Classroom() {
  const [hoveredCard, setHoveredCard] = useState(null)
  const { isTutor } = useAuth()

  function handleComingSoon() {
    toast.error('Coming soon! This feature is under construction.')
  }

  return (
    <HubLayout>
      <PageTitle title="Classroom" icon="school" />
      <PaywallGate feature="Classroom" bypass={isTutor}>
      <div style={{ maxWidth: '900px' }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="animate-slide-up" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL }}>school</span>
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>
                  Classroom
                </h1>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '500px', lineHeight: 1.5 }}>
                Live group tutoring sessions — join or host a session with up to 20 students
              </p>
            </div>

            {/* Top action buttons */}
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button
                className="btn-secondary"
                onClick={handleComingSoon}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 18px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>login</span>
                Join a Room
              </button>
              <button
                className="btn-primary"
                onClick={handleComingSoon}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 18px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                Create Room
              </button>
            </div>
          </div>
        </div>

        {/* ── Active rooms grid ────────────────────────────────────────── */}
        <div className="animate-slide-up delay-100" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>
              Available Rooms
              <span style={{
                marginLeft: '8px',
                background: `${CORAL}18`, color: CORAL,
                fontSize: '11px', fontWeight: '700',
                padding: '2px 8px', borderRadius: '20px',
              }}>
                {PLACEHOLDER_ROOMS.length} rooms
              </span>
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
              {PLACEHOLDER_ROOMS.filter(r => r.status === 'live').length} live now
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            {PLACEHOLDER_ROOMS.map((room, i) => (
              <ClassroomCard
                key={room.id}
                room={room}
                isHovered={hoveredCard === room.id}
                onMouseEnter={() => setHoveredCard(room.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onJoin={handleComingSoon}
                animClass={`animate-slide-up delay-${(i + 1) * 100}`}
              />
            ))}
          </div>
        </div>

        {/* ── How Classrooms Work ──────────────────────────────────────── */}
        <div className="animate-slide-up delay-500">
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '14px' }}>
            How Classrooms Work
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {HOW_IT_WORKS.map((item, i) => (
              <FeatureBox
                key={item.icon}
                icon={item.icon}
                title={item.title}
                desc={item.desc}
                animClass={`animate-slide-up delay-${(i + 5) * 100}`}
              />
            ))}
          </div>
        </div>

      </div>
      </PaywallGate>
    </HubLayout>
  )
}

// ── Classroom Card ───────────────────────────────────────────────────────────

function ClassroomCard({ room, isHovered, onMouseEnter, onMouseLeave, onJoin, animClass }) {
  const fillPct = (room.joined / room.max) * 100

  return (
    <div
      className={animClass}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: 'var(--bg-card)',
        border: isHovered
          ? `1px solid ${CORAL}55`
          : '1px solid var(--border)',
        borderRadius: '16px',
        padding: '18px 20px',
        backdropFilter: 'blur(12px)',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: isHovered ? `0 8px 30px rgba(255,114,94,0.12)` : '0 2px 8px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Subtle gradient border glow on hover */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${CORAL}0a 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Top row: icon + subject + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: `${CORAL}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: CORAL }}>{room.icon}</span>
          </div>
          <div>
            <div style={{ color: 'var(--text)', fontSize: '14px', fontWeight: '700', lineHeight: 1.2 }}>{room.subject}</div>
            <div style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '2px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '11px', verticalAlign: 'middle', marginRight: '3px' }}>person</span>
              {room.tutor}
            </div>
          </div>
        </div>

        {/* Status pill */}
        <span style={{
          background: `${room.color}18`,
          color: room.color,
          border: `1px solid ${room.color}35`,
          fontSize: '10px', fontWeight: '700',
          padding: '4px 10px', borderRadius: '20px',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          {room.status === 'live' && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: room.color,
              display: 'inline-block',
              animation: 'pulse 1.5s infinite',
            }} />
          )}
          {room.statusLabel}
        </span>
      </div>

      {/* Capacity bar */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '11px', verticalAlign: 'middle', marginRight: '3px' }}>group</span>
            {room.joined} / {room.max} students
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{room.max - room.joined} spots left</span>
        </div>
        <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${fillPct}%`,
            background: fillPct > 80
              ? `linear-gradient(90deg, #f87171, #ef4444)`
              : fillPct > 50
              ? `linear-gradient(90deg, #fbbf24, #f59e0b)`
              : `linear-gradient(90deg, ${CORAL}, #ff9a3c)`,
            borderRadius: '3px',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Join button */}
      <button
        className="btn-primary"
        onClick={onJoin}
        style={{ width: '100%', fontSize: '13px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          {room.status === 'live' ? 'login' : 'schedule'}
        </span>
        {room.status === 'live' ? 'Join Now' : 'Remind Me'}
      </button>
    </div>
  )
}

// ── Feature Box ──────────────────────────────────────────────────────────────

function FeatureBox({ icon, title, desc, animClass }) {
  return (
    <div
      className={animClass}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '20px',
        backdropFilter: 'blur(12px)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '11px',
        background: `${CORAL}16`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '12px',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL }}>{icon}</span>
      </div>
      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.55 }}>{desc}</div>
    </div>
  )
}
