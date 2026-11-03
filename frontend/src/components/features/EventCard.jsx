// Session pieces shared by the tutoring pages:
//   EventCard              one session, with the actions each side may take (only the tutor
//                          confirms; either side cancels or proposes a new time; the student
//                          pays the tutor directly)
//   CompactSession         a session as a clickable row without actions
//   MonthGrid              the month view used by both calendars
//   ScheduleSessionDialog  a tutor books one of their students (created already confirmed)
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { createEvent, updateStatus } from '../../api/events'
import {
  acceptTime, agreeToCancel, askToCancel, cancelSession, downloadSeriesIcs, downloadSessionIcs,
  dropCancelRequest, dropTime,
} from '../../api/scheduling'
import { getTutorProfile } from '../../api/tutors'
import { errorMessage } from '../../api/client'
import { toDateInput as dayKey, toLocalISO } from '../../lib/dates'
import { firstName, formatDate, formatMoney, formatTime, formatWhen } from '../../lib/format'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { invalidate } from '../../lib/query'
import {
  FREE_CANCEL_HOURS, REPEAT_WEEKS, canAddToCalendar, canJoin, canReschedule, canReview, feeWaived, googleCalendarUrl,
  isLateCancel, isRefunded, isUpcoming, laterWeeks, needsPayment, totalPrice,
} from '../../lib/sessions'
import { Avatar, DateChip, Icon, StatusPill } from '../ui'
import { useConfirm } from '../ui/confirm'
import RescheduleDialog from './RescheduleDialog'
import ReviewDialog from './ReviewDialog'
import './scheduling.css'
import LessonNotesButton from './LessonNotesButton'
import { notesPossible } from '../../lib/progress'

const TONE = {
  pending:   'var(--amber)',
  confirmed: 'var(--blue)',
  paid:      'var(--green)',
  canceled:  'var(--text-faint)',
  expired:   'var(--text-faint)',
}
const tint = (color, pct = 14) => `color-mix(in srgb, ${color} ${pct}%, transparent)`
const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }


/** A request the tutor never answered before it started counts as expired, not pending. */
const visualStatus = (ev) =>
  (ev.status === 'pending' && new Date(ev.start_time) <= new Date() ? 'expired' : ev.status)

function pillProps(ev) {
  const status = visualStatus(ev)
  if (status === 'expired') return { status: 'canceled', label: 'Expired' }
  if (status === 'canceled') return { status, label: isRefunded(ev) ? 'Refunded' : undefined }
  if (ev.cancel_requested_at && status === 'confirmed') return { status: 'pending', label: 'Cancel requested' }
  if (ev.proposed_start) return { status: 'pending', label: 'New time proposed' }
  if (ev.role === 'tutor' && status === 'pending') return { status, label: 'Needs answer' }
  if (ev.role === 'tutor' && status === 'confirmed' && needsPayment(ev)) return { status, label: 'Unpaid' }
  return { status }
}

