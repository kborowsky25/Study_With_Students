import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Avatar, Card, DateChip, EmptyState, Icon, Pill, SkeletonRows } from '../components/ui'
import {
  createClassroom, enrollClassroom, getClassrooms, getClassroomStudents, getMyClassrooms, unenrollClassroom,
} from '../api/classroom'
import { errorMessage } from '../api/client'
import { useAutoFocus } from '../hooks/useAutoFocus'
import { useEscape } from '../hooks/useEscape'
import { useNow } from '../hooks/useNow'
import { toDateInput, toLocalISO } from '../lib/dates'
import { formatTime } from '../lib/format'
import { isOpen, livePhase, meetingUrl, minutesUntil, normaliseLink } from '../lib/meetings'

const MAX_CLASS_SIZE = 20
const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'English',
  'History', 'Law', 'Psychology', 'Engineering', 'Medicine', 'Statistics', 'Finance', 'Philosophy',
]

function timeRange(c) {
  if (!c.start_time) return 'Time to be confirmed'
  return c.end_time ? `${formatTime(c.start_time)}–${formatTime(c.end_time)}` : formatTime(c.start_time)
}

const seats = (c) => ({
  count: Number(c.enrolled_count) || 0,
  capacity: Number(c.capacity) || MAX_CLASS_SIZE,
})

const Optional = () => <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>(optional)</span>

function PastToggle({ open, onToggle }) {
  return (
    <button className="btn btn-quiet btn-sm" onClick={onToggle} aria-expanded={open}>
      {open ? 'Hide' : 'Show'}
    </button>
  )
}

function PhasePill({ c, phase, now }) {
  if (phase === 'live') return <Pill tone="green">Live now</Pill>
  if (phase === 'soon') return <Pill>Starts in {minutesUntil(c.start_time, now)} min</Pill>
  return null
}

