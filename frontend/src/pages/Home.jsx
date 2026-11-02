import { Link } from '@tanstack/react-router'
import Art from '../components/marketing/Art'
import { Checks, MarketingPage, Wave } from '../components/marketing'
import { DashboardPreview, TutorCardPreview } from '../components/marketing/Previews'
import { PricingExplainer } from '../components/marketing/Pricing'
import { Icon } from '../components/ui'

// The original homepage, section by section, with the new app design worked in:
// a preview of the dashboard, the tutor checks and how pricing works.
// Styles: styles/marketing.css.

const HERO_ART = [
  { area: 'a', art: 'tutoring',    label: '1-to-1 Tutoring' },
  { area: 'b', art: 'group',       label: 'Group Study Sessions' },
  { area: 'c', art: 'forum',       label: 'Student Forums' },
  { area: 'd', art: 'events',      label: 'Events' },
  { area: 'e', art: 'uniGuidance', label: 'Uni Guidance' },
]

const UNIVERSITIES = [
  { name: 'Imperial College London', src: '/static/images/homepage/imperial.png' },
  { name: 'UCL',                     src: '/static/images/homepage/ucl.png' },
  { name: "King's College London",   src: '/static/images/homepage/kcl.png' },
  { name: 'University of Cambridge', src: '/static/images/homepage/cam.png' },
  { name: 'University of Oxford',    src: '/static/images/homepage/oxf.jpg' },
]

// 'Computer Science' → 'computer-science', the slug of its public subject page
const subjectSlug = (subject) => subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const SUBJECTS = [
  ['Mathematics', 'calculate'],
  ['Physics', 'atom'],
  ['Chemistry', 'flask'],
  ['Biology', 'dna'],
  ['Computer Science', 'code'],
  ['Economics', 'trending_up'],
  ['Business', 'briefcase'],
  ['English', 'menu_book'],
  ['French', 'translate'],
  ['Psychology', 'brain'],
  ['Art', 'palette'],
  ['Law', 'gavel'],
  ['Engineering', 'engineering'],
]

const REASONS = [
  ['schedule', 'Find tutors quickly'],
  ['backpack', '100% student run'],
  ['verified_user', 'Enhanced DBS checks'],
  ['videocam', 'Flexible and online'],
]

const STEPS = [
  { art: 'step1', title: 'Create account',  text: 'Sign up with your email address and confirm it with a 6‑digit code.' },
  { art: 'step2', title: 'Select mode',     text: "Choose Student or Tutor mode. Don't worry, you can switch anytime." },
  { art: 'step3', title: 'Discover portal', text: 'Find tutors, study rooms and the forum in the blink of an eye.' },
]

