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

const VALUE_CARDS = [
  {
    icon: 'payments',
    title: 'Make Everything You Earn',
    desc: 'Every penny students pay goes directly to you. 0% platform commission — always.',
  },
  {
    icon: 'tune',
    title: 'Set Your Own Rates',
    desc: 'You decide what to charge. Set any hourly rate and update it whenever you like.',
  },
  {
    icon: 'event_available',
    title: 'Flexible and Reliable',
    desc: 'Tutor on your schedule. Accept or decline session requests as they suit you.',
  },
]

const STEPS = [
  {
    n: '1',
    heading: 'Create an account\nand log in',
    icon: 'person_add',
  },
  {
    n: '2',
    heading: 'Verify your account\nand put your info',
    icon: 'verified',
  },
  {
    n: '3',
    heading: 'Start Tutoring\nand start making your nights out easier',
    icon: 'school',
  },
]

export default function BecomeATutor() {
  return (
    <div style={{ minHeight: '100vh', background: '#1b263b', color: 'white', overflowX: 'hidden' }}>
      <Navbar />

      {/* ── Hero: title + steps + space.svg ─────────────────────────── */}
      <section style={{ padding: '40px 32px 36px', maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '64px',
            alignItems: 'center',
          }}
        >
          {/* Left: badge + title + 3-step process + CTA */}
          <div className="animate-slide-up">
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,114,94,0.10)', border: '1px solid rgba(255,114,94,0.22)',
              borderRadius: '40px', padding: '6px 16px', marginBottom: '22px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ff725e' }}>school</span>
              <span style={{ color: '#ff725e', fontSize: '13px', fontWeight: '600' }}>Join 500+ peer tutors</span>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 'clamp(32px, 4.5vw, 54px)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: '44px',
            }}>
              Want to become<br />a <span style={{ color: '#ff725e' }}>tutor?</span>
            </h1>

            {/* 3-step process with horizontal connecting line */}
            <div style={{ position: 'relative' }}>
              {/* Connecting line */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                right: '20px',
                height: '2px',
                background: 'linear-gradient(90deg, #ff725e 0%, rgba(255,114,94,0.25) 100%)',
                zIndex: 0,
              }} />

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                position: 'relative',
                zIndex: 1,
              }}>
                {STEPS.map(({ n, heading }) => (
                  <div
                    key={n}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '12px',
                    }}
                  >
                    {/* Number circle */}
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      background: '#ff725e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: '18px', color: 'white', flexShrink: 0,
                      boxShadow: '0 4px 16px rgba(255,114,94,0.45)',
                    }}>
                      {n}
                    </div>
                    <p style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.60)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                    }}>
                      {heading}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/signup"
              className="btn-primary"
              style={{ marginTop: '36px', display: 'inline-block', fontSize: '16px', padding: '14px 32px' }}
            >
              Become a tutor →
            </Link>
          </div>

          {/* Right: space.svg illustration */}
          <div
            className="animate-scale-in delay-200"
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <img
              src="/static/images/becometutor/space.svg"
              alt="Tutor in space"
              className="animate-float"
              style={{ width: '100%', maxWidth: '440px' }}
            />
          </div>
        </div>
      </section>

      {/* ── Wave → Value cards (inline SVG, no dead space) ───────────── */}
      <Wave from="#1b263b" to="#141d2e" />

      {/* ── Value cards ───────────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: '#141d2e' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 className="section-title">Why tutor with us?</h2>
            <p className="section-sub">Everything you need, nothing you don't</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {VALUE_CARDS.map(({ icon, title, desc }, i) => (
              <div
                key={title}
                className={`glass-hover animate-slide-up delay-${(i + 1) * 200}`}
                style={{ padding: '36px 26px', textAlign: 'center' }}
              >
                <div style={{
                  width: '64px', height: '64px', borderRadius: '22px',
                  background: 'rgba(255,114,94,0.12)', border: '1px solid rgba(255,114,94,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 18px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '34px', color: '#ff725e' }}>{icon}</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '18px', color: 'white', marginBottom: '10px' }}>{title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '14px', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 32px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {[['0%', 'Platform fee'], ['100%', 'Goes to tutors'], ['∞', 'Scale possible']].map(([val, label]) => (
            <div key={label}>
              <p style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 900, color: '#ff725e', lineHeight: 1.1 }}>{val}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', marginTop: '6px' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px 80px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: 'white', marginBottom: '14px' }}>
          Ready to start <span style={{ color: '#ff725e' }}>teaching?</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: '16px', marginBottom: '28px' }}>
          Set up your tutor profile in under 5 minutes. No fees, no contracts.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup" className="btn-primary"   style={{ fontSize: '16px', padding: '13px 32px' }}>Create account</Link>
          <Link to="/login"  className="btn-secondary" style={{ fontSize: '16px', padding: '13px 32px' }}>Already a member?</Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
