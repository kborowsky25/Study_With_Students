import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import Art from '../components/marketing/Art'
import { MarketingPage } from '../components/marketing'
import { Icon } from '../components/ui'

// Founding tutors: the first verified tutors on the platform. Styles: styles/marketing.css.

const DEAL = [
  ['percent', 'Keep 100%', 'You keep 100% of your rate. Families pay a small booking fee on top.'],
  ['sell', 'Your price', 'Set your own hourly rate and change it whenever you like.'],
  ['verified_user', 'Verified and DBS checked', 'Your university and an enhanced DBS check are confirmed before your first booking.'],
]

export default function FoundingTutors() {
  const { isAuthenticated } = useAuth()

  return (
    <MarketingPage title="Founding tutors">
      <section className="mk-page-hero">
        <div className="mk-container mk-split">
          <div>
            <h1 className="mk-h2 mk-page-title">Founding <em>tutors.</em></h1>
            <p className="mk-sub mk-page-lead">
              The first tutors on Study with Students. We are students who tutor, and we built this
              so that tutors keep 100% of their rate. Be one of the first.
            </p>
            <div className="mk-actions">
              <Link to={isAuthenticated ? '/tutor-profile' : '/signup'} className="mk-btn mk-btn-coral">Become a tutor</Link>
              <Link to="/become-tutor" className="mk-btn mk-btn-slate">How tutoring works</Link>
            </div>
          </div>
          <div className="mk-founding-art"><Art name="becomeTutor" /></div>
        </div>
      </section>

      <section className="mk-section mk-center" aria-labelledby="deal-title">
        <div className="mk-container">
          <h2 id="deal-title" className="mk-h2 mk-coral">The deal</h2>
          <p className="mk-sub">Same for every tutor, from the first one on.</p>
          <ul className="mk-deal">
            {DEAL.map(([icon, title, text]) => (
              <li key={title} className="mk-box">
                <Icon name={icon} />
                <h3 className="mk-h3">{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </MarketingPage>
  )
}
