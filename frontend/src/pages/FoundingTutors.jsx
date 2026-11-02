import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const BG     = '#1b263b'
const CORAL  = '#ff725e'
const BORDER = 'rgb(var(--fg) / 0.08)'

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

const GRADS = [
  `linear-gradient(135deg, #ff725e, #ff9a3c)`,
  'linear-gradient(135deg, #60a5fa, #818cf8)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #f472b6, #ec4899)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #fb923c, #ef4444)',
  'linear-gradient(135deg, #22d3ee, #0284c7)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
]

const FOUNDING_TUTORS = [
  {
    name: 'Tutor 1',
    university: 'University of Oxford',
    subjects: ['Mathematics', 'Further Maths'],
    bio: 'One of the founding tutors who helped shape this platform from day one.',
  },
  {
    name: 'Tutor 2',
    university: 'Imperial College London',
    subjects: ['Physics', 'Engineering'],
    bio: 'Passionate about making physics accessible to every student.',
  },
  {
    name: 'Tutor 3',
    university: 'University of Cambridge',
    subjects: ['Chemistry', 'Biology'],
    bio: 'Believes every student deserves a brilliant teacher at a fair price.',
  },
  {
    name: 'Tutor 4',
    university: 'University College London',
    subjects: ['Economics', 'Statistics'],
    bio: 'Breaking down complex concepts into simple, intuitive ideas.',
  },
  {
    name: 'Tutor 5',
    university: "King's College London",
    subjects: ['English Literature', 'History'],
    bio: 'Helping students find their voice and their confidence in writing.',
  },
  {
    name: 'Tutor 6',
    university: 'University of Edinburgh',
    subjects: ['Computer Science', 'Python'],
    bio: 'Making coding click for students who think they can\'t do it.',
  },
]

function TutorCard({ tutor, idx, delay }) {
  const initials = tutor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const grad     = GRADS[idx % GRADS.length]

  return (
    <div
      data-reveal
      data-d={delay}
      style={{
        background: 'rgb(var(--fg) / 0.03)',
        border: `1px solid ${BORDER}`,
        borderRadius: '18px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${CORAL}35`; e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.2)` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', color: 'white', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
          {initials}
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 3px', letterSpacing: '-0.01em' }}>{tutor.name}</h3>
          <p style={{ fontSize: '12px', color: 'rgb(var(--fg) / 0.45)', margin: 0 }}>{tutor.university}</p>
        </div>
      </div>

      {/* Subjects */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {tutor.subjects.map((s, i) => {
          const c = [CORAL, '#60a5fa', '#34d399', '#a78bfa'][i % 4]
          return (
            <span key={s} style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: `${c}14`, color: c, border: `1px solid ${c}28` }}>
              {s}
            </span>
          )
        })}
      </div>

      {/* Bio */}
      <p style={{ fontSize: '13px', color: 'rgb(var(--fg) / 0.48)', lineHeight: 1.65, margin: 0 }}>
        {tutor.bio}
      </p>

      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', alignSelf: 'flex-start', background: `${CORAL}12`, border: `1px solid ${CORAL}25`, borderRadius: '20px', padding: '3px 10px' }}>
        <span style={{ fontSize: '9px' }}>⭐</span>
        <span style={{ fontSize: '10px', fontWeight: '700', color: CORAL, letterSpacing: '0.04em' }}>FOUNDING TUTOR</span>
      </div>
    </div>
  )
}

export default function FoundingTutors() {
  useReveal()

  return (
    <div style={{ '--fg': '255 255 255', background: BG, minHeight: '100vh', color: 'white', fontFamily: 'inherit' }}>
      <style>{`
        [data-reveal] {
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1);
        }
        [data-reveal].sws-vis { opacity: 1; transform: translateY(0); }
        [data-reveal][data-d="1"] { transition-delay: 0.07s; }
        [data-reveal][data-d="2"] { transition-delay: 0.14s; }
        [data-reveal][data-d="3"] { transition-delay: 0.21s; }
      `}</style>
      <Navbar />

      {/* Header */}
      <div style={{ padding: '72px 24px 64px', textAlign: 'center', borderBottom: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', borderRadius: '50%', background: `radial-gradient(circle, ${CORAL}06 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <p style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.16em', textTransform: 'uppercase', color: CORAL, marginBottom: '16px', position: 'relative', zIndex: 1 }}>
          The originals
        </p>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '800', margin: '0 0 16px', letterSpacing: '-0.02em', position: 'relative', zIndex: 1 }}>
          Founding Tutors
        </h1>
        <p style={{ color: 'rgb(var(--fg) / 0.45)', fontSize: '17px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.65, position: 'relative', zIndex: 1 }}>
          The brilliant people who believed in this platform from day one — and helped it become what it is.
        </p>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {FOUNDING_TUTORS.map((tutor, i) => (
            <TutorCard key={tutor.name} tutor={tutor} idx={i} delay={String((i % 3) + 1)} />
          ))}
        </div>

        {/* CTA */}
        <div data-reveal style={{ marginTop: '80px', padding: '48px', background: 'rgb(var(--fg) / 0.02)', border: `1px solid ${BORDER}`, borderRadius: '18px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Want to tutor on the platform?</h3>
          <p style={{ color: 'rgb(var(--fg) / 0.45)', fontSize: '15px', margin: '0 0 28px' }}>0% commission. Set your own rate. Teach when it suits you.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/become-tutor" style={{ background: CORAL, color: 'white', padding: '12px 26px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', textDecoration: 'none', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Become a tutor</Link>
            <Link to="/find-tutors" style={{ background: 'rgb(var(--fg) / 0.05)', border: `1px solid ${BORDER}`, color: 'rgb(var(--fg) / 0.75)', padding: '12px 26px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', textDecoration: 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--fg) / 0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgb(var(--fg) / 0.05)'}
            >Browse all tutors</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
