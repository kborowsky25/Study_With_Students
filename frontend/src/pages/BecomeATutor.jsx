import { useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { useTheme } from '../context/ThemeContext'

const CORAL = '#ff725e'

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

function gridStyle(dark) {
  const rgb = dark ? '255,255,255' : '27,38,59'
  return {
    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: `
      linear-gradient(rgba(${rgb},0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(${rgb},0.025) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
  }
}

function Wave({ flip }) {
  const { dark } = useTheme()
  return (
    <div aria-hidden="true" style={{ lineHeight: 0, overflow: 'hidden', transform: flip ? 'scaleY(-1)' : 'none' }}>
      <svg viewBox="0 0 1440 56" preserveAspectRatio="none" style={{ width: '100%', height: '56px', display: 'block' }}>
        <path d="M0,28 C360,56 1080,0 1440,28 L1440,56 L0,56 Z" fill={dark ? 'rgba(255,255,255,0.018)' : 'rgba(27,38,59,0.025)'} />
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
  const { dark } = useTheme()
  const BG      = dark ? '#1b263b' : '#f4f6fb'
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT_MUT  = dark ? 'rgba(255,255,255,0.45)' : 'rgba(27,38,59,0.50)'
  const TEXT_DIM  = dark ? 'rgba(255,255,255,0.38)' : 'rgba(27,38,59,0.42)'
  const TEXT_FAINT = dark ? 'rgba(255,255,255,0.24)' : 'rgba(27,38,59,0.28)'
  const BTN_UNSEL = dark ? 'rgba(255,255,255,0.07)' : 'rgba(27,38,59,0.07)'
  const BTN_TEXT  = dark ? 'rgba(255,255,255,0.50)' : 'rgba(27,38,59,0.55)'

  const [sel, setSel] = useState(1)
  const row = SESSIONS[sel]

  return (
    <div>
      <p style={{ fontSize: '13px', color: TEXT_MUT, marginBottom: '14px', fontWeight: 600 }}>
        Sessions per week (at £15/hr avg)
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {SESSIONS.map((s, i) => (
          <button key={i} onClick={() => setSel(i)} style={{
            padding: '9px 22px', borderRadius: '9px', cursor: 'pointer',
            fontWeight: 700, fontSize: '14px', border: 'none',
            background: sel === i ? CORAL : BTN_UNSEL,
            color: sel === i ? 'white' : BTN_TEXT,
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
            <div style={{ fontSize: '12px', color: TEXT_DIM, marginTop: '6px' }}>{label}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '12px', color: TEXT_FAINT, marginTop: '14px', textAlign: 'center' }}>
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


// ── Animated steps timeline — cards unveil as orange line draws down ───────────
function StepsTimeline() {
  const { dark } = useTheme()
  const BG     = dark ? '#1b263b' : '#f4f6fb'
  const BORDER = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT   = dark ? 'white' : '#1b263b'
  const TEXT_MUT = dark ? 'rgba(255,255,255,0.48)' : 'rgba(27,38,59,0.52)'
  const GRID   = gridStyle(dark)

  const sectionRef = useRef(null)
  const lineRef = useRef(null)
  const [revealedSteps, setRevealedSteps] = useState([])
  const [lineProgress, setLineProgress] = useState(0)
  const nodeRefs = useRef([])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const handleScroll = () => {
      const rect = section.getBoundingClientRect()
      const sectionTop = rect.top
      const sectionHeight = rect.height
      const vh = window.innerHeight

      const progress = Math.max(0, Math.min(1,
        (vh - sectionTop) / (sectionHeight + vh * 0.4)
      ))
      setLineProgress(progress)

      const newRevealed = []
      nodeRefs.current.forEach((node, i) => {
        if (!node) return
        const nodeRect = node.getBoundingClientRect()
        const nodeMid = nodeRect.top + nodeRect.height / 2
        if (nodeMid < vh * 0.72) newRevealed.push(i)
      })
      setRevealedSteps(newRevealed)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const dimText = dark ? 'rgba(255,255,255,0.30)' : 'rgba(27,38,59,0.35)'
  const veryDim = dark ? 'rgba(255,255,255,0.25)' : 'rgba(27,38,59,0.28)'
  const faint   = dark ? 'rgba(255,255,255,0.18)' : 'rgba(27,38,59,0.20)'
  const ultraDim = dark ? 'rgba(255,255,255,0.12)' : 'rgba(27,38,59,0.14)'
  const cardDim  = dark ? 'rgba(255,255,255,0.015)' : 'rgba(27,38,59,0.015)'
  const cardActive = dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.04)'
  const spineBg  = dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,38,59,0.08)'
  const nodeDim  = dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.05)'
  const nodeBorderDim = dark ? 'rgba(255,255,255,0.12)' : 'rgba(27,38,59,0.14)'

  return (
    <section ref={sectionRef} style={{ padding: '88px 24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes stepReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nodeGlow {
          from { box-shadow: 0 0 0 5px ${BG}, 0 0 0 6px ${CORAL}00; }
          to   { box-shadow: 0 0 0 5px ${BG}, 0 0 0 12px ${CORAL}00; }
        }
        .step-node-lit {
          animation: nodeGlow 1.2s ease-out forwards;
          border-color: ${CORAL} !important;
          background: ${CORAL}25 !important;
        }
      `}</style>
      <div aria-hidden style={{
        ...GRID,
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }} />
      <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '14px' }}>Getting started</p>
        <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, textAlign: 'center', margin: '0 0 56px', letterSpacing: '-0.02em', color: TEXT }}>
          Six steps. Under 10 minutes.
        </h2>

        <div style={{ position: 'relative' }}>
          <div aria-hidden style={{
            position: 'absolute', left: '50%', top: '20px', bottom: '20px',
            width: '1px', transform: 'translateX(-50%)',
            background: spineBg,
          }} />
          <div
            ref={lineRef}
            aria-hidden
            style={{
              position: 'absolute', left: '50%', top: '20px',
              width: '2px', transform: 'translateX(-50%)',
              background: `linear-gradient(to bottom, ${CORAL}, ${CORAL}55)`,
              height: `calc((100% - 40px) * ${lineProgress})`,
              transition: 'height 0.1s linear',
              boxShadow: `0 0 8px ${CORAL}55`,
              borderRadius: '1px',
            }}
          />

          {STEPS.map((step, i) => {
            const isLeft = i % 2 === 0
            const isRevealed = revealedSteps.includes(i)

            const card = (
              <div style={{
                padding: '22px 24px',
                background: isRevealed ? cardActive : cardDim,
                border: `1px solid ${isRevealed ? CORAL + '28' : BORDER}`,
                borderRadius: '14px',
                textAlign: isLeft ? 'right' : 'left',
                transition: 'border-color 0.4s, background 0.4s, box-shadow 0.4s',
                opacity: isRevealed ? 1 : 0.25,
                animation: isRevealed ? `stepReveal 0.5s cubic-bezier(0.16,1,0.3,1) both` : 'none',
                boxShadow: isRevealed ? `0 4px 20px ${CORAL}08` : 'none',
              }}
                onMouseEnter={e => { if (isRevealed) { e.currentTarget.style.borderColor = `${CORAL}50`; e.currentTarget.style.boxShadow = `0 8px 28px ${CORAL}14` }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isRevealed ? `${CORAL}28` : BORDER; e.currentTarget.style.boxShadow = isRevealed ? `0 4px 20px ${CORAL}08` : 'none' }}
              >
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  flexDirection: isLeft ? 'row-reverse' : 'row',
                  marginBottom: '8px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: isRevealed ? CORAL : veryDim }}>{step.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: isRevealed ? `${CORAL}80` : faint, letterSpacing: '0.06em' }}>{step.n}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '5px', color: isRevealed ? TEXT : dimText }}>{step.title}</div>
                <div style={{ fontSize: '12px', color: isRevealed ? TEXT_MUT : faint, lineHeight: 1.65 }}>{step.desc}</div>
              </div>
            )

            return (
              <div key={step.n}
                style={{ display: 'grid', gridTemplateColumns: '1fr 56px 1fr', alignItems: 'start', gap: '16px', marginBottom: i < 5 ? '20px' : 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {isLeft ? card : <div style={{ minHeight: '70px' }} />}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px' }}>
                  <div
                    ref={el => nodeRefs.current[i] = el}
                    className={isRevealed ? 'step-node-lit' : ''}
                    style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      background: isRevealed ? `${CORAL}22` : nodeDim,
                      border: `2px solid ${isRevealed ? CORAL + '80' : nodeBorderDim}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', zIndex: 2,
                      boxShadow: `0 0 0 5px ${BG}`,
                      transition: 'background 0.4s, border-color 0.4s',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isRevealed ? CORAL : veryDim }}>{step.icon}</span>
                  </div>
                </div>

                <div>
                  {!isLeft ? card : <div style={{ minHeight: '70px' }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function BecomeATutor() {
  const { dark } = useTheme()
  const BG      = dark ? '#1b263b' : '#f4f6fb'
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT    = dark ? 'white' : '#1b263b'
  const TEXT_MUT  = dark ? 'rgba(255,255,255,0.52)' : 'rgba(27,38,59,0.55)'
  const TEXT_DIM  = dark ? 'rgba(255,255,255,0.45)' : 'rgba(27,38,59,0.50)'
  const TEXT_FAINT = dark ? 'rgba(255,255,255,0.42)' : 'rgba(27,38,59,0.45)'
  const SURF    = dark ? 'rgba(255,255,255,0.02)' : 'rgba(27,38,59,0.02)'
  const SURF_HOVER = dark ? 'rgba(255,255,255,0.09)' : 'rgba(27,38,59,0.07)'
  const GRID    = gridStyle(dark)

  useReveal()

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT, fontFamily: 'inherit' }}>
      <style>{`
        [data-reveal]{opacity:0;transform:translateY(22px);transition:opacity 0.65s cubic-bezier(0.16,1,0.3,1),transform 0.65s cubic-bezier(0.16,1,0.3,1)}
        [data-reveal][data-from="left"]{transform:translate(-32px,0)}
        [data-reveal][data-from="right"]{transform:translate(32px,0)}
        [data-reveal].sws-vis{opacity:1;transform:translate(0,0)!important}
        [data-reveal][data-d="1"]{transition-delay:.08s}[data-reveal][data-d="2"]{transition-delay:.16s}
        [data-reveal][data-d="3"]{transition-delay:.24s}[data-reveal][data-d="4"]{transition-delay:.32s}
        [data-reveal][data-d="5"]{transition-delay:.40s}[data-reveal][data-d="6"]{transition-delay:.48s}
        @keyframes zeroCount{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
      `}</style>
      <Navbar />

      {/* ── HERO — 0% COMMISSION ───────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 24px 88px', textAlign: 'center', borderBottom: `1px solid ${BORDER}` }}>
        <div aria-hidden style={GRID} />
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 20%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 20%, transparent 80%)',
          ...GRID
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

          <div data-reveal data-d="1" style={{
            fontSize: 'clamp(96px, 15vw, 180px)',
            fontWeight: 900,
            color: CORAL,
            lineHeight: 1,
            letterSpacing: '-0.06em',
            marginBottom: '0',
            textShadow: `0 0 80px ${CORAL}30`,
            animation: 'zeroCount 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both',
          }}>
            0%
          </div>

          <h1 data-reveal data-d="2" style={{
            fontSize: 'clamp(18px, 2.5vw, 24px)',
            fontWeight: 700,
            margin: '6px 0 18px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: TEXT_MUT,
          }}>
            Platform commission — always
          </h1>

          <div data-reveal data-d="3" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '36px' }}>
            {['No setup fee', 'No monthly charge', 'No per-session cut'].map(label => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.04)', border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '6px 14px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#22c55e' }}>check_circle</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: dark ? 'rgba(255,255,255,0.72)' : 'rgba(27,38,59,0.75)' }}>{label}</span>
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

      {/* ── WHAT WE NEED FROM YOU ──────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '14px' }}>Requirements</p>
          <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, textAlign: 'center', margin: '0 0 44px', letterSpacing: '-0.02em', color: TEXT }}>
            Three things. That's it.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
            {[
              { icon: 'alternate_email', title: '.ac.uk email',      desc: 'Your active university email. We send a verification link.' },
              { icon: 'badge',           title: 'Proof of enrolment', desc: 'Student ID or enrolment letter — one upload.' },
              { icon: 'event',           title: 'Graduation date',    desc: 'Your expected month and year of graduation.' },
            ].map((req, i) => (
              <div key={req.icon} data-reveal data-d={String(i + 2)} data-from={i === 0 ? 'left' : i === 2 ? 'right' : undefined} style={{
                padding: '28px 22px', textAlign: 'center',
                background: `${CORAL}06`, border: `1px solid ${CORAL}20`, borderRadius: '18px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${CORAL}40`; e.currentTarget.style.boxShadow = `0 8px 28px ${CORAL}12` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${CORAL}20`; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${CORAL}15`, border: `1px solid ${CORAL}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL }}>{req.icon}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px', color: TEXT }}>{req.title}</div>
                <div style={{ fontSize: '12px', color: TEXT_DIM, lineHeight: 1.6 }}>{req.desc}</div>
              </div>
            ))}
          </div>

          <div data-reveal data-d="3" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '14px 20px', background: dark ? 'rgba(255,255,255,0.025)' : 'rgba(27,38,59,0.03)', border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: TEXT_FAINT, flexShrink: 0 }}>help_outline</span>
            <p style={{ fontSize: '13px', color: TEXT_FAINT, lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: TEXT_MUT }}>Not currently enrolled?</strong>{' '}
              Graduated or studied at a UK institution?{' '}
              <Link to="/contact" style={{ color: CORAL, fontWeight: 700, textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >Contact us</Link>{' '}— we review case-by-case.
            </p>
          </div>
        </div>
      </section>

      <Wave />

      {/* ── HOW TO GET STARTED ─────────────────────────────────────────────── */}
      <StepsTimeline />

      <Wave flip />

      {/* ── EARNINGS CALCULATOR ────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          ...GRID,
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 100% 50%, black 0%, transparent 60%)',
          maskImage: 'radial-gradient(ellipse 100% 100% at 100% 50%, black 0%, transparent 60%)',
        }} />
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <p data-reveal style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '14px' }}>What you could earn</p>
            <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.1, color: TEXT }}>
              Real income.<br />Zero cuts.
            </h2>
            <p data-reveal data-d="2" style={{ color: TEXT_DIM, fontSize: '15px', lineHeight: 1.75, margin: 0 }}>
              Every pound you charge goes directly to you. Set your own rate, teach on your own schedule, and build a real income around your studies.
            </p>
          </div>
          <div data-reveal data-d="2">
            <EarningsCalc />
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 96px' }}>
        <div data-reveal style={{ maxWidth: '860px', margin: '0 auto', padding: '52px', background: SURF, border: `1px solid ${BORDER}`, borderRadius: '20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', color: TEXT }}>Ready to start?</h3>
          <p style={{ color: TEXT_FAINT, fontSize: '14px', margin: '0 0 28px' }}>Free account. No card. Up in minutes.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ background: CORAL, color: 'white', padding: '13px 28px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: `0 4px 16px ${CORAL}30` }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Create your tutor profile</Link>
            <Link to="/how-it-works" style={{ background: SURF, border: `1px solid ${BORDER}`, color: TEXT_MUT, padding: '13px 28px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = SURF_HOVER}
              onMouseLeave={e => e.currentTarget.style.background = SURF}
            >How it works</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
