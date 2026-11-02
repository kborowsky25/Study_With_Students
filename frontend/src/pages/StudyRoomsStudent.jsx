import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Card, DateChip, EmptyState, Icon, Pill, SkeletonRows } from '../components/ui'
import { getStudyRooms, saveToCalendar } from '../api/studyrooms'
import { errorMessage } from '../api/client'
import { useNow } from '../hooks/useNow'
import { formatTime } from '../lib/format'
import { formatLength, isOpen, livePhase, meetingUrl, minutesUntil } from '../lib/meetings'

function PhasePill({ room, phase, now }) {
  if (phase === 'live') return <Pill tone="green">Live now</Pill>
  if (phase === 'soon') return <Pill>Starts in {minutesUntil(room.start_time, now)} min</Pill>
  return null
}

function JoinLink({ url, label, small }) {
  if (!url) return <span className="side">No link yet</span>
  return (
    <a className={`btn btn-coral ${small ? 'btn-sm' : ''}`} href={url} target="_blank" rel="noopener noreferrer">
      <Icon name="videocam" />{label}
    </a>
  )
}

function RoomRow({ room, now, userId, saving, onSave }) {
  const phase = livePhase(room, now)
  const mine = room.creator_user_id === userId

  let action = null
  if (isOpen(phase)) {
    action = <JoinLink url={meetingUrl(room.zoom_link)} label={mine ? 'Start' : 'Join'} small />
  } else if (phase === 'upcoming') {
    if (mine) action = <Pill>Hosting</Pill>
    else if (room.in_calendar) action = <Pill tone="green">In calendar</Pill>
    else {
      action = (
        <button className="btn btn-ghost btn-sm" onClick={() => onSave(room)} disabled={saving}>
          <Icon name="calendar_add_on" />Add to calendar
        </button>
      )
    }
  }

  return (
    <div className="row row-wrap">
      <DateChip value={room.start_time} />
      <div className="main">
        <div className="title">
          {room.subject}
          {room.description && <span style={{ color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>{room.description}</span>}
        </div>
        <div className="meta">
          {mine ? 'You' : room.tutor_name || 'Tutor'} · {formatTime(room.start_time)}–{formatTime(room.end_time)} · {formatLength(room.start_time, room.end_time)}
        </div>
      </div>
      <div className="row-actions">
        <PhasePill room={room} phase={phase} now={now} />
        {action}
      </div>
    </div>
  )
}

export default function StudyRoomsStudent() {
  const { user } = useAuth()
  const now = useNow()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(null)
  const [showPast, setShowPast] = useState(false)

  function load() {
    setLoading(true)
    getStudyRooms()
      .then(({ data }) => { setRooms(data.rooms ?? []); setFailed(false) })
      .catch((err) => { setFailed(true); toast.error(errorMessage(err, 'Could not load study rooms')) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function addToCalendar(room) {
    setSaving(room.id)
    try {
      const { data } = await saveToCalendar(room.id)
      setRooms((list) => list.map((r) => (r.id === room.id ? { ...r, in_calendar: true } : r)))
      toast.success(data?.already_saved ? 'Already in your calendar' : 'Added to your calendar')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add it to your calendar'))
    } finally {
      setSaving(null)
    }
  }

  const active = rooms.filter((r) => livePhase(r, now) !== 'past') // the API sorts by start time
  const past = rooms.filter((r) => livePhase(r, now) === 'past').reverse()
  const highlight = active.find((r) => livePhase(r, now) !== 'upcoming')
  const list = active.filter((r) => r !== highlight)

  const row = (room) => (
    <RoomRow key={room.id} room={room} now={now} userId={user?.id} saving={saving === room.id} onSave={addToCalendar} />
  )

  return (
    <HubLayout initialMode="student">
      <PageTitle title="Study rooms" icon="groups" />

      <div className="dash-head">
        <h1>Study rooms</h1>
        <div className="dash-actions">
          <Link to="/calendar/student" className="btn btn-ghost"><Icon name="calendar_month" />Calendar</Link>
          {user?.is_tutor && user.screening_status === 'approved' && (
            <Link to="/study-rooms/tutor" className="btn btn-coral"><Icon name="add" />Host a room</Link>
          )}
        </div>
      </div>

      <div className="dash-col">
        {highlight && (
          <section className="card spotlight">
            <div className="grow">
              <div className="when">
                {livePhase(highlight, now) === 'live'
                  ? `Live now · until ${formatTime(highlight.end_time)}`
                  : `Starts in ${minutesUntil(highlight.start_time, now)} min · ${formatTime(highlight.start_time)}`}
              </div>
              <h2>{highlight.subject}</h2>
              <div className="who">
                {highlight.creator_user_id === user?.id ? 'You’re hosting' : `with ${highlight.tutor_name || 'a tutor'}`}
              </div>
            </div>
            <JoinLink
              url={meetingUrl(highlight.zoom_link)}
              label={highlight.creator_user_id === user?.id ? 'Start' : 'Join'}
            />
          </section>
        )}

        <Card title="Upcoming" count={list.length || null}>
          {loading ? <SkeletonRows rows={3} /> : list.length ? (
            <div className="row-list">{list.map(row)}</div>
          ) : failed ? (
            <EmptyState title="Couldn’t load study rooms." action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
          ) : (
            <EmptyState title={highlight ? 'Nothing else scheduled.' : 'No rooms scheduled.'} />
          )}
        </Card>

        {past.length > 0 && (
          <Card
            title="Past"
            count={past.length}
            action={(
              <button className="btn btn-quiet btn-sm" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast}>
                {showPast ? 'Hide' : 'Show'}
              </button>
            )}
          >
            {showPast && <div className="row-list">{past.slice(0, 20).map(row)}</div>}
          </Card>
        )}
      </div>
    </HubLayout>
  )
}
