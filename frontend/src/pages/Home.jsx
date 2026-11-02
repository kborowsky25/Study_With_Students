import { Link } from '@tanstack/react-router'
import Art from '../components/marketing/Art'
import { Checks, MarketingPage, Wave } from '../components/marketing'
import { FEE } from '../components/marketing/Pricing'
import { Icon } from '../components/ui'

// The original homepage, kept calm: the hero with its five illustrations, the universities,
// three steps, the subjects, how tutors are checked and priced, and becoming a tutor.
// One heading style and at most one illustration per section. Styles: styles/marketing.css.

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

const STEPS = [
  { art: 'step1', title: 'Find a tutor',   text: 'Search by subject or university. Every tutor is a student at a UK university.' },
  { art: 'step2', title: 'Book a session', text: 'Send a request, chat, then pick a time that suits you both.' },
  { art: 'step3', title: 'Learn online',   text: 'Join the video call from your dashboard. You pay once your tutor confirms.' },
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

const CHECKS = [
  ['school', 'They study at a university', 'A university email and proof of enrolment, reviewed by us.'],
  ['shield', 'They have an enhanced DBS check', 'A criminal record check from the Disclosure and Barring Service.'],
]

const PRICING = [
  ['Tutors set their own rate', 'Every tutor chooses their hourly price.'],
  [`You pay the rate plus ${FEE}%`, 'A small booking fee, shown before you pay. It keeps the site running.'],
  ['Tutors keep 100%', 'We never take a cut, and joining and the community are free.'],
]

export default function Home() {
  return (
    <MarketingPage path="/">
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

      {/* How it works */}
      <section className="mk-section" aria-labelledby="steps-title">
        <div className="mk-container">
          <h2 id="steps-title" className="mk-h2">How it <em>works.</em></h2>
          <ol className="mk-steps">
            {STEPS.map(({ art, title, text }, i) => (
              <li key={art} className="mk-step">
                <div className="mk-step-art"><Art name={art} /></div>
                <h3 className="mk-step-title"><span className="mk-step-num">{i + 1}</span>{title}</h3>
                <p className="mk-step-text">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Explore. Learn. Repeat. */}
      <section className="mk-section mk-subjects" aria-labelledby="subjects-title">
        <div className="mk-container mk-subjects-grid">
          <div className="mk-subjects-art"><Art name="studyNotes" /></div>
          <div>
            <h2 id="subjects-title" className="mk-h2">Explore. Learn. <em>Repeat.</em></h2>
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

      {/* How tutors are checked, and how pricing works */}
      <section className="mk-section" aria-labelledby="promise-title">
        <div className="mk-container">
          <h2 id="promise-title" className="mk-h2">Checked tutors. Simple <em>pricing.</em></h2>
          <div className="mk-promise">
            <div>
              <h3 className="mk-h3">Every tutor is checked</h3>
              <ul className="mk-trust-list">
                {CHECKS.map(([icon, title, text]) => (
                  <li key={title}><Icon name={icon} /><div><b>{title}</b><p>{text}</p></div></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mk-h3">You only pay for sessions</h3>
              <ol className="mk-numbered">
                {PRICING.map(([title, text], i) => (
                  <li key={title}>
                    <span className="mk-num" aria-hidden="true">{i + 1}</span>
                    <div><b>{title}</b><p>{text}</p></div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Becoming a tutor */}
      <section className="mk-section mk-become" aria-labelledby="become-title">
        <div className="mk-container mk-become-grid">
          <div className="mk-become-art"><Art name="becomeTutor" /></div>
          <div>
            <h2 id="become-title" className="mk-h2">Interested in becoming a <em>tutor?</em></h2>
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
