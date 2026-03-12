import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

function Wave({ from = '#1b263b', to = '#141d2e' }) {
  return (
    <div style={{ background: to, lineHeight: 0, overflow: 'hidden', display: 'block' }}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: '80px' }}>
        <path d="M0,0 L0,48 C360,80 720,16 1080,48 C1260,66 1380,55 1440,48 L1440,0 Z" fill={from} />
      </svg>
    </div>
  )
}

const VALUES = [
  {
    img: '/static/images/aboutus/community.jpg',
    icon: 'groups',
    title: 'Community',
    desc: 'We believe learning happens best together. Our platform connects students who lift each other up — building friendships that last beyond exams.',
  },
  {
    img: '/static/images/aboutus/excellence.jpg',
    icon: 'workspace_premium',
    title: 'Excellence',
    desc: 'We hold ourselves and our tutors to the highest standards. Every tutor profile is student-verified, so you always get the best.',
  },
  {
    img: '/static/images/aboutus/innovation.jpg',
    icon: 'tips_and_updates',
    title: 'Innovation',
    desc: "We're constantly building features to make studying more efficient and enjoyable — from study rooms to real-time messaging.",
  },
]

const TEAM = [
  {
    photo: '/static/images/aboutus/kilian.jpeg',
    name: 'Kilian',
    role: 'Co-founder & Engineer',
    desc: 'Computer Science student passionate about making education accessible for everyone.',
  },
  {
    photo: '/static/images/aboutus/mickey.jpg',
    name: 'Mickey',
    role: 'Co-founder & Growth',
    desc: 'Economics graduate who believes quality tutoring should never be a luxury.',
  },
]

const STATS = [
  { value: '0%',   label: 'Commission — ever'   },
  { value: '100%', label: 'Goes to tutors'       },
  { value: '500+', label: 'Active peer tutors'   },
]

