import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const BG     = '#1b263b'
const CORAL  = '#ff725e'
const BORDER = 'rgba(255,255,255,0.08)'

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('sws-vis'); io.unobserve(e.target) }
      }),
      { threshold: 0.08 }
    )
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

const GRID_STYLE = {
  position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
  `,
  backgroundSize: '60px 60px',
}

function Wave({ flip }) {
  return (
    <div aria-hidden="true" style={{ lineHeight: 0, overflow: 'hidden', transform: flip ? 'scaleY(-1)' : 'none' }}>
      <svg viewBox="0 0 1440 56" preserveAspectRatio="none" style={{ width: '100%', height: '56px', display: 'block' }}>
        <path d="M0,28 C360,56 1080,0 1440,28 L1440,56 L0,56 Z" fill="rgba(255,255,255,0.018)" />
        <path d="M0,28 C360,56 1080,0 1440,28" fill="none" stroke={`${CORAL}16`} strokeWidth="1" />
      </svg>
    </div>
  )
}

// ── Earnings calculator ────────────────────────────────────────────────────────
const SESSIONS = [
  { n: 2,  weekly: 30,  monthly: 120,  annual: 1440  },
  { n: 5,  weekly: 75,  monthly: 300,  annual: 3600  },
  { n: 10, weekly: 150, monthly: 600,  annual: 7200  },
  { n: 20, weekly: 300, monthly: 1200, annual: 14400 },
]

function EarningsCalc() {
  const [sel, setSel] = useState(1)
  const row = SESSIONS[sel]

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px', fontWeight: 600 }}>
        Sessions per week (at £15/hr avg)
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {SESSIONS.map((s, i) => (
          <button key={i} onClick={() => setSel(i)} style={{
            padding: '9px 22px', borderRadius: '9px', cursor: 'pointer',
            fontWeight: 700, fontSize: '14px', border: 'none',
            background: sel === i ? CORAL : 'rgba(255,255,255,0.07)',
            color: sel === i ? 'white' : 'rgba(255,255,255,0.50)',
            transition: 'all 0.15s',
            boxShadow: sel === i ? `0 4px 14px ${CORAL}35` : 'none',
          }}>
            {s.n}x
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: BORDER, borderRadius: '14px', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        {[
          { label: 'Per week',  val: `£${row.weekly}` },
          { label: 'Per month', val: `£${row.monthly}` },
          { label: 'Per year',  val: `£${row.annual.toLocaleString()}` },
        ].map(({ label, val }) => (
          <div key={label} style={{ background: BG, padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: CORAL, lineHeight: 1, letterSpacing: '-0.03em' }}>{val}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', marginTop: '6px' }}>{label}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.24)', marginTop: '14px', textAlign: 'center' }}>
        0% goes to us — you keep every pound, every time.
      </p>
    </div>
  )
}

// ── Steps ──────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    n:'01', icon:'person_add', title:'Sign up free',
    desc:'Email only. No card, no waiting list.',
    detail: 'Create your account with just your email. No credit card required — ever. You can be up and running in under a minute.',
  },
  {
    n:'02', icon:'verified', title:'Verify your university',
    desc:'Submit your .ac.uk email + graduation date.',
    detail: 'We verify every tutor via a valid .ac.uk university email and your expected graduation date. This keeps the platform trusted — students know every tutor is a real university student.',
  },
  {
    n:'03', icon:'edit_note', title:'Build your profile',
    desc:'Subjects, rate, bio. Takes 5 mins.',
    detail: 'Add your subjects, hourly rate, a short bio, and your availability. You can edit everything at any time — there\'s no approval process to wait for.',
  },
  {
    n:'04', icon:'account_balance_wallet', title:'Connect Stripe',
    desc:'Set up payouts once. Done forever.',
    detail: 'Link your Stripe account (free) to receive direct payments from students. Once connected, every session fee lands in your account automatically.',
  },
  {
    n:'05', icon:'explore', title:'Go live',
    desc:'Profile instantly visible to students.',
    detail: 'Once your profile is saved, you\'re immediately searchable by students. Your XP and reviews build your ranking over time — the more you teach, the higher you appear.',
  },
  {
    n:'06', icon:'payments', title:'Get paid 100%',
    desc:'Full rate, every session. Always.',
    detail: 'Students pay directly. We take 0%. Every pound your student pays is every pound you receive. No deductions, no surprises.',
  },
]

// ── Perks ──────────────────────────────────────────────────────────────────────
const PERKS = [
  { icon: 'schedule',     text: 'Teach when you want' },
  { icon: 'tune',         text: 'Set your own rate' },
  { icon: 'cast_for_education', text: 'Host live classrooms' },
  { icon: 'emoji_events', text: 'Earn XP & level up' },
  { icon: 'star_rate',    text: 'Build reviews & rep' },
  { icon: 'chat',         text: 'Message before booking' },
  { icon: 'auto_stories', text: 'Contribute study notes' },
  { icon: 'workspace_premium', text: 'Unlock tutor badges' },
]

const MORE_CARDS = [
  {
    icon: 'cast_for_education',
    title: 'Host live classrooms',
    desc: 'Run group sessions for multiple students at once — earn more per hour and build your reputation faster.',
    xp: '+50 XP per session',
    color: '#60a5fa',
  },
  {
    icon: 'auto_stories',
    title: 'Contribute study notes',
    desc: 'Upload your notes, past papers, or revision guides. Every contribution earns XP and helps students across the platform.',
    xp: '+20 XP per upload',
    color: '#fbbf24',
  },
  {
    icon: 'workspace_premium',
    title: 'Earn tutor badges',
    desc: 'Hit milestones to unlock Rising Star, Expert Tutor, and Pioneer badges that boost your search ranking.',
    xp: 'Visible on your profile',
    color: CORAL,
  },
]

export default function BecomeATutor() {
  useReveal()
  const [activeStep, setActiveStep] = useState(null)

  return (
    <div style={{ background: BG, minHeight: '100vh', color: 'white', fontFamily: 'inherit' }}>
      <style>{`
        [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity 0.6s cubic-bezier(0.16,1,0.3,1),transform 0.6s cubic-bezier(0.16,1,0.3,1)}
        [data-reveal].sws-vis{opacity:1;transform:translateY(0)}
        [data-reveal][data-d="1"]{transition-delay:.10s}[data-reveal][data-d="2"]{transition-delay:.20s}
        [data-reveal][data-d="3"]{transition-delay:.30s}[data-reveal][data-d="4"]{transition-delay:.40s}
      `}</style>
      <Navbar />

      {/* ── HERO — 0% COMMISSION ───────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 24px 88px', textAlign: 'center', borderBottom: `1px solid ${BORDER}` }}>
        <div aria-hidden style={GRID_STYLE} />
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 20%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 20%, transparent 80%)',
          ...GRID_STYLE
        }} />
        <div aria-hidden style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '600px', height: '500px',
          background: `radial-gradient(ellipse, ${CORAL}08 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
          <p data-reveal style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: CORAL, marginBottom: '24px' }}>
            Become a tutor
          </p>

          {/* Giant 0% */}
          <div data-reveal data-d="1" style={{
            fontSize: 'clamp(96px, 15vw, 160px)',
            fontWeight: 900,
            color: CORAL,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            marginBottom: '0',
          }}>
            0%
          </div>

          <h1 data-reveal data-d="2" style={{
            fontSize: 'clamp(20px, 3vw, 28px)',
            fontWeight: 800,
            margin: '8px 0 20px',
            letterSpacing: '-0.02em',
            color: 'white',
          }}>
            Platform commission
          </h1>

          <p data-reveal data-d="2" style={{
            color: 'rgba(255,255,255,0.50)',
            fontSize: '16px',
            maxWidth: '440px',
            margin: '0 auto 32px',
            lineHeight: 1.7,
          }}>
            Your rate is your income. No setup fee, no monthly charge, no per-session cut. Not now, not later.
          </p>

          {/* Three checks */}
          <div data-reveal data-d="3" style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
            {['No setup fee', 'No monthly charge', 'No per-session cut'].map(label => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#22c55e' }}>check_circle</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.72)' }}>{label}</span>
              </div>
            ))}
          </div>

          <div data-reveal data-d="4">
            <Link to="/signup" style={{
              display: 'inline-block', background: CORAL, color: 'white',
              padding: '14px 32px', borderRadius: '10px', fontWeight: 700,
              fontSize: '15px', textDecoration: 'none',
              boxShadow: `0 4px 20px ${CORAL}38`,
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Start tutoring for free
            </Link>
          </div>
        </div>
      </section>

      <Wave />

      {/* ── EARNINGS CALCULATOR ────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          ...GRID_STYLE,
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 100% 50%, black 0%, transparent 60%)',
          maskImage: 'radial-gradient(ellipse 100% 100% at 100% 50%, black 0%, transparent 60%)',
        }} />
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <p data-reveal style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '14px' }}>What you could earn</p>
            <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Real income.<br />Zero cuts.
            </h2>
            <p data-reveal data-d="2" style={{ color: 'rgba(255,255,255,0.48)', fontSize: '15px', lineHeight: 1.75, margin: 0 }}>
              Every pound you charge goes directly to you. Set your own rate, teach on your own schedule, and build a real income around your studies.
            </p>
          </div>
          <div data-reveal data-d="2">
            <EarningsCalc />
          </div>
        </div>
      </section>

      <Wave flip />

      {/* ── WHAT WE NEED FROM YOU ──────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '14px' }}>Before you apply</p>
          <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, textAlign: 'center', margin: '0 0 44px', letterSpacing: '-0.02em' }}>
            What we need from you
          </h2>

          {/* Three requirement cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {[
              {
                icon: 'alternate_email',
                title: 'Valid .ac.uk email address',
                desc: 'Your university email ending in .ac.uk. We send a verification link to confirm it\'s active.',
              },
              {
                icon: 'badge',
                title: 'Proof of enrolment',
                desc: 'A student ID photo or enrolment letter showing your name and institution. One upload is enough.',
              },
              {
                icon: 'event',
                title: 'Expected graduation date',
                desc: 'Month and year you expect to graduate. This helps us keep the platform current and show your year to students.',
              },
            ].map((req, i) => (
              <div key={req.icon} data-reveal data-d={String(i + 2)} style={{
                display: 'flex', gap: '18px', alignItems: 'center',
                padding: '22px 26px',
                background: `${CORAL}07`,
                border: `1px solid ${CORAL}22`,
                borderRadius: '16px',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '11px',
                  background: `${CORAL}16`, border: `1px solid ${CORAL}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: CORAL }}>{req.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '4px' }}>{req.title}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>{req.desc}</div>
                </div>
                <div style={{
                  fontSize: '10px', fontWeight: 800, color: CORAL,
                  background: `${CORAL}15`, border: `1px solid ${CORAL}28`,
                  padding: '4px 10px', borderRadius: '20px',
                  flexShrink: 0,
                }}>
                  Required
                </div>
              </div>
            ))}
          </div>

          {/* Not a uni student? */}
          <div data-reveal data-d="3" style={{
            padding: '20px 24px',
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid ${BORDER}`,
            borderRadius: '14px',
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.40)', marginTop: '1px', flexShrink: 0 }}>help_outline</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px', color: 'rgba(255,255,255,0.80)' }}>
                  Not a university student?
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, margin: '0 0 12px' }}>
                  No worries — Study With Students is primarily built to help university students earn money and combat rising student loan costs. But if you've graduated or studied at a recognised institution,{' '}
                  <Link to="/contact" style={{ color: CORAL, fontWeight: 700, textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    contact us here
                  </Link>
                  {' '}with where you studied and we'll see if we can get you on the platform.
                </p>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
                  We review these case-by-case.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Wave />

      {/* ── HOW TO GET STARTED ─────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          ...GRID_STYLE,
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }} />
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '14px' }}>Getting started</p>
          <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, textAlign: 'center', margin: '0 0 48px', letterSpacing: '-0.02em' }}>
            Six steps. Under 10 minutes.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {STEPS.map((step, i) => {
              const isActive = activeStep === i
              return (
                <div
                  key={step.n}
                  data-reveal
                  data-d={String((i % 3) + 1)}
                  onClick={() => setActiveStep(isActive ? null : i)}
                  style={{
                    padding: '22px', borderRadius: '14px',
                    cursor: 'pointer',
                    background: isActive ? `${CORAL}0c` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? CORAL + '40' : BORDER}`,
                    boxShadow: isActive ? `0 8px 28px ${CORAL}12` : 'none',
                    transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = `${CORAL}28`; e.currentTarget.style.boxShadow = `0 4px 16px ${CORAL}08` } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '7px',
                      background: isActive ? CORAL : `${CORAL}18`,
                      border: `1px solid ${isActive ? CORAL : CORAL + '28'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 900,
                      color: isActive ? 'white' : CORAL,
                      flexShrink: 0,
                      transition: 'background 0.2s, color 0.2s',
                    }}>{step.n}</div>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: CORAL }}>{step.icon}</span>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '16px', color: 'rgba(255,255,255,0.28)',
                      marginLeft: 'auto',
                      transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s ease',
                    }}>expand_more</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '5px' }}>{step.title}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.55 }}>{step.desc}</div>
                  {isActive && (
                    <div style={{
                      marginTop: '14px',
                      paddingTop: '14px',
                      borderTop: `1px solid ${CORAL}20`,
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.62)',
                      lineHeight: 1.7,
                    }}>
                      {step.detail}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <Wave flip />

      {/* ── MORE THAN TUTORING ─────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '14px' }}>More than tutoring</p>
          <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, textAlign: 'center', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Build something bigger than sessions.
          </h2>
          <p data-reveal data-d="2" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 48px', lineHeight: 1.7 }}>
            Every action on the platform earns XP — classrooms, notes, reviews. Your profile grows as you do.
          </p>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '36px' }}>
            {MORE_CARDS.map((card, i) => (
              <div key={card.icon} data-reveal data-d={String(i + 1)} style={{
                padding: '28px 24px',
                background: 'rgba(255,255,255,0.025)',
                border: `1px solid ${BORDER}`,
                borderRadius: '16px',
                transition: 'border-color 0.25s, box-shadow 0.25s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${card.color}35`; e.currentTarget.style.boxShadow = `0 8px 28px ${card.color}10` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: `${card.color}14`, border: `1px solid ${card.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: card.color }}>{card.icon}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>{card.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, marginBottom: '16px' }}>{card.desc}</div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 700,
                  color: card.color,
                  background: `${card.color}12`,
                  border: `1px solid ${card.color}25`,
                  padding: '4px 10px', borderRadius: '20px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>bolt</span>
                  {card.xp}
                </div>
              </div>
            ))}
          </div>

          {/* Pill strip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {PERKS.map((p, i) => (
              <div
                key={p.text}
                data-reveal
                data-d={String((i % 4) + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '40px', transition: 'border-color 0.2s, background 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${CORAL}35`; e.currentTarget.style.background = `${CORAL}08` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: CORAL }}>{p.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 96px' }}>
        <div data-reveal style={{ maxWidth: '860px', margin: '0 auto', padding: '52px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>Ready to start?</h3>
          <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '14px', margin: '0 0 28px' }}>Free account. No card. Up in minutes.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ background: CORAL, color: 'white', padding: '13px 28px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: `0 4px 16px ${CORAL}30` }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Create your tutor profile</Link>
            <Link to="/how-it-works" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.70)', padding: '13px 28px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >How it works</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
