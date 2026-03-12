import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

// ── Inline SVG wave — `from` colour has wavy bottom edge flowing into `to` ──
function Wave({ from = '#1b263b', to = '#141d2e' }) {
  return (
    <div style={{ background: to, lineHeight: 0, overflow: 'hidden', display: 'block' }}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: '80px' }}>
        <path
          d="M0,0 L0,48 C360,80 720,16 1080,48 C1260,66 1380,55 1440,48 L1440,0 Z"
          fill={from}
        />
      </svg>
    </div>
  )
}

// ── Floating feature card — large SVG with coral badge pill ─────────────────
function FloatingCard({ img, label, animCls, style = {} }) {
  return (
    <div
      className={`animate-scale-in ${animCls}`}
      style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        ...style,
      }}
    >
      <img
        src={img}
        alt={label}
        style={{ width: '130px', height: '130px', objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))' }}
      />
      <span style={{
        background: '#ff725e',
        color: 'white',
        fontSize: '11px',
        fontWeight: '700',
        padding: '5px 14px',
        borderRadius: '40px',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 14px rgba(255,114,94,0.45)',
      }}>
        {label}
      </span>
    </div>
  )
}

const UNIS = [
  { src: '/static/images/homepage/oxf.jpg',      alt: 'Oxford'   },
  { src: '/static/images/homepage/cam.png',       alt: 'Cambridge'},
  { src: '/static/images/homepage/imperial.png',  alt: 'Imperial' },
  { src: '/static/images/homepage/ucl.png',       alt: 'UCL'      },
  { src: '/static/images/homepage/kcl.png',       alt: 'KCL'      },
  { src: '/static/images/homepage/nyu.png',       alt: 'NYU'      },
  { src: '/static/images/homepage/nus.jpg',       alt: 'NUS'      },
]

const SUBJECTS = [
  { icon: 'calculate',        label: 'Mathematics'      },
  { icon: 'science',          label: 'Physics'          },
  { icon: 'biotech',          label: 'Biology'          },
  { icon: 'water_drop',       label: 'Chemistry'        },
  { icon: 'code',             label: 'Computer Science' },
  { icon: 'account_balance',  label: 'Economics'        },
  { icon: 'translate',        label: 'English'          },
  { icon: 'history_edu',      label: 'History'          },
  { icon: 'gavel',            label: 'Law'              },
  { icon: 'psychology',       label: 'Psychology'       },
  { icon: 'engineering',      label: 'Engineering'      },
  { icon: 'medical_services', label: 'Medicine'         },
]

