// Static previews of the signed-in app for the public pages. They are drawn with the
// app's own components and classes (components/ui, styles/app.css), so they always match
// the real dashboard. The people are the demo accounts from db/seed.py; dates are worked
// out from today so a preview never looks stale. Styles: styles/marketing.css (mk-app,
// mk-snip, mk-check-card).
import { LogoMark } from '../brand/Logo'
import { Avatar, Card, DateChip, Icon, StatusPill } from '../ui'
import { BOOKING_FEE_PERCENT } from '../../lib/site'
import { formatMoney } from '../../lib/format'

/** The next `weekday` (0 = Sunday) after today, at `hour`:00. */
function next(weekday, hour) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7 || 7))
  return d
}

const longDay = (d) => d.toLocaleDateString('en-GB', { weekday: 'long' })
const shortDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// Oliver's £22 rate as families see it, booking fee included (as on the tutor pages)
const SAMPLE_PRICE = formatMoney(Math.round(22 * (100 + BOOKING_FEE_PERCENT)) / 100, { decimals: 2 })

const NAV = [
  { items: [['space_dashboard', 'Home', true], ['chat', 'Messages'], ['calendar_month', 'Calendar'], ['insights', 'Progress']] },
  { title: 'Tutoring', items: [['person_search', 'Find tutors'], ['cast_for_education', 'My tutors'], ['favorite', 'Saved tutors'], ['payments', 'Payments']] },
  { title: 'Community', items: [['forum', 'Forum'], ['menu_book', 'Study notes'], ['groups', 'Study rooms'], ['school', 'Classes']] },
]

const CardAction = ({ children }) => <span className="card-link">{children}<Icon name="chevron_right" /></span>