function durationLabel(ev) {
  const minutes = Math.round((new Date(ev.end_time) - new Date(ev.start_time)) / 60_000)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m}` : `${h} h`
}

/** "Only this session" or "this and the later weeks", for cancelling part of a series. */
function ScopeChoice({ later, onChange }) {
  const [value, setValue] = useState('one')
  const pick = (next) => { setValue(next); onChange(next) }
  return (
    <div className="scope-choice" role="radiogroup" aria-label="Which sessions">
      <label><input type="radio" name="cancel-scope" checked={value === 'one'} onChange={() => pick('one')} />Only this session</label>
      <label>
        <input type="radio" name="cancel-scope" checked={value === 'series'} onChange={() => pick('series')} />
        {later === 1 ? 'This one and next week’s' : `This one and the ${later} weeks after it`}
      </label>
    </div>
  )
}

/** The ⋯ button with a menu of less frequent actions. Choosing an item closes it. */
function SessionMenu({ children }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={wrap} style={{ position: 'relative', display: 'inline-flex', marginLeft: 'auto' }}>
      <button type="button" className="icon-btn" style={{ width: 26, height: 26 }} aria-haspopup="menu" aria-expanded={open}
        aria-label="More actions" title="More actions" onClick={() => setOpen((v) => !v)}>
        <Icon name="more_horiz" />
      </button>
      {open && (
        <div className="menu" role="menu" style={{ top: 'calc(100% + 4px)', right: 0 }} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </span>
  )
}

// ── EventCard ────────────────────────────────────────────────────────────────

/**
 * One session as a row. `variant="time"` shows the start time instead of a date chip
 * (for lists that are already grouped by day).
 */
export default function EventCard({ event: ev, onChanged, variant = 'date', showMessage = true }) {
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [moving, setMoving] = useState(false)
  const confirm = useConfirm()

  const asTutor = ev.role === 'tutor'
  const upcoming = isUpcoming(ev)
  const canceled = ev.status === 'canceled'
  const otherName = (asTutor ? ev.student_name : ev.tutor_name) || 'Unknown'
  const other = firstName(otherName)
  const otherUserId = asTutor ? ev.student_user_id : ev.tutor_user_id
  const weekly = ev.series_size > 1 && ev.series_index
  const proposal = Boolean(ev.proposed_start) && !canceled
  const myProposal = proposal && ev.proposed_by === ev.role
  const cancelAsked = Boolean(ev.cancel_requested_at) && ev.status === 'confirmed'

  const canAnswer = asTutor && ev.status === 'pending' && upcoming && !proposal
  const canPay = !asTutor && needsPayment(ev)
  const canCancel = upcoming && !cancelAsked && (ev.status === 'confirmed' || (ev.status === 'pending' && !asTutor))
  const movable = canReschedule(ev) && !proposal && !cancelAsked
  const calendar = canAddToCalendar(ev)
  const joinable = canJoin(ev)
  const reviewable = canReview(ev)
  const hasMenu = movable || calendar || canCancel
  const hasActions = canAnswer || proposal || cancelAsked || canPay || joinable || reviewable || hasMenu || notesPossible(ev) ||
    (showMessage && otherUserId && !canceled)

  async function run(request, fallback) {
    setBusy(true)
    try {
      const res = await request()
      toast.success(res?.data?.message || fallback)
      invalidate('events', 'slots')
      await onChanged?.()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the session'))
    } finally {
      setBusy(false)
    }
  }

  async function decline() {
    if (weekly) {
      const ok = await confirm({
        title: `Decline all ${ev.series_size} weeks?`,
        body: `${ev.title || 'Tutoring session'} · weekly from ${formatWhen(ev.start_time)}`,
        confirmLabel: 'Decline',
        cancelLabel: 'Keep',
        danger: true,
      })
      if (!ok) return
    }
    run(() => cancelSession(ev.id_event), 'Request declined')
  }

  async function cancel() {
    const what = `${ev.title || 'Tutoring session'} · ${formatWhen(ev.start_time)}`

    // Inside 24 hours a student can only ask: the tutor has to agree
    if (!asTutor && isLateCancel(ev)) {
      const ok = await confirm({
        title: `Ask ${other} to cancel?`,
        body: (
          <>
            <p>{what}</p>
            <p style={{ marginTop: 8 }}>
              Sessions can be cancelled free of charge until {FREE_CANCEL_HOURS} hours before they start.
              This one is sooner, so {other} has to agree. Until then it stays booked.
            </p>
          </>
        ),
        confirmLabel: 'Ask to cancel',
        cancelLabel: 'Keep session',
      })
      if (ok) run(() => askToCancel(ev.id_event), `Asked ${other} to cancel`)
      return
    }

    const withdrawing = ev.status === 'pending'
    const later = laterWeeks(ev)
    const scope = { current: 'one' }
    const ok = await confirm({
      title: withdrawing ? 'Withdraw this request?' : 'Cancel this session?',
      body: (
        <>
          <p>{what}</p>
          {!withdrawing && (
            <p style={{ marginTop: 8 }}>
              {asTutor
                ? 'Cancellations by tutors are counted, so only cancel when you have to.'
                : `Free to cancel until ${FREE_CANCEL_HOURS} hours before it starts.`}
            </p>
          )}
          {later > 0 && <ScopeChoice later={later} onChange={(value) => { scope.current = value }} />}
        </>
      ),
      confirmLabel: withdrawing ? 'Withdraw' : 'Cancel session',
      cancelLabel: 'Keep',
      danger: true,
    })
    if (ok) run(() => cancelSession(ev.id_event, scope.current), withdrawing ? 'Request withdrawn' : 'Session cancelled')
  }

  async function download(save) {
    try {
      await save()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create the calendar file'))
    }
  }

  const when = variant === 'time'
    ? durationLabel(ev)
    : `${formatTime(ev.start_time)}–${formatTime(ev.end_time)}`

  return (
    // Grid so the actions can use the full width under the text, even in narrow side panels.
    <div className="row" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'start', rowGap: 10 }}>
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
          {variant === 'time' ? '' : ` · ${when}`} · {Number(ev.amount) > 0 ? formatMoney(ev.amount) : <span className="free">Free</span>}
          {weekly && ` · Week ${ev.series_index} of ${ev.series_size}`}
        </div>
        {proposal && (
          <div className="session-note">
            <Icon name="schedule" />
            <span>{myProposal ? 'You proposed' : `${other} proposed`} {formatWhen(ev.proposed_start)}–{formatTime(ev.proposed_end)}</span>
          </div>
        )}
        {cancelAsked && (
          <div className="session-note">
            <Icon name="event_busy" />
            <span>{asTutor ? `${other} asked to cancel` : `You asked ${other} to cancel`}</span>
          </div>
        )}
        {ev.description && <div className="meta" title={ev.description}>“{ev.description}”</div>}
      </div>

      <SessionStatus event={ev} />

      {hasActions && (
        <div style={{ gridColumn: '2 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {joinable && (
            <a href={ev.meeting_url} target="_blank" rel="noreferrer" className="btn btn-coral btn-sm"><Icon name="videocam" />Join</a>
          )}
          <LessonNotesButton event={ev} />
          {canAnswer && (
            <>
              <button type="button" className="btn btn-coral btn-sm" disabled={busy}
                onClick={() => run(() => updateStatus(ev.id_event, 'confirmed'), 'Session confirmed')}>
                <Icon name="check" />{weekly ? `Confirm all ${ev.series_size}` : 'Confirm'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={decline}>
                Decline
              </button>
            </>
          )}
          {proposal && !myProposal && (
            <>
              <button type="button" className="btn btn-coral btn-sm" disabled={busy}
                onClick={() => run(() => acceptTime(ev.id_event), 'Session moved')}>
                <Icon name="check" />Accept new time
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                onClick={() => run(() => dropTime(ev.id_event), 'New time declined')}>
                Decline
              </button>
            </>
          )}
          {myProposal && (
            <button type="button" className="btn btn-quiet btn-sm" disabled={busy}
              onClick={() => run(() => dropTime(ev.id_event), 'Proposal withdrawn')}>
              Withdraw new time
            </button>
          )}
          {cancelAsked && asTutor && (
            <>
              <button type="button" className="btn btn-coral btn-sm" disabled={busy}
                onClick={() => run(() => agreeToCancel(ev.id_event), 'Session cancelled')}>
                Agree to cancel
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                onClick={() => run(() => dropCancelRequest(ev.id_event), 'Session kept')}>
                Keep session
              </button>
            </>
          )}
          {cancelAsked && !asTutor && (
            <button type="button" className="btn btn-quiet btn-sm" disabled={busy}
              onClick={() => run(() => dropCancelRequest(ev.id_event), 'Request withdrawn')}>
              Withdraw request
            </button>
          )}
          {canPay && (
            <Link to="/payments" className="btn btn-coral btn-sm"
              title={feeWaived(ev) ? 'Booking fee waived with an invite credit' : undefined}>
              <Icon name="credit_card" />Pay {formatMoney(totalPrice(ev), { decimals: 2 })}
            </Link>
          )}
          {reviewable && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReviewing(true)}><Icon name="star" />Rate</button>
          )}
          {showMessage && otherUserId && !canceled && (
            <Link to="/messages" search={{ user: otherUserId }} className="btn btn-ghost btn-sm"><Icon name="chat" />Message</Link>
          )}
          {hasMenu && (
            <SessionMenu>
              {movable && (
                <button type="button" role="menuitem" className="menu-item" onClick={() => setMoving(true)}>
                  <Icon name="schedule" />{!asTutor && ev.status === 'pending' ? 'Change time' : 'Propose a new time'}
                </button>
              )}
              {calendar && (
                <>
                  <a role="menuitem" className="menu-item" href={googleCalendarUrl(ev)} target="_blank" rel="noreferrer">
                    <Icon name="calendar_add_on" />Add to Google Calendar
                  </a>
                  <button type="button" role="menuitem" className="menu-item" onClick={() => download(() => downloadSessionIcs(ev.id_event))}>
                    <Icon name="download" />Download .ics
                  </button>
                  {weekly && (
                    <button type="button" role="menuitem" className="menu-item" onClick={() => download(() => downloadSeriesIcs(ev.series_id))}>
                      <Icon name="calendar_month" />Download all weeks (.ics)
                    </button>
                  )}
                </>
              )}
              {canCancel && (
                <>
                  {(movable || calendar) && <div className="menu-sep" />}
                  <button type="button" role="menuitem" className="menu-item danger" disabled={busy} onClick={cancel}>
                    <Icon name="event_busy" />{ev.status === 'pending' ? 'Withdraw request' : 'Cancel session'}
                  </button>
                </>
              )}
            </SessionMenu>
          )}
        </div>
      )}
      {reviewing && <ReviewDialog event={ev} onClose={() => setReviewing(false)} onDone={onChanged} />}
      {moving && <RescheduleDialog event={ev} onClose={() => setMoving(false)} onDone={onChanged} />}
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

/** A tutor books a session with one of their students, once or weekly. It's created as confirmed. */
export function ScheduleSessionDialog({ students, studentId, date, onClose, onScheduled }) {
  const titleRef = useAutoFocus()
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000))
  const firstDay = date && dayKey(date) >= dayKey(new Date()) ? dayKey(date) : tomorrow
  const [form, setForm] = useState({
    student: String(studentId ?? students[0]?.id_student ?? ''),
    title: '', date: firstDay, time: '17:00', minutes: 60, repeat: 1, notes: '',
  })
  const [rate, setRate] = useState(null)
  const [saving, setSaving] = useState(false)
  const confirm = useConfirm()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const confirming = useRef(false)

  useEffect(() => {
    getTutorProfile()
      .then(({ data }) => setRate(Number(data.profile?.hourly_rate ?? 20)))
      .catch(() => setRate(20))
    const onKey = (e) => { if (e.key === 'Escape' && !confirming.current) closeRef.current() }
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
    const schedule = (skipConflicts = false) => createEvent({
      student_id: student.id_student,
      title: form.title.trim() || 'Tutoring session',
      description: form.notes.trim(),
      start_time: toLocalISO(start),
      end_time: toLocalISO(end),
      repeat_weeks: form.repeat,
      skip_conflicts: skipConflicts,
    })
    setSaving(true)
    try {
      let res
      try {
        res = await schedule()
      } catch (err) {
        // Some weeks clash: offer to book the others
        const conflicts = err.response?.data?.conflicts
        if (!conflicts || conflicts.length >= form.repeat) throw err
        confirming.current = true
        const ok = await confirm({
          title: `${conflicts.length} of ${form.repeat} weeks ${conflicts.length === 1 ? 'isn’t' : 'aren’t'} free`,
          body: conflicts.map((c) => `${formatDate(c.start_time, { weekday: 'short' })}: ${c.message}`).join(' · '),
          confirmLabel: `Book the other ${form.repeat - conflicts.length}`,
          cancelLabel: 'Change time',
        })
        confirming.current = false
        if (!ok) return
        res = await schedule(true)
      }
      const count = res.data.events?.length ?? 1
      toast.success(count > 1 ? `${count} weekly sessions booked with ${name}` : `Session booked with ${name}`)
      invalidate('events', 'slots')
      onScheduled?.(res.data.event)
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
            <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Past paper walkthrough" maxLength={120} ref={titleRef} />
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
            <span>Repeat</span>
            <select className="input" value={form.repeat} onChange={(e) => setForm((f) => ({ ...f, repeat: Number(e.target.value) }))}>
              {REPEAT_WEEKS.map((n) => (
                <option key={n} value={n}>{n === 1 ? 'Just this once' : `Every week for ${n} weeks`}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="What to prepare, links, topics" />
          </label>
        </div>

        <div className="dialog-foot" style={{ alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)' }}>
            {price == null ? '' : (
              <><strong style={{ fontWeight: 600, color: 'var(--text)' }}>{formatMoney(price)}</strong>
                {form.repeat > 1 ? ` a week · ${form.repeat} weeks` : ` at ${formatMoney(rate)}/hr`}</>
            )}
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
