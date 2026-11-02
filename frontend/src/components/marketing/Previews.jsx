// Static previews of the logged-in app for the public pages. They are drawn with the
// app's own components and classes (components/ui, components/brand, styles/app.css),
// so they always match the real dashboard. The people and sessions are sample content;
// dates are worked out from today so the preview never looks stale.
import { LogoMark } from '../brand/Logo'
import { Avatar, Card, DateChip, Icon, StatusPill } from '../ui'

function next(weekday, hour) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7 || 7))
  return d
}

const longDay = (d) => d.toLocaleDateString('en-GB', { weekday: 'long' })

const NAV = [
  { items: [['space_dashboard', 'Home', true], ['chat', 'Messages'], ['calendar_month', 'Calendar']] },
  { title: 'Tutoring', items: [['person_search', 'Find tutors'], ['cast_for_education', 'My tutors'], ['favorite', 'Saved tutors'], ['payments', 'Payments']] },
  { title: 'Community', items: [['forum', 'Forum'], ['menu_book', 'Study notes'], ['groups', 'Study rooms'], ['school', 'Classes']] },
]

const CardAction = ({ children }) => <span className="card-link">{children}<Icon name="chevron_right" /></span>

/** The student dashboard, as it looks after signing in. */
export function DashboardPreview() {
  const upNext = next(3, 18)
  const later = next(6, 17)

  return (
    <div className="mk-app" role="img" aria-label="Preview of the student dashboard with upcoming sessions, messages and the community">
      <div className="mk-app-side" aria-hidden="true">
        <div className="mk-app-brand"><LogoMark size={18} />Study with <em>Students</em></div>
        {NAV.map((group, i) => (
          <div key={i} className="mk-app-group">
            {group.title && <div className="sidebar-label"><span>{group.title}</span></div>}
            {group.items.map(([icon, label, active]) => (
              <span key={label} className={`nav-item${active ? ' active' : ''}`}><Icon name={icon} />{label}</span>
            ))}
          </div>
        ))}
      </div>

      <div className="mk-app-main" aria-hidden="true">
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
                    <Avatar name="Oliver Grant" size={28} />
                    <div className="main"><div className="title">Oliver Grant</div><div className="meta">See you on {longDay(upNext)}!</div></div>
                  </div>
                </div>
              </Card>
              <Card title="Community" action={<CardAction>Forum</CardAction>}>
                <div className="row-list">
                  <div className="row"><div className="main"><div className="title">How do you plan revision for 3 A-levels?</div><div className="meta">Exam prep</div></div></div>
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

/** A tutor card with the two checks every tutor passes. */
export function TutorCardPreview() {
  return (
    <div className="mk-tutor-card card" role="img" aria-label="Example tutor card showing the university and enhanced DBS checks">
      <div className="mk-tutor-card-top" aria-hidden="true">
        <Avatar name="Oliver Grant" size={52} />
        <div className="grow">
          <div className="mk-tutor-name">Oliver Grant</div>
          <div className="mk-tutor-meta">Mathematics · Further Maths · Physics</div>
        </div>
        <span className="btn btn-coral btn-sm">Book</span>
      </div>
      <ul className="mk-tutor-checks" aria-hidden="true">
        <li><Icon name="school" />University student<span><Icon name="check_circle" />Verified</span></li>
        <li><Icon name="shield" />Enhanced DBS check<span><Icon name="check_circle" />Checked</span></li>
      </ul>
    </div>
  )
}
