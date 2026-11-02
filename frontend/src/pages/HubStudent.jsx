import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import BookSessionModal from '../components/features/BookSessionModal'
import SpotlightTour from '../components/features/SpotlightTour'
import { Avatar, Card, CardLink, DateChip, EmptyState, Icon, SkeletonRows, Stat, StatusPill } from '../components/ui'
import { getActiveTutors, getTutorRequestsSent } from '../api/tutors'
import { getEvents } from '../api/events'
import { getConversations } from '../api/messages'
import { getRecentThreads } from '../api/forum'
import { hasExplorerAccess } from '../lib/access'
import {
  firstName, formatMoney, formatTime, formatWhen, greeting, hoursBetween, timeAgo, weekBuckets,
} from '../lib/format'

const TOUR_STEPS = [
  { target: null, position: 'center', title: 'Welcome to Study With Students 🚀', body: "This is your home. Here's a 20-second tour of the essentials." },
  { target: '[data-tour="find-tutors"]', position: 'right', title: 'Find a tutor', body: 'Browse university students by subject and send a request. Once they accept, you can book sessions.' },
  { target: '[data-tour="messages"]', position: 'right', title: 'Messages', body: 'Talk to your tutors directly — no middleman.' },
  { target: '[data-tour="payments"]', position: 'right', title: 'Payments', body: 'Pay tutors per session. We take 0% commission — every penny goes to them.' },
  { target: '[data-tour="forum"]', position: 'right', title: 'Explorer plan', body: 'For £5/month: the community forum, shared study notes, study rooms and live classes.' },
]

const isUpcoming = (e) => new Date(e.end_time) > new Date() && ['pending', 'confirmed', 'paid'].includes(e.status)

function SessionRow({ ev }) {
  return (
    <div className="row">
      <DateChip value={ev.start_time} />
      <div className="main">
        <div className="title">{ev.title || 'Tutoring session'}</div>
        <div className="meta">with {ev.tutor_name} · {formatTime(ev.start_time)}–{formatTime(ev.end_time)}</div>
      </div>
      <span className="side hide-mobile">{formatMoney(ev.amount)}</span>
      <StatusPill status={ev.status} />
    </div>
  )
}

