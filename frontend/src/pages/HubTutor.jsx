import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import {
  Avatar, Card, CardLink, DateChip, EmptyState, Icon, SkeletonRows, Stars, StatusPill,
} from '../components/ui'
import { useConfirm } from '../components/ui/confirm'
import NotesToWriteCard from '../components/features/NotesToWriteCard'
import { respondTutorRequest } from '../api/tutors'
import { updateStatus } from '../api/events'
import { errorMessage } from '../api/client'
import { invalidate, useQuery } from '../lib/query'
import { Q } from '../lib/queries'
import { canJoin } from '../lib/sessions'
import { awardedXp, levelFor, xpFor } from '../lib/xp'
import { firstName, formatMoney, formatTime, formatWhen, timeAgo, weekBuckets } from '../lib/format'

function EarningsChart({ events }) {
  const weeks = useMemo(() => weekBuckets(8).map((b) => ({
    ...b,
    amount: events
      .filter((e) => e.status === 'paid')
      .filter((e) => { const t = new Date(e.start_time); return t >= b.start && t < b.end })
      .reduce((s, e) => s + Number(e.amount || 0), 0),
  })), [events])
  const max = Math.max(1, ...weeks.map((w) => w.amount))
  const sum = weeks.reduce((s, w) => s + w.amount, 0)

  return (
    <Card title="Earnings" action={<span className="count" style={{ paddingRight: 8 }}>{formatMoney(sum)} · 8 weeks</span>}>
      <div className="bars" style={{ paddingBottom: 12 }}>
        {weeks.map((w, i) => (
          <div className={`bar ${i === weeks.length - 1 ? 'hot' : ''}`} key={w.label} title={`${formatMoney(w.amount)} · week of ${w.label}`}>
            <i style={{ height: `${(w.amount / max) * 100}%` }} />
            <span>{w.label.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function HubTutor() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const { data: evData, loading: evLoading } = useQuery(...Q.events)
  const { data: stData, loading: stLoading } = useQuery(...Q.activeStudents)
  const { data: convData, loading: convLoading } = useQuery(...Q.conversations)
  const { data: roomData } = useQuery(...Q.studyRooms)
  const { data: reqData, loading: reqLoading } = useQuery(...Q.receivedRequests)
  const { data: profData } = useQuery(...Q.tutorProfile)
  const profile = profData?.profile
  const { data: reviewData } = useQuery(...Q.tutorReviews(profile?.id_tutor ?? 'none'), { enabled: Boolean(profile?.id_tutor) })
  const [busy, setBusy] = useState(null)

  const events = useMemo(() => (evData?.events ?? []).filter((e) => e.role === 'tutor'), [evData])
  const students = stData?.students ?? []
  const conversations = convData?.conversations ?? []
  const invites = reqData?.requests ?? []
  const rooms = (roomData?.rooms ?? []).filter((r) => r.creator_user_id === user?.id && new Date(r.end_time) > new Date())
  const reviews = reviewData?.reviews ?? []

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000)
  const pending = events.filter((e) => e.status === 'pending' && new Date(e.start_time) > now)
  const upcoming = events
    .filter((e) => ['confirmed', 'paid'].includes(e.status) && new Date(e.end_time) > now)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const earned = events.filter((e) => e.status === 'paid' && new Date(e.start_time) >= monthStart)
    .reduce((s, e) => s + Number(e.amount || 0), 0)
  const owed = events.filter((e) => e.status === 'confirmed' && Number(e.amount) > 0)
    .reduce((s, e) => s + Number(e.amount || 0), 0)
  const thisWeek = upcoming.filter((e) => new Date(e.start_time) < weekEnd).length
  const unread = conversations.reduce((s, c) => s + Number(c.unread || 0), 0)
  const attention = pending.length + invites.length

  const xp = xpFor('tutor', events, students.length, awardedXp('tutor', user))
  const level = levelFor('tutor', xp)

  async function act(key, fn, success) {
    setBusy(key)
    try {
      await fn()
      toast.success(success)
      invalidate('events', 'requests', 'students')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function decline(key, title, fn, success) {
    if (await confirm({ title, confirmLabel: 'Decline', danger: true })) act(key, fn, success)
  }

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="Home" icon="space_dashboard" />

      <div className="hello">
        <div>
          <h1>Ready to teach, <em>{firstName(user?.name)}</em>?</h1>
          <div className="level">
            <b>Level {level.index + 1} · {level.name}</b>
            <span className="level-track"><i style={{ width: `${Math.round(level.progress * 100)}%` }} /></span>
            <span>{xp} XP</span>
          </div>
        </div>
        <div className="dash-actions">
          {profile && (
            <Link to="/tutor/$tutorId" params={{ tutorId: String(profile.id_tutor) }} className="btn btn-ghost"><Icon name="visibility" />Public profile</Link>
          )}
          <Link to="/calendar/tutor" className="btn btn-coral"><Icon name="calendar_month" />Schedule</Link>
        </div>
      </div>

      <div className="metrics">
        <span><b>{formatMoney(earned)}</b>earned this month</span>
        {owed > 0 && <span><b>{formatMoney(owed)}</b>awaiting payment</span>}
        <span><b>{thisWeek}</b>{thisWeek === 1 ? 'session' : 'sessions'} this week</span>
        <span><b>{students.length}</b>{students.length === 1 ? 'student' : 'students'}</span>
        <span><b>{formatMoney(profile?.hourly_rate ?? 20)}</b>/hr</span>
        {reviewData?.count > 0 && <Stars rating={reviewData.average} count={reviewData.count} />}
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <NotesToWriteCard events={events} />

          <Card title="Needs your answer" count={attention || null}>
            {evLoading || reqLoading ? <SkeletonRows rows={2} /> : attention ? (
              <div className="row-list">
                {invites.map((r) => (
                  <div key={`r${r.id}`} className="row">
                    <Avatar name={r.student_name} size={28} />
                    <div className="main">
                      <div className="title">{r.student_name} wants you as their tutor</div>
                      <div className="meta">Request · {timeAgo(r.created_at)}</div>
                    </div>
                    <button className="btn btn-quiet btn-sm" disabled={busy === `r${r.id}`}
                      onClick={() => decline(`r${r.id}`, `Decline ${firstName(r.student_name)}'s request?`,
                        () => respondTutorRequest(r.id, 'declined'), 'Request declined')}>Decline</button>
                    <button className="btn btn-coral btn-sm" disabled={busy === `r${r.id}`}
                      onClick={() => act(`r${r.id}`, () => respondTutorRequest(r.id, 'accepted'), `${firstName(r.student_name)} is now your student`)}>Accept</button>
                  </div>
                ))}
                {pending.map((e) => (
                  <div key={`e${e.id_event}`} className="row">
                    <DateChip value={e.start_time} />
                    <div className="main">
                      <div className="title">{e.title || 'Tutoring session'}</div>
                      <div className="meta">{e.student_name} · {formatTime(e.start_time)}–{formatTime(e.end_time)} · {Number(e.amount) > 0 ? formatMoney(e.amount) : 'Free'}</div>
                    </div>
                    <button className="btn btn-quiet btn-sm" disabled={busy === `e${e.id_event}`}
                      onClick={() => decline(`e${e.id_event}`, `Decline ${e.title || 'this session'}?`,
                        () => updateStatus(e.id_event, 'canceled'), 'Session declined')}>Decline</button>
                    <button className="btn btn-coral btn-sm" disabled={busy === `e${e.id_event}`}
                      onClick={() => act(`e${e.id_event}`, () => updateStatus(e.id_event, 'confirmed'), 'Session confirmed')}>Confirm</button>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="All caught up" />}
          </Card>

          <Card title="Upcoming" count={upcoming.length || null} action={<CardLink to="/calendar/tutor">Schedule</CardLink>}>
            {evLoading ? <SkeletonRows /> : upcoming.length ? (
              <div className="row-list">
                {upcoming.slice(0, 6).map((e) => (
                  <div key={e.id_event} className="row">
                    <DateChip value={e.start_time} />
                    <div className="main">
                      <div className="title">{e.title || 'Tutoring session'}</div>
                      <div className="meta">{e.student_name} · {formatTime(e.start_time)}–{formatTime(e.end_time)}</div>
                    </div>
                    <StatusPill status={e.status} label={e.status === 'confirmed' && Number(e.amount) > 0 ? 'Unpaid' : undefined} />
                    {canJoin(e) && <a className="btn btn-coral btn-sm" href={e.meeting_url} target="_blank" rel="noreferrer"><Icon name="videocam" />Join</a>}
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Nothing scheduled" />}
          </Card>

          <EarningsChart events={events} />
        </div>

        <div className="dash-col">
          <Card title="Inbox" count={unread ? `${unread} new` : null} action={<CardLink to="/messages">Open</CardLink>}>
            {convLoading ? <SkeletonRows rows={2} /> : conversations.length ? (
              <div className="row-list">
                {conversations.slice(0, 4).map((c) => (
                  <Link key={c.user_id} to="/messages" search={{ user: c.user_id }} className="row">
                    <Avatar name={c.name} size={28} />
                    <div className="main">
                      <div className="title" style={{ fontWeight: c.unread ? 600 : 500 }}>{c.name}</div>
                      <div className="meta">{c.last_from_me ? 'You: ' : ''}{c.last_message}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <span className="side">{timeAgo(c.last_ts)}</span>
                      {c.unread > 0 && <span className="nav-badge">{c.unread}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : <EmptyState title="No messages yet" />}
          </Card>

          <Card title="Students" count={students.length || null} action={<CardLink to="/active-students" />}>
            {stLoading ? <SkeletonRows rows={2} /> : students.length ? (
              <div className="row-list">
                {students.slice(0, 5).map((s) => (
                  <div key={s.id_student} className="row">
                    <Avatar name={s.name} size={28} />
                    <Link to="/student/$userId" params={{ userId: String(s.user_id) }} className="main" style={{ color: 'inherit' }}>
                      <div className="title">{s.name}</div>
                      <div className="meta">{events.filter((e) => e.student_id === s.id_student && e.status !== 'canceled').length} sessions</div>
                    </Link>
                    <Link to="/messages" search={{ user: s.user_id }} className="icon-btn" aria-label={`Message ${s.name}`}><Icon name="chat" /></Link>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No students yet" />}
          </Card>

          {reviews.length > 0 && (
            <Card title="Latest reviews" action={<Stars rating={reviewData.average} count={reviewData.count} />}>
              <div className="row-list">
                {reviews.slice(0, 3).map((r) => (
                  <div key={r.id} className="row" style={{ alignItems: 'flex-start' }}>
                    <div className="main">
                      <div className="title" style={{ whiteSpace: 'normal' }}>{r.comment || 'No comment'}</div>
                      <div className="meta">{'★'.repeat(r.rating)} · {r.student_name} · {timeAgo(r.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Your study rooms" action={<CardLink to="/study-rooms/tutor">Manage</CardLink>}>
            {rooms.length ? (
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
            ) : <EmptyState title="No rooms scheduled" action={<CardLink to="/study-rooms/tutor">Host one</CardLink>} />}
          </Card>
        </div>
      </div>
    </HubLayout>
  )
}