const REVIEWS = [
  { name: 'Shlonda', uni: 'UCL',       text: 'I found a great tutor who helped me understand biology better. I feel so much more confident now.' },
  { name: 'Tiffany', uni: 'Cambridge', text: 'Found an incredible maths tutor in 10 minutes. Passed my exam with a First!' },
  { name: 'Mark',    uni: 'Imperial',  text: 'As a tutor, getting 100% of what students pay makes such a massive difference to my income.' },
]

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#1b263b', color: 'white', overflowX: 'hidden' }}>
      <Navbar />

      {/* ── HERO — full viewport height ──────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          height: 'calc(100vh - 64px)',   /* subtract navbar */
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow behind title */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(255,114,94,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* ── Floating feature cards ── */}

        {/* Top-left: 1-to-1 Tutoring */}
        <FloatingCard
          img="/static/images/homepage/tutoring.svg"
          label="1-to-1 Tutoring"
          animCls="animate-float"
          style={{ top: '10%', left: '6%' }}
        />

        {/* Top-right: Student Forum */}
        <FloatingCard
          img="/static/images/homepage/forum1.svg"
          label="Student Forums"
          animCls="animate-float-3"
          style={{ top: '10%', right: '6%' }}
        />

        {/* Bottom-left: Events */}
        <FloatingCard
          img="/static/images/homepage/events.svg"
          label="Events"
          animCls="animate-float-2"
          style={{ bottom: '18%', left: '6%' }}
        />

        {/* Bottom-right: Uni Guide */}
        <FloatingCard
          img="/static/images/homepage/uniguide.svg"
          label="Uni Guidance"
          animCls="animate-float"
          style={{ bottom: '18%', right: '6%' }}
        />

        {/* Top-centre: Group Study Sessions */}
        <FloatingCard
          img="/static/images/homepage/group.svg"
          label="Group Study Sessions"
          animCls="animate-float-2"
          style={{ top: '7%', left: '50%', transform: 'translateX(-50%)' }}
        />

        {/* ── Central content ── */}
        <div className="animate-slide-up" style={{ textAlign: 'center', zIndex: 2, padding: '0 16px', maxWidth: '780px' }}>
          <h1
            style={{
              fontSize: 'clamp(32px, 5.5vw, 70px)',
              fontWeight: 900,
              lineHeight: 0.95,
              marginBottom: '18px',
              letterSpacing: '-0.025em',
            }}
          >
            MORE THAN JUST{' '}
            <span style={{ color: '#ff725e', fontStyle: 'italic' }}>ANOTHER</span>
            <br />TUTORING WEBSITE.
          </h1>

          <p
            className="animate-slide-up delay-200"
            style={{
              color: 'rgba(255,255,255,0.52)',
              fontSize: '16px',
              maxWidth: '480px',
              margin: '0 auto 24px',
              lineHeight: 1.65,
            }}
          >
            Connect with peer tutors from top universities.
            Zero commission, flexible scheduling, and a community built to help you succeed.
          </p>

          <div
            className="animate-slide-up delay-300"
            style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link to="/find-tutors"  className="btn-primary"   style={{ fontSize: '15px', padding: '13px 28px' }}>Find a Tutor →</Link>
            <Link to="/become-tutor" className="btn-secondary" style={{ fontSize: '15px', padding: '13px 28px' }}>Become a Tutor</Link>
          </div>
        </div>

        {/* ── First 100% bar — pinned to bottom of hero ── */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 0',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.015)',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.30)',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
          }}>
            ── The First 100% Student Lead Tutoring Website ──
          </p>
        </div>
      </section>

      {/* ── University logos strip (below fold) ──────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '28px 24px',
      }}>
        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.25)',
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: '18px',
        }}>
          Tutors from top universities
        </p>
        <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          {UNIS.map(({ src, alt }) => (
            <img
              key={alt}
              src={src}
              alt={alt}
              title={alt}
              style={{
                height: '36px',
                objectFit: 'contain',
                filter: 'grayscale(1) brightness(1.8) opacity(0.45)',
                transition: 'filter 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'grayscale(0) brightness(1) opacity(1)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'grayscale(1) brightness(1.8) opacity(0.45)' }}
            />
          ))}
        </div>
      </div>

      {/* ── Subjects ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 24px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 className="section-title">Every subject covered</h2>
          <p className="section-sub">From A-levels to postgrad — find experts in your field</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          {SUBJECTS.map(({ icon, label }) => (
            <Link
              key={label}
              to="/find-tutors"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '40px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'rgba(255,255,255,0.68)',
                fontSize: '14px', fontWeight: '500', textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,114,94,0.12)'
                e.currentTarget.style.borderColor = 'rgba(255,114,94,0.35)'
                e.currentTarget.style.color = '#ff725e'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.68)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Wave: navy → dark ─────────────────────────────────────────────────── */}
      <Wave from="#1b263b" to="#141d2e" />

      {/* ── Why choose us ─────────────────────────────────────────────────────── */}
      <section style={{ background: '#141d2e', padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 className="section-title">Why Study With Students?</h2>
            <p className="section-sub">A platform built for students, by students</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { icon: 'payments',          title: '0% Commission',     desc: 'Every penny goes directly to your tutor. No hidden fees. Ever.' },
              { icon: 'schedule',          title: 'Flexible Sessions',  desc: 'Book anytime. Your tutor fits around your timetable, not the other way round.' },
              { icon: 'laptop_chromebook', title: 'Online & In-Person', desc: 'Zoom or face-to-face — find tutors your way.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="glass-hover" style={{ padding: '30px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#ff725e', display: 'block', marginBottom: '14px' }}>{icon}</span>
                <h3 style={{ fontWeight: 700, fontSize: '18px', color: 'white', marginBottom: '10px' }}>{title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: '14px', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: dark → navy ─────────────────────────────────────────────────── */}
      <Wave from="#141d2e" to="#1b263b" />

      {/* ── Get started in 3 steps ────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 className="section-title">Get started in 3 steps</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          {[
            { img: '/static/images/homepage/step1.svg', n: '01', title: 'Create your account', desc: 'Sign up free in 60 seconds. No card needed.' },
            { img: '/static/images/homepage/step2.svg', n: '02', title: 'Find your tutor',      desc: 'Browse by subject, university, and availability.' },
            { img: '/static/images/homepage/step3.svg', n: '03', title: 'Start learning',       desc: 'Message, book, and learn — 0% platform fee.' },
          ].map(({ img, n, title, desc }) => (
            <div key={n} style={{ textAlign: 'center' }}>
              <img src={img} alt={title} style={{ width: '80%', maxHeight: '150px', objectFit: 'contain', marginBottom: '16px' }} />
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#ff725e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'white', fontWeight: 900, fontSize: '13px', boxShadow: '0 4px 16px rgba(255,114,94,0.4)' }}>
                {n}
              </div>
              <h3 style={{ fontWeight: 700, color: 'white', marginBottom: '6px', fontSize: '16px' }}>{title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Wave: navy → dark ─────────────────────────────────────────────────── */}
      <Wave from="#1b263b" to="#141d2e" />

      {/* ── Become a tutor CTA ────────────────────────────────────────────────── */}
      <section style={{ background: '#141d2e', padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: '16px' }}>Become a Tutor</h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '16px', lineHeight: 1.7, marginBottom: '24px' }}>
              Share your knowledge, set your own rates, and keep 100% of what students pay.
              No commission, no middlemen.
            </p>
            {['Keep 100% of your earnings', 'Set your own schedule and rates', 'Verified university student profile'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#ff725e', fontSize: '20px' }}>check_circle</span>
                <span style={{ color: 'rgba(255,255,255,0.68)', fontSize: '15px' }}>{item}</span>
              </div>
            ))}
            <Link to="/become-tutor" className="btn-primary" style={{ marginTop: '28px', display: 'inline-block', fontSize: '15px', padding: '13px 28px' }}>
              Start tutoring →
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src="/static/images/homepage/becoming_tutor.svg"
              alt="Become a tutor"
              className="animate-float"
              style={{ width: '85%', maxWidth: '380px' }}
            />
          </div>
        </div>
      </section>

      {/* ── Wave: dark → navy ─────────────────────────────────────────────────── */}
      <Wave from="#141d2e" to="#1b263b" />

      {/* ── Reviews ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px 80px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 className="section-title">Loved by students and tutors</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {REVIEWS.map(({ name, text, uni }) => (
            <div key={name} className="glass" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ff725e' }}>star</span>
                ))}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: '14px', lineHeight: 1.65, marginBottom: '18px' }}>
                "{text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,114,94,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff725e', fontWeight: 700, fontSize: '14px' }}>
                  {name[0]}
                </div>
                <div>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>{uni}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '48px 24px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'white', marginBottom: '14px' }}>
          Ready to start learning?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: '18px', marginBottom: '32px' }}>
          Join thousands of students getting ahead with peer tutoring.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup"       className="btn-primary"   style={{ fontSize: '16px', padding: '14px 32px' }}>Sign up — it's free</Link>
          <Link to="/become-tutor" className="btn-secondary" style={{ fontSize: '16px', padding: '14px 32px' }}>Become a tutor</Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
