// Previews of the signed-in app for the public pages, drawn with the app's own components and
// classes (components/ui, styles/app.css), so they always match the real dashboard. The hero
// holds the dashboard to explore (AppPreview.jsx); the rest are single rows and cards. The
// people are made up (sample.js), and dates are worked out from today so a preview never looks
// stale. Styles: styles/marketing.css (mk-stage, mk-snip, mk-check-card) and
// styles/app-preview.css (mk-app, the dashboard).
import { useRef } from 'react'
import { Avatar, Icon, StatusPill } from '../ui'
import { BOOKING_FEE_PERCENT } from '../../lib/site'
import { formatMoney } from '../../lib/format'
import AppPreview from './AppPreview'
import { useScrollLanding, useSheen } from './stageMotion'
import { longDay, next } from './sample'

const shortDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// Oliver's £22 rate as families see it, booking fee included (as on the tutor pages)
const SAMPLE_PRICE = formatMoney(Math.round(22 * (100 + BOOKING_FEE_PERCENT)) / 100, { decimals: 2 })

// The dashboard's parts in the order they come in once it lands: the sidebar (the tabs on
// narrow screens), then the open view's blocks and cards, then their rows
const PANELS = [
  '.mk-app-side, .mk-app-tabs',
  '.mk-app-view :is(.hello, .metrics, .dash-head, .tabs, .stat-grid, .card, .mk-inbox-list, .mk-thread)',
  '.mk-app-view :is(.spotlight, .group-head, .row, .mk-convo, .mk-bubble-row)',
]

/**
 * The hero: the dashboard on a navy stage. Tilted back at first, it flattens, rises and grows
 * as it scrolls into view, over a coral glow that brightens as it lands, and then its panels
 * come in (useScrollLanding). A mouse pointer carries a soft light over it (useSheen).
 */
export function HeroStage() {
  const wrap = useRef(null)
  const stage = useRef(null)
  useScrollLanding(wrap, { panels: PANELS })
  useSheen(stage)
  return (
    <div ref={wrap} className="mk-stage-wrap">
      <div className="mk-stage-glow" data-glow aria-hidden="true" />
      <div ref={stage} className="mk-stage" data-stage>
        <AppPreview />
        <div className="mk-stage-sheen" data-sheen aria-hidden="true" />
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
      start: <Icon name="calendar_month" className="mk-snip-icon" />,
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
      start: <Icon name="videocam" className="mk-snip-icon" />,
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
