import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { Checks, ClosingCta, Facts, MarketingPage, Numbers, PageHero, Section } from '../components/marketing'
import { FEE } from '../components/marketing/Pricing'

// Become a tutor: the deal in numbers, the steps, and what you need.
// Styles: styles/marketing.css.

const DEAL = [
  [100, '%', 'of your rate is yours'],
  ['£0', '', 'to join, no card needed'],
  [FEE, '%', 'booking fee, paid by families on top'],
]

const STEPS = [
  ['person_add', 'Sign up', 'With your email.'],
  ['school', 'Verify your university', 'Email and proof of enrolment.'],
  ['verified_user', 'Enhanced DBS check', 'Before your first booking.'],
  ['badge', 'Build your profile', 'Subjects, rate, bio, free times.'],
  ['group_add', 'Accept students', 'You choose who to teach.'],
  ['payments', 'Get paid', 'Students pay through Stripe.'],
]

const NEED = ['Your university email', 'A student ID or certificate of enrolment', 'An enhanced DBS check']

export default function BecomeATutor() {
  const { isAuthenticated } = useAuth()
  const start = isAuthenticated ? '/tutor-profile' : '/signup'

  return (
    <MarketingPage path="/become-tutor">
      <PageHero title="Tutor while you study, and keep 100% of your rate" lead="Teach GCSE and A-level students online, at your price." art="becomeTutor">
        <div className="mk-actions">
          <Link to={start} className="mk-btn mk-btn-primary">Become a tutor</Link>
          <Link to="/how-it-works" className="mk-btn mk-btn-ghost">How it works</Link>
        </div>
      </PageHero>

      <Section id="deal" title="The deal">
        <Numbers items={DEAL} row />
      </Section>

      <Section id="steps" title="Six steps to your first student">
        <Facts items={STEPS} />
        <div className="mk-need mk-reveal">
          <h3 className="mk-h3">What you need</h3>
          <Checks items={NEED} className="is-row" />
        </div>
      </Section>

      <ClosingCta title="Ready to start tutoring?" text="Families can book you once you are verified.">
        <Link to={start} className="mk-btn mk-btn-primary">Create a profile</Link>
        <Link to="/founding-tutors" className="mk-btn mk-btn-ghost">Founding tutors</Link>
      </ClosingCta>
    </MarketingPage>
  )
}
