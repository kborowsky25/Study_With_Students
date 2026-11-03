// The student dashboard as a preview to explore, on the homepage's stage. The sidebar (a row
// of tabs on narrow screens) switches between the app's views, drawn with its own components
// and classes (components/ui, styles/app.css), and a few things in each view respond: open a
// conversation, pick a day, filter tutors, tick off homework. It all happens in local state,
// with no API calls and no navigation, and the people in it are made up (sample.js).
// Card titles are text rather than headings, so the page keeps its own outline.
// Only Home comes with the homepage: the other views (AppPreviewViews.jsx) load once the page
// has gone quiet, or as soon as someone points at or tabs into the dashboard.
// Styles: styles/app-preview.css, which loads with the homepage only.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { LogoMark } from '../brand/Logo'
import { Avatar, DateChip, EmptyState, Icon, Stars, StatusPill } from '../ui'
import { CONVERSATIONS, SESSIONS, STUDENT, THREADS, TUTORS, longDay, tutor } from './sample'
import { Panel, lastOf, range, replies, sum } from './previewParts'
import '../../styles/app-preview.css'

const NAV = [
  { items: [['home', 'space_dashboard', 'Home'], ['messages', 'chat', 'Messages'], ['calendar', 'calendar_month', 'Calendar'], ['progress', 'insights', 'Progress']] },
  { title: 'Tutoring', items: [['find', 'person_search', 'Find tutors'], ['mine', 'cast_for_education', 'My tutors'], ['saved', 'favorite', 'Saved tutors'], ['payments', 'payments', 'Payments']] },
  { title: 'Community', items: [['forum', 'forum', 'Forum'], ['notes', 'menu_book', 'Study notes'], ['rooms', 'groups', 'Study rooms'], ['classes', 'school', 'Classes']] },
]
const ITEMS = NAV.flatMap((group) => group.items)

// Phones show one pane of the inbox at a time (styles/app-preview-views.css)
const narrow = () => window.matchMedia?.('(max-width: 719px)').matches

// The other views, fetched once (and again if that failed)
let views = null
const loadViews = () => (views ??= import('./AppPreviewViews').catch((error) => { views = null; throw error }))
const prefetch = () => { loadViews().catch(() => {}) }

// A view that can't load (offline, or a newer version of the site went live) says so in the
// window rather than breaking the page
const Missed = () => <EmptyState title="This part of the preview didn't load. Refresh the page to try again." />
const lazyView = (name) => lazy(() => loadViews().then((all) => ({ default: all[name] }), () => ({ default: Missed })))

const More = ({ onClick, children }) => (
  <button type="button" className="card-link" onClick={onClick}>{children}<Icon name="chevron_right" /></button>
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

// ── The window ───────────────────────────────────────────────────────────────

const TutorsView = lazyView('TutorsView')
const VIEWS = {
  home: HomeView, messages: lazyView('MessagesView'), calendar: lazyView('CalendarView'), progress: lazyView('ProgressView'),
  find: TutorsView, mine: TutorsView, saved: TutorsView, payments: lazyView('PaymentsView'),
  forum: lazyView('ForumView'), notes: lazyView('NotesView'), rooms: lazyView('RoomsView'), classes: lazyView('ClassesView'),
}

export default function AppPreview() {
  const [view, setView] = useState('home')
  const [switching, startTransition] = useTransition()
  const [conversation, setConversation] = useState('oliver')
  const [day, setDay] = useState(() => SESSIONS.find((s) => s.end > Date.now()).start)
  const [flags, setFlags] = useState(() => new Set(['saved:leo', 'saved:amara', 'done:hw3']))
  const [sent, setSent] = useState({})
  const [moved, setMoved] = useState(false)   // a view has been switched to: views fade in from then on
  const root = useRef(null)
  const tabs = useRef(null)

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

  /**
   * Switch views; `conversation` or `date` open the inbox or the calendar on something. A
   * transition, so a view that's still loading leaves the current one up until it arrives.
   */
  function go(next, { conversation: id, date } = {}) {
    startTransition(() => {
      setMoved(true)
      if (next === 'messages') {
        if (id) open(id)
        else if (next !== view) open(narrow() ? null : conversation ?? 'oliver')
      }
      if (date) setDay(date)
      setView(next)
    })
  }

  // The other views come once the page has loaded and gone quiet
  useEffect(() => {
    const soon = () => (window.requestIdleCallback ? requestIdleCallback(prefetch, { timeout: 2000 }) : setTimeout(prefetch, 200))
    if (document.readyState === 'complete') soon()
    else window.addEventListener('load', soon, { once: true })
    return () => window.removeEventListener('load', soon)
  }, [])

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
    if (!moved || root.current?.contains(document.activeElement)) return
    const item = [...(root.current?.querySelectorAll(`[data-view="${view}"]`) ?? [])].find((el) => el.offsetParent)
    item?.focus({ preventScroll: true })
  }, [view, moved])

  const [, icon, label] = ITEMS.find(([key]) => key === view)
  const View = VIEWS[view]
  const badge = unread > 0 && <span className="nav-badge" aria-label={`${unread} unread`}>{unread}</span>

  return (
    <div ref={root} className="mk-app" role="region" aria-label="Preview of the student dashboard, with sample data"
      onPointerEnter={prefetch} onFocus={prefetch}>
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
        <Suspense fallback={null}>
          <div key={view} className={`mk-app-view is-${view}${view === 'messages' ? ' is-raw' : ''}${moved ? ' is-new' : ''}`}
            aria-busy={switching || undefined}>
            <View view={view} go={go} has={has} toggle={toggle} sessions={sessions} threads={threads} unread={unread}
              conversation={conversation} open={open} send={send} day={day} setDay={setDay} />
          </div>
        </Suspense>
      </div>
    </div>
  )
}
