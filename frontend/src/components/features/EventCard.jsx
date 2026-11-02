// Session pieces shared by the tutoring pages:
//   EventCard              one session, with the actions each side may take (only the tutor
//                          confirms; either side cancels; the student pays the tutor directly)
//   CompactSession         a session as a clickable row without actions
//   MonthGrid              the month view used by both calendars
//   ScheduleSessionDialog  a tutor books one of their students (created already confirmed)
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { createEvent, updateStatus } from '../../api/events'
import { getTutorProfile } from '../../api/tutors'
import { errorMessage } from '../../api/client'
import { firstName, formatMoney, formatTime } from '../../lib/format'
import { Avatar, DateChip, Icon, StatusPill } from '../ui'

const TONE = {
  pending:   'var(--amber)',
  confirmed: 'var(--blue)',
  paid:      'var(--green)',
  canceled:  'var(--text-faint)',
  expired:   'var(--text-faint)',
}
const tint = (color, pct = 14) => `color-mix(in srgb, ${color} ${pct}%, transparent)`
const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const localISO = (d) => `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

/** A request the tutor never answered before it started counts as expired, not pending. */
const visualStatus = (ev) =>
  (ev.status === 'pending' && new Date(ev.start_time) <= new Date() ? 'expired' : ev.status)

function pillProps(ev) {
  const status = visualStatus(ev)
  if (status === 'expired') return { status: 'canceled', label: 'Expired' }
  if (ev.role === 'tutor' && status === 'pending') return { status, label: 'Needs answer' }
  if (ev.role === 'tutor' && status === 'confirmed') return { status, label: 'Unpaid' }
  return { status }
}

function durationLabel(ev) {
  const minutes = Math.round((new Date(ev.end_time) - new Date(ev.start_time)) / 60_000)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m}` : `${h} h`
}

// ── EventCard ────────────────────────────────────────────────────────────────

/**
 * One session as a row. `variant="time"` shows the start time instead of a date chip
 * (for lists that are already grouped by day).
 */
export default function EventCard({ event: ev, onChanged, variant = 'date', showMessage = true }) {
  const [busy, setBusy] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const asTutor = ev.role === 'tutor'
  const upcoming = new Date(ev.start_time) > new Date()
  const canceled = ev.status === 'canceled'
  const otherName = (asTutor ? ev.student_name : ev.tutor_name) || 'Unknown'
  const otherUserId = asTutor ? ev.student_user_id : ev.tutor_user_id

  const canAnswer = asTutor && ev.status === 'pending' && upcoming
  const canPay = !asTutor && ev.status === 'confirmed'
  const canCancel = upcoming && (ev.status === 'confirmed' || (ev.status === 'pending' && !asTutor))
  const hasActions = canAnswer || canPay || canCancel || (showMessage && otherUserId && !canceled)

  async function change(status, message) {
    setBusy(true)
    try {
      await updateStatus(ev.id_event, status)
      toast.success(message)
      setConfirmingCancel(false)
      await onChanged?.()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the session'))
    } finally {
      setBusy(false)
    }
  }

  const when = variant === 'time'
    ? durationLabel(ev)
    : `${formatTime(ev.start_time)}–${formatTime(ev.end_time)}`

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      {variant === 'time' ? (
        <div style={{ width: 44, flexShrink: 0, paddingTop: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: canceled ? 'var(--text-faint)' : 'var(--text)' }}>{formatTime(ev.start_time)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{durationLabel(ev)}</div>
        </div>
      ) : (
        <DateChip value={ev.start_time} />
      )}

      <div className="main">
        <div className="title" style={canceled ? { color: 'var(--text-faint)', textDecoration: 'line-through' } : undefined}>
          {ev.title || 'Tutoring session'}
        </div>
        <div className="meta">
          {asTutor ? otherName : `with ${otherName}`}
          {variant === 'time' ? '' : ` · ${when}`} · {formatMoney(ev.amount)}
        </div>
        {ev.description && <div className="meta" title={ev.description}>“{ev.description}”</div>}

        {hasActions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 }}>
            {confirmingCancel ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 2 }}>
                  {ev.status === 'pending' ? 'Withdraw this request?' : 'Cancel this session?'}
                </span>
                <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => setConfirmingCancel(false)}>Keep</button>
                <button type="button" className="btn btn-danger btn-sm" disabled={busy}
                  onClick={() => change('canceled', ev.status === 'pending' ? 'Request withdrawn' : 'Session cancelled')}>
                  {busy ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </>
            ) : (
              <>
                {canAnswer && (
                  <>
                    <button type="button" className="btn btn-coral btn-sm" disabled={busy}
                      onClick={() => change('confirmed', 'Session confirmed')}>
                      <Icon name="check" />Confirm
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                      onClick={() => change('canceled', 'Session declined')}>
                      Decline
                    </button>
                  </>
                )}
                {canPay && (
                  <Link to="/payments" className="btn btn-coral btn-sm"><Icon name="credit_card" />Pay {formatMoney(ev.amount)}</Link>
                )}
                {showMessage && otherUserId && !canceled && (
                  <Link to="/messages" search={{ user: otherUserId }} className="btn btn-ghost btn-sm"><Icon name="chat" />Message</Link>
                )}
                {canCancel && (
                  <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => setConfirmingCancel(true)}>
                    {ev.status === 'pending' ? 'Withdraw' : 'Cancel'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <SessionStatus event={ev} />
    </div>
  )
}

/** Status pill worded for the viewer's side of the session. */
export function SessionStatus({ event }) {
  return <StatusPill {...pillProps(event)} />
}

/** A session as a compact clickable row, without actions. */
export function CompactSession({ event: ev, onClick }) {
  return (
    <button type="button" className="row" onClick={onClick}>
      <DateChip value={ev.start_time} />
      <div className="main">
        <div className="title" style={ev.status === 'canceled' ? { color: 'var(--text-faint)', textDecoration: 'line-through' } : undefined}>
          {ev.title || 'Tutoring session'}
        </div>
        <div className="meta">
          {formatTime(ev.start_time)} · {ev.role === 'tutor' ? ev.student_name : `with ${ev.tutor_name}`}
        </div>
      </div>
      <SessionStatus event={ev} />
    </button>
  )
}

// ── MonthGrid ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])
  return matches
}

