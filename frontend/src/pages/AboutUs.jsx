import { Link } from '@tanstack/react-router'
import Art from '../components/marketing/Art'
import { ClosingCta, Facts, MarketingPage } from '../components/marketing'
import { FEE } from '../components/marketing/Pricing'

// About us: who built it, why, and what we're aiming for. Styles: styles/marketing.css.

const MISSION = [
  ['auto_stories', 'Innovative, excellent tutoring'],
  ['rocket_launch', 'Empower our generation'],
  ['public', 'Tutoring for everyone'],
  ['mood', 'Make tutoring fun'],
]

export default function AboutUs() {
  return (
    <MarketingPage path="/about">
      <section className="mk-page-hero has-art">
        <div className="mk-container mk-page-hero-grid">
          <div className="mk-reveal">
            <h1 className="mk-title">Hi, I’m Kilian</h1>
            <p className="mk-lead">And I’m the CEO, or something like that. We built Study with Students because we are tutors.</p>
          </div>
          <div className="mk-portrait mk-reveal" style={{ '--i': 2 }}>
            <img src="/static/images/aboutus/kilian.jpeg" alt="Kilian, founder of Study with Students" />
          </div>
        </div>
      </section>

      <section className="mk-section" aria-labelledby="why-title">
        <div className="mk-container mk-side">
          <div className="mk-head mk-reveal">
            <h2 id="why-title" className="mk-h2">Tutors keep what they earn</h2>
          </div>
          <div className="mk-prose mk-reveal" style={{ '--i': 1 }}>
            <p>
              The person doing the teaching should keep what they earn. So tutors keep 100% of their
              rate, and families pay a {FEE}% booking fee on top. Joining is free, and so is the community.
            </p>
          </div>
        </div>
      </section>

      <section className="mk-section" aria-labelledby="mission-title">
        <div className="mk-container mk-split">
          <div>
            <h2 id="mission-title" className="mk-h2 mk-reveal">Our mission</h2>
            <div className="mk-mission"><Facts items={MISSION} cols={2} /></div>
          </div>
          <div className="mk-panel mk-reveal" style={{ '--i': 2 }}><Art name="mission" backdrop={false} /></div>
        </div>
      </section>

      <ClosingCta title="Feel like joining the team?" text="The best way to help is to tutor with us.">
        <Link to="/become-tutor" className="mk-btn mk-btn-primary">Become a tutor</Link>
        <Link to="/signup" className="mk-btn mk-btn-ghost">Join for free</Link>
      </ClosingCta>
    </MarketingPage>
  )
}
