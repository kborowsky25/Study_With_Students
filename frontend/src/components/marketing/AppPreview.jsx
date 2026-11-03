// The student dashboard as a preview to explore, on the homepage's stage. The sidebar (a row
// of tabs on narrow screens) switches between the app's views, drawn with its own components
// and classes (components/ui, styles/app.css), and a few things in each view respond: open a
// conversation, pick a day, filter tutors, tick off homework. It all happens in local state,
// with no API calls and no navigation, and the people in it are made up (sample.js).
// Card titles are text rather than headings, so the page keeps its own outline.
// Styles: styles/app-preview.css, which loads with the homepage only.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LogoMark } from '../brand/Logo'
import { Avatar, DateChip, EmptyState, Icon, Pill, Stars, Stat, StatusPill } from '../ui'
import { formatDate, formatDay, formatMoney, formatTime, timeAgo } from '../../lib/format'
import {
  CLASSES, CLASS_SIZE, CONFIDENCE, CONVERSATIONS, HOMEWORK, NOTES, ROOMS, SESSIONS, STUDENT, SUBJECTS,
  THREADS, TUTORS, longDay, tutor,
} from './sample'
import '../../styles/app-preview.css'

const NAV = [
  { items: [['home', 'space_dashboard', 'Home'], ['messages', 'chat', 'Messages'], ['calendar', 'calendar_month', 'Calendar'], ['progress', 'insights', 'Progress']] },
  { title: 'Tutoring', items: [['find', 'person_search', 'Find tutors'], ['mine', 'cast_for_education', 'My tutors'], ['saved', 'favorite', 'Saved tutors'], ['payments', 'payments', 'Payments']] },
  { title: 'Community', items: [['forum', 'forum', 'Forum'], ['notes', 'menu_book', 'Study notes'], ['rooms', 'groups', 'Study rooms'], ['classes', 'school', 'Classes']] },
]
const ITEMS = NAV.flatMap((group) => group.items)

// Phones show one pane of the inbox at a time (styles/app-preview.css)
const narrow = () => window.matchMedia?.('(max-width: 719px)').matches

const range = (s) => `${formatTime(s.start)}–${formatTime(s.end)}`
const length = (hours) => (hours < 1 ? `${hours * 60} min` : `${Math.floor(hours)} h${hours % 1 ? ` ${(hours % 1) * 60}` : ''}`)
const sum = (list, value) => list.reduce((total, item) => total + value(item), 0)
const lastOf = (list) => list[list.length - 1]
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const replies = (n) => `${n} ${n === 1 ? 'reply' : 'replies'}`

/** A card as in the app (components/ui Card), with its title as text. */
function Panel({ title, count, action, className = '', children }) {
  return (
    <div className={`card ${className}`}>
      <div className="card-head">
        <span className="mk-card-title">{title}</span>
        {count != null && <span className="count">{count}</span>}
        {action}
      </div>
      {children}
    </div>
  )
}

const More = ({ onClick, children }) => (
  <button type="button" className="card-link" onClick={onClick}>{children}<Icon name="chevron_right" /></button>
)

/** A page's title row (.dash-head), with its buttons. Not a <p>: app.css hides those in .dash-head. */
const Head = ({ title, children }) => (
  <div className="dash-head">
    <div className="mk-app-title">{title}</div>
    {children && <div className="dash-actions">{children}</div>}
  </div>
)

/** A row of filters, styled as the app's view tabs. */
function Filters({ options, value, onChange, label }) {
  return (
    <div className="tabs mk-app-filters" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option} type="button" className={option === value ? 'on' : undefined} aria-pressed={option === value}
          onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  )
}

/** A session's price as families see it: the total, with the tutor's price and the booking fee under it. */
const Price = ({ s, muted }) => (
  <span className={`mk-price${muted ? ' is-muted' : ''}`}>
    <b>{formatMoney(s.amount + s.fee)}</b>
    <small>{formatMoney(s.amount)} + {formatMoney(s.fee)} fee</small>
  </span>
)

// ── Home ─────────────────────────────────────────────────────────────────────

