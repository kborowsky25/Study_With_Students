import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import Art from '../components/marketing/Art'
import { ClosingCta, Faq, MarketingPage, Section } from '../components/marketing'
import { HeroStage, StepPreview, TutorChecksPreview } from '../components/marketing/Previews'
import { PricingExplainer } from '../components/marketing/Pricing'
import { FAQ } from '../components/marketing/faq'
import { Icon } from '../components/ui'

// The homepage, visual first: the product on a stage, what's inside (the five scenes from
// the original hero), how it works, how tutors are checked, pricing in three numbers,
// questions and one call to action. Styles and motion: styles/marketing.css.

const UNIVERSITIES = ['Imperial College London', 'UCL', 'King’s College London', 'University of Cambridge', 'University of Oxford']

const FEATURES = [
  ['tutoring',    '1-to-1 tutoring', 'Pay per session, no subscription.'],
  ['studyRooms',  'Study rooms',     'Live group sessions. Free.'],
  ['forum',       'Student forum',   'Ask, answer, revise together.'],
  ['liveClasses', 'Live classes',    'Up to 20 students. Free.'],
  ['graduation',  'Graduation',      'Earn XP as you learn.'],
]

const STEPS = [
  ['Find a tutor', 'By subject, level or university.'],
  ['Book a session', 'Pick a time, your tutor confirms.'],
  ['Learn online', 'Join the call. Pay once confirmed.'],
]

const CHECKS = [
  ['school', 'University enrolment, reviewed by us'],
  ['shield', 'An enhanced DBS check'],
]

/** The names on a slow loop; the copies after the first are for the eye only. */
function Universities() {
  const names = UNIVERSITIES.map((name) => <li key={name}>{name}</li>)
  return (
    <div className="mk-unis mk-reveal" style={{ '--i': 4 }}>
      <p>Tutors from top UK universities</p>
      <div className="mk-marquee">
        <div className="mk-marquee-track">
          <ul>{names}</ul>
          <ul aria-hidden="true">{names}</ul>
          <ul aria-hidden="true">{names}</ul>
          <ul aria-hidden="true">{names}</ul>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <MarketingPage path="/">
      <section className="mk-hero">
        <div className="mk-container">
          <h1 className="mk-display mk-reveal">Tutoring from students who sat the same exams</h1>
          <p className="mk-lead mk-reveal" style={{ '--i': 1 }}>Verified, DBS-checked tutors from top UK universities.</p>
          <div className="mk-actions mk-reveal" style={{ '--i': 2 }}>
            <Link to="/tutors" className="mk-btn mk-btn-primary">Find a tutor</Link>
            <Link to="/become-tutor" className="mk-btn mk-btn-ghost">Become a tutor<Icon name="arrow_forward" /></Link>
          </div>
          <HeroStage style={{ '--i': 3 }} />
        </div>
        <Universities />
      </section>

      <Section title={<>More than just <em className="mk-em">another</em> tutoring website.</>}>
        <ul className="mk-features">
          {FEATURES.map(([art, title, text], i) => (
            <li key={title} className="mk-feature mk-reveal" style={{ '--i': i }}>
              <div className="mk-feature-art"><Art name={art} backdrop={false} /></div>
              <div className="mk-feature-body">
                <h3 className="mk-h3">{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="steps" title="How it works">
        <ol className="mk-steps">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="mk-step mk-reveal" style={{ '--i': i * 2 }}>
              <span className="mk-step-num" aria-hidden="true">{i + 1}</span>
              <h3 className="mk-h3">{title}</h3>
              <p>{text}</p>
              <StepPreview step={i} />
            </li>
          ))}
        </ol>
      </Section>

      <section className="mk-section" aria-labelledby="checked-title">
        <div className="mk-container mk-split">
          <div className="mk-reveal">
            <h2 id="checked-title" className="mk-h2">Every tutor is checked</h2>
            <ul className="mk-list">
              {CHECKS.map(([icon, title]) => (
                <li key={title}><Icon name={icon} /><b>{title}</b></li>
              ))}
            </ul>
          </div>
          <div className="mk-panel mk-reveal" style={{ '--i': 2 }}><TutorChecksPreview /></div>
        </div>
      </section>

      <Section id="pricing" title="Simple pricing">
        <PricingExplainer />
      </Section>

      <Section id="questions" side title="Questions" lead={<>More in <Link to="/how-it-works" hash="faq">How it works</Link>.</>}>
        <Faq items={FAQ.slice(0, 4)} />
      </Section>

      <ClosingCta art="rocket" title="Ready for take-off?" text="Joining is free.">
        {isAuthenticated
          ? <Link to="/hub" className="mk-btn mk-btn-primary">Open your dashboard</Link>
          : <Link to="/signup" className="mk-btn mk-btn-primary">Join for free</Link>}
        <Link to="/tutors" className="mk-btn mk-btn-ghost">Find a tutor</Link>
      </ClosingCta>
    </MarketingPage>
  )
}
