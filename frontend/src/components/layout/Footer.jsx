import { Link } from '@tanstack/react-router'
import { Logo } from '../brand/Logo'

// Public-site footer: the logo and one line, four columns of links (the subjects link
// to their public pages), and the rights line. Styles: styles/marketing.css (.mk-footer).

const SUBJECTS = [
  ['mathematics', 'Mathematics'],
  ['physics', 'Physics'],
  ['chemistry', 'Chemistry'],
  ['biology', 'Biology'],
  ['computer-science', 'Computer Science'],
  ['economics', 'Economics'],
]

const COLUMNS = [
  {
    title: 'Learn',
    links: [
      { to: '/tutors',       label: 'Find a tutor' },
      { to: '/how-it-works', label: 'How it works' },
      { to: '/how-it-works', hash: 'pricing', label: 'Pricing' },
      { to: '/signup',       label: 'Sign up' },
    ],
  },
  {
    title: 'Teach',
    links: [
      { to: '/become-tutor',    label: 'Become a tutor' },
      { to: '/founding-tutors', label: 'Founding tutors' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About us' },
      { to: '/login', label: 'Log in' },
      { to: '/hub',   label: 'Your dashboard' },
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
              <Logo size={22} />
            </Link>
            <p>The first 100% student-led tutoring website. Free to join, and tutors keep 100% of their rate.</p>
          </div>
          <nav className="mk-footer-col" aria-label="Subjects">
            <h2>Subjects</h2>
            {SUBJECTS.map(([slug, name]) => (
              <Link key={slug} to="/subjects/$subject" params={{ subject: slug }}>{name}</Link>
            ))}
          </nav>
          {COLUMNS.map(({ title, links }) => (
            <nav key={title} className="mk-footer-col" aria-label={title}>
              <h2>{title}</h2>
              {links.map(({ to, hash, label }) => <Link key={label} to={to} hash={hash}>{label}</Link>)}
            </nav>
          ))}
        </div>
        <p className="mk-footer-base">© Study with Students {new Date().getFullYear()}. All rights reserved.</p>
      </div>
    </footer>
  )
}