/** Every day shown for `month`: whole Monday-to-Sunday weeks. */
function monthDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const start = new Date(first)
  start.setDate(1 - ((first.getDay() + 6) % 7))
  const end = new Date(last)
  end.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)))
  const days = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d))
  return days
}

/**
 * Month view. Sessions show as status-coloured chips (dots on narrow screens).
 * onSelect(date) fires for day clicks and "Today"; onMonthChange(firstOfMonth) for the arrows.
 */
export function MonthGrid({ month, onMonthChange, selected, onSelect, events, chipLabel = (ev) => ev.title, legend = [] }) {
  const narrow = useMediaQuery('(max-width: 640px)')
  const days = useMemo(() => monthDays(month), [month])
  const byDay = useMemo(() => {
    const map = new Map()
    const sorted = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    for (const ev of sorted) {
      const key = dayKey(new Date(ev.start_time))
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(ev)
    }
    return map
  }, [events])

  const todayKey = dayKey(new Date())
  const selectedKey = selected ? dayKey(selected) : null
  const shift = (n) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <section className="card">
      <header className="card-head">
        <h3><Icon name="calendar_month" />{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h3>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => onSelect(new Date())}>Today</button>
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month" title="Previous month">
          <Icon name="chevron_left" />
        </button>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month" title="Next month" style={{ marginRight: -8 }}>
          <Icon name="chevron_right" />
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{
            padding: '8px 8px 6px', fontSize: 12, fontWeight: 500,
            color: 'var(--text-faint)', textAlign: narrow ? 'center' : 'left',
          }}>
            {narrow ? d[0] : d}
          </div>
        ))}

        {days.map((day, i) => {
          const key = dayKey(day)
          const list = byDay.get(key) ?? []
          const inMonth = day.getMonth() === month.getMonth()
          const isToday = key === todayKey
          const isSelected = key === selectedKey
          const label = day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
          return (
            <button
              key={key}
              type="button"
              className="btn-quiet"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={list.length ? `${label}, ${list.length} session${list.length > 1 ? 's' : ''}` : label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: narrow ? 'center' : 'stretch', gap: 3,
                minWidth: 0, minHeight: narrow ? 52 : 98, padding: narrow ? '5px 2px 6px' : '6px 6px 8px',
                border: 0, borderTop: '1px solid var(--border)', borderLeft: i % 7 ? '1px solid var(--border)' : 0,
                borderRadius: 0, font: 'inherit', textAlign: 'left', cursor: 'pointer',
                ...(isSelected ? { background: 'rgb(var(--fg) / 0.05)', boxShadow: 'inset 0 0 0 1.5px var(--coral)' } : null),
              }}
            >
              <span style={{
                alignSelf: narrow ? 'center' : 'flex-start',
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: isToday || isSelected ? 600 : 500,
                background: isToday ? 'var(--coral-soft)' : undefined,
                color: isToday ? 'var(--coral)' : inMonth ? 'var(--text)' : 'var(--text-faint)',
              }}>
                {day.getDate()}
              </span>

              {narrow ? (
                <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
                  {list.slice(0, 4).map((ev) => (
                    <i key={ev.id_event} style={{ width: 6, height: 6, borderRadius: '50%', background: TONE[visualStatus(ev)] }} />
                  ))}
                </span>
              ) : (
                <>
                  {list.slice(0, 3).map((ev) => {
                    const status = visualStatus(ev)
                    const faded = status === 'canceled' || status === 'expired'
                    return (
                      <span key={ev.id_event} title={`${formatTime(ev.start_time)} · ${ev.title || 'Tutoring session'}`} style={{
                        display: 'block', height: 18, lineHeight: '18px', padding: '0 6px', borderRadius: 4,
                        fontSize: 11, fontWeight: 500, ...ellipsis,
                        background: tint(TONE[status]), boxShadow: `inset 2px 0 0 ${TONE[status]}`,
                        color: faded ? 'var(--text-faint)' : 'var(--text)',
                        textDecoration: status === 'canceled' ? 'line-through' : undefined,
                        opacity: inMonth ? 1 : 0.6,
                      }}>
                        <span style={{ fontWeight: 600, color: faded ? undefined : TONE[status] }}>{formatTime(ev.start_time)}</span>{' '}
                        {chipLabel(ev)}
                      </span>
                    )
                  })}
                  {list.length > 3 && (
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', paddingLeft: 6 }}>+{list.length - 3} more</span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {legend.length > 0 && (
        <footer style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px 16px', padding: '10px 18px',
          borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-faint)',
        }}>
          {legend.map(({ status, label }) => (
            <span key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i style={{ width: 8, height: 8, borderRadius: 2, background: TONE[status] }} />{label}
            </span>
          ))}
        </footer>
      )}
    </section>
  )
}