/** The student dashboard, as it looks after signing in. */
export function DashboardPreview() {
  const upNext = next(3, 18)
  const later = next(6, 17)

  return (
    <div className="mk-app" role="img" aria-label="The student dashboard: the next session, messages from a tutor and the community forum">
      <div className="mk-app-side">
        <div className="mk-app-brand"><LogoMark size={16} />Study with <em>Students</em></div>
        {NAV.map((group, i) => (
          <div key={i} className="mk-app-group">
            {group.title && <div className="sidebar-label"><span>{group.title}</span></div>}
            {group.items.map(([icon, label, active]) => (
              <span key={label} className={`nav-item${active ? ' active' : ''}`}><Icon name={icon} />{label}</span>
            ))}
          </div>
        ))}
      </div>

      <div className="mk-app-main">
        <div className="mk-app-top"><Icon name="space_dashboard" />Home</div>
        <div className="mk-app-content">
          <div className="hello">
            <div>
              <h1>Ready to study, <em>Maya</em>?</h1>
              <div className="level">
                <b>Level 3 · Scholar</b>
                <span className="level-track"><i style={{ width: '24%' }} /></span>
                <span>520 XP</span>
              </div>
            </div>
            <div className="dash-actions">
              <span className="btn btn-ghost"><Icon name="person_search" />Find a tutor</span>
              <span className="btn btn-coral"><Icon name="add" />Book a session</span>
            </div>
          </div>

          <div className="metrics">
            <span><b>2</b>upcoming</span>
            <span><b>6.5 h</b>learned</span>
            <span><b>2</b>tutors</span>
          </div>

          <div className="dash-grid">
            <div className="dash-col">
              <Card title="Sessions" count={2} action={<CardAction>Calendar</CardAction>}>
                <div className="row-list">
                  <div className="spotlight">
                    <div className="grow">
                      <div className="when">Up next · {longDay(upNext)} 18:00–19:00</div>
                      <h2>Mechanics: projectiles</h2>
                      <div className="who">with Oliver Grant</div>
                    </div>
                    <StatusPill status="confirmed" />
                  </div>
                  <div className="group-head">Later <span className="count">1</span></div>
                  <div className="row">
                    <DateChip value={later} />
                    <div className="main"><div className="title">Exam technique review</div><div className="meta">Oliver Grant · 17:00–18:00</div></div>
                    <StatusPill status="pending" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="dash-col mk-app-aside">
              <Card title="Inbox" action={<CardAction>Open</CardAction>}>
                <div className="row-list">
                  <div className="row">
                    <Avatar name="Oliver Grant" size={26} />
                    <div className="main"><div className="title">Oliver Grant</div><div className="meta">See you on {longDay(upNext)}!</div></div>
                  </div>
                </div>
              </Card>
              <Card title="Community" action={<CardAction>Forum</CardAction>}>
                <div className="row-list">
                  <div className="row"><div className="main"><div className="title">Planning revision for 3 A-levels?</div><div className="meta">Exam prep</div></div></div>
                  <div className="row"><div className="main"><div className="title">Best way into integration by parts?</div><div className="meta">Maths</div></div></div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The hero: the dashboard on a navy stage, with two notes from the app floating over its edges. */
export function HeroStage({ style }) {
  return (
    <div className="mk-stage-wrap mk-reveal" style={style}>
      <div className="mk-stage">
        <DashboardPreview />
      </div>
      <div className="mk-note is-booked" aria-hidden="true">
        <span className="mk-snip-icon"><Icon name="event_available" /></span>
        <div className="mk-snip-main"><b>Session confirmed</b><span>{longDay(next(3, 18))} · 18:00</span></div>
      </div>
      <div className="mk-note is-xp" aria-hidden="true">
        <span className="mk-snip-icon"><Icon name="military_tech" /></span>
        <div className="mk-snip-main"><b>+100 XP</b><span>Level 3 · Scholar</span></div>
      </div>
    </div>
  )
}

/** One row of the app for each step of "How it works": a tutor, a booking, the call. */
export function StepPreview({ step }) {
  const upNext = next(3, 18)
  const rows = [
    {
      label: 'A tutor in the search results',
      start: <Avatar name="Oliver Grant" size={32} />,
      title: 'Oliver Grant',
      meta: 'UCL · Mathematics',
      end: <span className="mk-snip-end">{SAMPLE_PRICE}<small>/hr</small></span>,
    },
    {
      label: 'A booked session, waiting for the tutor and then confirmed',
      start: <span className="mk-snip-icon"><Icon name="calendar_month" /></span>,
      title: 'Mechanics: projectiles',
      meta: `${shortDate(upNext)} · 18:00–19:00`,
      end: (
        <span className="mk-flip">
          <StatusPill status="pending" />
          <StatusPill status="confirmed" />
        </span>
      ),
    },
    {
      label: 'The video call, ready to join from the dashboard',
      start: <span className="mk-snip-icon"><Icon name="videocam" /></span>,
      title: 'Up next · 18:00',
      meta: `${longDay(upNext)} · with Oliver Grant`,
      end: <span className="btn btn-coral btn-sm">Join</span>,
    },
  ]
  const { label, start, title, meta, end } = rows[step]
  return (
    <div className="mk-snip" role="img" aria-label={label}>
      {start}
      <div className="mk-snip-main"><b>{title}</b><span>{meta}</span></div>
      {end}
    </div>
  )
}

/** A tutor's card with the two checks every tutor passes. */
export function TutorChecksPreview() {
  return (
    <div className="mk-check-card" role="img" aria-label="A tutor's card showing a verified university and a checked enhanced DBS certificate">
      <div className="mk-check-card-head">
        <Avatar name="Oliver Grant" size={44} />
        <div className="mk-snip-main"><b>Oliver Grant</b><span>UCL · Mathematics</span></div>
        <span className="btn btn-coral btn-sm">Book</span>
      </div>
      <ul className="mk-check-rows">
        <li><Icon name="school" />University enrolment<span><Icon name="check_circle" />Verified</span></li>
        <li><Icon name="shield" />Enhanced DBS check<span><Icon name="check_circle" />Checked</span></li>
      </ul>
    </div>
  )
}