function Capacity({ c }) {
  const { count, capacity } = seats(c)
  return (
    <div
      className="hide-mobile"
      style={{ width: 116, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}
      title={`${count} of ${capacity} places taken`}
    >
      <div className="progress" style={{ flex: 1 }}>
        <i style={{ width: `${Math.min(100, (count / capacity) * 100)}%` }} />
      </div>
      <span className="side">{count}/{capacity}</span>
    </div>
  )
}

function ClassMain({ c, who }) {
  return (
    <>
      {c.start_time ? <DateChip value={c.start_time} /> : <span className="date-col">TBC</span>}
      <div className="main">
        <div className="title">
          {c.title}
          {c.description && <span style={{ color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>{c.description}</span>}
        </div>
        <div className="meta">{[c.subject, who, timeRange(c)].filter(Boolean).join(' · ')}</div>
      </div>
    </>
  )
}

function ClassSpotlight({ c, now, hosting }) {
  const url = meetingUrl(c.zoom_link)
  return (
    <section className="card spotlight">
      <div className="grow">
        <div className="when">
          {livePhase(c, now) === 'live'
            ? `Live now${c.end_time ? ` · until ${formatTime(c.end_time)}` : ''}`
            : `Starts in ${minutesUntil(c.start_time, now)} min · ${formatTime(c.start_time)}`}
        </div>
        <h2>{c.title}</h2>
        <div className="who">
          {hosting ? `${seats(c).count} enrolled` : [c.subject, c.tutor_name && `with ${c.tutor_name}`].filter(Boolean).join(' · ')}
        </div>
      </div>
      {url ? (
        <a className="btn btn-coral" href={url} target="_blank" rel="noopener noreferrer">
          <Icon name="videocam" />{hosting ? 'Start class' : 'Join class'}
        </a>
      ) : <span className="side">No link yet</span>}
    </section>
  )
}

// ── Student view ──────────────────────────────────────────────────────────────

function StudentClassRow({ c, now, userId, busy, onJoin, onLeave }) {
  const phase = livePhase(c, now)
  const { count, capacity } = seats(c)
  const mine = c.tutor_user_id === userId
  const url = meetingUrl(c.zoom_link)
  const open = isOpen(phase)

  let status = <PhasePill c={c} phase={phase} now={now} />
  let action = null
  if (phase === 'past') {
    status = null
  } else if (mine) {
    status = <Pill>Hosting</Pill>
  } else if (c.enrolled) {
    if (open && url) {
      action = (
        <a className="btn btn-coral btn-sm" href={url} target="_blank" rel="noopener noreferrer">
          <Icon name="videocam" />Join class
        </a>
      )
    } else {
      if (!open) status = <Pill tone="green">Joined</Pill>
      if (phase !== 'live') {
        action = <button className="btn btn-quiet btn-sm" onClick={() => onLeave(c)} disabled={busy}>Leave</button>
      }
    }
  } else if (count >= capacity) {
    action = <button className="btn btn-ghost btn-sm" disabled>Full</button>
  } else {
    action = (
      <button className="btn btn-coral btn-sm" onClick={() => onJoin(c)} disabled={busy}>
        {busy ? 'Joining…' : 'Join'}
      </button>
    )
  }

  return (
    <div className="row row-wrap">
      <ClassMain c={c} who={mine ? 'You' : c.tutor_name} />
      <div className="row-actions">
        {status}
        <Capacity c={c} />
        {action && <div style={{ display: 'flex', justifyContent: 'flex-end', minWidth: 72 }}>{action}</div>}
      </div>
    </div>
  )
}

function StudentClasses({ user }) {
  const now = useNow()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState('all')
  const [busy, setBusy] = useState(null)
  const [showPast, setShowPast] = useState(false)

  function load() {
    setLoading(true)
    getClassrooms()
      .then(({ data }) => { setClasses(data.classrooms ?? []); setFailed(false) })
      .catch((err) => { setFailed(true); toast.error(errorMessage(err, 'Could not load classes')) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const patch = (id, change) => setClasses((list) => list.map((x) => (x.id === id ? { ...x, ...change(x) } : x)))

  async function join(c) {
    setBusy(c.id)
    try {
      await enrollClassroom(c.id)
      patch(c.id, (x) => ({ enrolled: true, enrolled_count: seats(x).count + 1 }))
      toast.success(`Joined ${c.title}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not join this class'))
      if (err?.response?.status === 409) load() // filled up meanwhile: refresh the counts
    } finally {
      setBusy(null)
    }
  }

  async function leave(c) {
    setBusy(c.id)
    try {
      await unenrollClassroom(c.id)
      patch(c.id, (x) => ({ enrolled: false, enrolled_count: Math.max(0, seats(x).count - 1) }))
      toast.success(`Left ${c.title}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not leave this class'))
    } finally {
      setBusy(null)
    }
  }

  const active = classes.filter((c) => livePhase(c, now) !== 'past') // the API sorts by start time
  const joined = active.filter((c) => c.enrolled)
  const joinedPast = classes.filter((c) => c.enrolled && livePhase(c, now) === 'past').reverse()
  const highlight = joined.find((c) => livePhase(c, now) !== 'upcoming')
  const shown = tab === 'joined' ? joined : active

  const row = (c) => (
    <StudentClassRow key={c.id} c={c} now={now} userId={user?.id} busy={busy === c.id} onJoin={join} onLeave={leave} />
  )

  return (
    <>
      <div className="dash-head">
        <h1>Classes</h1>
      </div>

      <div className="dash-col">
        {highlight && <ClassSpotlight c={highlight} now={now} />}

        <section>
          <div className="tabs" role="tablist" aria-label="Classes">
            {[['all', 'All classes', active.length], ['joined', 'Joined', joined.length]].map(([key, label, count]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
                {label}{!loading && <span className="count">{count}</span>}
              </button>
            ))}
          </div>
          <Card>
            {loading ? <SkeletonRows rows={3} /> : shown.length ? (
              <div className="row-list">{shown.map(row)}</div>
            ) : failed ? (
              <EmptyState title="Couldn’t load classes." action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
            ) : tab === 'joined' ? (
              <EmptyState
                title="You haven’t joined any classes."
                action={<button className="btn btn-ghost btn-sm" onClick={() => setTab('all')}>Browse classes</button>}
              />
            ) : (
              <EmptyState title="No classes scheduled." />
            )}
          </Card>
        </section>

        {tab === 'joined' && joinedPast.length > 0 && (
          <Card title="Past" count={joinedPast.length} action={<PastToggle open={showPast} onToggle={() => setShowPast((v) => !v)} />}>
            {showPast && <div className="row-list">{joinedPast.slice(0, 20).map(row)}</div>}
          </Card>
        )}
      </div>
    </>
  )
}

// ── Tutor view ────────────────────────────────────────────────────────────────

function HostedClassRow({ c, now, onRoster }) {
  const phase = livePhase(c, now)
  const url = meetingUrl(c.zoom_link)

  return (
    <div className="row row-wrap">
      <ClassMain c={c} />
      <div className="row-actions">
        <PhasePill c={c} phase={phase} now={now} />
        {phase !== 'past' && !url && <Pill tone="red">No link</Pill>}
        <Capacity c={c} />
        <button className="btn btn-ghost btn-sm" onClick={() => onRoster(c)}>
          <Icon name="group" />Students
        </button>
        {isOpen(phase) && url && (
          <a className="btn btn-coral btn-sm" href={url} target="_blank" rel="noopener noreferrer">
            <Icon name="videocam" />Start
          </a>
        )}
      </div>
    </div>
  )
}

function NewClassDialog({ onClose, onCreated }) {
  const [form, setForm] = useState(() => ({
    title: '', subject: '', description: '', capacity: String(MAX_CLASS_SIZE),
    date: toDateInput(new Date(Date.now() + 86_400_000)), start: '18:00', end: '19:00', link: '',
  }))
  const [saving, setSaving] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const first = useAutoFocus()
  useEscape(onClose)

  async function submit(e) {
    e.preventDefault()
    const title = form.title.trim()
    const subject = form.subject.trim()
    const capacity = Number(form.capacity)
    const start = new Date(`${form.date}T${form.start}`)
    const end = new Date(`${form.date}T${form.end}`)
    const link = normaliseLink(form.link)

    if (!title) { toast.error('Add a title'); return }
    if (!subject) { toast.error('Add a subject'); return }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CLASS_SIZE) {
      toast.error(`Classes can have 1 to ${MAX_CLASS_SIZE} students`)
      return
    }
    if (Number.isNaN(start.getTime()) || !(end > start)) { toast.error('The end time must be after the start'); return }
    if (end <= new Date()) { toast.error('Pick a time in the future'); return }
    if (!link) { toast.error('Add a valid meeting link'); return }

    setSaving(true)
    try {
      await createClassroom({
        title,
        subject,
        description: form.description.trim(),
        capacity,
        start_time: toLocalISO(start),
        end_time: toLocalISO(end),
        zoom_link: link,
      })
      toast.success('Class scheduled')
      onCreated()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not schedule the class'))
      setSaving(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-class-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="dialog-head">
          <h2 id="new-class-title">New class</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="dialog-body">
          <label className="field">
            <span>Title</span>
            <input ref={first} className="input" value={form.title} onChange={set('title')} maxLength={255} required />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Subject</span>
              <input className="input" value={form.subject} onChange={set('subject')} list="class-subjects" maxLength={100} required />
              <datalist id="class-subjects">
                {SUBJECTS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </label>
            <label className="field">
              <span>Places</span>
              <input
                className="input"
                type="number"
                min={1}
                max={MAX_CLASS_SIZE}
                step={1}
                value={form.capacity}
                onChange={set('capacity')}
                required
              />
            </label>
          </div>
          <label className="field">
            <span>Description <Optional /></span>
            <textarea className="input" value={form.description} onChange={set('description')} maxLength={2000} />
          </label>
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" value={form.date} min={toDateInput(new Date())} onChange={set('date')} required />
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
            {saving ? 'Scheduling…' : 'Schedule class'}
          </button>
        </div>
      </form>
    </div>
  )
}

function RosterDialog({ classroom, onClose }) {
  const [students, setStudents] = useState(null)
  const { count, capacity } = seats(classroom)
  useEscape(onClose)

  useEffect(() => {
    let live = true
    getClassroomStudents(classroom.id)
      .then(({ data }) => { if (live) setStudents(data.students ?? []) })
      .catch((err) => {
        if (!live) return
        setStudents([])
        toast.error(errorMessage(err, 'Could not load the class list'))
      })
    return () => { live = false }
  }, [classroom.id])

  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(students.map((s) => s.email).join(', '))
      toast.success('Emails copied')
    } catch {
      toast.error('Could not copy the emails')
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="roster-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <h2 id="roster-title" style={{ minWidth: 0 }}>
            {classroom.title} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{count}/{capacity}</span>
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div style={{ padding: '10px 4px 6px' }}>
          {students === null ? <SkeletonRows rows={3} /> : students.length ? (
            <div className="row-list">
              {students.map((s) => (
                <div className="row" key={s.id_user}>
                  <Avatar name={s.name} size={28} />
                  <div className="main">
                    <div className="title">{s.name}</div>
                    <div className="meta">{s.email}</div>
                  </div>
                  <Link to="/messages" search={{ user: s.id_user }} className="icon-btn" aria-label={`Message ${s.name}`}>
                    <Icon name="chat" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No students yet." />
          )}
        </div>

        <div className="dialog-foot">
          {students?.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={copyEmails}><Icon name="content_copy" />Copy emails</button>
          )}
          <button type="button" className="btn btn-quiet" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function TutorClasses({ user }) {
  const verified = Boolean(user?.is_tutor && user.screening_status === 'approved')
  const now = useNow()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [roster, setRoster] = useState(null)
  const [showPast, setShowPast] = useState(false)

  function load() {
    setLoading(true)
    getMyClassrooms()
      .then(({ data }) => { setClasses(data.classrooms ?? []); setFailed(false) })
      .catch((err) => { setFailed(true); toast.error(errorMessage(err, 'Could not load your classes')) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const active = classes.filter((c) => livePhase(c, now) !== 'past')
  const past = classes.filter((c) => livePhase(c, now) === 'past').reverse()
  const highlight = active.find((c) => livePhase(c, now) !== 'upcoming')
  const list = active.filter((c) => c !== highlight)
  const row = (c) => <HostedClassRow key={c.id} c={c} now={now} onRoster={setRoster} />

  return (
    <>
      <div className="dash-head">
        <h1>Classes</h1>
        <div className="dash-actions">
          {verified ? (
            <button className="btn btn-coral" onClick={() => setCreating(true)}><Icon name="add" />New class</button>
          ) : (
            <Link to="/tutor-screening" className="btn btn-ghost">Get verified to host classes</Link>
          )}
        </div>
      </div>

      <div className="dash-col">
        {highlight && <ClassSpotlight c={highlight} now={now} hosting />}

        <Card title="Upcoming" count={list.length || null}>
          {loading ? <SkeletonRows rows={2} /> : list.length ? (
            <div className="row-list">{list.map(row)}</div>
          ) : failed ? (
            <EmptyState title="Couldn’t load your classes." action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
          ) : (
            <EmptyState title={highlight ? 'Nothing else scheduled.' : 'No classes scheduled.'} />
          )}
        </Card>

        {past.length > 0 && (
          <Card title="Past" count={past.length} action={<PastToggle open={showPast} onToggle={() => setShowPast((v) => !v)} />}>
            {showPast && <div className="row-list">{past.slice(0, 20).map(row)}</div>}
          </Card>
        )}
      </div>

      {creating && (
        <NewClassDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load() }} />
      )}
      {roster && <RosterDialog classroom={roster} onClose={() => setRoster(null)} />}
    </>
  )
}

export default function Classroom() {
  const { user } = useAuth()
  // Same rule as the sidebar: tutors see the page in whichever view they last chose.
  const tutorView = Boolean(user?.is_tutor) && localStorage.getItem('sws_hub_mode') === 'tutor'

  return (
    <HubLayout initialMode={tutorView ? 'tutor' : 'student'}>
      <PageTitle title="Classes" icon="school" />
      {tutorView ? <TutorClasses user={user} /> : <StudentClasses user={user} />}
    </HubLayout>
  )
}
