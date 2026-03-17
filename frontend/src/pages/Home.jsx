import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const BG     = '#1b263b'
const CORAL  = '#ff725e'
const BORDER = 'rgba(255,255,255,0.08)'

// ── Scroll-reveal + parallax ──────────────────────────────────────────────────
function useScrollEffects() {
  useEffect(() => {
    // Reveal on scroll
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('sws-vis'); io.unobserve(e.target) }
      }),
      { threshold: 0.08 }
    )
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el))

    // Parallax CSS var
    const onScroll = () => {
      document.documentElement.style.setProperty('--sy', `${window.scrollY}px`)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [])
}

// ── Grid background ───────────────────────────────────────────────────────────
function Grid({ mask, parallax, opacity = 0.028 }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
      backgroundImage: `
        linear-gradient(rgba(255,255,255,${opacity}) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,${opacity}) 1px, transparent 1px)
      `,
      backgroundSize: '56px 56px',
      backgroundPosition: parallax ? `0 calc(var(--sy, 0px) * -0.25)` : '0 0',
      WebkitMaskImage: mask || 'none',
      maskImage: mask || 'none',
    }} />
  )
}

// ── Mini product previews ─────────────────────────────────────────────────────
function PreviewTutor() {
  return (
    <div style={{ marginTop: '20px', borderTop: `1px solid ${BORDER}`, paddingTop: '16px' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${CORAL}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', color: CORAL, flexShrink: 0 }}>AV</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', fontSize: '13px' }}>Alex V.</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', marginTop: '1px' }}>Oxford · Maths · £18/hr</div>
          <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
            {[1,2,3,4,5].map(i => <svg key={i} width="9" height="9" viewBox="0 0 10 10"><polygon points="5,1 6.2,3.8 9,4.2 7,6.2 7.6,9 5,7.5 2.4,9 3,6.2 1,4.2 3.8,3.8" fill={CORAL} /></svg>)}
          </div>
        </div>
        <div style={{ background: CORAL, color: 'white', fontSize: '11px', fontWeight: '700', padding: '5px 12px', borderRadius: '7px' }}>Book</div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '12px 14px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.55 }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,114,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>SK</div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '13px' }}>Sara K.</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)' }}>Imperial · Physics · £22/hr</div>
        </div>
      </div>
    </div>
  )
}

