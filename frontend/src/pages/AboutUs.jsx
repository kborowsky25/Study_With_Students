import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
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

function AgencyFeeBreakdown() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '24px', maxWidth: '320px' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>
        Where your £30/hr goes
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {[
          { label: 'Tutor earns', pct: '50%', val: '£15', color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.02)', border: BORDER },
          { label: 'Agency fee',  pct: '50%', val: '£15', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: r.bg, border: `1px solid ${r.border}`, borderRadius: '9px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: r.color }}>{r.label}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)', marginLeft: '8px' }}>{r.pct}</span>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 900, color: r.color }}>{r.val}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: CORAL, marginBottom: '8px' }}>On StudyWithStudents</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${CORAL}08`, border: `1px solid ${CORAL}25`, borderRadius: '9px' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: CORAL }}>Tutor earns</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)', marginLeft: '8px' }}>100%</span>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 900, color: CORAL }}>£30 ✓</span>
        </div>
      </div>
    </div>
  )
}

function FunTutoringMock() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '24px', maxWidth: '320px' }}>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700 }}>Your XP</span>
          <span style={{ fontSize: '11px', color: CORAL, fontWeight: 800 }}>Level 3</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '72%', background: `linear-gradient(to right, ${CORAL}, #ff9f8e)`, borderRadius: '20px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', color: 'rgba(255,255,255,0.28)' }}>
          <span>360 XP</span><span>500 XP</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        {[
          { icon: 'workspace_premium', label: 'Rising Star', color: CORAL },
          { icon: 'star', label: 'Explorer', color: '#fbbf24' },
          { icon: 'groups', label: 'Community', color: '#60a5fa' },
        ].map(b => (
          <div key={b.label} style={{ flex: 1, textAlign: 'center', background: `${b.color}10`, border: `1px solid ${b.color}25`, borderRadius: '10px', padding: '10px 4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: b.color, display: 'block', marginBottom: '4px' }}>{b.icon}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: b.color }}>{b.label}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: CORAL }}>dashboard</span>
          <span style={{ fontSize: '11px', fontWeight: 700 }}>Dashboard</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {[
            { n: '12', l: 'sessions' },
            { n: '3', l: 'tutors' },
            { n: '340', l: 'XP', coral: true },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '16px', color: s.coral ? CORAL : 'white' }}>{s.n}</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.30)' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const VALUES = [
  { icon: 'percent',            title: '0% commission',        desc: 'Tutors keep every penny they earn' },
  { icon: 'verified',           title: 'UK universities only', desc: 'Every tutor verified via .ac.uk email' },
  { icon: 'volunteer_activism', title: 'Supporting UNICEF',    desc: 'Explorer revenue funds global education' },
  { icon: 'lock_open',          title: 'Core tutoring is free', desc: 'Finding & booking tutors costs nothing' },
  { icon: 'groups',             title: 'Community-first',      desc: 'Study rooms, forums, & peer learning' },
  { icon: 'emoji_events',       title: 'XP & reputation',      desc: 'Earn recognition for every contribution' },
]

const FOUNDING_TUTORS = [
  { initials: 'KB', name: 'Kiki B.',   uni: 'UCL',       color: CORAL,     role: 'Founder' },
  { initials: 'AL', name: 'Amara L.',  uni: "King's",    color: '#60a5fa', role: null },
  { initials: 'TM', name: 'Tom M.',    uni: 'Edinburgh', color: '#34d399', role: null },
  { initials: 'SP', name: 'Shreya P.', uni: 'Imperial',  color: '#a78bfa', role: null },
]

export default function AboutUs() {
  useReveal()

  return (
    <div style={{ background: BG, minHeight: '100vh', color: 'white', fontFamily: 'inherit' }}>
      <style>{`
        [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity 0.6s cubic-bezier(0.16,1,0.3,1),transform 0.6s cubic-bezier(0.16,1,0.3,1)}
        [data-reveal].sws-vis{opacity:1;transform:translateY(0)}
        [data-reveal][data-d="1"]{transition-delay:.10s}[data-reveal][data-d="2"]{transition-delay:.20s}
        [data-reveal][data-d="3"]{transition-delay:.30s}[data-reveal][data-d="4"]{transition-delay:.40s}
      `}</style>
      <Navbar />

      {/* ── HERO — diagonal split ─────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '420px', borderBottom: `1px solid ${BORDER}` }}>
        <style>{`
          @keyframes diagLineGrow {
            from { stroke-dashoffset: 1200; }
            to   { stroke-dashoffset: 0; }
          }
        `}</style>
        <div aria-hidden style={GRID_STYLE} />
        {/* Diagonal divider line */}
        <svg aria-hidden viewBox="0 0 1440 420" preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
        >
          <line x1="0" y1="380" x2="1440" y2="60"
            stroke={`${CORAL}20`} strokeWidth="1"
            strokeDasharray="1200" strokeDashoffset="1200"
            style={{ animation: 'diagLineGrow 1.4s ease 0.3s forwards' }}
          />
        </svg>
        {/* Ambient glows */}
        <div aria-hidden style={{ position: 'absolute', top: '-10%', left: '-5%', width: '50vw', height: '80%', background: `radial-gradient(ellipse, ${CORAL}07 0%, transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '50vw', height: '80%', background: `radial-gradient(ellipse, rgba(96,165,250,0.06) 0%, transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />

        {/* Top-left: first statement */}
        <div style={{ position: 'relative', zIndex: 2, padding: '80px 8% 0 8%' }}>
          <p data-reveal style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: CORAL, marginBottom: '20px' }}>Our story</p>
          <h1 data-reveal data-d="1" style={{
            fontSize: 'clamp(32px, 5vw, 62px)', fontWeight: 900,
            margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05,
            maxWidth: '640px', color: 'white',
          }}>
            We think tutors are getting scammed.
          </h1>
        </div>

        {/* Bottom-right: second statement */}
        <div style={{ position: 'relative', zIndex: 2, padding: '32px 8% 80px 8%', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right', maxWidth: '560px' }}>
            <h2 data-reveal data-d="2" style={{
              fontSize: 'clamp(22px, 3.8vw, 46px)', fontWeight: 800,
              margin: '0 0 18px', letterSpacing: '-0.025em', lineHeight: 1.1,
              color: CORAL, opacity: 0.85,
            }}>
              And tutoring should be fun.
            </h2>
            <p data-reveal data-d="3" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, margin: 0 }}>
              Built by a student tired of watching agencies take 50% — when the best tutors were already in the next lecture hall.
            </p>
          </div>
        </div>
      </section>

      <Wave />

      {/* ── STATS STRIP ───────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 24px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { stat: '0%', label: 'Commission taken', sub: 'Tutors keep every penny' },
            { stat: '£2', label: 'Explorer plan',    sub: 'The only cost, ever' },
            { stat: '🌍', label: 'UNICEF partner',   sub: 'Education for every child' },
          ].map((s, i) => (
            <div key={i} data-reveal data-d={String(i+1)} style={{ padding: '36px 24px', textAlign: 'center', borderRight: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-0.04em', color: CORAL, lineHeight: 1, marginBottom: '8px' }}>{s.stat}</div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.36)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <Wave flip />

      {/* ── STORY 1: Tutors are getting scammed ───────────────────────────── */}
      <section style={{ padding: '96px 24px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ ...GRID_STYLE, WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 0% 50%, black 0%, transparent 60%)', maskImage: 'radial-gradient(ellipse 100% 100% at 0% 50%, black 0%, transparent 60%)' }} />
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <p data-reveal style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '16px' }}>The problem</p>
            <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(24px, 3.2vw, 34px)', fontWeight: 800, margin: '0 0 24px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Tutors are getting scammed by the middleman.
            </h2>
            <p data-reveal data-d="2" style={{ color: 'rgba(255,255,255,0.52)', fontSize: '16px', lineHeight: 1.8, margin: '0 0 16px' }}>
              Tutoring agencies charge students £30/hr — and pocket half. The tutor sees £15. The student pays a premium. Nobody wins except the platform.
            </p>
            <p data-reveal data-d="3" style={{ color: 'rgba(255,255,255,0.52)', fontSize: '16px', lineHeight: 1.8, margin: '0 0 24px' }}>
              We cut the middleman out entirely. Students agree a rate directly with their tutor and pay 100% to them. We take nothing.
            </p>
            <div data-reveal data-d="3" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['0% commission', 'Direct payment', 'Tutor sets the rate'].map(pill => (
                <span key={pill} style={{ fontSize: '12px', fontWeight: 700, background: `${CORAL}12`, color: CORAL, border: `1px solid ${CORAL}28`, padding: '5px 12px', borderRadius: '20px' }}>{pill}</span>
              ))}
            </div>
          </div>
          <div data-reveal data-d="2" style={{ display: 'flex', justifyContent: 'center' }}>
            <AgencyFeeBreakdown />
          </div>
        </div>
      </section>

      <Wave />

      {/* ── STORY 2: Tutoring should be fun ──────────────────────────────── */}
      <section style={{ padding: '96px 24px', position: 'relative', overflow: 'hidden', borderTop: `1px solid ${BORDER}` }}>
        <div aria-hidden style={{ ...GRID_STYLE, WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 100% 50%, black 0%, transparent 60%)', maskImage: 'radial-gradient(ellipse 100% 100% at 100% 50%, black 0%, transparent 60%)' }} />
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div data-reveal data-d="1" style={{ display: 'flex', justifyContent: 'center', order: -1 }}>
            <FunTutoringMock />
          </div>
          <div>
            <p data-reveal style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '16px' }}>The vision</p>
            <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(24px, 3.2vw, 34px)', fontWeight: 800, margin: '0 0 24px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Tutoring should be fun and interactive.
            </h2>
            <p data-reveal data-d="2" style={{ color: 'rgba(255,255,255,0.52)', fontSize: '16px', lineHeight: 1.8, margin: '0 0 16px' }}>
              We built an XP system that makes learning feel like a game. Students level up by engaging with the platform. Tutors earn badges and boost their visibility by delivering great sessions.
            </p>
            <p data-reveal data-d="3" style={{ color: 'rgba(255,255,255,0.52)', fontSize: '16px', lineHeight: 1.8, margin: '0 0 24px' }}>
              Your dashboard tracks everything — sessions, messages, upcoming bookings, and XP progress — all in one place.
            </p>
            <div data-reveal data-d="3" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['XP levelling', 'Tutor badges', 'Live dashboards', 'Study rooms'].map(pill => (
                <span key={pill} style={{ fontSize: '12px', fontWeight: 700, background: `${CORAL}12`, color: CORAL, border: `1px solid ${CORAL}28`, padding: '5px 12px', borderRadius: '20px' }}>{pill}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Wave flip />

      {/* ── VALUES GRID ───────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ ...GRID_STYLE, WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)' }} />
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p data-reveal style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '14px' }}>What we stand for</p>
          <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, textAlign: 'center', margin: '0 0 48px', letterSpacing: '-0.02em' }}>Six principles behind every decision</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: BORDER, borderRadius: '20px', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            {VALUES.map((v, i) => (
              <div key={v.title} data-reveal data-d={String((i % 3) + 1)}
                style={{ background: BG, padding: '28px 30px', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                onMouseLeave={e => e.currentTarget.style.background = BG}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL, display: 'block', marginBottom: '12px' }}>{v.icon}</span>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>{v.title}</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)', margin: 0, lineHeight: 1.65 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Wave />

      {/* ── UNICEF ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div data-reveal style={{ maxWidth: '820px', margin: '0 auto', background: 'rgba(1,102,172,0.07)', border: '1px solid rgba(1,102,172,0.20)', borderRadius: '20px', padding: '36px 44px' }}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(1,102,172,0.18)', border: '1px solid rgba(1,102,172,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '28px' }}>🌍</span>
            </div>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(1,152,218,0.85)', margin: '0 0 6px' }}>Charity partner</p>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.01em' }}>UNICEF — Learning for Every Child</h3>
              <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
                A portion of every Explorer subscription funds UNICEF's education programmes. Over 190 countries. Over 1 billion children impacted. Education shouldn't be a privilege.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>
              {[{ n: '190+', l: 'Countries' }, { n: '1B+', l: 'Children' }].map(s => (
                <div key={s.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'rgba(1,152,218,0.85)', letterSpacing: '-0.02em' }}>{s.n}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUNDING TUTORS ───────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 96px' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p data-reveal style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '6px' }}>The beginning</p>
              <h2 data-reveal data-d="1" style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>Founding tutors</h2>
            </div>
            <Link to="/founding-tutors" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: CORAL, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Meet them all <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {FOUNDING_TUTORS.map((t, i) => (
              <div key={t.name} data-reveal data-d={String((i % 4) + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '12px', flex: '1 1 160px', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${t.color}35`}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${t.color}18`, border: `1px solid ${t.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: t.color, flexShrink: 0 }}>{t.initials}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{t.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '2px' }}>{t.uni}</div>
                  {t.role === 'Founder' && (
                    <div style={{ fontSize: '10px', color: CORAL, fontWeight: 700, marginTop: '2px' }}>Founder</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 96px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ ...GRID_STYLE, WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)' }} />
        <div data-reveal style={{ maxWidth: '820px', margin: '0 auto', padding: '52px', background: `${CORAL}07`, border: `1px solid ${CORAL}18`, borderRadius: '20px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Join us</h3>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 28px' }}>Whether you're here to learn or to teach.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ background: CORAL, color: 'white', padding: '12px 26px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: `0 4px 16px ${CORAL}30` }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Create your account</Link>
            <Link to="/become-tutor" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.70)', padding: '12px 26px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >Become a tutor</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
