import { Link } from '@tanstack/react-router'

const CORAL = '#ff725e'

export default function Footer() {
  return (
    <footer style={{
      '--fg': '255 255 255', // the footer stays navy in both themes
      background: '#141d2e',
      borderTop: '1px solid rgb(var(--fg) / 0.05)',
      color: 'white',
      fontFamily: '"Noto Sans JP", sans-serif',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 32px 32px' }}>

        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '40px', marginBottom: '48px' }}>

          {/* Brand */}
          <div>
            <p style={{ fontSize: '20px', fontWeight: 900, marginBottom: '10px' }}>
              Study<span style={{ color: CORAL }}>WithStudents</span>
            </p>
            <p style={{ color: 'rgb(var(--fg) / 0.38)', fontSize: '13px', lineHeight: 1.7, maxWidth: '260px', marginBottom: '18px' }}>
              Peer tutoring with 0% commission. University students helping university students — and funding education charities.
            </p>
            {/* Stats micro-strip */}
            <div style={{ display: 'flex', gap: '18px' }}>
              {[
                { val: '0%',  label: 'Commission' },
                { val: '50%', label: 'To charity'  },
              ].map(({ val, label }) => (
                <div key={label}>
                  <p style={{ fontSize: '16px', fontWeight: 900, color: CORAL, lineHeight: 1 }}>{val}</p>
                  <p style={{ fontSize: '11px', color: 'rgb(var(--fg) / 0.28)', marginTop: '2px' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <p style={{ fontWeight: 700, fontSize: '13px', color: 'rgb(var(--fg) / 0.70)', marginBottom: '14px', letterSpacing: '0.04em' }}>Platform</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Find Tutors',    to: '/find-tutors'  },
                { label: 'Become a Tutor', to: '/become-tutor' },
                { label: 'How It Works',   to: '/how-it-works' },
                { label: 'Pricing',        to: '/how-it-works' },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    style={{ color: 'rgb(var(--fg) / 0.40)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.color = CORAL }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--fg) / 0.40)' }}
                  >{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p style={{ fontWeight: 700, fontSize: '13px', color: 'rgb(var(--fg) / 0.70)', marginBottom: '14px', letterSpacing: '0.04em' }}>Company</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'About Us',        to: '/about'       },
                { label: 'Our Mission',     to: '/about'       },
                { label: 'Charity Impact',  to: '/about'       },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    style={{ color: 'rgb(var(--fg) / 0.40)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.color = CORAL }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--fg) / 0.40)' }}
                  >{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p style={{ fontWeight: 700, fontSize: '13px', color: 'rgb(var(--fg) / 0.70)', marginBottom: '14px', letterSpacing: '0.04em' }}>Account</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Sign Up Free', to: '/signup'    },
                { label: 'Log In',       to: '/login'     },
                { label: 'My Hub',       to: '/hub'       },
                { label: 'My Profile',   to: '/hub'       },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    style={{ color: 'rgb(var(--fg) / 0.40)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.color = CORAL }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--fg) / 0.40)' }}
                  >{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgb(var(--fg) / 0.05)',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <p style={{ color: 'rgb(var(--fg) / 0.22)', fontSize: '12px' }}>
            © {new Date().getFullYear()} StudyWithStudents. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ color: 'rgb(var(--fg) / 0.18)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>0% COMMISSION</span>
            <span style={{ color: 'rgb(var(--fg) / 0.10)', fontSize: '11px' }}>·</span>
            <span style={{ color: 'rgb(var(--fg) / 0.18)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>STUDENT-FIRST</span>
            <span style={{ color: 'rgb(var(--fg) / 0.10)', fontSize: '11px' }}>·</span>
            <span style={{ color: 'rgb(var(--fg) / 0.18)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>50% TO CHARITY</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