export default function Home() {
  return (
    <MarketingPage>
      {/* Hero: the five illustrations around the headline */}
      <section className="mk-hero">
        <div className="mk-container mk-hero-grid">
          <h1 className="mk-h1 mk-hero-title">
            <span>More than just <em>another</em></span>
            <span>tutoring website.</span>
          </h1>
          <div className="mk-hero-copy">
            <p>
              Here, at Study with Students, you can find tutors, talk to students and find out
              about upcoming events. This is your new student portal.
            </p>
            <div className="mk-actions mk-center">
              <Link to="/signup" className="mk-btn mk-btn-coral">Join now</Link>
              <Link to="/tutors" className="mk-btn mk-btn-slate">Find a tutor</Link>
            </div>
          </div>
          {HERO_ART.map(({ area, art, label }) => (
            <figure key={area} className="mk-hero-art" data-area={area}>
              <Art name={art} />
              <figcaption className="mk-tag">{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <div className="mk-container mk-divider-wrap">
        <p className="mk-divider">The First 100% Student Led Tutoring Website</p>
      </div>

      {/* Universities band, with the wave into the next section */}
      <section className="mk-band mk-unis" aria-labelledby="unis-title">
        <div className="mk-container">
          <h2 id="unis-title" className="mk-unis-title">Tutors from <em>TOP</em> universities…</h2>
          <ul className="mk-logos">
            {UNIVERSITIES.map(({ name, src }) => (
              <li key={name}><img src={src} alt={name} loading="lazy" decoding="async" /></li>
            ))}
          </ul>
        </div>
        <Wave />
      </section>

      {/* The dashboard itself */}
      <section className="mk-section mk-portal" aria-labelledby="portal-title">
        <div className="mk-container">
          <div className="mk-head mk-center">
            <p className="mk-eyebrow">Your dashboard</p>
            <h2 id="portal-title" className="mk-h2">This is your new <em>student portal.</em></h2>
            <p className="mk-sub">Sessions, messages, tutors and the community, all in one place.</p>
          </div>
          <div className="mk-stage">
            <DashboardPreview />
            <span className="mk-sticker is-a" aria-hidden="true"><Icon name="add" />Book a session</span>
            <span className="mk-sticker is-b" aria-hidden="true"><Icon name="chat" />Message your tutor</span>
            <span className="mk-sticker is-c" aria-hidden="true"><Icon name="forum" />Ask the community</span>
          </div>
        </div>
      </section>

      {/* Explore. Learn. Repeat. */}
      <section className="mk-section mk-subjects" aria-labelledby="subjects-title">
        <div className="mk-container mk-subjects-grid">
          <div className="mk-subjects-art"><Art name="studyNotes" /></div>
          <div>
            <h2 id="subjects-title" className="mk-h2 mk-coral">Explore. Learn. Repeat.</h2>
            <p className="mk-sub">Explore our subjects and find what's interesting to you.</p>
            <ul className="mk-subject-list">
              {SUBJECTS.map(([subject, icon]) => (
                <li key={subject}>
                  <Link to="/subjects/$subject" params={{ subject: subjectSlug(subject) }} className="mk-subject">
                    <Icon name={icon} />{subject}
                  </Link>
                </li>
              ))}
              <li className="mk-subject-all">
                <Link to="/tutors" className="mk-subject mk-subject-all">
                  Explore all<Icon name="arrow_forward" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Why choose us? */}
      <section className="mk-section mk-center" aria-labelledby="why-title">
        <div className="mk-container">
          <h2 id="why-title" className="mk-h2 mk-coral">Why choose us?</h2>
          <ul className="mk-why-list">
            {REASONS.map(([icon, label]) => (
              <li key={label} className="mk-box"><Icon name={icon} />{label}</li>
            ))}
          </ul>
          <p className="mk-why-note">
            If that's not enough, just know that <b>we built this website!</b> And we care about
            our students and tutors, because <b>we are tutors.</b>
          </p>
        </div>
      </section>

      {/* Every tutor is checked */}
      <section className="mk-section" aria-labelledby="trust-title">
        <div className="mk-container mk-split mk-trust">
          <div>
            <p className="mk-eyebrow">For parents</p>
            <h2 id="trust-title" className="mk-h2">Every tutor is <em>checked.</em></h2>
            <p className="mk-lead">
              Our tutors are university students. Before anyone can take a booking, we check two things.
            </p>
            <ul className="mk-trust-list">
              <li>
                <Icon name="school" />
                <div><b>They study at a university</b><p>A university email and proof of enrolment, reviewed by us.</p></div>
              </li>
              <li>
                <Icon name="shield" />
                <div><b>They have an enhanced DBS check</b><p>A criminal record check from the Disclosure and Barring Service.</p></div>
              </li>
            </ul>
          </div>
          <div className="mk-trust-art">
            <TutorCardPreview />
            <span className="mk-sticker is-trust" aria-hidden="true">Checked before booking</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mk-section" aria-labelledby="steps-title">
        <div className="mk-container">
          <h2 id="steps-title" className="mk-h2 mk-coral">How it works</h2>
          <p className="mk-sub mk-sub-arrow"><span className="mk-arrow" aria-hidden="true">↳</span>3 easy steps:</p>
          <ol className="mk-steps">
            {STEPS.map(({ art, title, text }, i) => (
              <li key={art} className="mk-step">
                <div className="mk-step-art"><Art name={art} /></div>
                <h3 className="mk-step-title">{i + 1}: {title}</h3>
                <p className="mk-step-text">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How pricing works */}
      <section className="mk-section" aria-labelledby="pricing-title">
        <div className="mk-container">
          <div className="mk-head mk-center">
            <h2 id="pricing-title" className="mk-h2 mk-coral">How pricing works</h2>
            <p className="mk-sub">Free to join. Tutors keep 100%.</p>
          </div>
          <PricingExplainer />
        </div>
      </section>

      {/* Interested in becoming a tutor? Say less. */}
      <section className="mk-section mk-become" aria-labelledby="become-title">
        <div className="mk-container mk-become-grid">
          <div className="mk-become-art"><Art name="becomeTutor" /></div>
          <div>
            <h2 id="become-title" className="mk-h2 mk-coral">Interested in becoming a tutor?</h2>
            <p className="mk-sayless"><span>Say less.</span></p>
            <Checks items={['Keep 100% of your rate', 'University verification and an enhanced DBS check', 'Flexible and online']} />
            <div className="mk-actions">
              <Link to="/become-tutor" className="mk-btn mk-btn-coral">Create a profile now</Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  )
}
