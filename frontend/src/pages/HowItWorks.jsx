import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import Art from '../components/marketing/Art'
import { MarketingPage } from '../components/marketing'
import { FEE, PricingExplainer } from '../components/marketing/Pricing'

// How it works: the steps for students and for tutors, pricing, and questions.
// Styles: styles/marketing.css.

const STUDENT_STEPS = [
  ['Find a tutor', 'Search by subject or university.'],
  ['Send a request', 'Once your tutor accepts, you can message each other.'],
  ['Book a session', "Pick a time. The price is your tutor's hourly rate × hours."],
  ['Your tutor confirms', 'The session shows up in your calendar.'],
  ['Pay with Stripe', `You pay the price plus a ${FEE}% booking fee. Your tutor keeps 100% of their rate.`],
]

const TUTOR_STEPS = [
  ['Verify your university', 'Use your university email and upload proof of enrolment.'],
  ['Get an enhanced DBS check', 'Every tutor has one before they can take bookings.'],
  ['Build your profile', 'Subjects, hourly rate, a short bio and when you’re free.'],
  ['Accept students', 'Students send requests. You choose who to take on.'],
  ['Confirm sessions and get paid', 'Students book, you confirm, they pay through Stripe. You keep 100% of your rate.'],
]

const FAQ = [
  ['Is it free to join?', `Yes. Joining is free, and so is the community: the forum, study notes, study rooms and live classes. When you book a session, you pay your tutor's rate plus a ${FEE}% booking fee.`],
  ['Do you take a cut of tutoring?', `No. Tutors keep 100% of their rate. The ${FEE}% booking fee is added on top, and it's how we keep the site running.`],
  ['How are tutors checked?', 'Every tutor is a verified university student: they confirm a university email and upload proof of enrolment, which we review. Every tutor also has an enhanced DBS check before they can take bookings.'],
  ['What is an enhanced DBS check?', 'A criminal record check from the Disclosure and Barring Service. The enhanced level also includes any relevant information held by local police.'],
  ['Can I be both a student and a tutor?', 'Yes. Once you are verified as a tutor you can switch between student mode and tutor mode at any time.'],
  ['When do I pay?', 'Once your tutor has confirmed the session. You pay by card, through Stripe, and you see the booking fee before you pay.'],
]

function NumberedSteps({ title, steps }) {
  return (
    <div>
      <h3 className="mk-h3">{title}</h3>
      <ol className="mk-numbered">
        {steps.map(([name, text], i) => (
          <li key={name}>
            <span className="mk-num" aria-hidden="true">{i + 1}</span>
            <div><b>{name}</b><p>{text}</p></div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function HowItWorks() {
  const { isAuthenticated } = useAuth()
  const start = isAuthenticated ? '/hub' : '/signup'

  return (
    <MarketingPage path="/how-it-works">
      {/* Do more than just learn. */}
      <section className="mk-page-hero">
        <div className="mk-container mk-split">
          <div>
            <h1 className="mk-h2 mk-page-title">Do more than just <em>learn.</em></h1>
            <p className="mk-lead mk-page-lead">
              Find a tutor, book sessions and keep track of your progress, with a free community of
              students alongside: the forum, study notes, study rooms and live classes.
            </p>
            <div className="mk-actions">
              <Link to={start} className="mk-btn mk-btn-coral">Start my journey</Link>
            </div>
          </div>
          <div className="mk-page-art"><Art name="findTutor" /></div>
        </div>
      </section>

      {/* The steps, for each side */}
      <section className="mk-section" aria-labelledby="steps-title">
        <div className="mk-container">
          <h2 id="steps-title" className="mk-h2">Step by <em>step.</em></h2>
          <div className="mk-flows">
            <NumberedSteps title="For students and parents" steps={STUDENT_STEPS} />
            <NumberedSteps title="For tutors" steps={TUTOR_STEPS} />
          </div>
        </div>
      </section>

      {/* How pricing works */}
      <section className="mk-section" id="pricing" aria-labelledby="pricing-title">
        <div className="mk-container">
          <h2 id="pricing-title" className="mk-h2">How pricing <em>works.</em></h2>
          <PricingExplainer />
        </div>
      </section>

      {/* Questions */}
      <section className="mk-section" aria-labelledby="faq-title">
        <div className="mk-container">
          <h2 id="faq-title" className="mk-h2">Any <em>questions?</em></h2>
          <div className="mk-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <div className="mk-actions mk-faq-actions">
            <Link to={start} className="mk-btn mk-btn-coral">Join now</Link>
            <Link to="/tutors" className="mk-btn mk-btn-slate">Find a tutor</Link>
          </div>
        </div>
      </section>
    </MarketingPage>
  )
}