// ── ScheduleSessionDialog ────────────────────────────────────────────────────

const DURATIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1 h 30' },
  { minutes: 120, label: '2 hours' },
]

/** A tutor books a session with one of their students. It's created as confirmed. */
export function ScheduleSessionDialog({ students, studentId, date, onClose, onScheduled }) {
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000))
  const firstDay = date && dayKey(date) >= dayKey(new Date()) ? dayKey(date) : tomorrow
  const [form, setForm] = useState({
    student: String(studentId ?? students[0]?.id_student ?? ''),
    title: '', date: firstDay, time: '17:00', minutes: 60, notes: '',
  })
  const [rate, setRate] = useState(null)
  const [saving, setSaving] = useState(false)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    getTutorProfile()
      .then(({ data }) => setRate(Number(data.profile?.hourly_rate ?? 20)))
      .catch(() => setRate(20))
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const student = students.find((s) => String(s.id_student) === form.student)
  const name = firstName(student?.name)
  const price = rate == null ? null : (rate * form.minutes) / 60

  async function submit(e) {
    e.preventDefault()
    if (!student) { toast.error('Choose a student'); return }
    const start = new Date(`${form.date}T${form.time}`)
    if (Number.isNaN(start.getTime()) || start < new Date()) {
      toast.error('Pick a time in the future')
      return
    }
    const end = new Date(start.getTime() + form.minutes * 60_000)
    setSaving(true)
    try {
      const { data } = await createEvent({
        student_id: student.id_student,
        title: form.title.trim() || 'Tutoring session',
        description: form.notes.trim(),
        start_time: localISO(start),
        end_time: localISO(end),
      })
      toast.success(`Session booked with ${name}`)
      onScheduled?.(data.event)
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not schedule the session'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="schedule-title"
        onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="dialog-head">
          <Avatar name={student?.name ?? '?'} size={40} />
          <div style={{ flex: 1, alignSelf: 'center' }}>
            <h2 id="schedule-title">Schedule a session{student ? ` with ${name}` : ''}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="dialog-body">
          {students.length > 1 && (
            <label className="field">
              <span>Student</span>
              <select className="input" value={form.student} onChange={set('student')}>
                {students.map((s) => <option key={s.id_student} value={String(s.id_student)}>{s.name}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span>What will you cover?</span>
            <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Past paper walkthrough" maxLength={120} autoFocus />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Date</span>
              <input className="input" type="date" value={form.date} min={dayKey(new Date())} onChange={set('date')} required />
            </label>
            <label className="field">
              <span>Start time</span>
              <input className="input" type="time" value={form.time} step={900} onChange={set('time')} required />
            </label>
          </div>
          <div className="field">
            <span>Length</span>
            <div className="mode-switch" style={{ gridTemplateColumns: `repeat(${DURATIONS.length}, 1fr)` }}>
              {DURATIONS.map((d) => (
                <button type="button" key={d.minutes} className={form.minutes === d.minutes ? 'on' : ''}
                  onClick={() => setForm((f) => ({ ...f, minutes: d.minutes }))}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="What to prepare, links, topics" />
          </label>
        </div>

        <div className="dialog-foot" style={{ alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)' }}>
            {price == null ? '' : <><strong style={{ fontWeight: 600, color: 'var(--text)' }}>{formatMoney(price)}</strong> at {formatMoney(rate)}/hr</>}
          </span>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={saving || !student}>
            <Icon name="event_available" />{saving ? 'Scheduling…' : 'Schedule session'}
          </button>
        </div>
      </form>
    </div>
  )
}
