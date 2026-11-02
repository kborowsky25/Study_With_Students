// Study With Students — original icon set.
//
// 24×24 glyphs drawn for this app: round-capped 1.75 strokes, soft corners,
// ~2px optical padding, the odd solid accent. Each entry in ICONS is the inner
// JSX of the <svg>; BrandIcon supplies the wrapper (stroke="currentColor",
// fill="none"), so icons take the surrounding text colour.
//
// The map covers every Material Symbols name the app used, plus a few extras.
// Aliases share a drawing (e.g. group / groups / groups_2).

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const r2 = (n) => Math.round(n * 100) / 100
const solid = { fill: 'currentColor', stroke: 'none' }

// Scalloped "verified" rosette: anchors on an inner ring, bumps pulled out by
// quadratic control points between them.
function rosette(cx, cy, inner, outer, n) {
  const pt = (a, r) => `${r2(cx + Math.cos(a) * r)} ${r2(cy + Math.sin(a) * r)}`
  const step = (Math.PI * 2) / n
  let d = `M${pt(-Math.PI / 2 - step / 2, inner)}`
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * step
    d += `Q${pt(a, outer)} ${pt(a + step / 2, inner)}`
  }
  return `${d}Z`
}

// Cog outline with `n` flat-topped teeth.
function cog(cx, cy, rIn, rOut, n) {
  const pt = (a, r) => `${r2(cx + Math.cos(a) * r)} ${r2(cy + Math.sin(a) * r)}`
  const step = (Math.PI * 2) / n
  const top = step * 0.17
  const base = step * 0.27
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * step
    d += `${i ? 'L' : 'M'}${pt(a - base, rIn)}L${pt(a - top, rOut)}L${pt(a + top, rOut)}L${pt(a + base, rIn)}`
    d += `A${rIn} ${rIn} 0 0 1 ${pt(a + step - base, rIn)}`
  }
  return `${d}Z`
}

function starPath(cx, cy, outer, inner) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const r = i % 2 ? inner : outer
    return `${r2(cx + Math.cos(a) * r)} ${r2(cy + Math.sin(a) * r)}`
  })
  return `M${pts.join('L')}Z`
}

/* ── Shared parts ────────────────────────────────────────────────────────── */

const CAL = (
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 9.75h17M8 3v4M16 3v4" />
  </>
)
const cal = (inner) => (
  <>
    {CAL}
    {inner}
  </>
)

const DOC = 'M13.5 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5z'
const DOC_FOLD = 'M13.5 3.5V7a2.5 2.5 0 0 0 2.5 2.5h3.5'
const doc = (inner) => (
  <>
    <path d={DOC} />
    <path d={DOC_FOLD} />
    {inner}
  </>
)

