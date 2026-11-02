import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import BookSessionModal from '../components/features/BookSessionModal'
import EventCard from '../components/features/EventCard'
import { BookSessionButton, VerifiedPill } from '../components/features/TutorCard'
import { Avatar, Card, CardLink, Icon, SkeletonRows, StatusPill } from '../components/ui'
import { useConfirm } from '../components/ui/confirm'
import { deactivateTutor, getActiveTutors, getTutorRequestsSent, requestTutor } from '../api/tutors'
import { getEvents } from '../api/events'
import { errorMessage } from '../api/client'
import { firstName, formatMoney, formatWhen, timeAgo } from '../lib/format'

const emptyLine = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 18px', fontSize: 13, color: 'var(--text-faint)' }

const isUpcoming = (e, now) =>
  e.status !== 'canceled' && new Date(e.end_time) > now && !(e.status === 'pending' && new Date(e.start_time) <= now)

export default function ActiveTutors() {
  const [data, setData] = useState({ tutors: [], requests: [], events: [] })
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(null)
  const confirm = useConfirm()
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => Promise.allSettled([getActiveTutors(), getTutorRequestsSent(), getEvents()])
    .then(([tutors, requests, events]) => {
      const ok = (r, key) => (r.status === 'fulfilled' ? r.value.data[key] ?? [] : [])
      if (tutors.status === 'rejected') toast.error(errorMessage(tutors.reason, 'Could not load your tutors'))
      setData({
        tutors: ok(tutors, 'tutors'),
        requests: ok(requests, 'requests'),
        events: ok(events, 'events').filter((e) => e.role === 'student'),
      })
      setLoading(false)
    }), [])

  useEffect(() => { load() }, [load])

  async function remove(t) {
    const ok = await confirm({
      title: `Remove ${firstName(t.name)} from your tutors?`,
      body: 'You can send them a request again later.',
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    setBusy(`t${t.id_tutor}`)
    try {
      await deactivateTutor(t.id_tutor)
      toast.success(`${firstName(t.name)} removed`)
      await load()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove this tutor'))
    } finally {
      setBusy(null)
    }
  }

  async function askAgain(r) {
    setBusy(`r${r.id}`)
    try {
      await requestTutor(r.tutor_id)
      toast.success(`Request sent to ${firstName(r.tutor_name)}`)
      await load()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the request'))
    } finally {
      setBusy(null)
    }
  }

  const { tutors, requests, events } = data
  const now = new Date()
  const upcoming = events.filter((e) => isUpcoming(e, now)).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const nextWith = (t) => upcoming.find((e) => e.tutor_id === t.id_tutor)
  const openRequests = requests
    .filter((r) => r.status === 'pending' || r.status === 'declined')
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1))

  return (
    <HubLayout initialMode="student">
      <PageTitle title="My tutors" icon="cast_for_education" />

      <div className="dash-head">
        <h1>My tutors</h1>
        <div className="dash-actions">
          <Link to="/find-tutors" className="btn btn-ghost"><Icon name="person_search" />Find a tutor</Link>
          <BookSessionButton tutors={tutors} onBooked={load} />
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <Card title="Tutors" icon="cast_for_education" count={tutors.length || null}>
            {loading ? <SkeletonRows rows={2} /> : tutors.length ? (
              <div className="row-list">
                {tutors.map((t) => {
                  const next = nextWith(t)
                  return (
                    <div key={t.id_tutor} className="row" style={{ flexWrap: 'wrap', rowGap: 10 }}>
                      <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={t.name} src={t.avatar_url} size={36} />
                        <div className="main">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <Link to="/tutor/$tutorId" params={{ tutorId: String(t.id_tutor) }} className="title"
                              style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
                              {t.name}
                            </Link>
                            {t.verified && <VerifiedPill />}
                          </div>
                          <div className="meta">
                            {formatMoney(t.hourly_rate ?? 20)}/hr · {next ? `Next: ${formatWhen(next.start_time)}` : 'No session booked'}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {(
                          <>
                            <Link to="/messages" search={{ user: t.id_user }} className="icon-btn" title="Message" aria-label={`Message ${t.name}`}>
                              <Icon name="chat" />
                            </Link>
                            <button type="button" className="icon-btn" title="Remove tutor" aria-label={`Remove ${t.name}`} disabled={busy === `t${t.id_tutor}`} onClick={() => remove(t)}>
                              <Icon name="person_remove" />
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBooking(t)}>
                              <Icon name="add" />Book
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={emptyLine}>No tutors yet.</div>
            )}
          </Card>

          <Card title="Upcoming sessions" icon="event" count={upcoming.length || null} action={<CardLink to="/calendar/student">Calendar</CardLink>}>
            {loading ? <SkeletonRows rows={2} /> : upcoming.length ? (
              <div className="row-list">
                {upcoming.map((ev) => <EventCard key={ev.id_event} event={ev} onChanged={load} />)}
              </div>
            ) : (
              <div style={emptyLine}>No upcoming sessions.</div>
            )}
          </Card>
        </div>

        <div className="dash-col">
          <Card title="Requests" icon="send" count={openRequests.length || null}>
            {loading ? <SkeletonRows rows={2} /> : openRequests.length ? (
              <div className="row-list">
                {openRequests.map((r) => (
                  <div key={r.id} className="row">
                    <Avatar name={r.tutor_name} size={32} />
                    <Link to="/tutor/$tutorId" params={{ tutorId: String(r.tutor_id) }} className="main" style={{ color: 'inherit', textDecoration: 'none' }}>
                      <div className="title">{r.tutor_name}</div>
                      <div className="meta">Sent {timeAgo(r.created_at)}</div>
                    </Link>
                    {r.status === 'declined' && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => askAgain(r)} disabled={busy === `r${r.id}`}>
                        Ask again
                      </button>
                    )}
                    <StatusPill status={r.status} label={r.status === 'pending' ? 'Pending' : undefined} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyLine}>No open requests.</div>
            )}
          </Card>
        </div>
      </div>

      {booking && <BookSessionModal tutor={booking} onClose={() => setBooking(null)} onBooked={load} />}
    </HubLayout>
  )
}
