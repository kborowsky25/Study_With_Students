import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

// Seamless inline SVG wave — no dead space, `from` colour flows into `to`
function Wave({ from = '#1b263b', to = '#141d2e', flip = false }) {
  const d = flip
    ? 'M0,80 L0,32 C360,0 720,64 1080,32 C1260,14 1380,26 1440,32 L1440,80 Z'
    : 'M0,0 L0,48 C360,80 720,16 1080,48 C1260,66 1380,55 1440,48 L1440,0 Z'
  return (
    <div style={{ background: to, lineHeight: 0, overflow: 'hidden', display: 'block' }}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: '80px' }}>
        <path d={d} fill={from} />
      </svg>
    </div>
  )
}

const FEATURES = [
  { img: '/static/images/howitworks/tutors.svg', label: 'Find tutors' },
  { img: '/static/images/howitworks/uni.svg',    label: 'Get university guidance' },
  { img: '/static/images/howitworks/events.svg', label: 'Discover events near you' },
  { img: '/static/images/howitworks/group.svg',  label: 'Join study groups' },
  { img: '/static/images/howitworks/forum.svg',  label: 'Explore student and tutor forums' },
]

export default function HowItWorks() {
  return (
    <div style={{ minHeight: '100vh', background: '#1b263b', color: 'white', overflowX: 'hidden' }}>
      <Navbar />

      {/* ── Hero split layout ─────────────────────────────────────────── */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 32px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '64px',
        alignItems: 'center',
        minHeight: '85vh',
      }}>

        {/* Left: Big title + description + CTA */}
        <div className="animate-slide-up">
          <p style={{
            color: '#ff725e', fontSize: '12px', fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '18px',
          }}>
            Study With Students
          </p>

          <h1 style={{
            fontSize: 'clamp(42px, 5.5vw, 72px)',
            fontWeight: 900,
            lineHeight: 1.0,
            marginBottom: '22px',
            letterSpacing: '-0.02em',
          }}>
            Do more<br />
            than just<br />
            <em style={{ color: '#ff725e', fontStyle: 'italic' }}>learn.</em>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.52)',
            fontSize: '16px',
            lineHeight: 1.75,
            marginBottom: '36px',
            maxWidth: '400px',
          }}>
            A platform that goes beyond tutoring — connecting students with expert peers,
            study groups, local events, and a community that helps you truly thrive at university.
          </p>

          <Link to="/signup" className="btn-primary" style={{ fontSize: '16px', padding: '14px 32px' }}>
            Start My Journey →
          </Link>
        </div>

        {/* Right: staggered feature items with circular SVG icons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FEATURES.map(({ img, label }, i) => (
            <div
              key={label}
              className={`animate-slide-up delay-${(i + 1) * 100}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                borderRadius: '16px',
                marginLeft: i % 2 === 1 ? '32px' : '0',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.2s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,114,94,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,114,94,0.22)'
                e.currentTarget.style.marginLeft = i % 2 === 1 ? '40px' : '8px'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.marginLeft = i % 2 === 1 ? '32px' : '0'
              }}
            >
              {/* Circular SVG container */}
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(255,114,94,0.10)',
                border: '1px solid rgba(255,114,94,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden', padding: '9px',
              }}>
                <img src={img} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              {/* Label */}
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.80)' }}>
                {label}
              </span>

              {/* Arrow */}
              <span
                className="material-symbols-outlined"
                style={{ marginLeft: 'auto', fontSize: '18px', color: 'rgba(255,114,94,0.50)' }}
              >
                arrow_forward
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Wave → How it works steps (inline SVG, no dead space) ────── */}
      <Wave from="#1b263b" to="#141d2e" />

      {/* ── How it works steps ────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: '#141d2e' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 className="section-title">How it works in 3 steps</h2>
            <p className="section-sub">Get started in minutes</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { icon: 'person_add',    n: '01', title: 'Create your account', desc: 'Sign up free in seconds. No credit card required.' },
              { icon: 'manage_search', n: '02', title: 'Find your tutor',      desc: 'Browse by subject, university, and availability to find the perfect match.' },
              { icon: 'video_call',    n: '03', title: 'Start learning',       desc: 'Book sessions, message directly, pay your tutor — 0% platform fee.' },
            ].map(({ icon, n, title, desc }) => (
              <div key={n} className="glass-hover" style={{ padding: '28px 24px', textAlign: 'center' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '18px',
                  background: 'rgba(255,114,94,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '30px', color: '#ff725e' }}>{icon}</span>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#ff725e', letterSpacing: '0.12em', marginBottom: '8px' }}>
                  {n}
                </div>
                <h3 style={{ fontWeight: 700, color: 'white', fontSize: '17px', marginBottom: '10px' }}>{title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform features ─────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 className="section-title">Everything in one place</h2>
          <p className="section-sub">All the tools you need to succeed at university</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {[
            { icon: 'manage_search',    title: 'Smart tutor search',    desc: 'Filter by subject, university, availability, and price.' },
            { icon: 'chat',             title: 'Direct messaging',      desc: 'No middlemen. Talk directly with your tutor before committing.' },
            { icon: 'calendar_month',   title: 'Session scheduling',    desc: 'Book sessions with reminders and Google/Outlook calendar sync.' },
            { icon: 'groups',           title: 'Study rooms',           desc: 'Join group virtual study sessions for collaborative learning.' },
            { icon: 'forum',            title: 'Community forum',       desc: 'Ask questions, share knowledge, connect with other students.' },
            { icon: 'payments',         title: '0% commission',         desc: 'Every penny you pay goes directly to your tutor. Always.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="glass-hover" style={{ padding: '22px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#ff725e', display: 'block', marginBottom: '10px' }}>{icon}</span>
              <h3 style={{ fontWeight: 700, color: 'white', fontSize: '15px', marginBottom: '6px' }}>{title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: 'rgba(22,31,48,0.60)' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: 'white', marginBottom: '14px' }}>
            Ready to get started?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: '16px', marginBottom: '28px' }}>
            Join thousands of students learning smarter with peer tutors.
          </p>
          <Link to="/signup" className="btn-primary" style={{ fontSize: '16px', padding: '14px 36px' }}>
            Create free account →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
