import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import Art from '../components/marketing/Art'
import { Checks, MarketingPage, Wave } from '../components/marketing'
import { FEE } from '../components/marketing/Pricing'

// The original "Become a tutor" page. Styles: styles/marketing.css.

const PROCESS = [
  ['Create an account', 'and log in'],
  ['Verify your account', 'and add your info'],
  ['Start tutoring', 'and start making your nights out easier'],
]

const REASONS = [
  ['Make everything you earn', 'You keep 100% of your rate. No strings attached.'],
  ['Set your own rates', 'Value your lessons at your own price.'],
  ['Flexible and online', 'Teach when it suits you, from wherever you are.'],
]

const EXPECT = [
  ['Sign up', 'Create your account with your email. No card needed.'],
  ['Verify your university', 'Confirm your university email and upload proof of enrolment. We review it.'],
  ['Get an enhanced DBS check', 'Every tutor has one before they can take bookings, so families know who they are booking.'],
  ['Build your profile', 'Your subjects, hourly rate, a short bio and when you’re free. Edit it any time.'],
  ['Accept students', 'Students send requests and you choose who to take on.'],
  ['Confirm sessions and get paid', 'Students book, you confirm, they pay through Stripe. You keep 100% of your rate.'],
]

export default function BecomeATutor() {
  const { isAuthenticated } = useAuth()
  const start = isAuthenticated ? '/tutor-profile' : '/signup'

  return (
    <MarketingPage title="Become a tutor">
      {/* Want to become a tutor? */}
      <section className="mk-page-hero">
        <div className="mk-container">
          <h1 className="mk-h2 mk-page-title">Want to become a <em>tutor?</em></h1>
          <div className="mk-process-row">
            <ol className="mk-process">
              {PROCESS.map(([title, sub], i) => (
                <li key={title}>
                  <span className="mk-process-num" aria-hidden="true">{i + 1}</span>
                  <b>{title}</b>
                  <i>{sub}</i>
                </li>
              ))}
            </ol>
            <div className="mk-process-art"><Art name="space" /></div>
          </div>
          <div className="mk-actions">
            <Link to={start} className="mk-btn mk-btn-coral">Become a tutor</Link>
          </div>

          <ul className="mk-reason-cols">
            {REASONS.map(([title, text]) => (
              <li key={title}><h2 className="mk-h3 mk-coral">{title}</h2><p>{text}</p></li>
            ))}
          </ul>
        </div>
      </section>

      {/* Here's what to expect */}
      <section className="mk-band mk-band-expect" aria-labelledby="expect-title">
        <Wave top shape="b" />
        <div className="mk-container">
          <div className="mk-expect brand-dark">
            <div>
              <h2 id="expect-title" className="mk-h2">Here's what to expect</h2>
              <ol className="mk-numbered">
                {EXPECT.map(([name, text], i) => (
                  <li key={name}>
                    <span className="mk-num" aria-hidden="true">{i + 1}</span>
                    <div><b>{name}</b><p>{text}</p></div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mk-expect-side">
              <Art name="earnings" />
              <div className="mk-need">
                <h3 className="mk-h3">What you need</h3>
                <Checks items={['Your university email', 'A student ID card or certificate of enrolment', 'An enhanced DBS check']} />
              </div>
            </div>
          </div>
        </div>
        <Wave />
      </section>

      {/* You keep 100% */}
      <section className="mk-section mk-center" aria-labelledby="keep-title">
        <div className="mk-container mk-narrow mk-head">
          <h2 id="keep-title" className="mk-h2">You keep <em>100%.</em></h2>
          <p className="mk-sub">
            Families pay your rate plus a {FEE}% booking fee, so nothing comes out of what you
            charge. The forum, study notes, study rooms and live classes are free for every member.
          </p>
          <div className="mk-actions mk-center">
            <Link to={start} className="mk-btn mk-btn-coral">Create a profile now</Link>
            <Link to="/how-it-works" className="mk-btn mk-btn-slate">How it works</Link>
          </div>
        </div>
      </section>
    </MarketingPage>
  )
}
