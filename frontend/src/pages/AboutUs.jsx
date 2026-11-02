import { Link } from '@tanstack/react-router'
import Art from '../components/marketing/Art'
import { MarketingPage, Wave } from '../components/marketing'
import { FEE } from '../components/marketing/Pricing'
import { Icon } from '../components/ui'

// The original "About us" page. Styles: styles/marketing.css.

const MISSION = [
  'Provide innovative and excellent tutoring',
  'Empower our generation',
  'Make tutoring available to everyone',
  'Make tutoring fun',
]

const VALUES = [
  ['school', 'Academic excellence'],
  ['forum', 'Supportive community'],
  ['psychology', 'Innovation in learning'],
]

export default function AboutUs() {
  return (
    <MarketingPage title="About us">
      {/* Hi, I'm Kilian */}
      <section className="mk-page-hero">
        <div className="mk-container mk-split mk-about-hero">
          <div>
            <h1 className="mk-hello">Hi,<br /><span>I'm Kilian</span></h1>
            <p className="mk-sub">and I'm the CEO, or something like that.</p>
          </div>
          <div className="mk-portrait">
            <img src="/static/images/aboutus/kilian.jpeg" alt="Kilian, founder of Study with Students" />
          </div>
        </div>
      </section>

      {/* Why we built it */}
      <section className="mk-section mk-about-why" aria-labelledby="why-title">
        <div className="mk-container mk-narrow">
          <h2 id="why-title" className="mk-h2">We built this website because <em>we are tutors.</em></h2>
          <p className="mk-lead">
            The person doing the teaching should keep what they earn. So on Study with Students,
            tutors keep 100% of their rate. Families pay a small {FEE}% booking fee on top, and
            that's how we keep the site running.
          </p>
          <p className="mk-lead">
            Joining is free, and so is the community: the forum, study notes and materials, study
            rooms and live classes. Every tutor is a verified university student with an enhanced
            DBS check.
          </p>
        </div>
      </section>

      {/* Our mission */}
      <section className="mk-section" aria-labelledby="mission-title">
        <div className="mk-container mk-split">
          <div className="mk-mission-art">
            <h2 id="mission-title" className="mk-h2">Our mission</h2>
            <Art name="mission" />
          </div>
          <div className="mk-outline-card">
            <p className="mk-mission-lead">Making learning more interactive</p>
            <ol className="mk-mission-list">
              {MISSION.map((item, i) => <li key={item}><span>{i + 1}.</span>{item}</li>)}
            </ol>
          </div>
        </div>
      </section>

      {/* Core values */}
      <section className="mk-section mk-center" aria-labelledby="values-title">
        <div className="mk-container">
          <h2 id="values-title" className="mk-h2 mk-coral">Core values</h2>
          <ul className="mk-values">
            {VALUES.map(([icon, label]) => (
              <li key={label}><Icon name={icon} />{label}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Quote band */}
      <section className="mk-band mk-quote-band">
        <Wave top />
        <figure className="mk-container mk-quote">
          <blockquote>“Who's gonna carry the boats? And the logs?”</blockquote>
          <figcaption>David Goggins</figcaption>
        </figure>
        <Wave shape="b" />
      </section>

      {/* Our future / joining the team */}
      <section className="mk-section" aria-label="What's next">
        <div className="mk-container mk-future">
          <div>
            <h2 className="mk-h3 mk-coral">Our future</h2>
            <p>
              We want to build a community of students from all over, bringing learning and
              integration into one place.
            </p>
          </div>
          <div>
            <h2 className="mk-h3 mk-coral">Feel like joining the team?</h2>
            <p>
              We are always looking for motivated and curious people to help us reach more and
              more students. The best place to start is tutoring with us.
            </p>
            <div className="mk-actions">
              <Link to="/become-tutor" className="mk-btn mk-btn-coral">Become a tutor</Link>
              <Link to="/signup" className="mk-btn mk-btn-slate">Join now</Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  )
}
