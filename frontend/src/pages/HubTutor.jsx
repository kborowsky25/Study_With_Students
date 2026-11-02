import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Avatar, Card, CardLink, DateChip, EmptyState, Icon, SkeletonRows, Stat, StatusPill } from '../components/ui'
import { getActiveStudents, getTutorProfile, getTutorRequestsRec, respondTutorRequest } from '../api/tutors'
import { getEvents, updateStatus } from '../api/events'
import { getConversations } from '../api/messages'
import { getStudyRooms } from '../api/studyrooms'
import { errorMessage } from '../api/client'
import { firstName, formatMoney, formatTime, formatWhen, greeting, timeAgo, weekBuckets } from '../lib/format'

function EarningsChart({ events }) {
  const weeks = useMemo(() => weekBuckets(8).map((b) => ({
    ...b,
    amount: events
      .filter((e) => e.status === 'paid')
      .filter((e) => { const t = new Date(e.start_time); return t >= b.start && t < b.end })
      .reduce((s, e) => s + Number(e.amount || 0), 0),
  })), [events])
  const max = Math.max(1, ...weeks.map((w) => w.amount))
  const total = weeks.reduce((s, w) => s + w.amount, 0)

  return (
    <Card title="Earnings" icon="account_balance" action={<span className="count">{formatMoney(total)} · 8 weeks</span>}>
      <div style={{ padding: '14px 18px 16px' }}>
        <div className="bars">
          {weeks.map((w, i) => (
            <div className={`bar ${i === weeks.length - 1 ? 'hot' : ''}`} key={w.label} title={`${formatMoney(w.amount)} · week of ${w.label}`}>
              <i style={{ height: `${(w.amount / max) * 100}%`, animationDelay: `${i * 40}ms` }} />
              <span>{w.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="verified" size={15} style={{ color: 'var(--green)' }} />
          You keep 100% — Study With Students takes no commission.
        </p>
      </div>
    </Card>
  )
}

function AttentionRow({ icon, title, meta, children }) {
  return (
    <div className="row">
      <span className="avatar" style={{ width: 32, height: 32, background: 'var(--coral-soft)', color: 'var(--coral)' }}>
        <Icon name={icon} size={17} />
      </span>
      <div className="main">
        <div className="title">{title}</div>
        <div className="meta">{meta}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>{children}</div>
    </div>
  )
}

export default function HubTutor() {
  const { user } = useAuth()
  const [data, setData] = useState({ events: [], students: [], conversations: [], rooms: [], invites: [], profile: null })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  function load() {
    return Promise.allSettled([
      getEvents(), getActiveStudents(), getConversations(), getStudyRooms(), getTutorRequestsRec(), getTutorProfile(),
    ]).then(([ev, st, conv, rooms, inv, prof]) => {
      const ok = (r, key) => (r.status === 'fulfilled' ? r.value.data[key] ?? [] : [])
      setData({
        events: ok(ev, 'events').filter((e) => e.role === 'tutor'),
        students: ok(st, 'students'),
        conversations: ok(conv, 'conversations'),
        rooms: ok(rooms, 'rooms').filter((r) => r.creator_user_id === user?.id && new Date(r.end_time) > new Date()),
        invites: ok(inv, 'requests'),
        profile: prof.status === 'fulfilled' ? prof.value.data.profile : null,
      })
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  async function act(key, fn, success) {
    setBusy(key)
    try { await fn(); toast.success(success); await load() }
    catch (err) { toast.error(errorMessage(err)) }
    finally { setBusy(null) }
  }

  const { events, students, conversations, rooms, invites, profile } = data
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000)

  const pending = events.filter((e) => e.status === 'pending' && new Date(e.start_time) > now)
  const upcoming = events
    .filter((e) => ['confirmed', 'paid'].includes(e.status) && new Date(e.end_time) > now)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const earnedThisMonth = events
    .filter((e) => e.status === 'paid' && new Date(e.start_time) >= monthStart)
    .reduce((s, e) => s + Number(e.amount || 0), 0)
  const owed = events.filter((e) => e.status === 'confirmed').reduce((s, e) => s + Number(e.amount || 0), 0)
  const thisWeek = upcoming.filter((e) => new Date(e.start_time) < weekEnd).length
  const unread = conversations.reduce((s, c) => s + Number(c.unread || 0), 0)
  const attention = pending.length + invites.length

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="Home" icon="space_dashboard" />

      <div className="dash-head">
        <div>
          <div className="eyebrow">Tutor workspace</div>
          <h1 style={{ marginTop: 6 }}>{greeting()}, <em>{firstName(user?.name)}</em></h1>
          <p>
            {loading ? 'Loading your week…' : [
              attention ? `${attention} thing${attention > 1 ? 's' : ''} need${attention > 1 ? '' : 's'} your answer` : 'You’re all caught up',
              `${thisWeek} session${thisWeek === 1 ? '' : 's'} this week`,
              unread ? `${unread} unread` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="dash-actions">
          {profile && <Link to="/tutor/$tutorId" params={{ tutorId: String(profile.id_tutor) }} className="btn btn-ghost"><Icon name="visibility" />Public profile</Link>}
          <Link to="/calendar/tutor" className="btn btn-coral"><Icon name="calendar_month" />Open schedule</Link>
        </div>
      </div>

      <section className="card stat-grid">
        <Stat icon="payments" label="Earned this month" value={formatMoney(earnedThisMonth)}
          note={owed ? `${formatMoney(owed)} awaiting payment` : '100% yours — 0% commission'} trend={owed ? undefined : 'up'} />
        <Stat icon="event_upcoming" label="This week" value={thisWeek}
          note={upcoming[0] ? `Next: ${formatWhen(upcoming[0].start_time)}` : 'No sessions booked'} />
        <Stat icon="groups_2" label="Students" value={students.length}
          note={invites.length ? `${invites.length} new request${invites.length > 1 ? 's' : ''}` : 'Active students'} />
        <Stat icon="sell" label="Your rate" value={formatMoney(profile?.hourly_rate ?? 20)} unit="/hr"
          note={<Link to="/tutor-profile" className="card-link" style={{ fontSize: 11.5 }}>Edit rate</Link>} />
      </section>

      <div className="dash-grid">
        <div className="dash-col">
          <Card title="Needs your answer" icon="notifications_active" count={attention || null}>
            {loading ? <SkeletonRows rows={2} /> : attention ? (
              <div className="row-list">
                {invites.map((r) => (
                  <AttentionRow key={`r${r.id}`} icon="person_add" title={`${r.student_name} wants you as their tutor`} meta={`Request · ${timeAgo(r.created_at)}`}>
                    <button className="btn btn-quiet btn-sm" disabled={busy === `r${r.id}`}
                      onClick={() => act(`r${r.id}`, () => respondTutorRequest(r.id, 'declined'), 'Request declined')}>Decline</button>
                    <button className="btn btn-coral btn-sm" disabled={busy === `r${r.id}`}
                      onClick={() => act(`r${r.id}`, () => respondTutorRequest(r.id, 'accepted'), `${firstName(r.student_name)} is now your student`)}>Accept</button>
                  </AttentionRow>
                ))}
                {pending.map((e) => (
                  <AttentionRow key={`e${e.id_event}`} icon="event" title={`${e.title} · ${e.student_name}`}
                    meta={`${formatWhen(e.start_time)}–${formatTime(e.end_time)} · ${formatMoney(e.amount)}`}>
                    <button className="btn btn-quiet btn-sm" disabled={busy === `e${e.id_event}`}
                      onClick={() => act(`e${e.id_event}`, () => updateStatus(e.id_event, 'canceled'), 'Session declined')}>Decline</button>
                    <button className="btn btn-coral btn-sm" disabled={busy === `e${e.id_event}`}
                      onClick={() => act(`e${e.id_event}`, () => updateStatus(e.id_event, 'confirmed'), 'Session confirmed')}>Confirm</button>
                  </AttentionRow>
                ))}
              </div>
            ) : (
              <EmptyState icon="task_alt" title="All caught up">New student requests and session bookings show up here.</EmptyState>
            )}
          </Card>

          <Card title="Upcoming sessions" icon="event" count={upcoming.length || null} action={<CardLink to="/calendar/tutor">Schedule</CardLink>}>
            {loading ? <SkeletonRows /> : upcoming.length ? (
              <div className="row-list">
                {upcoming.slice(0, 6).map((e) => (
                  <div key={e.id_event} className="row">
                    <DateChip value={e.start_time} />
                    <div className="main">
                      <div className="title">{e.title || 'Tutoring session'}</div>
                      <div className="meta">{e.student_name} · {formatTime(e.start_time)}–{formatTime(e.end_time)}</div>
                    </div>
                    <span className="side hide-mobile">{formatMoney(e.amount)}</span>
                    <StatusPill status={e.status} label={e.status === 'confirmed' ? 'Unpaid' : undefined} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="event_available" title="Nothing scheduled">Confirmed bookings from your students appear here.</EmptyState>
            )}
          </Card>

          <EarningsChart events={events} />
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
              <EmptyState icon="forum" title="No conversations yet">Students can message you from your profile.</EmptyState>
            )}
          </Card>

          <Card title="My students" icon="groups_2" count={students.length || null} action={<CardLink to="/active-students" />}>
            {loading ? <SkeletonRows rows={2} /> : students.length ? (
              <div className="row-list">
                {students.slice(0, 5).map((s) => (
                  <div key={s.id_student} className="row">
                    <Avatar name={s.name} size={32} />
                    <Link to="/student/$userId" params={{ userId: String(s.user_id) }} className="main" style={{ color: 'inherit' }}>
                      <div className="title">{s.name}</div>
                      <div className="meta">{events.filter((e) => e.student_id === s.id_student && e.status !== 'canceled').length} sessions</div>
                    </Link>
                    <Link to="/messages" search={{ user: s.user_id }} className="icon-btn" aria-label={`Message ${s.name}`}><Icon name="chat" /></Link>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="group_add" title="No students yet">Accept a request and they’ll appear here.</EmptyState>
            )}
          </Card>

          <Card title="Your study rooms" icon="groups" action={<CardLink to="/study-rooms/tutor">Manage</CardLink>}>
            {loading ? <SkeletonRows rows={1} /> : rooms.length ? (
              <div className="row-list">
                {rooms.slice(0, 3).map((r) => (
                  <div key={r.id} className="row">
                    <DateChip value={r.start_time} />
                    <div className="main">
                      <div className="title">{r.subject}</div>
                      <div className="meta">{formatWhen(r.start_time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="add_circle" title="Host a study room" action={<Link to="/study-rooms/tutor" className="btn btn-ghost btn-sm">Create one</Link>}>
                Drop-in group sessions help Explorer students find you.
              </EmptyState>
            )}
          </Card>
        </div>
      </div>
    </HubLayout>
  )
}
