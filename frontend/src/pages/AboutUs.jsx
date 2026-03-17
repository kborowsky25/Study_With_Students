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

// ── Shared grid background ────────────────────────────────────────────────────
const GRID_STYLE = {
  position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
  `,
  backgroundSize: '60px 60px',
}

// ── Wave divider ──────────────────────────────────────────────────────────────
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

// ── Product card mock (right side of mission) ─────────────────────────────────
function TutorCardMock() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
      borderRadius: '20px', padding: '24px', maxWidth: '300px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `${CORAL}22`, border: `2px solid ${CORAL}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', color: CORAL, flexShrink: 0 }}>AV</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '16px' }}>Alex V.</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', marginTop: '2px' }}>University of Oxford</div>
          <div style={{ display: 'flex', gap: '2px', marginTop: '5px' }}>
            {[1,2,3,4,5].map(i => <svg key={i} width="10" height="10" viewBox="0 0 10 10"><polygon points="5,1 6.2,3.8 9,4.2 7,6.2 7.6,9 5,7.5 2.4,9 3,6.2 1,4.2 3.8,3.8" fill={CORAL} /></svg>)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {['A-Level Maths','Further Maths','Statistics'].map(s => (
          <span key={s} style={{ fontSize: '10px', fontWeight: '700', background: `${CORAL}16`, color: CORAL, padding: '3px 9px', borderRadius: '6px' }}>{s}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${BORDER}` }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>£18<span style={{ fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.40)' }}>/hr</span></div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.36)', marginTop: '2px' }}>0% commission</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Message</div>
          <div style={{ background: CORAL, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', color: 'white', cursor: 'pointer', boxShadow: `0 4px 12px ${CORAL}38` }}>Book</div>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', lineHeight: '1.65', margin: 0 }}>
        "I love breaking down complex topics. I've been tutoring for 2 years and my students consistently improved their grades."
      </p>
    </div>
  )
}

const VALUES = [
  { icon: 'percent',           title: '0% commission',          desc: 'Tutors keep every penny they earn' },
  { icon: 'verified',          title: 'UK universities only',    desc: 'Every tutor verified via .ac.uk email' },
  { icon: 'volunteer_activism', title: 'Supporting UNICEF',      desc: 'Explorer revenue funds global education' },
  { icon: 'lock_open',         title: 'Core tutoring is free',   desc: 'Finding & booking tutors costs nothing' },
  { icon: 'groups',            title: 'Community-first',         desc: 'Study rooms, forums, & peer learning' },
  { icon: 'emoji_events',      title: 'XP & reputation',         desc: 'Earn recognition for every contribution' },
]

const FOUNDING_TUTORS = [
  { initials: 'KB', name: 'Kiki B.',   uni: 'UCL',      color: CORAL },
  { initials: 'AL', name: 'Amara L.',  uni: "King's",   color: '#60a5fa' },
  { initials: 'TM', name: 'Tom M.',    uni: 'Edinburgh', color: '#34d399' },
  { initials: 'SP', name: 'Shreya P.', uni: 'Imperial',  color: '#a78bfa' },
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

      {/* ── HERO — large manifesto + grid ─────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 24px 88px', borderBottom: `1px solid ${BORDER}` }}>
        <div aria-hidden style={GRID_STYLE} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 20%, transparent 80%)', maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 20%, transparent 80%)', ...GRID_STYLE }} />
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '400px', background: `radial-gradient(ellipse, ${CORAL}08 0%, transparent 65%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
          <p data-reveal style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: CORAL, marginBottom: '24px' }}>Our story</p>
          <h1 data-reveal data-d="1" style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, margin: '0 0 24px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            We believe education<br />belongs to everyone.
          </h1>
          <p data-reveal data-d="2" style={{ fontSize: '17px', color: 'rgba(255,255,255,0.48)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Built by a student who was tired of paying agencies a fortune — when the best tutors were already in the next lecture hall.
          </p>
        </div>
      </section>

      <Wave />

      {/* ── STATS STRIP ───────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 24px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { stat: '0%',   label: 'Commission taken',   sub: 'Tutors keep every penny' },
            { stat: '£2',   label: 'Explorer plan',      sub: 'The only cost, ever' },
            { stat: '🌍',   label: 'UNICEF partner',     sub: 'Education for every child' },
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

      {/* ── MISSION + PRODUCT PREVIEW ─────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ ...GRID_STYLE, WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 0% 50%, black 0%, transparent 60%)', maskImage: 'radial-gradient(ellipse 100% 100% at 0% 50%, black 0%, transparent 60%)' }} />
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <p data-reveal style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: '16px' }}>Our mission</p>
            <h2 data-reveal data-d="1" style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, margin: '0 0 24px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Cut out the middleman.<br />Connect students directly.
            </h2>
            <p data-reveal data-d="2" style={{ color: 'rgba(255,255,255,0.52)', fontSize: '16px', lineHeight: 1.8, margin: '0 0 16px' }}>
              Agencies charge students a premium and keep 30–50% for themselves. Brilliant tutors get underpaid. We built the direct alternative.
            </p>
            <p data-reveal data-d="3" style={{ color: 'rgba(255,255,255,0.52)', fontSize: '16px', lineHeight: 1.8, margin: 0 }}>
              Students pay tutors directly. We take 0%. An optional £2/month covers our community features — and a portion funds UNICEF's global education work.
            </p>
          </div>
          <div data-reveal data-d="2" style={{ display: 'flex', justifyContent: 'center' }}>
            <TutorCardMock />
          </div>
        </div>
      </section>

      <Wave />

      {/* ── FOUNDER ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 24px', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ ...GRID_STYLE, WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 100% 50%, black 0%, transparent 60%)', maskImage: 'radial-gradient(ellipse 100% 100% at 100% 50%, black 0%, transparent 60%)' }} />
        <div data-reveal style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', gap: '48px', alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: `linear-gradient(135deg, ${CORAL}45, ${CORAL}15)`, border: `2px solid ${CORAL}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '44px', color: CORAL, opacity: 0.75 }}>person</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', marginBottom: '12px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Kiki Boro</h3>
              <span style={{ fontSize: '13px', color: CORAL, fontWeight: 700 }}>Founder & Developer</span>
            </div>
            <blockquote style={{ fontSize: '17px', fontStyle: 'italic', color: 'rgba(255,255,255,0.62)', lineHeight: 1.75, margin: '0 0 16px', borderLeft: `3px solid ${CORAL}40`, paddingLeft: '16px' }}>
              "I knew brilliant tutors in my lectures charging almost nothing — and students paying agencies a fortune. That gap didn't make sense. So I built the bridge."
            </blockquote>
            <Link to="/how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: CORAL, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              How it works <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
            </Link>
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
              <div
                key={v.title}
                data-reveal
                data-d={String((i % 3) + 1)}
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
              <div
                key={t.name}
                data-reveal
                data-d={String((i % 4) + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '12px', flex: '1 1 160px', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${t.color}35`}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${t.color}18`, border: `1px solid ${t.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: t.color, flexShrink: 0 }}>{t.initials}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{t.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '2px' }}>{t.uni}</div>
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