function HomeView({ go, sessions, threads, unread, has, toggle }) {
  const now = Date.now()
  const upcoming = sessions.filter((s) => s.end > now)
  const [first, ...later] = upcoming
  const learned = sum(sessions.filter((s) => s.end <= now), (s) => s.hours)

  return (
    <>
      <div className="hello">
        <div>
          <p className="mk-app-hello">Ready to study, <em>{STUDENT.first}</em>?</p>
          <div className="level">
            <b>Level 3 · Scholar</b>
            <span className="level-track"><i style={{ width: '24%' }} /></span>
            <span>520 XP</span>
          </div>
        </div>
        <div className="dash-actions">
          <button type="button" className="btn btn-ghost" onClick={() => go('find')}><Icon name="person_search" />Find a tutor</button>
          <button type="button" className="btn btn-coral" onClick={() => go('calendar', { date: first.start })}><Icon name="add" />Book a session</button>
        </div>
      </div>

      <div className="metrics">
        <span><b>{upcoming.length}</b>upcoming</span>
        <span><b>{learned.toFixed(1)} h</b>learned</span>
        <span><b>{TUTORS.filter((t) => t.mine).length}</b>tutors</span>
        {unread > 0 && (
          <button type="button" className="mk-app-unread" onClick={() => go('messages', { conversation: 'oliver' })}>
            <b>{unread}</b>unread
          </button>
        )}
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <Panel title="Sessions" count={upcoming.length} action={<More onClick={() => go('calendar', { date: first.start })}>Calendar</More>}>
            <div className="row-list">
              <div className="spotlight">
                <div className="grow">
                  <div className="when">Up next · {longDay(first.start)} {range(first)}</div>
                  <p className="mk-app-spot">{first.title}</p>
                  <div className="who">with {first.tutor}</div>
                </div>
                <StatusPill status={first.status} />
              </div>
              <div className="group-head">Later <span className="count">{later.length}</span></div>
              {later.map((s) => (
                <button key={s.id} type="button" className="row" onClick={() => go('calendar', { date: s.start })}>
                  <DateChip value={s.start} />
                  <span className="main"><span className="title">{s.title}</span><span className="meta">{s.tutor} · {range(s)}</span></span>
                  <StatusPill status={s.status} />
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Recommended tutors" action={<More onClick={() => go('find')}>Browse</More>}>
            <div className="row-list">
              {TUTORS.filter((t) => t.match).map((t) => (
                <div key={t.id} className="row">
                  <Avatar name={t.name} size={28} />
                  <div className="main">
                    <div className="mk-app-line"><span className="title">{t.name}</span><span className="match">{t.match}%</span><Stars rating={t.rating} count={t.reviews} /></div>
                    <div className="reasons">{t.reasons.join(' · ')}</div>
                  </div>
                  {has(`requested:${t.id}`)
                    ? <span className="side">Requested</span>
                    : <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(`requested:${t.id}`)}>Request</button>}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="dash-col mk-app-aside">
          <Panel title="Inbox" count={unread ? `${unread} new` : null} action={<More onClick={() => go('messages')}>Open</More>}>
            <div className="row-list">
              {threads.map((c) => {
                const last = lastOf(c.messages)
                const isUnread = c.id === 'oliver' && unread > 0
                return (
                  <button key={c.id} type="button" className="row" onClick={() => go('messages', { conversation: c.id })}>
                    <Avatar name={tutor(c.id).name} size={26} />
                    <span className="main">
                      <span className={`title${isUnread ? ' is-unread' : ''}`}>{tutor(c.id).name}</span>
                      <span className="meta">{last.mine ? 'You: ' : ''}{last.text}</span>
                    </span>
                    {isUnread && <span className="nav-badge">{unread}</span>}
                  </button>
                )
              })}
            </div>
          </Panel>

          <Panel title="Community" action={<More onClick={() => go('forum')}>Forum</More>}>
            <div className="row-list">
              {THREADS.slice(0, 3).map((t) => (
                <button key={t.title} type="button" className="row" onClick={() => go('forum')}>
                  <span className="main"><span className="title">{t.title}</span><span className="meta">{t.category} · {replies(t.replies)}</span></span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

// ── Messages ─────────────────────────────────────────────────────────────────

function MessagesView({ threads, conversation, open, unread, send }) {
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState('')
  const scroller = useRef(null)
  const query = filter.trim().toLowerCase()
  const shown = threads.filter((c) => !query || tutor(c.id).name.toLowerCase().includes(query))
  const current = threads.find((c) => c.id === conversation)
  const name = current ? tutor(current.id).name : ''

  // The newest message stays in view
  const count = current?.messages.length
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversation, count])

  function submit(e) {
    e.preventDefault()
    if (!draft.trim()) return
    send(conversation, draft.trim())
    setDraft('')
  }

  const days = []
  for (const m of current?.messages ?? []) {
    const label = formatDay(m.at)
    if (lastOf(days)?.label === label) lastOf(days).items.push(m)
    else days.push({ label, items: [m] })
  }

  return (
    <div className={`mk-inbox${current ? ' has-thread' : ''}`}>
      <div className="mk-inbox-list">
        <div className="mk-inbox-head">Inbox</div>
        <label className="mk-inbox-filter">
          <Icon name="search" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter conversations" aria-label="Filter conversations" />
        </label>
        <div className="mk-inbox-rows">
          {shown.map((c) => {
            const last = lastOf(c.messages)
            const isUnread = c.id === 'oliver' && unread > 0
            return (
              <button key={c.id} type="button" className={`mk-convo${c.id === conversation ? ' on' : ''}${isUnread ? ' unread' : ''}`}
                aria-current={c.id === conversation ? 'true' : undefined} onClick={() => open(c.id)}>
                <Avatar name={tutor(c.id).name} size={32} />
                <span className="mk-convo-main">
                  <span className="mk-convo-top">
                    <span className="mk-convo-name">{tutor(c.id).name}</span>
                    <span className="mk-convo-time">{timeAgo(last.at)}</span>
                  </span>
                  <span className="mk-convo-preview">{last.mine ? 'You: ' : ''}{last.text}</span>
                </span>
                {isUnread && <span className="nav-badge">{unread}</span>}
              </button>
            )
          })}
          {shown.length === 0 && <EmptyState title="No matches." />}
        </div>
      </div>

      <div className="mk-thread">
        {current ? (
          <>
            <div className="mk-thread-head">
              <button type="button" className="icon-btn mk-thread-back" onClick={() => open(null)} aria-label="Back to inbox">
                <Icon name="arrow_back" />
              </button>
              <Avatar name={name} size={30} />
              <div className="mk-thread-who">
                <div className="mk-thread-name">{name}</div>
                <div className="mk-thread-sub"><Icon name="visibility" />Visible to your parent</div>
              </div>
            </div>
            <div className="mk-thread-scroll" ref={scroller}>
              {days.map((day) => (
                <div key={day.label}>
                  <div className="mk-day"><span>{day.label}</span></div>
                  {day.items.map((m, i) => {
                    const tail = day.items[i + 1]?.mine !== m.mine
                    return (
                      <div key={`${m.at.getTime()}-${i}`} className={`mk-bubble-row${m.mine ? ' mine' : ''}${tail ? ' tail' : ''}`}>
                        <div className="mk-bubble">{m.text}</div>
                        {tail && <div className="mk-bubble-meta">{formatTime(m.at)}</div>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <form className="mk-composer" onSubmit={submit}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={400}
                placeholder={`Message ${name.split(' ')[0]}…`} aria-label={`Message ${name}`} />
              <button type="submit" className="btn btn-coral" disabled={!draft.trim()} aria-label="Send"><Icon name="send" /></button>
            </form>
          </>
        ) : (
          <div className="mk-thread-empty"><EmptyState title="Pick a conversation." /></div>
        )}
      </div>
    </div>
  )
}

// ── Calendar ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const monthOf = (d) => new Date(d.getFullYear(), d.getMonth(), 1)

/** The days to draw for `month`: whole weeks, Monday first. */
function monthDays(month) {
  const day = new Date(month)
  day.setDate(1 - ((day.getDay() + 6) % 7))
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const days = []
  while (day <= last || day.getDay() !== 1) {
    days.push(new Date(day))
    day.setDate(day.getDate() + 1)
  }
  return days
}

function CalendarView({ sessions, day, setDay }) {
  const [month, setMonth] = useState(() => monthOf(day))
  const byDay = useMemo(() => {
    const map = new Map()
    for (const s of sessions) map.set(dayKey(s.start), [...(map.get(dayKey(s.start)) ?? []), s])
    return map
  }, [sessions])
  const days = useMemo(() => monthDays(month), [month])
  const today = dayKey(new Date())
  const selected = dayKey(day)
  const onDay = byDay.get(selected) ?? []
  const upcoming = sessions.filter((s) => s.end > Date.now())

  function pick(d) {
    setDay(d)
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) setMonth(monthOf(d))
  }

  return (
    <>
      <Head title="Calendar" />
      <div className="dash-grid">
        <div className="dash-col">
          <div className="card">
            <div className="card-head">
              <span className="mk-card-title">
                <Icon name="calendar_month" />{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => pick(new Date())}>Today</button>
              <button type="button" className="icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
                <Icon name="chevron_left" />
              </button>
              <button type="button" className="icon-btn mk-cal-next" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
                <Icon name="chevron_right" />
              </button>
            </div>
            <div className="mk-cal">
              {WEEKDAYS.map((w) => <span key={w} className="mk-cal-head" aria-hidden="true">{w[0]}<span>{w.slice(1)}</span></span>)}
              {days.map((d) => {
                const key = dayKey(d)
                const list = byDay.get(key) ?? []
                const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
                return (
                  <button key={key} type="button" onClick={() => pick(d)} aria-pressed={key === selected}
                    aria-label={list.length ? `${label}, ${plural(list.length, 'session')}` : label}
                    className={`mk-cal-day${d.getMonth() !== month.getMonth() ? ' is-out' : ''}${key === today ? ' is-today' : ''}${key === selected ? ' is-on' : ''}`}>
                    <span className="mk-cal-num">{d.getDate()}</span>
                    {list.length > 0 && (
                      <span className="mk-cal-events">
                        {list.map((s) => <i key={s.id} className={`mk-cal-event is-${s.status}`}><span>{formatTime(s.start)}</span></i>)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="dash-col">
          <Panel title={day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} count={onDay.length || null}>
            {onDay.length ? (
              <div className="row-list">
                {onDay.map((s) => (
                  <div key={s.id} className="row">
                    <span className="mk-cal-time">{formatTime(s.start)}</span>
                    <div className="main"><div className="title">{s.title}</div><div className="meta">{s.tutor} · {length(s.hours)}</div></div>
                    <StatusPill status={s.status} />
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Nothing on this day." />}
          </Panel>

          <Panel title="Upcoming" count={upcoming.length} className="mk-cal-upcoming">
            <div className="row-list">
              {upcoming.map((s) => (
                <button key={s.id} type="button" className="row" onClick={() => pick(s.start)}>
                  <DateChip value={s.start} />
                  <span className="main"><span className="title">{s.title}</span><span className="meta">{s.tutor} · {range(s)}</span></span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

// ── Tutors: find, mine, saved ────────────────────────────────────────────────

const TUTOR_VIEWS = { find: 'Find a tutor', mine: 'My tutors', saved: 'Saved tutors' }
const TUTOR_SUBJECTS = ['Maths', 'Physics', 'Chemistry', 'Biology', 'English']

function TutorsView({ view, go, has, toggle }) {
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const q = query.trim().toLowerCase()
  const saved = TUTORS.filter((t) => has(`saved:${t.id}`))
  const scope = view === 'mine' ? TUTORS.filter((t) => t.mine) : view === 'saved' ? saved : TUTORS
  const list = scope
    .filter((t) => !subject || t.subjects.includes(subject))
    .filter((t) => !q || [t.name, t.uni, ...t.subjects].some((v) => v.toLowerCase().includes(q)))
  const filtered = Boolean(q || subject)
  const clear = () => { setQuery(''); setSubject('') }

  return (
    <>
      <Head title={TUTOR_VIEWS[view]}>
        {view !== 'find' && <button type="button" className="btn btn-ghost" onClick={() => go('find')}><Icon name="person_search" />Find tutors</button>}
        {view !== 'saved' && <button type="button" className="btn btn-ghost" onClick={() => go('saved')}><Icon name="favorite" />Saved{saved.length ? ` · ${saved.length}` : ''}</button>}
        {view !== 'mine' && <button type="button" className="btn btn-ghost" onClick={() => go('mine')}><Icon name="cast_for_education" />My tutors</button>}
      </Head>

      {view === 'find' && (
        <>
          <div className="mk-app-search">
            <Icon name="search" />
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Subject or name" aria-label="Search by subject or name" />
          </div>
          <div className="mk-app-chips" role="group" aria-label="Subjects">
            {TUTOR_SUBJECTS.map((s) => (
              <button key={s} type="button" className="btn btn-ghost btn-sm" aria-pressed={s === subject} onClick={() => setSubject(s === subject ? '' : s)}>{s}</button>
            ))}
          </div>
        </>
      )}

      <Panel title="Tutors" count={filtered ? `${list.length} of ${scope.length}` : list.length}
        action={filtered && <button type="button" className="btn btn-quiet btn-sm" onClick={clear}>Clear filters</button>}>
        {list.length ? (
          <div className="row-list">
            {list.map((t) => {
              const isSaved = has(`saved:${t.id}`)
              return (
                <div key={t.id} className="row row-wrap mk-tutor">
                  <Avatar name={t.name} size={34} />
                  <div className="main">
                    <div className="mk-app-line">
                      <span className="title">{t.name}</span>
                      <Pill tone="green">DBS checked</Pill>
                      {t.mine && <StatusPill status="accepted" label="Your tutor" />}
                    </div>
                    <div className="meta">{t.uni} · {t.course}</div>
                    <div className="mk-tutor-subjects">
                      {t.subjects.map((s) => <Pill key={s} tone={s === subject ? 'coral' : undefined}>{s}</Pill>)}
                    </div>
                  </div>
                  <div className="row-actions">
                    <span className="mk-tutor-rate">{formatMoney(t.rate)}<small>/hr</small></span>
                    <button type="button" className="icon-btn" aria-pressed={isSaved} onClick={() => toggle(`saved:${t.id}`)}
                      aria-label={isSaved ? `Remove ${t.name} from saved tutors` : `Save ${t.name}`}>
                      <Icon name="favorite" fill={isSaved} style={isSaved ? { color: 'var(--coral)' } : undefined} />
                    </button>
                    {t.mine ? (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('messages', { conversation: t.id })}>Message</button>
                    ) : has(`requested:${t.id}`) ? (
                      <StatusPill status="pending" label="Requested" />
                    ) : (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(`requested:${t.id}`)}>Request</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : filtered ? (
          <EmptyState title="No tutors match these filters." action={<button type="button" className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button>} />
        ) : (
          <EmptyState title="No saved tutors yet." action={<button type="button" className="btn btn-ghost btn-sm" onClick={() => go('find')}>Find tutors</button>} />
        )}
      </Panel>
    </>
  )
}

// ── Progress ─────────────────────────────────────────────────────────────────

function Confidence({ value }) {
  return (
    <span className="mk-conf" role="img" aria-label={`${CONFIDENCE[value]}, ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= value ? 'on' : undefined} />)}
    </span>
  )
}

function dueLabel(date) {
  const day = formatDay(date)
  return `Due ${['Today', 'Tomorrow'].includes(day) ? day.toLowerCase() : day}`
}

function ProgressView({ sessions, has, toggle }) {
  const [tab, setTab] = useState('overview')
  const subject = SUBJECTS.find((s) => s.key === tab)
  const lesson = (id) => sessions.find((s) => s.id === id)
  const past = sessions.filter((s) => s.end <= Date.now())
  const open = HOMEWORK.filter((h) => !has(`done:${h.id}`))
  const covered = (s) => s.topics.filter((t) => t.confidence)
  const confident = (s) => s.topics.filter((t) => t.confidence >= 4)

  return (
    <>
      <div className="tabs" role="group" aria-label="Subjects">
        <button type="button" className={subject ? undefined : 'on'} aria-pressed={!subject} onClick={() => setTab('overview')}>Overview</button>
        {SUBJECTS.map((s) => (
          <button key={s.key} type="button" className={s === subject ? 'on' : undefined} aria-pressed={s === subject} onClick={() => setTab(s.key)}>
            {s.name}<span className="count">{covered(s).length}/{s.total}</span>
          </button>
        ))}
      </div>

      {subject ? (
        <>
          <div className="metrics">
            <span><b>{covered(subject).length}</b>of {subject.total} topics covered</span>
            <span><b>{confident(subject).length}</b>confident</span>
            <span><b>{subject.lessons.length}</b>lessons</span>
          </div>
          <div className="dash-grid">
            <div className="dash-col">
              <Panel title="Topics" count={`${covered(subject).length} of ${subject.total}`}>
                <div className="row-list">
                  {subject.topics.map((t) => (t.confidence ? (
                    <div key={t.name} className="row">
                      <div className="main">
                        <div className="title">{t.name}</div>
                        <div className="meta">Last covered {formatDate(lesson(t.lesson).start)}</div>
                      </div>
                      {t.previous && <Icon name="expand_less" className="mk-trend" title={`Up from ${CONFIDENCE[t.previous]}`} />}
                      <Confidence value={t.confidence} />
                      <span className="mk-conf-label">{CONFIDENCE[t.confidence]}</span>
                    </div>
                  ) : (
                    <div key={t.name} className="row is-untouched"><div className="main"><div className="title">{t.name}</div></div></div>
                  )))}
                </div>
              </Panel>
            </div>
            <div className="dash-col">
              <Panel title="Topics over time">
                <div className="bars" role="img" aria-label={`Topics covered after each lesson: ${subject.growth.join(', ')}`}>
                  {subject.growth.map((n, i) => (
                    <div key={subject.lessons[i]} className={`bar${i === subject.growth.length - 1 ? ' hot' : ''}`}>
                      <i style={{ height: `${(n / Math.max(...subject.growth)) * 100}%` }} />
                      <span>{formatDate(lesson(subject.lessons[i]).start)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="metrics">
            <span><b>{past.length}</b>lessons</span>
            <span><b>{SUBJECTS.length}</b>subjects</span>
            <span><b>{open.length}</b>homework to do</span>
            <span>Last lesson <b>{formatDate(lastOf(past).start)}</b></span>
          </div>
          <div className="dash-grid">
            <div className="dash-col">
              <Panel title="Subjects" count={SUBJECTS.length}>
                <div className="row-list">
                  {SUBJECTS.map((s) => (
                    <button key={s.key} type="button" className="row mk-subject" onClick={() => setTab(s.key)}>
                      <span className="main">
                        <span className="title">{s.name}</span>
                        <span className="meta">{covered(s).length} of {s.total} topics · {confident(s).length} confident · {s.lessons.length} lessons</span>
                      </span>
                      <span className="progress"><i style={{ width: `${(covered(s).length / s.total) * 100}%` }} /></span>
                      <Icon name="chevron_right" className="mk-faint" />
                    </button>
                  ))}
                </div>
              </Panel>
            </div>
            <div className="dash-col">
              <Panel title="Homework" count={open.length ? `${open.length} to do` : null}>
                <div className="mk-hw-list">
                  {HOMEWORK.map((h) => {
                    const done = has(`done:${h.id}`)
                    return (
                      <div key={h.id} className={`mk-hw${done ? ' is-done' : ''}`}>
                        <button type="button" role="checkbox" aria-checked={done} aria-label={h.task}
                          className={`mk-hw-check${done ? ' on' : ''}`} onClick={() => toggle(`done:${h.id}`)}>
                          {done && <Icon name="check" />}
                        </button>
                        <div className="mk-hw-main">
                          <div className="mk-hw-task">{h.task}</div>
                          <div className="mk-hw-meta">{h.subject}{!done && h.due ? ` · ${dueLabel(h.due)}` : ''}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Payments ─────────────────────────────────────────────────────────────────

function PaymentsView({ sessions, toggle }) {
  const due = sessions.filter((s) => s.status === 'confirmed')
  const paid = sessions.filter((s) => s.status === 'paid').reverse()
  const waiting = sessions.filter((s) => s.status === 'pending')
  const row = (s, end) => (
    <div key={s.id} className="row row-wrap">
      <DateChip value={s.start} />
      <div className="main"><div className="title">{s.title}</div><div className="meta">{s.tutor} · {range(s)}</div></div>
      <div className="row-actions">{end}</div>
    </div>
  )

  return (
    <>
      <div className="card stat-grid">
        <Stat label="To pay" value={formatMoney(sum(due, (s) => s.amount + s.fee))} />
        <Stat label="Paid to tutors" value={formatMoney(sum(paid, (s) => s.amount))} />
        <Stat label="Booking fees" value={formatMoney(sum(paid, (s) => s.fee))} />
        <Stat label="Total paid" value={formatMoney(sum(paid, (s) => s.amount + s.fee))} />
      </div>
      <div className="dash-grid">
        <div className="dash-col">
          <Panel title="To pay" count={due.length || null}>
            {due.length ? (
              <div className="row-list">
                {due.map((s) => row(s, <>
                  <Price s={s} />
                  <button type="button" className="btn btn-coral btn-sm" onClick={() => toggle(`paid:${s.id}`)}>Pay</button>
                </>))}
              </div>
            ) : <EmptyState title="Nothing to pay." />}
          </Panel>
          <Panel title="History" count={paid.length}>
            <div className="row-list">{paid.map((s) => row(s, <><Price s={s} /><StatusPill status="paid" /></>))}</div>
          </Panel>
        </div>
        <div className="dash-col">
          <Panel title="Awaiting tutor" count={waiting.length || null}>
            <div className="row-list">{waiting.map((s) => row(s, <Price s={s} muted />))}</div>
          </Panel>
        </div>
      </div>
    </>
  )
}

// ── Community: forum, study notes, study rooms, classes ──────────────────────

const FORUM_CATEGORIES = ['All', 'Maths', 'Sciences', 'English', 'Exam prep']

function ForumView() {
  const [category, setCategory] = useState('All')
  const list = THREADS.filter((t) => category === 'All' || t.category === category)
  return (
    <>
      <Head title="Forum" />
      <Filters label="Categories" options={FORUM_CATEGORIES} value={category} onChange={setCategory} />
      <Panel title="Latest discussions" count={list.length}>
        <div className="row-list">
          {list.map((t) => (
            <div key={t.title} className="row">
              <Avatar name={t.by} size={28} />
              <div className="main">
                <div className="title">{t.title}</div>
                <div className="meta">{t.category} · {replies(t.replies)} · {timeAgo(t.at)}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

const FILE_KINDS = { pdf: ['picture_as_pdf', 'PDF'], slides: ['slideshow', 'Slides'], doc: ['description', 'Word document'] }

function NotesView() {
  const [whose, setWhose] = useState('All notes')
  const list = NOTES.filter((n) => whose === 'All notes' || n.mine)
  return (
    <>
      <Head title="Study notes" />
      <Filters label="Whose notes" options={['All notes', 'Mine']} value={whose} onChange={setWhose} />
      <Panel title="Notes" count={list.length}>
        <div className="row-list">
          {list.map((n) => (
            <div key={n.title} className="row">
              <Icon name={FILE_KINDS[n.kind][0]} className={`mk-file is-${n.kind}`} title={FILE_KINDS[n.kind][1]} />
              <div className="main">
                <div className="title">{n.title}</div>
                <div className="meta">{n.subject} · {n.mine ? 'You' : n.by} · {formatDate(n.at)}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

function RoomsView({ has, toggle }) {
  return (
    <>
      <Head title="Study rooms" />
      <Panel title="Upcoming" count={ROOMS.length}>
        <div className="row-list">
          {ROOMS.map((r) => (
            <div key={r.id} className="row row-wrap">
              <DateChip value={r.start} />
              <div className="main">
                <div className="title">{r.subject}<span className="mk-faint"> {r.note}</span></div>
                <div className="meta">{r.host} · {formatTime(r.start)} · {length(r.hours)}</div>
              </div>
              <div className="row-actions">
                {has(`calendar:${r.id}`) ? <Pill tone="green">In calendar</Pill> : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(`calendar:${r.id}`)}>
                    <Icon name="calendar_add_on" />Add to calendar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

function ClassesView({ has, toggle }) {
  const [tab, setTab] = useState('All')
  const list = CLASSES.filter((c) => tab === 'All' || has(`joined:${c.id}`))
  return (
    <>
      <Head title="Classes" />
      <Filters label="Classes" options={['All', 'Joined']} value={tab} onChange={setTab} />
      <Panel title="Upcoming" count={list.length}>
        {list.length ? (
          <div className="row-list">
            {list.map((c) => {
              const joined = has(`joined:${c.id}`)
              const taken = c.taken + (joined ? 1 : 0)
              return (
                <div key={c.id} className="row row-wrap">
                  <DateChip value={c.start} />
                  <div className="main">
                    <div className="title">{c.title}</div>
                    <div className="meta">{c.subject} · {c.host} · {formatTime(c.start)}</div>
                  </div>
                  <div className="row-actions">
                    <span className="mk-seats" title={`${taken} of ${CLASS_SIZE} places taken`}>
                      <span className="progress"><i style={{ width: `${(taken / CLASS_SIZE) * 100}%` }} /></span>
                      <span className="side">{taken}/{CLASS_SIZE}</span>
                    </span>
                    {joined ? (
                      <>
                        <Pill tone="green">Joined</Pill>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => toggle(`joined:${c.id}`)}>Leave</button>
                      </>
                    ) : taken >= CLASS_SIZE ? (
                      <button type="button" className="btn btn-ghost btn-sm" disabled>Full</button>
                    ) : (
                      <button type="button" className="btn btn-coral btn-sm" onClick={() => toggle(`joined:${c.id}`)}>Join</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : <EmptyState title="You haven’t joined any classes." action={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab('All')}>See all</button>} />}
      </Panel>
    </>
  )
}

// ── The window ───────────────────────────────────────────────────────────────

const VIEWS = {
  home: HomeView, messages: MessagesView, calendar: CalendarView, progress: ProgressView,
  find: TutorsView, mine: TutorsView, saved: TutorsView, payments: PaymentsView,
  forum: ForumView, notes: NotesView, rooms: RoomsView, classes: ClassesView,
}

export default function AppPreview() {
  const [view, setView] = useState('home')
  const [conversation, setConversation] = useState('oliver')
  const [day, setDay] = useState(() => SESSIONS.find((s) => s.end > Date.now()).start)
  const [flags, setFlags] = useState(() => new Set(['saved:leo', 'saved:amara', 'done:hw3']))
  const [sent, setSent] = useState({})
  const root = useRef(null)
  const tabs = useRef(null)
  const moved = useRef(false)

  const has = (key) => flags.has(key)
  const toggle = useCallback((key) => setFlags((all) => {
    const next = new Set(all)
    if (!next.delete(key)) next.add(key)
    return next
  }), [])

  const unread = has('read:oliver') ? 0 : 1
  const open = useCallback((id) => {
    setConversation(id)
    if (id === 'oliver') setFlags((all) => (all.has('read:oliver') ? all : new Set(all).add('read:oliver')))
  }, [])

  // Sessions as they stand after "Pay"; conversations with what was written here
  const sessions = useMemo(() => SESSIONS.map((s) => (flags.has(`paid:${s.id}`) ? { ...s, status: 'paid' } : s)), [flags])
  const threads = useMemo(() => CONVERSATIONS
    .map((c) => ({ ...c, messages: [...c.messages, ...(sent[c.id] ?? [])] }))
    .sort((a, b) => lastOf(b.messages).at - lastOf(a.messages).at), [sent])
  const send = (id, text) => setSent((all) => ({ ...all, [id]: [...(all[id] ?? []), { mine: true, text, at: new Date() }] }))

  /** Switch views; `conversation` or `date` open the inbox or the calendar on something. */
  function go(next, { conversation: id, date } = {}) {
    moved.current = true
    if (next === 'messages') {
      if (id) open(id)
      else if (next !== view) open(narrow() ? null : conversation ?? 'oliver')
    }
    if (date) setDay(date)
    setView(next)
  }

  // A button that switched views went with the old view: focus moves to the new view's
  // sidebar item (or tab), so the keyboard carries on from there. The visible tab is also
  // scrolled into the row.
  useEffect(() => {
    const strip = tabs.current
    const on = strip?.querySelector('.on')
    if (on && strip.clientWidth) {
      if (on.offsetLeft < strip.scrollLeft) strip.scrollLeft = on.offsetLeft - 8
      else if (on.offsetLeft + on.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = on.offsetLeft + on.offsetWidth - strip.clientWidth + 8
    }
    if (!moved.current || root.current?.contains(document.activeElement)) return
    const item = [...(root.current?.querySelectorAll(`[data-view="${view}"]`) ?? [])].find((el) => el.offsetParent)
    item?.focus({ preventScroll: true })
  }, [view])

  const [, icon, label] = ITEMS.find(([key]) => key === view)
  const View = VIEWS[view]
  const badge = unread > 0 && <span className="nav-badge" aria-label={`${unread} unread`}>{unread}</span>

  return (
    <div ref={root} className="mk-app" role="region" aria-label="Preview of the student dashboard, with sample data">
      <div className="mk-app-side">
        <div className="mk-app-brand"><LogoMark size={16} />Study with <em>Students</em></div>
        {NAV.map((group, i) => (
          <div key={i} className="mk-app-group">
            {group.title && <div className="sidebar-label"><span>{group.title}</span></div>}
            {group.items.map(([key, itemIcon, itemLabel]) => (
              <button key={key} type="button" data-view={key} className={`nav-item${key === view ? ' active' : ''}`}
                aria-current={key === view ? 'page' : undefined} onClick={() => go(key)}>
                <Icon name={itemIcon} /><span className="grow">{itemLabel}</span>{key === 'messages' && badge}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="mk-app-main">
        <div className="mk-app-top"><Icon name={icon} />{label}</div>
        <div ref={tabs} className="tabs mk-app-tabs">
          {ITEMS.map(([key, , itemLabel]) => (
            <button key={key} type="button" data-view={key} className={key === view ? 'on' : undefined}
              aria-current={key === view ? 'page' : undefined} onClick={() => go(key)}>
              {itemLabel}{key === 'messages' && badge}
            </button>
          ))}
        </div>
        <div key={view} className={`mk-app-view is-${view}${view === 'messages' ? ' is-raw' : ''}${moved.current ? ' is-new' : ''}`}>
          <View view={view} go={go} has={has} toggle={toggle} sessions={sessions} threads={threads} unread={unread}
            conversation={conversation} open={open} send={send} day={day} setDay={setDay} />
        </div>
      </div>
    </div>
  )
}