function LearningChart({ events }) {
  const weeks = useMemo(() => {
    const buckets = weekBuckets(8)
    return buckets.map((b) => ({
      ...b,
      hours: events
        .filter((e) => ['confirmed', 'paid'].includes(e.status))
        .filter((e) => { const t = new Date(e.start_time); return t >= b.start && t < b.end })
        .reduce((sum, e) => sum + hoursBetween(e.start_time, e.end_time), 0),
    }))
  }, [events])
  const max = Math.max(1, ...weeks.map((w) => w.hours))
  const total = weeks.reduce((s, w) => s + w.hours, 0)

  return (
    <Card title="Learning hours" icon="insights" action={<span className="count">{total.toFixed(1)} h · 8 weeks</span>}>
      <div style={{ padding: '14px 18px 16px' }}>
        <div className="bars">
          {weeks.map((w, i) => (
            <div className={`bar ${i === weeks.length - 1 ? 'hot' : ''}`} key={w.label} title={`${w.hours.toFixed(1)} h · week of ${w.label}`}>
              <i style={{ height: `${(w.hours / max) * 100}%`, animationDelay: `${i * 40}ms` }} />
              <span>{w.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ExplorerUpsell() {
  return (
    <section className="card spotlight" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
      <div>
        <div className="eyebrow">Explorer plan · £5/month</div>
        <h2 style={{ fontSize: 17 }}>Study with the whole community</h2>
        <p className="who" style={{ lineHeight: 1.5 }}>Tutoring is always free to use. Explorer adds everything around it.</p>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {[
          ['forum', 'Community forum'],
          ['menu_book', 'Shared study notes & materials'],
          ['groups', 'Drop-in study rooms'],
          ['school', 'Live group classes'],
        ].map(([icon, label]) => (
          <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            <Icon name={icon} size={17} style={{ color: 'var(--coral)' }} />{label}
          </div>
        ))}
      </div>
      <Link to="/membership" className="btn btn-coral"><Icon name="rocket_launch" />Upgrade for £5/month</Link>
    </section>
  )
}

export default function HubStudent() {
  const { user } = useAuth()
  const explorer = hasExplorerAccess(user)
  const [data, setData] = useState({ events: [], conversations: [], tutors: [], requests: [], threads: [] })
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(null)
  const [tour, setTour] = useState(false)

  function load() {
    return Promise.allSettled([
      getEvents(), getConversations(), getActiveTutors(), getTutorRequestsSent(),
      explorer ? getRecentThreads(4) : Promise.resolve({ data: { threads: [] } }),
    ]).then(([ev, conv, tut, req, thr]) => {
      const ok = (r, key) => (r.status === 'fulfilled' ? r.value.data[key] ?? [] : [])
      setData({
        events: ok(ev, 'events').filter((e) => e.role !== 'tutor'),
        conversations: ok(conv, 'conversations'),
        tutors: ok(tut, 'tutors'),
        requests: ok(req, 'requests'),
        threads: ok(thr, 'threads'),
      })
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [explorer])

  useEffect(() => {
    const key = `sws_tour_student_${user?.id}`
    if (user?.id && !localStorage.getItem(key)) {
      const t = setTimeout(() => setTour(true), 700)
      return () => clearTimeout(t)
    }
  }, [user?.id])

  const { events, conversations, tutors, requests, threads } = data
  const upcoming = events.filter(isUpcoming).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const next = upcoming[0]
  const past = events.filter((e) => new Date(e.end_time) <= new Date() && ['confirmed', 'paid'].includes(e.status))
  const hoursLearned = past.reduce((s, e) => s + hoursBetween(e.start_time, e.end_time), 0)
  const spent = events.filter((e) => e.status === 'paid').reduce((s, e) => s + Number(e.amount || 0), 0)
  const toPay = events.filter((e) => e.status === 'confirmed').length
  const unread = conversations.reduce((s, c) => s + Number(c.unread || 0), 0)
  const pendingRequests = requests.filter((r) => r.status === 'pending')

  const summary = [
    upcoming.length ? `${upcoming.length} upcoming session${upcoming.length > 1 ? 's' : ''}` : 'No sessions booked yet',
    unread ? `${unread} unread message${unread > 1 ? 's' : ''}` : null,
    toPay ? `${toPay} to pay` : null,
  ].filter(Boolean).join(' · ')

  return (
    <HubLayout initialMode="student">
      <PageTitle title="Home" icon="space_dashboard" />

      <div className="dash-head">
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 style={{ marginTop: 6 }}>{greeting()}, <em>{firstName(user?.name)}</em></h1>
          <p>{loading ? 'Loading your week…' : summary}</p>
        </div>
        <div className="dash-actions">
          <Link to="/find-tutors" className="btn btn-ghost"><Icon name="person_search" />Find a tutor</Link>
          <button className="btn btn-coral" disabled={!tutors.length} title={tutors.length ? '' : 'Connect with a tutor first'}
            onClick={() => setBooking(tutors[0])}>
            <Icon name="add" />Book a session
          </button>
        </div>
      </div>

      <section className="card stat-grid">
        <Stat icon="event_upcoming" label="Upcoming" value={upcoming.length}
          note={next ? `Next: ${formatWhen(next.start_time)}` : 'Nothing scheduled'} />
        <Stat icon="schedule" label="Hours learned" value={hoursLearned.toFixed(1)} unit="h"
          note={`${past.length} session${past.length === 1 ? '' : 's'} completed`} />
        <Stat icon="cast_for_education" label="My tutors" value={tutors.length}
          note={pendingRequests.length ? `${pendingRequests.length} request${pendingRequests.length > 1 ? 's' : ''} pending` : 'Connected tutors'} />
        <Stat icon="volunteer_activism" label="Paid to tutors" value={formatMoney(spent)}
          note="0% commission — all of it" trend="up" />
      </section>

      <div className="dash-grid">
        <div className="dash-col">
          {next ? (
            <section className="card spotlight">
              <DateChip value={next.start_time} />
              <div className="grow">
                <div className="when"><Icon name="bolt" size={15} />Up next · {formatWhen(next.start_time)}</div>
                <h2>{next.title || 'Tutoring session'}</h2>
                <div className="who">with {next.tutor_name} · {formatMoney(next.amount)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <StatusPill status={next.status} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link to="/messages" search={{ user: next.tutor_user_id }} className="btn btn-ghost btn-sm"><Icon name="chat" />Message</Link>
                  {next.status === 'confirmed' && <Link to="/payments" className="btn btn-coral btn-sm"><Icon name="credit_card" />Pay</Link>}
                </div>
              </div>
            </section>
          ) : !loading && (
            <section className="card spotlight">
              <div className="grow">
                <div className="when"><Icon name="rocket_launch" size={15} />Get started</div>
                <h2>{tutors.length ? 'Book your next session' : 'Find your first tutor'}</h2>
                <div className="who">
                  {tutors.length
                    ? 'Pick a time that suits you — your tutor confirms, then you pay them directly.'
                    : 'Send a request to a university student who aced your subject. Booking opens once they accept.'}
                </div>
              </div>
              {tutors.length
                ? <button className="btn btn-coral" onClick={() => setBooking(tutors[0])}><Icon name="add" />Book</button>
                : <Link to="/find-tutors" className="btn btn-coral"><Icon name="person_search" />Browse tutors</Link>}
            </section>
          )}

          <Card title="Sessions" icon="event" count={upcoming.length || null} action={<CardLink to="/calendar/student">Calendar</CardLink>}>
            {loading ? <SkeletonRows /> : upcoming.length ? (
              <div className="row-list">{upcoming.slice(0, 5).map((ev) => <SessionRow key={ev.id_event} ev={ev} />)}</div>
            ) : (
              <EmptyState icon="event_available" title="No upcoming sessions">
                Sessions you request appear here while your tutor confirms them.
              </EmptyState>
            )}
          </Card>

          <LearningChart events={events} />
        </div>

        <div className="dash-col">
          <Card title="Messages" icon="chat" count={unread ? `${unread} new` : null} action={<CardLink to="/messages">Inbox</CardLink>}>
            {loading ? <SkeletonRows rows={2} /> : conversations.length ? (
              <div className="row-list">
                {conversations.slice(0, 4).map((c) => (
                  <Link key={c.user_id} to="/messages" search={{ user: c.user_id }} className="row">
                    <Avatar name={c.name} size={32} />
                    <div className="main">
                      <div className="title" style={{ fontWeight: c.unread ? 800 : 600 }}>{c.name}</div>
                      <div className="meta">{c.last_from_me ? 'You: ' : ''}{c.last_message}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span className="side">{timeAgo(c.last_ts)}</span>
                      {c.unread > 0 && <span className="nav-badge">{c.unread}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon="forum" title="No conversations yet">Message a tutor from their profile.</EmptyState>
            )}
          </Card>

          <Card title="My tutors" icon="cast_for_education" action={<CardLink to="/active-tutors" />}>
            {loading ? <SkeletonRows rows={2} /> : tutors.length || pendingRequests.length ? (
              <div className="row-list">
                {tutors.slice(0, 4).map((t) => (
                  <div key={t.id_tutor} className="row">
                    <Avatar name={t.name} src={t.avatar_url} size={32} />
                    <Link to="/tutor/$tutorId" params={{ tutorId: String(t.id_tutor) }} className="main" style={{ color: 'inherit' }}>
                      <div className="title">{t.name}</div>
                      <div className="meta">{t.subjects || t.university}</div>
                    </Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => setBooking(t)}>Book</button>
                  </div>
                ))}
                {pendingRequests.slice(0, 2).map((r) => (
                  <div key={r.id} className="row">
                    <Avatar name={r.tutor_name} size={32} />
                    <div className="main">
                      <div className="title">{r.tutor_name}</div>
                      <div className="meta">Request sent {timeAgo(r.created_at)}</div>
                    </div>
                    <StatusPill status="pending" label="Pending" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="person_search" title="No tutors yet" action={<Link to="/find-tutors" className="btn btn-ghost btn-sm">Find a tutor</Link>}>
                Tutors appear here once they accept your request.
              </EmptyState>
            )}
          </Card>

          {explorer ? (
            <Card title="Community" icon="forum" action={<CardLink to="/forum">Forum</CardLink>}>
              {threads.length ? (
                <div className="row-list">
                  {threads.map((t) => (
                    <Link key={t.id} to="/forum/thread/$threadId" params={{ threadId: String(t.id) }} className="row">
                      <div className="main">
                        <div className="title">{t.title}</div>
                        <div className="meta">{t.category_name} · {t.post_count} repl{t.post_count === 1 ? 'y' : 'ies'} · {timeAgo(t.last_activity)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon="forum" title="Quiet in here" action={<Link to="/forum" className="btn btn-ghost btn-sm">Start a thread</Link>}>
                  Be the first to ask the community something.
                </EmptyState>
              )}
            </Card>
          ) : <ExplorerUpsell />}
        </div>
      </div>

      {booking && <BookSessionModal tutor={booking} onClose={() => setBooking(null)} onBooked={load} />}
      {tour && (
        <SpotlightTour steps={TOUR_STEPS} onDone={() => { localStorage.setItem(`sws_tour_student_${user?.id}`, 'done'); setTour(false) }} />
      )}
    </HubLayout>
  )
}

