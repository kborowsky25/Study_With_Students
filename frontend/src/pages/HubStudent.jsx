import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import BookSessionModal from '../components/features/BookSessionModal'
import LearningProfileDialog from '../components/features/LearningProfileDialog'
import ReviewDialog from '../components/features/ReviewDialog'
import SpotlightTour from '../components/features/SpotlightTour'
import HomeworkCard from '../components/features/HomeworkCard'
import FamilyCard from '../components/features/FamilyCard'
import LessonNotesButton from '../components/features/LessonNotesButton'
import { FindTutor } from '../components/brand/illustrations'
import {
  Avatar, Card, CardLink, DateChip, EmptyState, Icon, SkeletonRows, Stars, StatusPill,
} from '../components/ui'
import { requestTutor } from '../api/tutors'
import { errorMessage } from '../api/client'
import { invalidate, useQuery } from '../lib/query'
import { Q } from '../lib/queries'
import { canJoin, canReview, feeWaived, needsPayment, totalPrice } from '../lib/sessions'
import { levelFor, xpFor } from '../lib/xp'
import { firstName, formatMoney, formatTime, formatWhen, hoursBetween, timeAgo } from '../lib/format'

const TOUR_STEPS = [
  { target: null, position: 'center', title: 'Welcome to Study With Students', body: "This is your home. Here's a quick tour of the essentials." },
  { target: '[data-tour="find-tutors"]', position: 'right', title: 'Find a tutor', body: 'Browse university students by subject and send a request. Once they accept, you can book sessions.' },
  { target: '[data-tour="messages"]', position: 'right', title: 'Messages', body: 'Talk to your tutors directly.' },
  { target: '[data-tour="payments"]', position: 'right', title: 'Payments', body: 'Tutors keep 100% of their price. You pay a small 5% booking fee per session.' },
]

function SessionActions({ ev, onRate }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
      {canJoin(ev) && <a className="btn btn-coral btn-sm" href={ev.meeting_url} target="_blank" rel="noreferrer"><Icon name="videocam" />Join</a>}
      {needsPayment(ev) && (
        <Link to="/payments" className="btn btn-coral btn-sm" title={feeWaived(ev) ? 'Booking fee waived with an invite credit' : undefined}>
          Pay {formatMoney(totalPrice(ev), { decimals: 2 })}
        </Link>
      )}
      <LessonNotesButton event={ev} />
      {canReview(ev) && <button className="btn btn-ghost btn-sm" onClick={() => onRate(ev)}><Icon name="star" />Rate</button>}
    </div>
  )
}

function SessionRow({ ev, onRate }) {
  return (
    <div className="row">
      <DateChip value={ev.start_time} />
      <div className="main">
        <div className="title">{ev.title || 'Tutoring session'}</div>
        <div className="meta">{ev.tutor_name} · {formatTime(ev.start_time)}–{formatTime(ev.end_time)}</div>
      </div>
      <StatusPill status={ev.status} />
      <SessionActions ev={ev} onRate={onRate} />
    </div>
  )
}

