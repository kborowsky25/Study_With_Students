import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Card, DateChip, EmptyState, Icon, Pill, SkeletonRows } from '../components/ui'
import { createStudyRoom, getStudyRooms } from '../api/studyrooms'
import { errorMessage } from '../api/client'
import { formatTime } from '../lib/format'

const JOIN_WINDOW = 15 * 60_000 // students see the join link from 15 minutes before the start

/** Rooms store whatever was typed — only http(s) links are rendered. */
function meetingUrl(link) {
  const s = (link || '').trim()
  if (/^https?:\/\/\S+$/i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) return `https://${s}`
  return null
}

/** Accepts "zoom.us/j/123" as well as full URLs; null for anything that isn't http(s). */
function normaliseLink(value) {
  const s = value.trim()
  if (!s) return null
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(s) ? s : `https://${s}`)
    return /^https?:$/.test(url.protocol) && url.hostname.includes('.') ? url.href : null
  } catch {
    return null
  }
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return null }
}

function phaseOf(room, now) {
  const start = new Date(room.start_time).getTime()
  const end = new Date(room.end_time).getTime()
  if (now >= end) return 'past'
  if (now >= start) return 'live'
  return start - now <= JOIN_WINDOW ? 'soon' : 'upcoming'
}

function useNow(every = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(id)
  }, [every])
  return now
}

function useEscape(handler) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handler() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handler])
}

function formatLength(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60_000)
  if (mins < 60) return `${mins} min`
  return mins % 60 ? `${Math.floor(mins / 60)} h ${mins % 60}` : `${mins / 60} h`
}

const minutesUntil = (value, now) => Math.max(1, Math.ceil((new Date(value) - now) / 60_000))

const pad = (n) => String(n).padStart(2, '0')
const dateOnly = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const localISO = (d) => `${dateOnly(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

const Optional = () => <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>(optional)</span>

function HostedRoomRow({ room, now }) {
  const phase = phaseOf(room, now)
  const url = meetingUrl(room.zoom_link)

  return (
    <div className="row">
      <DateChip value={room.start_time} />
      <div className="main">
        <div className="title">
          {room.subject}
          {room.description && <span style={{ color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>{room.description}</span>}
        </div>
        <div className="meta">
          {formatTime(room.start_time)}–{formatTime(room.end_time)} · {formatLength(room.start_time, room.end_time)}
          {url && ` · ${hostOf(url) ?? 'Meeting link'}`}
        </div>
      </div>
      {phase === 'live' && <Pill tone="green">Live now</Pill>}
      {phase === 'soon' && <Pill>Starts in {minutesUntil(room.start_time, now)} min</Pill>}
      {phase !== 'past' && !url && <Pill tone="red">No link</Pill>}
      {(phase === 'live' || phase === 'soon') && url && (
        <a className="btn btn-coral btn-sm" href={url} target="_blank" rel="noopener noreferrer">
          <Icon name="videocam" />Start
        </a>
      )}
    </div>
  )
}

function HostRoomDialog({ onClose, onCreated }) {
  const [form, setForm] = useState(() => ({
    subject: '', description: '', date: dateOnly(new Date(Date.now() + 86_400_000)), start: '18:00', end: '19:00', link: '',
  }))
  const [saving, setSaving] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  useEscape(onClose)

  async function submit(e) {
    e.preventDefault()
    const subject = form.subject.trim()
    const start = new Date(`${form.date}T${form.start}`)
    const end = new Date(`${form.date}T${form.end}`)
    const link = normaliseLink(form.link)

    if (!subject) { toast.error('Add a subject'); return }
    if (Number.isNaN(start.getTime()) || !(end > start)) { toast.error('The end time must be after the start'); return }
    if (end <= new Date()) { toast.error('Pick a time in the future'); return }
    if (!link) { toast.error('Add a valid meeting link'); return }

    setSaving(true)
    try {
      await createStudyRoom({
        subject,
        description: form.description.trim(),
        start_time: localISO(start),
        end_time: localISO(end),
        zoom_link: link,
      })
      toast.success('Room scheduled')
      onCreated()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not schedule the room'))
      setSaving(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-room-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="dialog-head">
          <h2 id="host-room-title">Host a study room</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="dialog-body">
          <label className="field">
            <span>Subject</span>
            <input className="input" value={form.subject} onChange={set('subject')} maxLength={150} required autoFocus />
          </label>
          <label className="field">
            <span>Description <Optional /></span>
            <textarea className="input" value={form.description} onChange={set('description')} maxLength={1000} />
          </label>
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" value={form.date} min={dateOnly(new Date())} onChange={set('date')} required />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Start</span>
              <input className="input" type="time" value={form.start} onChange={set('start')} required />
            </label>
            <label className="field">
              <span>End</span>
              <input className="input" type="time" value={form.end} onChange={set('end')} required />
            </label>
          </div>
          <label className="field">
            <span>Meeting link</span>
            <input
              className="input"
              value={form.link}
              onChange={set('link')}
              placeholder="https://"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
        </div>

        <div className="dialog-foot">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={saving}>
            {saving ? 'Scheduling…' : 'Schedule room'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function StudyRoomsTutor() {
  const { user } = useAuth()
  const now = useNow()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [hosting, setHosting] = useState(false)
  const [showPast, setShowPast] = useState(false)

  function load() {
    setLoading(true)
    getStudyRooms()
      .then(({ data }) => { setRooms(data.rooms ?? []); setFailed(false) })
      .catch((err) => { setFailed(true); toast.error(errorMessage(err, 'Could not load your study rooms')) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const mine = rooms.filter((r) => r.creator_user_id === user?.id)
  const active = mine.filter((r) => phaseOf(r, now) !== 'past')
  const past = mine.filter((r) => phaseOf(r, now) === 'past').reverse()
  const highlight = active.find((r) => phaseOf(r, now) !== 'upcoming')
  const list = active.filter((r) => r !== highlight)
  const highlightUrl = highlight && meetingUrl(highlight.zoom_link)

  const row = (room) => <HostedRoomRow key={room.id} room={room} now={now} />

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="Study rooms" icon="groups" />

      <div className="dash-head">
        <h1>Study rooms</h1>
        <div className="dash-actions">
          <button className="btn btn-coral" onClick={() => setHosting(true)}><Icon name="add" />Host a room</button>
        </div>
      </div>

      <div className="dash-col">
        {highlight && (
          <section className="card spotlight">
            <div className="grow">
              <div className="when">
                {phaseOf(highlight, now) === 'live'
                  ? `Live now · until ${formatTime(highlight.end_time)}`
                  : `Starts in ${minutesUntil(highlight.start_time, now)} min · ${formatTime(highlight.start_time)}`}
              </div>
              <h2>{highlight.subject}</h2>
              <div className="who">{formatLength(highlight.start_time, highlight.end_time)}</div>
            </div>
            {highlightUrl ? (
              <a className="btn btn-coral" href={highlightUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="videocam" />Start
              </a>
            ) : <Pill tone="red">No link</Pill>}
          </section>
        )}

        <Card title="Upcoming" count={list.length || null}>
          {loading ? <SkeletonRows rows={2} /> : list.length ? (
            <div className="row-list">{list.map(row)}</div>
          ) : failed ? (
            <EmptyState title="Couldn’t load your rooms." action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
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

      {hosting && (
        <HostRoomDialog
          onClose={() => setHosting(false)}
          onCreated={() => { setHosting(false); load() }}
        />
      )}
    </HubLayout>
  )
}
