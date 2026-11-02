import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import BookSessionModal from '../components/features/BookSessionModal'
import EventCard from '../components/features/EventCard'
import { RelationPill, SubjectPills, VerifiedPill } from '../components/features/TutorCard'
import { Avatar, Card, CardLink, Icon, SkeletonRows } from '../components/ui'
import { getTutor, likeTutor, requestTutor } from '../api/tutors'
import { getEvents } from '../api/events'
import { errorMessage } from '../api/client'
import { firstName, formatMoney } from '../lib/format'

const emptyLine = { padding: '16px 18px', fontSize: 13, color: 'var(--text-faint)' }

function Detail({ label, children }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <span style={{ width: 92, flexShrink: 0, fontSize: 12.5, color: 'var(--text-faint)', paddingTop: 1 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  )
}

export default function TutorInfo() {
  const { tutorId } = useParams({ from: '/tutor/$tutorId' })
  const { user } = useAuth()
  const [state, setState] = useState({ status: 'loading' })
  const [sessions, setSessions] = useState([])
  const [busy, setBusy] = useState(false)
  const [booking, setBooking] = useState(false)

  const loadSessions = useCallback((id) => getEvents()
    .then(({ data }) => setSessions((data.events ?? []).filter((e) => e.role === 'student' && e.tutor_id === id)))
    .catch(() => setSessions([])), [])

  const load = useCallback(async () => {
    try {
      const { data } = await getTutor(tutorId)
      setState({ status: 'ready', tutor: data.tutor, liked: data.liked, connected: data.connected, request: data.request_status })
      if (data.connected) loadSessions(data.tutor.id_tutor)
      else setSessions([])
    } catch (err) {
      if (err.response?.status === 404) setState({ status: 'missing' })
      else {
        setState({ status: 'error' })
        toast.error(errorMessage(err, 'Could not load this tutor'))
      }
    }
  }, [tutorId, loadSessions])

  useEffect(() => { load() }, [load])

  const t = state.tutor
  const self = Boolean(t && user && t.id_user === user.id)
  const relation = self ? 'self' : state.connected ? 'connected' : state.request === 'pending' ? 'pending' : null

  async function sendRequest() {
    setBusy(true)
    try {
      await requestTutor(t.id_tutor)
      toast.success(`Request sent to ${firstName(t.name)}`)
      setState((s) => ({ ...s, request: 'pending' }))
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the request'))
      load()
    } finally {
      setBusy(false)
    }
  }

  async function toggleLike() {
    const was = state.liked
    setState((s) => ({ ...s, liked: !was }))
    try {
      const { data } = await likeTutor(t.id_tutor)
      setState((s) => ({ ...s, liked: data.liked }))
    } catch (err) {
      setState((s) => ({ ...s, liked: was }))
      toast.error(errorMessage(err, 'Could not update saved tutors'))
    }
  }

  const now = new Date()
  const upcoming = sessions
    .filter((e) => e.status !== 'canceled' && new Date(e.end_time) > now && !(e.status === 'pending' && new Date(e.start_time) <= now))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const age = Number(t?.age)
  // Only ever link out to a real web address the tutor typed in.
  const linkedin = /^https?:\/\/[^\s]+$/i.test(t?.linkedin_url ?? '') ? t.linkedin_url : null

  return (
    <HubLayout initialMode={state.status === 'ready' ? (self ? 'tutor' : 'student') : undefined}>
      <PageTitle title={t?.name ?? 'Tutor'} icon="person" />

      {!self && (
        <div style={{ marginBottom: 14 }}>
          <Link to="/find-tutors" className="card-link"><Icon name="chevron_left" />Find tutors</Link>
        </div>
      )}

      {state.status === 'loading' && (
        <Card><SkeletonRows rows={4} /></Card>
      )}

      {(state.status === 'missing' || state.status === 'error') && (
        <Card>
          <div style={{ ...emptyLine, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {state.status === 'missing' ? 'This tutor profile doesn’t exist.' : 'This profile couldn’t be loaded.'}
            {state.status === 'error' && <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Retry</button>}
          </div>
        </Card>
      )}

      {state.status === 'ready' && (
        <>
          <div className="dash-head" style={{ alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <Avatar name={t.name} src={t.avatar_url} size={56} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h1>{t.name}</h1>
                  {t.verified && <VerifiedPill />}
                  <RelationPill status={relation} />
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  {[t.university, t.course].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>

            <div className="dash-actions">
              {self ? (
                <Link to="/tutor-profile" className="btn btn-coral"><Icon name="edit" />Edit profile</Link>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost" onClick={toggleLike} aria-pressed={state.liked}>
                    <Icon name="favorite" fill={state.liked} style={state.liked ? { color: 'var(--coral)' } : undefined} />
                    {state.liked ? 'Saved' : 'Save'}
                  </button>
                  <Link to="/messages" search={{ user: t.id_user }} className="btn btn-ghost"><Icon name="chat" />Message</Link>
                  {state.connected ? (
                    <button type="button" className="btn btn-coral" onClick={() => setBooking(true)}>
                      <Icon name="add" />Book a session
                    </button>
                  ) : state.request === 'pending' ? (
                    <button type="button" className="btn btn-ghost" disabled><Icon name="schedule" />Request sent</button>
                  ) : (
                    <button type="button" className="btn btn-coral" onClick={sendRequest} disabled={busy}>
                      <Icon name="person_add" />{state.request === 'declined' ? 'Request again' : 'Request tutor'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="dash-grid">
            <div className="dash-col">
              <Card title="About" icon="person">
                {t.about_me
                  ? <p style={{ padding: '14px 18px 16px', fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>{t.about_me}</p>
                  : <p style={emptyLine}>No bio yet.</p>}
              </Card>

              {state.connected && (
                <Card title="Sessions" icon="event" count={upcoming.length || null} action={<CardLink to="/calendar/student">Calendar</CardLink>}>
                  {upcoming.length ? (
                    <div className="row-list">
                      {upcoming.map((ev) => (
                        <EventCard key={ev.id_event} event={ev} showMessage={false} onChanged={() => loadSessions(t.id_tutor)} />
                      ))}
                    </div>
                  ) : (
                    <p style={emptyLine}>No upcoming sessions.</p>
                  )}
                </Card>
              )}
            </div>

            <div className="dash-col">
              <Card title="Details" icon="badge">
                <div className="row-list">
                  <Detail label="Rate">
                    <strong style={{ fontWeight: 600 }}>{formatMoney(t.hourly_rate ?? 20)}</strong>
                    <span style={{ color: 'var(--text-faint)' }}> / hour</span>
                  </Detail>
                  {t.subjects && <Detail label="Subjects"><SubjectPills subjects={t.subjects} /></Detail>}
                  {t.availability && <Detail label="Availability">{t.availability}</Detail>}
                  {t.university && <Detail label="University">{t.university}</Detail>}
                  {t.course && <Detail label="Course">{t.course}</Detail>}
                  {age >= 16 && age < 100 && <Detail label="Age">{age}</Detail>}
                  {linkedin && (
                    <Detail label="LinkedIn">
                      <a href={linkedin} target="_blank" rel="noopener noreferrer" className="card-link" style={{ fontSize: 13.5 }}>
                        {linkedin.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')}<Icon name="open_in_new" />
                      </a>
                    </Detail>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {booking && (
            <BookSessionModal tutor={t} onClose={() => setBooking(false)} onBooked={() => loadSessions(t.id_tutor)} />
          )}
        </>
      )}
    </HubLayout>
  )
}
