import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import Art from '../components/marketing/Art'
import { MarketingPage, Wave } from '../components/marketing'
import { FEE, PricingExplainer } from '../components/marketing/Pricing'

// The original "How it works" page, with the real product steps. Styles: styles/marketing.css.

const FEATURES = [
  { art: 'findTutor',  label: 'Find tutors' },
  { art: 'uni',        label: 'Get university guidance' },
  { art: 'classes',    label: 'Join live classes' },
  { art: 'studyRooms', label: 'Join study rooms' },
  { art: 'forumBoard', label: 'Explore the student and tutor forum' },
]

const EASY_STEPS = [
  { art: 'stepJoin',    text: 'Create an account and join the community' },
  { art: 'stepMode',    text: "Choose Student mode or Tutor mode. It's up to you." },
  { art: 'stepExplore', text: 'Explore the hub and find what interests you' },
]

const REASONS = [
  ['Switch anytime', 'Move between modes whenever you feel like a change.'],
  ['Enjoy dual benefits', 'Learn in one subject and teach in another.'],
  ['Adapt to your needs', 'Match your mode to your goals.'],
]

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
    <div className="mk-mode-steps">
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
    <MarketingPage title="How it works">
      {/* Do more than just learn. */}
      <section className="mk-page-hero">
        <div className="mk-container mk-split">
          <div>
            <h1 className="mk-h2 mk-page-title">Do more than just <em>learn.</em></h1>
            <p className="mk-sub mk-page-lead">
              Study with Students is an all-inclusive hub for students and tutors alike. We want you
              to be able to find everything you need right here.
            </p>
            <div className="mk-actions">
              <Link to={start} className="mk-btn mk-btn-coral">Start my journey</Link>
            </div>
          </div>
          <ul className="mk-feature-rows">
            {FEATURES.map(({ art, label }) => (
              <li key={art}>
                <Art name={art} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Start exploring in 3 easy steps */}
      <section className="mk-band mk-band-steps" aria-labelledby="easy-title">
        <Wave top />
        <div className="mk-container mk-center">
          <h2 id="easy-title" className="mk-h2">Start exploring in 3 easy steps</h2>
          <ol className="mk-step-cards brand-light">
            {EASY_STEPS.map(({ art, text }, i) => (
              <li key={art}>
                <h3>Step {i + 1}</h3>
                <Art name={art} />
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <Link to={start} className="mk-btn mk-btn-coral">Start now</Link>
        </div>
        <Wave shape="b" />
      </section>

      {/* Choosing modes */}
      <section className="mk-section" aria-labelledby="modes-title">
        <div className="mk-container mk-split">
          <div>
            <h2 id="modes-title" className="mk-h2">Choosing modes</h2>
            <p className="mk-quote-line">“To tutor or not to tutor. That is the question.” — William Shakespeare</p>
            <dl className="mk-reasons">
              {REASONS.map(([name, text]) => (
                <div key={name}><dt>{name}</dt><dd>{text}</dd></div>
              ))}
            </dl>
          </div>
          <div className="mk-modes">
            <figure className="mk-mode is-student"><Art name="studentMode" /><figcaption>Student mode</figcaption></figure>
            <figure className="mk-mode is-tutor"><Art name="tutorMode" /><figcaption>Tutor mode</figcaption></figure>
          </div>
        </div>
        <div className="mk-container mk-mode-grid">
          <NumberedSteps title="In student mode" steps={STUDENT_STEPS} />
          <NumberedSteps title="In tutor mode" steps={TUTOR_STEPS} />
        </div>
      </section>

      {/* How pricing works */}
      <section className="mk-section" aria-labelledby="pricing-title">
        <div className="mk-container">
          <div className="mk-head mk-center">
            <p className="mk-eyebrow">Pricing</p>
            <h2 id="pricing-title" className="mk-h2">How pricing <em>works.</em></h2>
            <p className="mk-sub">Free to join. Tutors keep 100%.</p>
          </div>
          <PricingExplainer />
        </div>
      </section>

      {/* Questions */}
      <section className="mk-section" aria-labelledby="faq-title">
        <div className="mk-container mk-faq-wrap">
          <h2 id="faq-title" className="mk-h2 mk-coral">Questions?</h2>
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