const SHIELD = 'M12 3.25 19 6v5.25c0 4.35-2.9 7.8-7 9.25-4.1-1.45-7-4.9-7-9.25V6z'
const BUBBLE = 'M7.5 17.5H6A2.5 2.5 0 0 1 3.5 15V7A2.5 2.5 0 0 1 6 4.5h12A2.5 2.5 0 0 1 20.5 7v8a2.5 2.5 0 0 1-2.5 2.5h-6.25L7.5 20.75z'
const HEART = 'M12 19.25s-7.75-4.4-7.75-10A4.25 4.25 0 0 1 8.5 5c1.5 0 2.75.75 3.5 2 .75-1.25 2-2 3.5-2a4.25 4.25 0 0 1 4.25 4.25c0 5.6-7.75 10-7.75 10z'
const STAR = starPath(12, 12.6, 9, 4.1)
const OPEN_BOOK = 'M12 6.75C10 5.25 7.5 4.75 3.5 5v13c4-.25 6.5.25 8.5 1.75 2-1.5 4.5-2 8.5-1.75V5c-4-.25-6.5.25-8.5 1.75z'
const PERSON_HEAD = <circle cx="12" cy="8" r="3.75" />
const PERSON_BODY = 'M5 20c.6-3.75 3.4-6.25 7-6.25s6.4 2.5 7 6.25'
const SMALL_HEAD = <circle cx="10" cy="8" r="3.5" />
const SMALL_BODY = 'M3.5 19.75c.6-3.4 3.2-5.75 6.5-5.75 1.5 0 2.85.45 3.95 1.3'
const CIRCLE = <circle cx="12" cy="12" r="8.75" />
const CHEVRON_DOWN = <path d="M6.5 9.5 12 15l5.5-5.5" />
const CLOCK = (
  <>
    {CIRCLE}
    <path d="M12 7.5V12l3 2" />
  </>
)
const GLOBE = (
  <>
    {CIRCLE}
    <path d="M3.5 12h17M12 3.25c2.3 2.4 3.5 5.3 3.5 8.75s-1.2 6.35-3.5 8.75C9.7 18.35 8.5 15.45 8.5 12S9.7 5.65 12 3.25z" />
  </>
)
const GROUP = (
  <>
    <circle cx="9" cy="8.25" r="3.25" />
    <path d="M3 19.5c.5-3.4 2.9-5.6 6-5.6s5.5 2.2 6 5.6" />
    <path d="M15.25 5.1a3.25 3.25 0 0 1 0 6.3M17.25 14.3c1.95.8 3.3 2.6 3.75 5.2" />
  </>
)
const GROUPS = (
  <>
    <circle cx="12" cy="8.5" r="3" />
    <path d="M6.75 19.5c.4-3.1 2.5-5.1 5.25-5.1s4.85 2 5.25 5.1" />
    <path d="M6 6.75a2.25 2.25 0 1 0 0 4.5M18 6.75a2.25 2.25 0 1 1 0 4.5M2.75 18c.2-1.85 1.15-3.2 2.6-3.85M21.25 18c-.2-1.85-1.15-3.2-2.6-3.85" />
  </>
)
const VIDEO = (
  <>
    <rect x="3" y="6.5" width="12.5" height="11" rx="2.75" />
    <path d="M15.5 10.4 20.25 7.6c.35-.2.75.05.75.45v7.9c0 .4-.4.65-.75.45L15.5 13.6z" />
  </>
)
const SUN = (
  <>
    <circle cx="12" cy="12" r="3.75" />
    <path d="M12 2.75v1.75M12 19.5v1.75M2.75 12H4.5M19.5 12h1.75M5.45 5.45l1.25 1.25M17.3 17.3l1.25 1.25M5.45 18.55l1.25-1.25M17.3 6.7l1.25-1.25" />
  </>
)
const MOON = <path d="M19.75 14.25A7.75 7.75 0 0 1 9.75 4.25a7.75 7.75 0 1 0 10 10z" />
const BELL = (
  <>
    <path d="M6 16.75V11a6 6 0 0 1 12 0v5.75l1.25 1.5H4.75z" />
    <path d="M10 20.5a2.25 2.25 0 0 0 4 0" />
  </>
)
const LOCK_BODY = (
  <>
    <rect x="5" y="10.5" width="14" height="10" rx="2.75" />
    <path d="M12 14.5v2" />
  </>
)
const PLAY = <path d="M8.5 5.75v12.5c0 .6.65.95 1.15.65l9.6-6.25a.75.75 0 0 0 0-1.3l-9.6-6.25c-.5-.3-1.15.05-1.15.65z" />
const DOTS = (y) => (
  <>
    <circle cx="6" cy={y} r="1.5" {...solid} />
    <circle cx="12" cy={y} r="1.5" {...solid} />
    <circle cx="18" cy={y} r="1.5" {...solid} />
  </>
)

/* ── The set ─────────────────────────────────────────────────────────────── */