function Recommended({ profile, onEditProfile }) {
  const complete = Boolean(profile?.complete)
  const { data, loading } = useQuery(...Q.recommended, { enabled: complete })
  const { data: sent } = useQuery(...Q.sentRequests)
  const [busy, setBusy] = useState(null)
  const requested = new Set((sent?.requests ?? []).filter((r) => r.status === 'pending').map((r) => r.tutor_id))

  async function request(t) {
    setBusy(t.id_tutor)
    try {
      await requestTutor(t.id_tutor)
      toast.success(`Request sent to ${firstName(t.name)}`)
      invalidate('requests', 'tutors')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the request'))
    } finally {
      setBusy(null)
    }
  }

  if (!complete) {
    return (
      <Card title="Recommended tutors">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px' }}>
          <FindTutor className="art art-sm" title="" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Tell us what you need and we'll match you with tutors.</div>
            <button className="btn btn-coral btn-sm" onClick={onEditProfile}>Set preferences</button>
          </div>
        </div>
      </Card>
    )
  }

  const tutors = data?.tutors ?? []
  return (
    <Card title="Recommended tutors" action={<button className="card-link" onClick={onEditProfile} style={{ border: 0, background: 'none', cursor: 'pointer' }}>Preferences</button>}>
      {loading ? <SkeletonRows rows={3} /> : tutors.length ? (
        <div className="row-list">
          {tutors.map((t) => (
            <div key={t.id_tutor} className="row">
              <Avatar name={t.name} src={t.avatar_url} size={30} />
              <Link to="/tutor/$tutorId" params={{ tutorId: String(t.id_tutor) }} className="main" style={{ color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span className="title">{t.name}</span>
                  <span className="match">{t.match}%</span>
                  <Stars rating={t.rating} count={t.review_count} />
                </div>
                <div className="reasons">{t.reasons.join(' · ') || t.university}</div>
              </Link>
              {requested.has(t.id_tutor)
                ? <span className="side">Requested</span>
                : <button className="btn btn-ghost btn-sm" disabled={busy === t.id_tutor} onClick={() => request(t)}>Request</button>}
            </div>
          ))}
        </div>
      ) : <EmptyState title="No new matches right now" action={<CardLink to="/find-tutors">Browse tutors</CardLink>} />}
    </Card>
  )
}

export default function HubStudent() {
  const { user } = useAuth()
  const { data: evData, loading: evLoading } = useQuery(...Q.events)
  const { data: convData, loading: convLoading } = useQuery(...Q.conversations)
  const { data: tutorData, loading: tutorsLoading } = useQuery(...Q.activeTutors)
  const { data: profile } = useQuery(...Q.learningProfile)
  const { data: threadData } = useQuery(...Q.recentThreads)
  const [booking, setBooking] = useState(null)
  const [rating, setRating] = useState(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [tour, setTour] = useState(false)

  useEffect(() => {
    const key = `sws_tour_student_${user?.id}`
    if (user?.id && !localStorage.getItem(key)) {
      const t = setTimeout(() => setTour(true), 600)
      return () => clearTimeout(t)
    }
  }, [user?.id])

  const events = useMemo(() => (evData?.events ?? []).filter((e) => e.role === 'student'), [evData])
  const conversations = convData?.conversations ?? []
  const tutors = tutorData?.tutors ?? []
  const threads = threadData?.threads ?? []
  const now = new Date()

  const upcoming = events
    .filter((e) => new Date(e.end_time) > now && ['pending', 'confirmed', 'paid'].includes(e.status))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const next = upcoming[0]
  const toPay = events.filter(needsPayment)
  const toReview = events.filter((e) => canReview(e))
  const later = upcoming.slice(1).filter((e) => !needsPayment(e))
  const past = events.filter((e) => new Date(e.end_time) <= now && ['confirmed', 'paid'].includes(e.status))
  const hours = past.reduce((s, e) => s + hoursBetween(e.start_time, e.end_time), 0)
  const paidToTutors = events.filter((e) => e.status === 'paid').reduce((s, e) => s + Number(e.amount || 0), 0)
  const unread = conversations.reduce((s, c) => s + Number(c.unread || 0), 0)

  const xp = xpFor('student', events, tutors.length)
  const level = levelFor('student', xp)

  return (
    <HubLayout initialMode="student">
      <PageTitle title="Home" icon="space_dashboard" />

      <div className="hello">
        <div>
          <h1>Ready to study, <em>{firstName(user?.name)}</em>?</h1>
          <div className="level">
            <b>Level {level.index + 1} · {level.name}</b>
            <span className="level-track"><i style={{ width: `${Math.round(level.progress * 100)}%` }} /></span>
            <span>{xp} XP</span>
          </div>
        </div>
        <div className="dash-actions">
          <Link to="/find-tutors" className="btn btn-ghost"><Icon name="person_search" />Find a tutor</Link>
          <button className="btn btn-coral" disabled={!tutors.length} title={tutors.length ? undefined : 'Connect with a tutor first'}
            onClick={() => setBooking(tutors[0])}>
            <Icon name="add" />Book a session
          </button>
        </div>
      </div>

      <div className="metrics">
        <span><b>{upcoming.length}</b>upcoming</span>
        <span><b>{hours.toFixed(1)} h</b>learned</span>
        <span><b>{tutors.length}</b>{tutors.length === 1 ? 'tutor' : 'tutors'}</span>
        <span><b>{formatMoney(paidToTutors)}</b>paid to tutors</span>
        {unread > 0 && <Link to="/messages" style={{ color: 'var(--coral)' }}><b style={{ color: 'inherit' }}>{unread}</b>unread</Link>}
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <Card title="Sessions" count={upcoming.length || null} action={<CardLink to="/calendar/student">Calendar</CardLink>}>
            {evLoading ? <SkeletonRows /> : (
              <div className="row-list">
                {next ? (
                  <div className="spotlight">
                    <div className="grow">
                      <div className="when">Up next · {formatWhen(next.start_time)}–{formatTime(next.end_time)}</div>
                      <h2>{next.title || 'Tutoring session'}</h2>
                      <div className="who">with {next.tutor_name}</div>
                    </div>
                    <StatusPill status={next.status} />
                    <SessionActions ev={next} onRate={setRating} />
                  </div>
                ) : (
                  <EmptyState
                    title={tutors.length ? 'No sessions booked' : 'Find a tutor to book your first session'}
                    action={tutors.length
                      ? <button className="btn btn-coral btn-sm" onClick={() => setBooking(tutors[0])}>Book</button>
                      : <Link to="/find-tutors" className="btn btn-coral btn-sm">Find a tutor</Link>}
                  />
                )}
                {toPay.filter((e) => e !== next).length > 0 && (
                  <>
                    <div className="group-head">To pay <span className="count">{toPay.filter((e) => e !== next).length}</span></div>
                    {toPay.filter((e) => e !== next).map((ev) => <SessionRow key={ev.id_event} ev={ev} onRate={setRating} />)}
                  </>
                )}
                {later.length > 0 && (
                  <>
                    <div className="group-head">Later <span className="count">{later.length}</span></div>
                    {later.slice(0, 5).map((ev) => <SessionRow key={ev.id_event} ev={ev} onRate={setRating} />)}
                  </>
                )}
                {toReview.length > 0 && (
                  <>
                    <div className="group-head">To review <span className="count">{toReview.length}</span></div>
                    {toReview.slice(0, 3).map((ev) => <SessionRow key={ev.id_event} ev={ev} onRate={setRating} />)}
                  </>
                )}
              </div>
            )}
          </Card>

          <Recommended profile={profile} onEditProfile={() => setEditingProfile(true)} />
        </div>

        <div className="dash-col">
          <FamilyCard />
          <HomeworkCard />

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

          <Card title="Your tutors" count={tutors.length || null} action={<CardLink to="/active-tutors" />}>
            {tutorsLoading ? <SkeletonRows rows={2} /> : tutors.length ? (
              <div className="row-list">
                {tutors.slice(0, 4).map((t) => (
                  <div key={t.id_tutor} className="row">
                    <Avatar name={t.name} src={t.avatar_url} size={28} />
                    <Link to="/tutor/$tutorId" params={{ tutorId: String(t.id_tutor) }} className="main" style={{ color: 'inherit' }}>
                      <div className="title">{t.name}</div>
                      <div className="meta">{formatMoney(t.hourly_rate ?? 20)}/hr · {t.subjects || t.university}</div>
                    </Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => setBooking(t)}>Book</button>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No tutors yet" action={<CardLink to="/find-tutors">Find one</CardLink>} />}
          </Card>

          <Card title="Community" action={<CardLink to="/forum">Forum</CardLink>}>
            {threads.length ? (
              <div className="row-list">
                {threads.slice(0, 4).map((t) => (
                  <Link key={t.id} to="/forum/thread/$threadId" params={{ threadId: String(t.id) }} className="row">
                    <div className="main">
                      <div className="title">{t.title}</div>
                      <div className="meta">{t.category_name} · {t.post_count} repl{t.post_count === 1 ? 'y' : 'ies'} · {timeAgo(t.last_activity)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <EmptyState title="Quiet in here" action={<CardLink to="/forum">Start a thread</CardLink>} />}
          </Card>
        </div>
      </div>

      {booking && <BookSessionModal tutor={booking} onClose={() => setBooking(null)} />}
      {rating && <ReviewDialog event={rating} onClose={() => setRating(null)} />}
      {editingProfile && <LearningProfileDialog profile={profile?.profile} onClose={() => setEditingProfile(false)} />}
      {tour && (
        <SpotlightTour steps={TOUR_STEPS} onDone={() => { localStorage.setItem(`sws_tour_student_${user?.id}`, 'done'); setTour(false) }} />
      )}
    </HubLayout>
  )
}
