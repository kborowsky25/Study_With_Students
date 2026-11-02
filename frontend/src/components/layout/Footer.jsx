import { Link } from '@tanstack/react-router'
import { Logo } from '../brand/Logo'

// The original footer: logo, two columns of links, and the rights line between rules.
// Navy in both themes. Styles: styles/marketing.css (.mk-footer).

const COLUMNS = [
  {
    title: 'About the company',
    links: [
      { to: '/about',           label: 'About us' },
      { to: '/how-it-works',    label: 'How it works' },
      { to: '/become-tutor',    label: 'Become a tutor' },
      { to: '/founding-tutors', label: 'Founding tutors' },
    ],
  },
  {
    title: 'Quick shortcuts',
    links: [
      { to: '/signup',      label: 'Sign up' },
      { to: '/login',       label: 'Log in' },
      { to: '/find-tutors', label: 'Find a tutor' },
      { to: '/hub',         label: 'Your dashboard' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer-grid">
          <div className="mk-footer-brand">
            <Link to="/" className="mk-logo" aria-label="Study with Students, home">
              <Logo size={28} />
            </Link>
            <p>The first 100% student led tutoring website. Free to join, and tutors keep 100% of their rate.</p>
          </div>
          {COLUMNS.map(({ title, links }) => (
            <nav key={title} className="mk-footer-col" aria-label={title}>
              <h2>{title}</h2>
              {links.map(({ to, label }) => <Link key={label} to={to}>{label}</Link>)}
            </nav>
          ))}
        </div>
        <p className="mk-rights">© Study with Students {new Date().getFullYear()}. All rights reserved.</p>
      </div>
    </footer>
  )
}