export default function AboutUs() {
  return (
    <div style={{ minHeight: '100vh', background: '#1b263b', color: 'white', overflowX: 'hidden', fontFamily: '"Noto Sans JP", sans-serif' }}>
      <Navbar />

      {/* ── Hero: split layout ───────────────────────────────────────────────── */}
      <section style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '48px',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 32px',
      }}>
        {/* Left: headline + tagline + CTA */}
        <div className="animate-slide-up">
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,114,94,0.10)', border: '1px solid rgba(255,114,94,0.22)',
            borderRadius: '40px', padding: '6px 16px', marginBottom: '24px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ff725e' }}>favorite</span>
            <span style={{ color: '#ff725e', fontSize: '13px', fontWeight: '600' }}>Built by students, for students</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 4.5vw, 58px)',
            fontWeight: 900,
            lineHeight: 1.05,
            marginBottom: '20px',
            letterSpacing: '-0.02em',
          }}>
            We got tired of<br />
            <span style={{ color: '#ff725e' }}>paying the big</span><br />
            tutoring sites.
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.52)',
            fontSize: '16px',
            lineHeight: 1.75,
            maxWidth: '420px',
            marginBottom: '36px',
          }}>
            So we built our own — with 0% commission, forever.
            StudyWithStudents connects students directly with peer tutors from the UK's top universities. No middlemen. No hidden fees.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Link to="/find-tutors"  className="btn-primary"   style={{ fontSize: '15px', padding: '13px 28px' }}>Find a Tutor →</Link>
            <Link to="/become-tutor" className="btn-secondary" style={{ fontSize: '15px', padding: '13px 28px' }}>Become a Tutor</Link>
          </div>
        </div>

        {/* Right: earth SVG + floating stat chips */}
        <div className="animate-scale-in delay-200" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/static/images/aboutus/earth.svg"
            alt="Global learning community"
            className="animate-float"
            style={{ width: '85%', maxWidth: '420px', filter: 'drop-shadow(0 20px 60px rgba(255,114,94,0.18))' }}
          />

          {/* Floating chip: 0% Commission */}
          <div style={{
            position: 'absolute', top: '10%', left: '2%',
            background: 'rgba(255,114,94,0.15)',
            border: '1px solid rgba(255,114,94,0.30)',
            borderRadius: '12px', padding: '10px 16px',
            backdropFilter: 'blur(12px)',
          }}>
            <p style={{ color: '#ff725e', fontWeight: 900, fontSize: '20px', lineHeight: 1 }}>0%</p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '3px' }}>Commission</p>
          </div>

          {/* Floating chip: 500+ Tutors */}
          <div style={{
            position: 'absolute', bottom: '15%', right: '2%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px', padding: '10px 16px',
            backdropFilter: 'blur(12px)',
          }}>
            <p style={{ color: 'white', fontWeight: 900, fontSize: '20px', lineHeight: 1 }}>500+</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: '3px' }}>Peer tutors</p>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,114,94,0.06)',
        borderTop: '1px solid rgba(255,114,94,0.12)',
        borderBottom: '1px solid rgba(255,114,94,0.12)',
        padding: '36px 24px',
      }}>
        <div style={{
          maxWidth: '800px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center',
        }}>
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 900, color: '#ff725e', lineHeight: 1 }}>{value}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', marginTop: '6px' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Wave: navy → dark ────────────────────────────────────────────────── */}
      <Wave from="#1b263b" to="#141d2e" />

      {/* ── Our Mission ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#141d2e', padding: '80px 32px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#ff725e', display: 'block', marginBottom: '20px' }}>
            rocket_launch
          </span>
          <h2 className="section-title" style={{ marginBottom: '20px' }}>Our Mission</h2>
          <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: '18px', lineHeight: 1.8, maxWidth: '680px', margin: '0 auto 36px' }}>
            Education should be affordable and accessible. When a tutor earns £30/hour but a student pays £40, something's broken.
            We connect them directly — <strong style={{ color: 'white' }}>no middleman, no cuts, no hidden fees.</strong>
          </p>

          {/* 3-column feature list */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {[
              { icon: 'payments',     text: 'No hidden fees — ever' },
              { icon: 'handshake',    text: 'Direct student-tutor connection' },
              { icon: 'verified',     text: 'Verified university students' },
            ].map(({ icon, text }) => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 18px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#ff725e', flexShrink: 0 }}>{icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.68)', fontSize: '14px', fontWeight: '500', textAlign: 'left' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: dark → navy ────────────────────────────────────────────────── */}
      <Wave from="#141d2e" to="#1b263b" />

      {/* ── What we stand for ────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <h2 className="section-title">What we stand for</h2>
          <p className="section-sub">The principles that guide everything we build</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {VALUES.map(({ img, icon, title, desc }, i) => (
            <div
              key={title}
              className={`animate-slide-up delay-${(i + 1) * 150}`}
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                transition: 'transform 0.3s ease, border-color 0.3s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.borderColor = 'rgba(255,114,94,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
              }}
            >
              {/* Image */}
              <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                <img
                  src={img}
                  alt={title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.55) saturate(0.7)' }}
                />
                <div style={{
                  position: 'absolute', bottom: '14px', left: '16px',
                  background: 'rgba(255,114,94,0.90)',
                  borderRadius: '10px', padding: '6px 10px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'white' }}>{icon}</span>
                  <span style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>{title}</span>
                </div>
              </div>
              {/* Text */}
              <div style={{ padding: '22px 24px' }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', lineHeight: 1.7 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Wave: navy → dark ────────────────────────────────────────────────── */}
      <Wave from="#1b263b" to="#141d2e" />

      {/* ── Meet the team ────────────────────────────────────────────────────── */}
      <section style={{ background: '#141d2e', padding: '80px 32px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 className="section-title">Meet the team</h2>
            <p className="section-sub">Two students fed up with overpriced tutoring platforms</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '700px', margin: '0 auto' }}>
            {TEAM.map(({ photo, name, role, desc }, i) => (
              <div
                key={name}
                className={`animate-slide-up delay-${(i + 1) * 200}`}
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'center',
                  transition: 'transform 0.3s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ height: '220px', overflow: 'hidden' }}>
                  <img
                    src={photo}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  />
                </div>
                <div style={{ padding: '22px 24px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '20px', color: 'white', marginBottom: '4px' }}>{name}</h3>
                  <p style={{ color: '#ff725e', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>{role}</p>
                  <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '14px', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: dark → navy ────────────────────────────────────────────────── */}
      <Wave from="#141d2e" to="#1b263b" />

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'white', marginBottom: '14px' }}>
          Ready to join the<br /><span style={{ color: '#ff725e' }}>movement?</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '16px', marginBottom: '28px' }}>
          Sign up free today — no commission, no contracts, just learning.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup"       className="btn-primary"   style={{ fontSize: '16px', padding: '14px 32px' }}>Create free account</Link>
          <Link to="/how-it-works" className="btn-secondary" style={{ fontSize: '16px', padding: '14px 32px' }}>How it works</Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