export const ICONS = {
  // Fallback
  dot: <circle cx="12" cy="12" r="3" {...solid} />,

  // Arrows & navigation
  add: <path d="M12 5v14M5 12h14" />,
  add_circle: (
    <>
      {CIRCLE}
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  arrow_back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrow_forward: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrow_up_right: <path d="M7 17 17 7M8.5 7H17v8.5" />,
  chevron_left: <path d="M14.5 6 8.5 12l6 6" />,
  chevron_right: <path d="M9.5 6l6 6-6 6" />,
  expand_more: CHEVRON_DOWN,
  keyboard_arrow_down: CHEVRON_DOWN,
  expand_less: <path d="M6.5 14.5 12 9l5.5 5.5" />,
  unfold_more: <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  cancel: (
    <>
      {CIRCLE}
      <path d="M9.25 9.25l5.5 5.5M14.75 9.25l-5.5 5.5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  check_circle: (
    <>
      {CIRCLE}
      <path d="M8.25 12.25l2.6 2.6 5-5.35" />
    </>
  ),
  task_alt: (
    <>
      <path d="M20.75 11.25v.75a8.75 8.75 0 1 1-5.2-8" />
      <path d="M8 11.5l3.5 3.5L20.5 6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more_horiz: DOTS(12),
  open_in_new: (
    <>
      <path d="M19.5 13.5v4A2.5 2.5 0 0 1 17 20H6.5A2.5 2.5 0 0 1 4 17.5V7a2.5 2.5 0 0 1 2.5-2.5h4" />
      <path d="M14.5 3.5h6v6M20.5 3.5l-8 8" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.75 12a7.75 7.75 0 1 1-2.3-5.5" />
      <path d="M19.75 3.75V8h-4.25" />
    </>
  ),
  swap_horiz: <path d="M16.5 3.5 20 7l-3.5 3.5M20 7H8M7.5 13.5 4 17l3.5 3.5M4 17h12" />,
  fork_right: (
    <>
      <path d="M8.5 20.5v-17" />
      <path d="M8.5 14.5c0-3.6 2.9-6.5 6.5-6.5h4" />
      <path d="M16.5 5.25 19.25 8l-2.75 2.75" />
    </>
  ),
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.75h14" />,
  upload: <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.75h14" />,
  logout: (
    <>
      <path d="M9.5 20H6.5A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4h3" />
      <path d="M15.75 16.5 20.25 12l-4.5-4.5M20.25 12H9.5" />
    </>
  ),
  sidebar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M9.5 4.5v15M6 8.25h1M6 11.25h1" />
    </>
  ),
  filter: <path d="M4 5.25h16a.5.5 0 0 1 .4.8L14 13.5v5.25l-4 2V13.5L3.6 6.05a.5.5 0 0 1 .4-.8z" />,
  sort: <path d="M4 7h16M7 12h10M10 17h4" />,
  link: (
    <>
      <path d="M10.25 13.75a4 4 0 0 0 5.65 0l3-3a4 4 0 0 0-5.65-5.65l-1 1" />
      <path d="M13.75 10.25a4 4 0 0 0-5.65 0l-3 3a4 4 0 0 0 5.65 5.65l1-1" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.25 15.25 20 20" />
    </>
  ),
  explore: (
    <>
      {CIRCLE}
      <path d="M15.6 8.4 13.6 13.6 8.4 15.6l2-5.2z" />
    </>
  ),
  map_pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),

  // Layout
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7.25" height="9" rx="2" />
      <rect x="13.25" y="3.5" width="7.25" height="5" rx="2" />
      <rect x="13.25" y="11.5" width="7.25" height="9" rx="2" />
      <rect x="3.5" y="15.5" width="7.25" height="5" rx="2" />
    </>
  ),
  space_dashboard: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M10 3.5v17M10 12h10.5" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.75" y="6" width="18.5" height="12" rx="2.75" />
      <path d="M6.5 9.75h.01M9.75 9.75h.01M13 9.75h.01M16.25 9.75h.01M7.75 14.25h8.5" />
    </>
  ),
  slideshow: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M10 8.9v6.2c0 .4.45.65.8.42l4.6-3.1a.5.5 0 0 0 0-.84l-4.6-3.1c-.35-.23-.8.02-.8.42z" />
    </>
  ),
  play: PLAY,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.75" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="M4 17.25l4.5-4.25 3 2.75 3.5-3.5 5.25 5" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5 6.1 6.3A2 2 0 0 1 8 5h8a2 2 0 0 1 1.9 1.3l2.6 7.2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <path d="M3.5 13.5H8l1.25 2.25h5.5L16 13.5h4.5" />
    </>
  ),

  // Calendar & time
  calendar_month: cal(
    <>
      <circle cx="8" cy="13.5" r="1" {...solid} />
      <circle cx="12" cy="13.5" r="1" {...solid} />
      <circle cx="16" cy="13.5" r="1" {...solid} />
      <circle cx="8" cy="17" r="1" {...solid} />
      <circle cx="12" cy="17" r="1" {...solid} />
    </>,
  ),
  event: cal(<rect x="13.5" y="13" width="3.75" height="3.75" rx="1" {...solid} />),
  today: cal(<rect x="6.75" y="12.75" width="4" height="4" rx="1" {...solid} />),
  event_available: cal(<path d="M9.25 15l2 2 3.75-3.75" />),
  event_busy: cal(<path d="M10 13l4 4M14 13l-4 4" />),
  event_upcoming: cal(<path d="M8 15h7.5M13 12.75 15.5 15 13 17.25" />),
  calendar_add_on: cal(<path d="M12 12.75v4.75M9.6 15.1h4.8" />),
  event_note: cal(<path d="M7.75 13.5h8.5M7.75 17h5.5" />),
  schedule: CLOCK,
  clock: CLOCK,
  hourglass_empty: (
    <path d="M6.5 3.5h11M6.5 20.5h11M7.75 3.5v2.75a4.5 4.5 0 0 0 1.9 3.65L12 11.75l2.35-1.85a4.5 4.5 0 0 0 1.9-3.65V3.5M7.75 20.5v-2.75a4.5 4.5 0 0 1 1.9-3.65L12 12.25l2.35 1.85a4.5 4.5 0 0 1 1.9 3.65v2.75" />
  ),
  pending: (
    <>
      {CIRCLE}
      <circle cx="8" cy="12" r="1.15" {...solid} />
      <circle cx="12" cy="12" r="1.15" {...solid} />
      <circle cx="16" cy="12" r="1.15" {...solid} />
    </>
  ),
  progress_activity: <path d="M12 3.25A8.75 8.75 0 1 1 3.25 12" />,

  // People
  person: (
    <>
      {PERSON_HEAD}
      <path d={PERSON_BODY} />
    </>
  ),
  person_add: (
    <>
      {SMALL_HEAD}
      <path d={SMALL_BODY} />
      <path d="M18.5 13v6M15.5 16h6" />
    </>
  ),
  person_remove: (
    <>
      {SMALL_HEAD}
      <path d={SMALL_BODY} />
      <path d="M15.5 16.5h6" />
    </>
  ),
  person_off: (
    <>
      {PERSON_HEAD}
      <path d={PERSON_BODY} />
      <path d="M3.5 3.5l17 17" />
    </>
  ),
  person_search: (
    <>
      {SMALL_HEAD}
      <path d="M3.5 19.75c.6-3.4 3.2-5.75 6.5-5.75" />
      <circle cx="16.25" cy="15.75" r="3" />
      <path d="M18.5 18 20.5 20" />
    </>
  ),
  group: GROUP,
  groups: GROUPS,
  groups_2: GROUPS,
  group_add: (
    <>
      <circle cx="9" cy="8.25" r="3.25" />
      <path d="M3 19.5c.5-3.4 2.9-5.6 6-5.6s5.5 2.2 6 5.6" />
      <path d="M18.25 7.5v6M15.25 10.5h6" />
    </>
  ),
  badge: (
    <>
      <rect x="3.5" y="6" width="17" height="14.5" rx="2.75" />
      <path d="M9.75 6V4.5a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1V6" />
      <circle cx="9" cy="12" r="2" />
      <path d="M6.25 17c.5-1.3 1.5-2 2.75-2s2.25.7 2.75 2M14.5 11.5h3M14.5 15h2" />
    </>
  ),
  admin_panel_settings: (
    <>
      <path d={SHIELD} />
      <circle cx="12" cy="10" r="2" />
      <path d="M8.75 15.75c.65-1.5 1.85-2.3 3.25-2.3s2.6.8 3.25 2.3" />
    </>
  ),
  waving_hand: (
    <>
      <path d="M7.75 12.5V7a1.25 1.25 0 0 1 2.5 0v4.25M10.25 10.25V5.5a1.25 1.25 0 0 1 2.5 0v4.75M12.75 10.5V6.75a1.25 1.25 0 0 1 2.5 0v4.75" />
      <path d="M15.25 11.25V9.75a1.25 1.25 0 0 1 2.5 0v4.5a6.25 6.25 0 0 1-6.25 6.25h-.4a5.4 5.4 0 0 1-4.3-2.15l-2.65-3.5a1.3 1.3 0 0 1 1.95-1.7l1.65 1.6" />
      <path d="M3.75 7.25a4.5 4.5 0 0 1 2-3M20.25 17.75a4.5 4.5 0 0 1-2 3" />
    </>
  ),
  self_improvement: (
    <>
      <path d="M12 4.75c2.1 1.9 3.15 4 3.15 6.35S14.1 15.3 12 16.5c-2.1-1.2-3.15-3.05-3.15-5.4S9.9 6.65 12 4.75z" />
      <path d="M10.6 16.35C7.1 15.9 4.4 13.3 3.75 9.6c1.95-.3 3.7.05 5.15.85M13.4 16.35c3.5-.45 6.2-3.05 6.85-6.75-1.95-.3-3.7.05-5.15.85" />
      <path d="M6.5 19.75c1.6-.6 3.45-.95 5.5-.95s3.9.35 5.5.95" />
    </>
  ),

  // Communication
  chat: (
    <>
      <path d={BUBBLE} />
      <path d="M7.75 9.25h8.5M7.75 12.75h5.5" />
    </>
  ),
  chat_bubble: <path d={BUBBLE} />,
  forum: (
    <>
      <path d="M15.75 9h2.75a2.5 2.5 0 0 1 2.5 2.5v8.75l-3.1-2.25H11.5A2.5 2.5 0 0 1 9 15.5v-.25" />
      <path d="M5.5 3.5H13A2.5 2.5 0 0 1 15.5 6v6.5A2.5 2.5 0 0 1 13 15H6.75L3 17.75V6a2.5 2.5 0 0 1 2.5-2.5z" />
    </>
  ),
  send: <path d="M20.5 3.5 10.25 13.75M20.5 3.5l-6.25 17-4-6.75-6.75-4z" />,
  alternate_email: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M15.5 12v1.25a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.4 6.8" />
    </>
  ),
  mark_email_read: (
    <>
      <path d="M20.5 12V7A2.5 2.5 0 0 0 18 4.5H6A2.5 2.5 0 0 0 3.5 7v10A2.5 2.5 0 0 0 6 19.5h6" />
      <path d="M4 7.25l8 5.5 8-5.5" />
      <path d="M14.75 17.5l2 2 4-4.25" />
    </>
  ),
  campaign: (
    <>
      <path d="M3.5 10.25v3.5c0 .7.55 1.25 1.25 1.25H7l8.5 4.5V4.5L7 9H4.75c-.7 0-1.25.55-1.25 1.25z" />
      <path d="M7.5 15.25 8.75 20" />
      <path d="M18.75 9.25a3.75 3.75 0 0 1 0 5.5" />
    </>
  ),
  notifications: BELL,
  notifications_active: (
    <>
      {BELL}
      <path d="M2.75 9.5a8.5 8.5 0 0 1 2.4-5M21.25 9.5a8.5 8.5 0 0 0-2.4-5" />
    </>
  ),
  quote: (
    <>
      <path d="M10.25 6.25C7.3 7.1 5.25 9.6 5.25 13.6M18.75 6.25c-2.95.85-5 3.35-5 7.35" />
      <circle cx="7.6" cy="14.6" r="2.6" {...solid} />
      <circle cx="16.1" cy="14.6" r="2.6" {...solid} />
    </>
  ),
  videocam: VIDEO,
  video: VIDEO,
  cast_for_education: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2.75" />
      <path d="M9 20.75h6M12 17v3.75" />
      <path d="M7.75 9.75 12 7.5l4.25 2.25L12 12z" />
      <path d="M9.75 11v1.9c1.3.85 3.2.85 4.5 0V11" />
    </>
  ),

  // Documents & study
  delete: (
    <>
      <path d="M4.5 6.75h15M9.75 6.75V5A1.25 1.25 0 0 1 11 3.75h2A1.25 1.25 0 0 1 14.25 5v1.75" />
      <path d="M6.5 6.75l.85 11.6a2.25 2.25 0 0 0 2.25 2.15h4.8a2.25 2.25 0 0 0 2.25-2.15l.85-11.6" />
      <path d="M10 10.75v5.75M14 10.75v5.75" />
    </>
  ),
  description: doc(<path d="M8.5 13h7M8.5 16.5h5" />),
  text_snippet: doc(<path d="M8.5 12.25h7M8.5 15.25h7M8.5 18.25h4" />),
  draft: doc(null),
  upload_file: doc(<path d="M12 18v-6M9.5 14.5 12 12l2.5 2.5" />),
  picture_as_pdf: doc(<rect x="7.25" y="13" width="9.5" height="4.75" rx="1.5" {...solid} />),
  article: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.75" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  notes: <path d="M4 7h16M4 12h16M4 17h10" />,
  subject: <path d="M4 5.5h16M4 10h16M4 14.5h16M4 19h10" />,
  content_copy: (
    <>
      <rect x="8.25" y="8.25" width="12.25" height="12.25" rx="2.5" />
      <path d="M15.75 8.25V6A2.5 2.5 0 0 0 13.25 3.5H6A2.5 2.5 0 0 0 3.5 6v7.25A2.5 2.5 0 0 0 6 15.75h2.25" />
    </>
  ),
  attach_file: <path d="M15.5 7.5 8.4 14.6a1.75 1.75 0 0 0 2.5 2.5l7.35-7.35a3.5 3.5 0 0 0-4.95-4.95L5.9 12.2a5.25 5.25 0 0 0 7.4 7.4l5.95-5.95" />,
  edit: (
    <>
      <path d="M4.25 19.75l.85-3.85L15.85 5.15a2.1 2.1 0 0 1 3 3L8.1 18.9z" />
      <path d="M13.75 7.25l3 3" />
    </>
  ),
  edit_note: (
    <>
      <path d="M4 6.5h10M4 11h7M4 15.5h4" />
      <path d="M12.25 20.25l.6-2.65 6.15-6.15a1.55 1.55 0 0 1 2.2 2.2l-6.15 6.15z" />
    </>
  ),
  edit_square: (
    <>
      <path d="M11.5 4h-5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-5" />
      <path d="M9.75 14.25l.6-2.85 8.05-8.05a1.6 1.6 0 0 1 2.25 2.25L12.6 13.65z" />
    </>
  ),
  menu_book: (
    <>
      <path d={OPEN_BOOK} />
      <path d="M12 6.75v13M6.25 9.25h3M6.25 12.5h3M14.75 9.25h3M14.75 12.5h3" />
    </>
  ),
  auto_stories: (
    <>
      <path d={OPEN_BOOK} />
      <path d="M12 6.75v13" />
      <path d="M15 4.1V11l1.75-1.25L18.5 11V4.4" />
    </>
  ),
  school: (
    <>
      <path d="M2.75 9.5 12 5l9.25 4.5L12 14z" />
      <path d="M6.75 11.5v4.25c1.5 1.4 3.3 2.15 5.25 2.15s3.75-.75 5.25-2.15V11.5" />
      <path d="M21.25 9.5v5" />
    </>
  ),
  backpack: (
    <>
      <path d="M6 10.5a6 6 0 0 1 12 0v8A2.5 2.5 0 0 1 15.5 21h-7A2.5 2.5 0 0 1 6 18.5z" />
      <path d="M9.5 4.9V4.5a2.5 2.5 0 0 1 5 0v.4" />
      <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4M10 12h4" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.75" />
      <rect x="8" y="6" width="8" height="3.5" rx="1" />
      <path d="M8.5 13.25h.01M12 13.25h.01M15.5 13.25h.01M8.5 17h.01M12 17h.01M15.5 17h.01" />
    </>
  ),
  atom: (
    <>
      <circle cx="12" cy="12" r="1.5" {...solid} />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </>
  ),
  flask: (
    <>
      <path d="M9.25 3.5h5.5M10.5 3.5v5.25L5.3 17.6a2 2 0 0 0 1.7 3H17a2 2 0 0 0 1.7-3L13.5 8.75V3.5" />
      <path d="M7.6 14.5h8.8" />
    </>
  ),
  dna: (
    <>
      <path d="M8 3.25c0 4.4 8 4.75 8 8.75s-8 4.35-8 8.75M16 3.25c0 4.4-8 4.75-8 8.75s8 4.35 8 8.75" />
      <path d="M9.25 6.5h5.5M9.25 17.5h5.5" />
    </>
  ),
  code: <path d="M8.5 7.5 4 12l4.5 4.5M15.5 7.5 20 12l-4.5 4.5M13.5 5l-3 14" />,
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12.5" rx="2.75" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.75h17M10.5 12.75v1.5h3v-1.5" />
    </>
  ),
  language: GLOBE,
  public: GLOBE,
  translate: GLOBE,
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.25 0 2-.75 2-1.75 0-1.25-1-1.75-1-2.9 0-1 .8-1.85 1.85-1.85h2.15A3.5 3.5 0 0 0 20.5 10.5c0-3.9-3.8-7-8.5-7z" />
      <circle cx="7.75" cy="11.5" r="1.15" {...solid} />
      <circle cx="9.5" cy="7.75" r="1.15" {...solid} />
      <circle cx="13.75" cy="7" r="1.15" {...solid} />
      <circle cx="16.75" cy="9.75" r="1.15" {...solid} />
    </>
  ),
  brain: (
    <>
      <path d="M12 5.75a3 3 0 0 0-5.6-1.5A3 3 0 0 0 4 8.75a3.25 3.25 0 0 0 .25 5.75A3.25 3.25 0 0 0 7.5 19.5a3 3 0 0 0 4.5.25z" />
      <path d="M12 5.75a3 3 0 0 1 5.6-1.5A3 3 0 0 1 20 8.75a3.25 3.25 0 0 1-.25 5.75 3.25 3.25 0 0 1-3.25 5 3 3 0 0 1-4.5.25" />
      <path d="M8.75 9.5a2 2 0 0 1 2 1.75M15.25 9.5a2 2 0 0 0-2 1.75M8.5 15.25h1.25M15.5 15.25h-1.25" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M8.5 20h7M5 7.25h14" />
      <path d="M5 7.25 2.75 13M5 7.25 7.25 13M19 7.25 16.75 13M19 7.25 21.25 13" />
      <path d="M2.75 13a2.25 2.25 0 0 0 4.5 0zM16.75 13a2.25 2.25 0 0 0 4.5 0z" />
    </>
  ),
  gear: (
    <>
      <path d={cog(12, 12, 6.9, 9, 8)} />
      <circle cx="12" cy="12" r="2.75" />
    </>
  ),

  // Money
  account_balance: (
    <>
      <path d="M3.5 9.25 12 4.5l8.5 4.75z" />
      <path d="M6.25 12.25v4.75M10.15 12.25v4.75M13.85 12.25v4.75M17.75 12.25v4.75M3.5 20h17" />
    </>
  ),
  account_balance_wallet: (
    <>
      <path d="M18.5 7V5.75A1.75 1.75 0 0 0 16.75 4H6a2.5 2.5 0 0 0-2.5 2.5V17A2.5 2.5 0 0 0 6 19.5h12A2.5 2.5 0 0 0 20.5 17V9.5A2.5 2.5 0 0 0 18 7H6a2.5 2.5 0 0 1-2.5-2.5" />
      <path d="M20.5 11h-3.25a2 2 0 0 0 0 4h3.25" />
    </>
  ),
  payments: (
    <>
      <rect x="2.75" y="5.5" width="16" height="10.5" rx="2.25" />
      <circle cx="10.75" cy="10.75" r="2.25" />
      <path d="M5.75 19h13a2.5 2.5 0 0 0 2.5-2.5V9" />
    </>
  ),
  credit_card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.75" />
      <path d="M3 10h18M7 14.75h3" />
    </>
  ),
  savings: (
    <>
      <path d="M4.75 11.75C4.75 8.6 7.7 6.25 11.5 6.25h1.5c2.1 0 3.9.8 5.05 2.15l2.2-.9v4h-1.1a6 6 0 0 1-2.4 3.1v3.65h-2.5v-2.35a8.4 8.4 0 0 1-3.5 0v2.35h-2.5v-3.7a5.6 5.6 0 0 1-3.5-4.8z" />
      <path d="M10 9.25h3.5M4.75 11.75c-1.1 0-1.75-.75-1.75-1.75" />
      <circle cx="16.25" cy="10.75" r=".95" {...solid} />
    </>
  ),
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="5.5" ry="2.5" />
      <path d="M3.5 7v4.25c0 1.4 2.45 2.5 5.5 2.5M3.5 11.25v4.25c0 1.4 2.45 2.5 5.5 2.5" />
      <circle cx="15.5" cy="15" r="5" />
      <path d="M15.5 12.75v4.5" />
    </>
  ),
  sell: (
    <>
      <path d="M3.5 11.6V5A1.5 1.5 0 0 1 5 3.5h6.6a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8l-6.4 6.4a2 2 0 0 1-2.8 0L4.1 13a2 2 0 0 1-.6-1.4z" />
      <circle cx="8" cy="8" r="1.5" />
    </>
  ),
  percent: (
    <>
      <path d="M18.5 5.5 5.5 18.5" />
      <circle cx="7.25" cy="7.25" r="2.25" />
      <circle cx="16.75" cy="16.75" r="2.25" />
    </>
  ),
  trending_up: <path d="M3.5 17l6-6 4 4 7-7.5M15 7.5h5.5V13" />,
  insights: (
    <>
      <path d="M3.75 18.5 8.5 13l4 3 7.75-8.5" />
      <path d="M7.25 3.25l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" {...solid} />
    </>
  ),

  // Status, trust & rewards
  lock: (
    <>
      {LOCK_BODY}
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  lock_open: (
    <>
      {LOCK_BODY}
      <path d="M8 10.5V8a4 4 0 0 1 7.75-1.4" />
    </>
  ),
  shield: <path d={SHIELD} />,
  verified_user: (
    <>
      <path d={SHIELD} />
      <path d="M8.75 12l2.25 2.25 4.25-4.5" />
    </>
  ),
  verified: (
    <>
      <path d={rosette(12, 12, 7.6, 10.4, 8)} />
      <path d="M8.75 12.1l2.2 2.2 4.3-4.6" />
    </>
  ),
  block: (
    <>
      {CIRCLE}
      <path d="M5.8 5.8l12.4 12.4" />
    </>
  ),
  help_outline: (
    <>
      {CIRCLE}
      <path d="M9.6 9.75a2.5 2.5 0 0 1 4.85.85c0 1.75-2.45 2.2-2.45 3.65" />
      <circle cx="12" cy="17" r="1" {...solid} />
    </>
  ),
  visibility: (
    <>
      <path d="M2.75 12S6.1 5.75 12 5.75 21.25 12 21.25 12 17.9 18.25 12 18.25 2.75 12 2.75 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bolt: <path d="M13.25 3 5.75 13.25H11.5L10.75 21l7.5-10.25H12.5z" />,
  star: <path d={STAR} />,
  star_filled: <path d={STAR} fill="currentColor" />,
  favorite: <path d={HEART} />,
  heart_filled: <path d={HEART} fill="currentColor" />,
  emoji_events: (
    <>
      <path d="M7.75 4h8.5v5.5a4.25 4.25 0 0 1-8.5 0z" />
      <path d="M7.75 6H5.5a.75.75 0 0 0-.75.75v.5a3.5 3.5 0 0 0 3.2 3.5M16.25 6h2.25a.75.75 0 0 1 .75.75v.5a3.5 3.5 0 0 1-3.2 3.5" />
      <path d="M12 13.75V17M8.5 20.5h7M9.5 20.5c0-1.75 1.1-3.5 2.5-3.5s2.5 1.75 2.5 3.5" />
    </>
  ),
  military_tech: (
    <>
      <path d="M8 3.5l2.75 6.5M16 3.5l-2.75 6.5M8 3.5h8" />
      <circle cx="12" cy="15.25" r="5" />
      <path d={starPath(12, 15.45, 2.5, 1.15)} {...solid} />
    </>
  ),
  workspace_premium: (
    <>
      <circle cx="12" cy="9.5" r="6" />
      <path d="M8.5 14.4 7.5 20.75l4.5-2.25 4.5 2.25-1-6.35" />
      <path d={starPath(12, 9.7, 2.6, 1.2)} {...solid} />
    </>
  ),
  volunteer_activism: (
    <>
      <path d="M12.5 11.25s-3.75-2.15-3.75-4.75a2 2 0 0 1 3.75-1 2 2 0 0 1 3.75 1c0 2.6-3.75 4.75-3.75 4.75z" />
      <path d="M3.5 14h2.75l3.75 1.25h2.75a1.5 1.5 0 0 1 0 3H10" />
      <path d="M12.75 18.25l4.85-2.3a1.6 1.6 0 0 1 1.95 2.45l-5.1 3a3 3 0 0 1-2.15.35L6.25 20.5H3.5" />
    </>
  ),
  // Outline of the logo rocket, tilted for take-off.
  rocket_launch: (
    <g transform="translate(0.4 -0.4) rotate(45 12 12)">
      <path d="M12 2.7C14.6 5 15.4 8.6 15.1 12.3L14.7 15.7H9.3L8.9 12.3C8.6 8.6 9.4 5 12 2.7Z" />
      <path d="M9 11.75 6.65 14a1.4 1.4 0 0 0-.45 1v1.75l3.1-1.05M15 11.75 17.35 14a1.4 1.4 0 0 1 .45 1v1.75l-3.1-1.05" />
      <path d="M10.75 18.25c.15 1.15.55 2.1 1.25 3 .7-.9 1.1-1.85 1.25-3" />
      <circle cx="12" cy="8.75" r="1.4" />
    </g>
  ),
  sun: SUN,
  light_mode: SUN,
  moon: MOON,
  dark_mode: MOON,
}

// Material Symbols names that map onto drawings above (forum categories store
// these in the database, e.g. calculate / science / terminal / translate).
const ALIASES = {
  calculate: 'calculator',
  science: 'flask',
  biotech: 'dna',
  terminal: 'code',
  psychology: 'brain',
  gavel: 'scale',
  balance: 'scale',
  engineering: 'gear',
  settings: 'gear',
  work: 'briefcase',
  location_on: 'map_pin',
  play_arrow: 'play',
  format_quote: 'quote',
  filter_list: 'filter',
  help: 'help_outline',
  star_rate: 'star_filled',
}
for (const [alias, name] of Object.entries(ALIASES)) ICONS[alias] = ICONS[name]

/* ── Component ───────────────────────────────────────────────────────────── */

const warned = new Set()

/** One icon from the set; unknown names fall back to a dot (warned once in development). */
export function BrandIcon({ name, size = 18, className, style, title, strokeWidth = 1.75, ...rest }) {
  const glyph = ICONS[name]
  if (!glyph && import.meta.env?.DEV && !warned.has(name)) {
    warned.add(name)
    console.warn(`[BrandIcon] Unknown icon "${name}" — rendering the fallback dot.`)
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `sws-icon ${className}` : 'sws-icon'}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      {glyph ?? ICONS.dot}
    </svg>
  )
}

export const ICON_NAMES = Object.keys(ICONS)