function PreviewUCAS() {
  return (
    <div style={{ marginTop: '20px', borderTop: `1px solid ${BORDER}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {[
        { label: 'Personal Statement', status: 'Draft', color: CORAL },
        { label: 'UCAS Form Walkthrough', status: 'Scheduled', color: 'rgba(255,255,255,0.60)' },
        { label: 'University Shortlist', status: 'Done', color: 'rgba(255,255,255,0.45)' },
      ].map(item => (
        <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', fontWeight: '600' }}>{item.label}</div>
          <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(255,255,255,0.07)', color: item.color, padding: '2px 7px', borderRadius: '5px' }}>{item.status}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewRooms() {
  return (
    <div style={{ marginTop: '20px', borderTop: `1px solid ${BORDER}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {[
        { sub: 'A-Level Maths', tutor: 'Alex V.', count: 7, live: true },
        { sub: 'Organic Chem', tutor: 'Sara K.', count: 12, live: true },
        { sub: 'Linear Algebra', tutor: 'Tom R.', count: 4, live: false },
      ].map(r => (
        <div key={r.sub} style={{ background: r.live ? `${CORAL}06` : 'rgba(255,255,255,0.025)', border: `1px solid ${r.live ? CORAL + '20' : BORDER}`, borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700' }}>{r.sub}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', marginTop: '1px' }}>{r.tutor} · {r.count} students</div>
          </div>
          {r.live
            ? <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(239,68,68,0.20)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>LIVE</span>
            : <span style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.35)' }}>Soon</span>}
        </div>
      ))}
    </div>
  )
}

function PreviewForum() {
  return (
    <div style={{ marginTop: '20px', borderTop: `1px solid ${BORDER}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {[
        { q: 'Best way to tackle integration by parts?', replies: 14, hot: true },
        { q: 'Anyone struggling with statistics?', replies: 7, hot: false },
      ].map(t => (
        <div key={t.q} style={{ background: t.hot ? `${CORAL}06` : 'rgba(255,255,255,0.025)', border: `1px solid ${t.hot ? CORAL + '20' : BORDER}`, borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', lineHeight: 1.4 }}>{t.q}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            {t.hot && <span style={{ fontSize: '9px', background: `${CORAL}20`, color: CORAL, padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>🔥 Hot</span>}
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{t.replies} replies</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewCalendar() {
  const today = new Date().getDate()
  const booked = [today, today + 2, today + 5].filter(d => d <= 31)
  return (
    <div style={{ marginTop: '20px', borderTop: `1px solid ${BORDER}`, paddingTop: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '10px' }}>
        {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '8px', color: 'rgba(255,255,255,0.28)', paddingBottom: '3px' }}>{d}</div>)}
        {Array.from({ length: 21 }, (_, i) => {
          const d = i + (today - 6)
          const isToday = d === today
          const isBooked = booked.includes(d)
          return (
            <div key={i} style={{ textAlign: 'center', fontSize: '10px', padding: '4px 2px', borderRadius: '5px', background: isToday ? CORAL : isBooked ? `${CORAL}20` : 'transparent', color: isToday ? 'white' : isBooked ? CORAL : 'rgba(255,255,255,0.40)', fontWeight: isToday || isBooked ? '700' : '400' }}>
              {d > 0 && d <= 31 ? d : ''}
            </div>
          )
        })}
      </div>
      <div style={{ background: `${CORAL}10`, borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '13px', color: CORAL }}>event</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700' }}>Maths with Alex</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.40)' }}>Today · 4:00 PM</div>
        </div>
      </div>
    </div>
  )
}

function PreviewMessages() {
  const msgs = [
    { from: 'them', text: 'Hi! I need help with calculus 📚' },
    { from: 'me',   text: 'Of course! What topics?' },
    { from: 'them', text: 'Integration by parts mainly' },
  ]
  return (
    <div style={{ marginTop: '20px', borderTop: `1px solid ${BORDER}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
          <div style={{ background: m.from === 'me' ? CORAL : 'rgba(255,255,255,0.07)', color: m.from === 'me' ? 'white' : 'rgba(255,255,255,0.78)', padding: '7px 11px', borderRadius: 9, fontSize: 12, maxWidth: '80%', lineHeight: 1.4 }}>
            {m.text}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Feature card with hover-reveal ────────────────────────────────────────────
function FeatureCard({ icon, title, desc, preview, delay, badge, from }) {
  const [hovered, setHovered] = useState(false)
  const hasPreview = Boolean(preview)

  return (
    <div
      data-reveal
      data-d={delay}
      data-from={from}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `${CORAL}07` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? CORAL + '30' : BORDER}`,
        borderRadius: '16px',
        padding: '28px',
        transition: 'border-color 0.25s, background 0.25s, box-shadow 0.25s',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: hovered ? `0 8px 32px ${CORAL}10` : 'none',
        minHeight: hasPreview ? '260px' : 'auto',
        cursor: hasPreview ? 'pointer' : 'default',
      }}
    >
      {badge && (
        <div style={{
          position: 'absolute', top: '14px', right: '14px',
          background: badge === 'EXPLORER' ? `${CORAL}22` : 'rgba(255,255,255,0.10)',
          color: badge === 'EXPLORER' ? CORAL : 'rgba(255,255,255,0.55)',
          fontSize: '9px', fontWeight: '800', padding: '2px 8px',
          borderRadius: '20px', letterSpacing: '0.06em',
        }}>
          {badge}
        </div>
      )}

      <span className="material-symbols-outlined" style={{
        fontSize: '24px', color: CORAL, display: 'block', marginBottom: '14px',
        transition: 'transform 0.3s',
        transform: hovered ? 'scale(1.12)' : 'scale(1)',
      }}>{icon}</span>

      <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 8px', letterSpacing: '-0.01em' }}>{title}</h3>

      {/* Text layer — fades out on hover if there's a preview */}
      <div style={{
        opacity: hovered && hasPreview ? 0 : 1,
        transform: hovered && hasPreview ? 'translateY(6px)' : 'translateY(0)',
        transition: 'opacity 0.25s, transform 0.25s',
      }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.48)', margin: 0, lineHeight: 1.65 }}>{desc}</p>
        {hasPreview && (
          <p style={{ fontSize: '11px', color: `${CORAL}70`, marginTop: '12px', fontWeight: 600 }}>
            Hover to preview →
          </p>
        )}
      </div>

      {/* Preview layer — fades in on hover */}
      {hasPreview && (
        <div style={{
          position: 'absolute', inset: 0, padding: '28px',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.3s, transform 0.3s',
          pointerEvents: hovered ? 'auto' : 'none',
          overflow: 'hidden',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: CORAL, display: 'block', marginBottom: '14px' }}>{icon}</span>
          <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 0', letterSpacing: '-0.01em' }}>{title}</h3>
          {preview}
        </div>
      )}
    </div>
  )
}

// ── Pricing feature row ───────────────────────────────────────────────────────
function PricingFeatureRow({ icon, label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}>
      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: CORAL, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '700' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{desc}</div>
      </div>
    </div>
  )
}

// ── Pricing section ───────────────────────────────────────────────────────────
const FREE_FEATURES = [
  { icon: 'school',         label: '1-to-1 Tutoring',     desc: 'Book & message verified tutors' },
  { icon: 'menu_book',      label: 'UCAS Guidance',        desc: 'Personal statement & application help' },
  { icon: 'calendar_month', label: 'Session Calendar',     desc: 'Track all upcoming sessions' },
  { icon: 'chat',           label: 'Direct Messages',      desc: 'Chat with any tutor before booking' },
]

const PRO_FEATURES = [
  { icon: 'groups',             label: 'Live Study Rooms',  desc: 'Drop into open peer study sessions' },
  { icon: 'forum',              label: 'Community Forum',   desc: 'Ask questions, get help from peers' },
  { icon: 'cast_for_education', label: 'Live Classrooms',   desc: 'Group lessons at a fraction of 1-to-1' },
  { icon: 'description',        label: 'Study Notes',       desc: 'Share & discover student notes' },
]

// ── Stripe wordmark (inline SVG) ──────────────────────────────────────────────
function StripeBadge() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '5px 10px' }}>
      {/* Stripe 's' mark */}
      <svg width="14" height="14" viewBox="0 0 30 30" fill="none">
        <rect width="30" height="30" rx="6" fill="rgba(255,255,255,0.15)" />
        <path d="M14.3 12.5c0-.8.7-1.1 1.8-1.1 1.6 0 3.6.5 5.2 1.4V8.4C19.6 7.5 17.8 7 16 7c-4 0-6.6 2-6.6 5.3 0 5.2 7.2 4.4 7.2 6.6 0 .9-.8 1.2-2 1.2-1.7 0-3.9-.7-5.7-1.7v4.5c1.9.8 3.9 1.2 5.7 1.2 4.1 0 6.9-2 6.9-5.4-.1-5.6-7.2-4.6-7.2-6.2z" fill="white" />
      </svg>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '-0.01em' }}>Stripe</span>
    </div>
  )
}

// ── UNICEF badge ──────────────────────────────────────────────────────────────
function UnicefBadge() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(1,102,172,0.12)', border: '1px solid rgba(1,102,172,0.30)', borderRadius: '8px', padding: '5px 10px' }}>
      <span style={{ fontSize: '13px' }}>🌍</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(1,152,218,0.90)', letterSpacing: '-0.01em' }}>UNICEF</span>
    </div>
  )
}

function PricingSection() {
  return (
    <section style={{ padding: '100px 24px', borderTop: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
      <Grid mask="radial-gradient(ellipse 80% 80% at 50% 100%, black 0%, transparent 70%)" opacity={0.022} />
      <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.14em', color: CORAL, marginBottom: '14px' }}>
          Pricing
        </p>
        <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: '800', textAlign: 'center', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Everything free. Community for £2/mo.
        </h2>
        <p data-reveal data-d="2" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.42)', fontSize: '15px', margin: '0 0 16px', lineHeight: 1.6, maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
          Tutoring, UCAS guidance, and booking are always free. The community extras are £2/month.
        </p>

        {/* Payments badge row */}
        <div data-reveal data-d="2" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '52px', flexWrap: 'wrap' }}>
          <StripeBadge />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '5px 10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: CORAL }}>lock</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Bank-level encryption</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '5px 10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: CORAL }}>percent</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>0% to platform</span>
          </div>
        </div>

        <div data-reveal data-d="3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Free */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '18px', padding: '28px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Free</div>
              <div style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '4px' }}>£0</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>No card required — ever</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              {FREE_FEATURES.map(f => <PricingFeatureRow key={f.label} {...f} />)}
            </div>
            <Link to="/signup" style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: '13px', textDecoration: 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            >Get started free</Link>
          </div>

          {/* Explorer */}
          <div style={{ background: `linear-gradient(135deg, ${CORAL}10, ${CORAL}04)`, border: `1.5px solid ${CORAL}35`, borderRadius: '18px', padding: '28px', position: 'relative', overflow: 'visible' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '24px', background: CORAL, color: 'white', fontSize: '10px', fontWeight: '800', letterSpacing: '0.06em', padding: '3px 12px', borderRadius: '20px', textTransform: 'uppercase' }}>
              Explorer Plan
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: CORAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Explorer</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <div style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-0.04em' }}>£2</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>/month</div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>Everything in Free, plus:</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              {PRO_FEATURES.map(f => <PricingFeatureRow key={f.label} {...f} />)}
            </div>
            <Link to="/signup" style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: '10px', background: CORAL, color: 'white', fontWeight: '700', fontSize: '13px', textDecoration: 'none', transition: 'opacity 0.15s', boxShadow: `0 4px 18px ${CORAL}35` }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Start Explorer</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Why £2 section ────────────────────────────────────────────────────────────
function WhyTwoPounds() {
  const reasons = [
    { icon: 'handshake', title: 'Keep everything running', desc: 'Servers, dev, and keeping the platform fast — £2/month lets us build this sustainably.' },
    { icon: 'volunteer_activism', title: 'A portion goes to UNICEF', desc: 'A share of every Explorer subscription funds UNICEF\'s education programmes globally.' },
    { icon: 'lock_open', title: 'Core tutoring stays free — always', desc: 'Finding tutors, booking sessions, and UCAS guidance will never sit behind a paywall.' },
  ]

  return (
    <section style={{ padding: '100px 24px', borderTop: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.14em', color: CORAL, marginBottom: '14px' }}>
          The honest answer
        </p>
        <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: '800', textAlign: 'center', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Why do we charge £2?
        </h2>
        <p data-reveal data-d="2" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '16px', margin: '0 auto 64px', lineHeight: 1.7, maxWidth: '540px' }}>
          The tutoring platform is free. The community is £2/month. Here's exactly where that money goes.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '48px' }}>
          {reasons.map((r, i) => (
            <div
              key={r.title}
              data-reveal
              data-from={i === 0 ? 'left' : i === 2 ? 'right' : undefined}
              data-d={String(i + 1)}
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '28px', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${CORAL}35`}
              onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
            >
              {i === 1 && (
                <div style={{ marginBottom: '10px' }}>
                  <UnicefBadge />
                </div>
              )}
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL, display: 'block', marginBottom: '14px' }}>{r.icon}</span>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px', letterSpacing: '-0.01em' }}>{r.title}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.46)', margin: 0, lineHeight: 1.7 }}>{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Pull quote */}
        <div data-reveal style={{ background: `linear-gradient(135deg, ${CORAL}08, ${CORAL}03)`, border: `1px solid ${CORAL}20`, borderRadius: '16px', padding: '36px 40px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '48px', lineHeight: 1, color: CORAL, opacity: 0.4, fontFamily: 'Georgia, serif', marginTop: '-8px' }}>"</span>
          <div>
            <p style={{ fontSize: '16px', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, margin: '0 0 14px' }}>
              We didn't want to build a platform that profits from students. We wanted one that genuinely helps them — and if keeping the lights on costs £2 a month, that felt honest.
            </p>
            <p style={{ fontSize: '13px', fontWeight: '700', color: CORAL, margin: 0 }}>Kiki Boro — Founder</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── UK Universities Marquee ───────────────────────────────────────────────────
const UK_UNIS = [
  'Oxford', 'Cambridge', 'Imperial College', 'UCL', 'LSE',
  "King's College", 'Edinburgh', 'Manchester', 'Bristol', 'Durham',
  'Warwick', 'Bath', 'St Andrews', 'Exeter', 'Sheffield',
  'Birmingham', 'Nottingham', 'Glasgow', 'Leeds', 'Southampton',
]

function UniMarquee() {
  const doubled = [...UK_UNIS, ...UK_UNIS]
  return (
    <div style={{ overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .marquee-track { display: flex; gap: 0; animation: marquee 38s linear infinite; width: max-content; }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px', background: `linear-gradient(to right, ${BG}, transparent)`, zIndex: 1, pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px', background: `linear-gradient(to left, ${BG}, transparent)`, zIndex: 1, pointerEvents: 'none' }} />
      <div className="marquee-track">
        {doubled.map((uni, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0 28px', flexShrink: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.60)', whiteSpace: 'nowrap' }}>{uni}</span>
            <span aria-hidden="true" style={{ width: '4px', height: '4px', borderRadius: '50%', background: CORAL, margin: '0 0 0 28px', opacity: 0.55, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  useScrollEffects()

  return (
    <div style={{ background: BG, minHeight: '100vh', color: 'white', fontFamily: 'inherit' }}>
      <style>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        [data-reveal][data-from="left"]  { transform: translate(-28px, 0); }
        [data-reveal][data-from="right"] { transform: translate(28px, 0); }
        [data-reveal].sws-vis { opacity: 1; transform: translate(0, 0) !important; }
        [data-reveal][data-d="1"] { transition-delay: 0.10s; }
        [data-reveal][data-d="2"] { transition-delay: 0.20s; }
        [data-reveal][data-d="3"] { transition-delay: 0.30s; }
        [data-reveal][data-d="4"] { transition-delay: 0.40s; }
      `}</style>
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '80px 24px 64px',
      }}>
        {/* Parallax grid */}
        <Grid
          parallax
          mask="radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)"
        />
        <div aria-hidden="true" style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', borderRadius: '50%', background: `radial-gradient(circle, ${CORAL}07 0%, transparent 65%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '720px' }}>
          <div data-reveal style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `${CORAL}12`, border: `1px solid ${CORAL}28`, borderRadius: '20px', padding: '5px 14px', marginBottom: '24px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: CORAL, display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: CORAL, letterSpacing: '0.06em' }}>Peer tutoring · 0% commission</span>
          </div>
          <h1 data-reveal data-d="1" style={{ fontSize: 'clamp(42px, 6.5vw, 76px)', fontWeight: '800', lineHeight: 1.05, margin: '0 0 22px', letterSpacing: '-0.025em' }}>
            Study with students.<br />
            <span style={{ color: CORAL }}>Not agencies.</span>
          </h1>
          <p data-reveal data-d="2" style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: 'rgba(255,255,255,0.52)', maxWidth: '520px', margin: '0 auto 16px', lineHeight: 1.65 }}>
            Connect with verified university students for 1-to-1 tutoring, UCAS guidance, live study rooms, and a community built entirely around learning.
          </p>
          <p data-reveal data-d="2" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.30)', margin: '0 auto 40px' }}>
            Free to join. Tutoring costs nothing to start.
          </p>
          <div data-reveal data-d="3" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ background: CORAL, color: 'white', padding: '14px 30px', borderRadius: '10px', fontWeight: '700', fontSize: '15px', textDecoration: 'none', transition: 'opacity 0.15s', boxShadow: `0 4px 20px ${CORAL}35` }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Get started free</Link>
            <Link to="/find-tutors" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.8)', padding: '14px 30px', borderRadius: '10px', fontWeight: '600', fontSize: '15px', textDecoration: 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >Browse tutors</Link>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '0 24px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { stat: '0%',   label: 'Commission',          sub: 'Every penny goes directly to your tutor' },
            { stat: '100%', label: 'University Students',  sub: 'Every tutor verified at a UK university' },
            { stat: '£0',   label: 'To get started',       sub: 'Tutoring and UCAS guidance always free' },
          ].map((item, i) => (
            <div key={i} data-reveal data-d={String(i + 1)} style={{ padding: '32px 24px', textAlign: 'center', borderRight: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '900', letterSpacing: '-0.03em', color: CORAL, lineHeight: 1, marginBottom: '6px' }}>{item.stat}</div>
              <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── UNIVERSITIES ────────────────────────────────────────────────────── */}
      <section style={{ padding: '56px 0', borderBottom: `1px solid ${BORDER}` }}>
        <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '28px', padding: '0 24px' }}>
          Tutors from the UK's top universities
        </p>
        <UniMarquee />
      </section>

      {/* ── WHAT WE OFFER ───────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
        <Grid mask="radial-gradient(ellipse 90% 60% at 50% 50%, black 0%, transparent 70%)" opacity={0.020} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '14px' }}>
            What we offer
          </p>
          <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: '800', textAlign: 'center', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Top tutors, and much more
          </h2>
          <p data-reveal data-d="2" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.42)', fontSize: '16px', margin: '0 0 64px' }}>
            Built by students, for students. Hover any card to see it in action.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <FeatureCard from="left"  delay="1" icon="school"          title="1-to-1 Tutoring"  badge="FREE"     desc="Book private sessions with verified university students. No middlemen, no markups — pay your tutor directly." preview={<PreviewTutor />} />
            <FeatureCard              delay="2" icon="menu_book"       title="UCAS Guidance"    badge="FREE"     desc="Get help with personal statements and applications from students who've been through it themselves." preview={<PreviewUCAS />} />
            <FeatureCard from="right" delay="3" icon="calendar_month"  title="Session Calendar" badge="FREE"     desc="Book, track, and manage all your sessions in one place. Never miss a lesson." preview={<PreviewCalendar />} />
            <FeatureCard from="left"  delay="1" icon="groups"          title="Live Study Rooms" badge="EXPLORER" desc="Drop into open study sessions with peers in your subject. Real-time and far cheaper than solo tutoring." preview={<PreviewRooms />} />
            <FeatureCard              delay="2" icon="forum"           title="Community Forum"  badge="EXPLORER" desc="Ask questions, share insights, and get help from people studying the same subjects. Trending threads surfaced first." preview={<PreviewForum />} />
            <FeatureCard from="right" delay="3" icon="chat"            title="Direct Messages"  badge="FREE"     desc="Message any tutor directly before booking. Discuss goals, agree a rate, and make sure it's the right fit." preview={<PreviewMessages />} />
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ── WHY £2 ──────────────────────────────────────────────────────────── */}
      <WhyTwoPounds />

      {/* ── FOUNDER ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.14em', color: CORAL, marginBottom: '48px' }}>
            Who built this
          </p>
          <div data-reveal data-d="1" style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `linear-gradient(135deg, ${CORAL}40, ${CORAL}15)`, border: `2px solid ${CORAL}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '52px', color: CORAL, opacity: 0.7 }}>person</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.02em', margin: '0 0 6px' }}>Kiki Boro</h3>
              <p style={{ fontSize: '13px', color: CORAL, fontWeight: '700', margin: '0 0 14px' }}>Founder, Study With Students</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.52)', lineHeight: 1.75, margin: '0 0 18px' }}>
                "I built Study With Students because I wanted a place where students could genuinely help each other — without agencies taking a cut. University students are brilliant teachers. They deserve to be paid properly, and learners deserve fair prices."
              </p>
              <Link to="/about" style={{ fontSize: '13px', fontWeight: '700', color: CORAL, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Read our story
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUNDING TUTORS ──────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 60px' }}>
        <div data-reveal style={{ maxWidth: '720px', margin: '0 auto', background: `linear-gradient(135deg, rgba(255,114,94,0.08), rgba(255,114,94,0.03))`, border: `1px solid ${CORAL}25`, borderRadius: '20px', padding: '36px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: CORAL, marginBottom: '8px' }}>Founding Tutors</p>
            <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', margin: '0 0 8px' }}>Meet the first tutors on the platform</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.48)', margin: 0, lineHeight: 1.6 }}>
              The brilliant people who believed in this from day one.
            </p>
          </div>
          <Link to="/founding-tutors" style={{ background: CORAL, color: 'white', padding: '11px 22px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', textDecoration: 'none', flexShrink: 0, transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Meet them →
          </Link>
        </div>
      </section>

      {/* ── UNICEF ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div data-reveal style={{ maxWidth: '720px', margin: '0 auto', background: 'rgba(1,102,172,0.05)', border: '1px solid rgba(1,102,172,0.20)', borderRadius: '20px', padding: '32px 40px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flexShrink: 0 }}>
            <UnicefBadge />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.01em', margin: '0 0 6px' }}>Supporting UNICEF — Learning for Every Child</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.65 }}>
              A portion of every Explorer Plan subscription funds UNICEF's education programmes, helping children access quality learning worldwide.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 100px', borderTop: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
        <Grid mask="radial-gradient(ellipse 60% 80% at 50% 50%, black 0%, transparent 80%)" opacity={0.022} />
        <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 data-reveal style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Ready to find your tutor?
          </h2>
          <p data-reveal data-d="1" style={{ color: 'rgba(255,255,255,0.42)', fontSize: '16px', margin: '0 0 36px', lineHeight: 1.6 }}>
            Join students from top UK universities. Free to join — no card required.
          </p>
          <div data-reveal data-d="2" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ display: 'inline-block', background: CORAL, color: 'white', padding: '14px 32px', borderRadius: '10px', fontWeight: '700', fontSize: '15px', textDecoration: 'none', transition: 'opacity 0.15s', boxShadow: `0 4px 20px ${CORAL}35` }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Create your free account</Link>
            <Link to="/how-it-works" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.7)', padding: '14px 32px', borderRadius: '10px', fontWeight: '600', fontSize: '15px', textDecoration: 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >How it works</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
