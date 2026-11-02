import { Link } from '@tanstack/react-router'
import Art from '../components/marketing/Art'
import { MarketingPage } from '../components/marketing'
import { FEE } from '../components/marketing/Pricing'

// About us: who built it, why, and what we're aiming for. Styles: styles/marketing.css.

const MISSION = [
  'Provide innovative and excellent tutoring',
  'Empower our generation',
  'Make tutoring available to everyone',
  'Make tutoring fun',
]

export default function AboutUs() {
  return (
    <MarketingPage path="/about">
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
          <div className="mk-page-art"><Art name="mission" /></div>
          <div>
            <h2 id="mission-title" className="mk-h2">Our <em>mission.</em></h2>
            <ol className="mk-mission-list">
              {MISSION.map((item, i) => <li key={item}><span>{i + 1}.</span>{item}</li>)}
            </ol>
          </div>
        </div>
      </section>

      {/* Joining the team */}
      <section className="mk-section mk-center" aria-labelledby="team-title">
        <div className="mk-container mk-narrow mk-head">
          <h2 id="team-title" className="mk-h2">Feel like joining the <em>team?</em></h2>
          <p className="mk-lead">
            We want to bring students from all over into one place to learn together. The best
            way to help is to tutor with us.
          </p>
          <div className="mk-actions mk-center">
            <Link to="/become-tutor" className="mk-btn mk-btn-coral">Become a tutor</Link>
            <Link to="/signup" className="mk-btn mk-btn-slate">Join now</Link>
          </div>
        </div>
      </section>
    </MarketingPage>
  )
}
