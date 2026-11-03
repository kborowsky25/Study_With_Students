import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { ClosingCta, Faq, MarketingPage, PageHero, Section, Steps } from '../components/marketing'
import { FEE, PricingExplainer } from '../components/marketing/Pricing'
import { FAQ } from '../components/marketing/faq'
import { Icon } from '../components/ui'

// How it works: the steps for students and for tutors, pricing, and questions.
// Styles: styles/marketing.css.

const FLOWS = [
  {
    icon: 'school',
    title: 'For students and parents',
    steps: [
      ['Find a tutor', 'By subject, level or university.'],
      ['Send a request', 'Message once they accept.'],
      ['Book a session', 'Rate × hours, shown up front.'],
      ['Your tutor confirms', 'It lands in your calendar.'],
      ['Pay with Stripe', `The rate plus a ${FEE}% booking fee.`],
    ],
  },
  {
    icon: 'cast_for_education',
    title: 'For tutors',
    steps: [
      ['Verify your university', 'University email and proof of enrolment.'],
      ['Get an enhanced DBS check', 'Needed before your first booking.'],
      ['Build your profile', 'Subjects, rate, bio and free times.'],
      ['Accept students', 'You choose who to teach.'],
      ['Get paid', 'You keep 100% of your rate.'],
    ],
  },
]

export default function HowItWorks() {
  const { isAuthenticated } = useAuth()
  const start = isAuthenticated ? '/hub' : '/signup'

  return (
    <MarketingPage path="/how-it-works">
      <PageHero title="Do more than just learn" lead="Find a tutor, book a session, learn online. The community comes free." art="howItWorks">
        <div className="mk-actions">
          <Link to="/tutors" className="mk-btn mk-btn-primary">Find a tutor</Link>
          <Link to={start} className="mk-btn mk-btn-ghost">{isAuthenticated ? 'Open your dashboard' : 'Join for free'}</Link>
        </div>
      </PageHero>

      <Section id="steps" title="Step by step">
        <div className="mk-flows">
          {FLOWS.map(({ icon, title, steps }) => (
            <div key={title} className="mk-card mk-flow">
              <h3 className="mk-h3"><Icon name={icon} />{title}</h3>
              <Steps items={steps} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="pricing" title="How pricing works">
        <PricingExplainer />
      </Section>

      <Section id="faq" side title="Questions">
        <Faq items={FAQ} />
      </Section>

      <ClosingCta title="Start your first session" text="Joining is free. You pay once a tutor confirms.">
        <Link to={start} className="mk-btn mk-btn-primary">{isAuthenticated ? 'Open your dashboard' : 'Join for free'}</Link>
        <Link to="/tutors" className="mk-btn mk-btn-ghost">Find a tutor</Link>
      </ClosingCta>
    </MarketingPage>
  )
}
