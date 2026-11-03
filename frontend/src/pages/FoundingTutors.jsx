import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { ClosingCta, Facts, MarketingPage, PageHero, Section } from '../components/marketing'

// Founding tutors: the first verified tutors on the platform. Styles: styles/marketing.css.

const DEAL = [
  ['percent', 'Keep 100%', 'Families pay a small booking fee on top.'],
  ['sell', 'Your price', 'Change it whenever you like.'],
  ['verified_user', 'Verified and DBS checked', 'Confirmed before your first booking.'],
]

export default function FoundingTutors() {
  const { isAuthenticated } = useAuth()
  const start = isAuthenticated ? '/tutor-profile' : '/signup'

  return (
    <MarketingPage path="/founding-tutors">
      <PageHero
        title="Founding tutors"
        lead="The first tutors on Study with Students. We built it so tutors keep 100% of their rate."
        art="founding"
      >
        <div className="mk-actions">
          <Link to={start} className="mk-btn mk-btn-primary">Become a tutor</Link>
          <Link to="/become-tutor" className="mk-btn mk-btn-ghost">How tutoring works</Link>
        </div>
      </PageHero>

      <Section id="deal" title="The deal, from the first tutor on">
        <Facts items={DEAL} />
      </Section>

      <ClosingCta title="Be one of the first" text="Joining is free.">
        <Link to={start} className="mk-btn mk-btn-primary">Become a tutor</Link>
      </ClosingCta>
    </MarketingPage>
  )
}
