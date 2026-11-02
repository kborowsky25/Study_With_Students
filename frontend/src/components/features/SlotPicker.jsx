// A tutor's open start times as a strip of days and that day's times: one tap picks a time.
// Falls back to a free date + time entry when the tutor hasn't set weekly hours.
import { useEffect, useMemo, useState } from 'react'
import { getSlots } from '../../api/scheduling'
import { formatTime } from '../../lib/format'
import { useQuery } from '../../lib/query'
import './scheduling.css'

const SLOT_LENGTHS = [15, 30, 45, 60, 90, 120]
const MAX_WEEKS = 12

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const timeKey = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Date + start time inputs. Reports a Date (or null while incomplete). */
export function DateTimeFields({ value, onChange }) {
  const [date, setDate] = useState(() => dayKey(value ?? new Date(Date.now() + 86_400_000)))
  const [time, setTime] = useState(() => (value ? timeKey(value) : '17:00'))

  useEffect(() => {
    const d = new Date(`${date}T${time}`)
    onChange(Number.isNaN(d.getTime()) ? null : d)
  // Report when the fields change; parents pass inline callbacks, which would loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time])

  return (
    <div className="field-row">
      <label className="field">
        <span>Date</span>
        <input className="input" type="date" value={date} min={dayKey(new Date())} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label className="field">
        <span>Start</span>
        <input className="input" type="time" value={time} step={900} onChange={(e) => setTime(e.target.value)} required />
      </label>
    </div>
  )
}

/**
 * value / onChange: the chosen start (Date or null).
 * event: id of a session being moved (its current time doesn't count as taken).
 * student: a tutor scheduling one of their students (that student's sessions count as taken).
 * allowCustom: also offer any other time (tutors aren't bound to their own weekly hours).
 * readOnly: show the times without picking one (the tutor's preview).
 */
export default function SlotPicker({
  tutorId, minutes, event, student, value, onChange, allowCustom = false, readOnly = false, label = 'When',
}) {
  const [weeks, setWeeks] = useState(3)
  const [custom, setCustom] = useState(false)
  const [day, setDay] = useState(null)
  const supported = SLOT_LENGTHS.includes(minutes)

  const { data, error, loading } = useQuery(
    `slots:${tutorId}:${minutes}:${weeks}:${event ?? ''}:${student ?? ''}`,
    () => getSlots(tutorId, { minutes, weeks, event, student }),
    { enabled: supported, staleTime: 30_000 },
  )

  const days = useMemo(() => {
    const byDay = new Map()
    for (const slot of data?.slots ?? []) {
      const d = new Date(slot)
      const key = dayKey(d)
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key).push(d)
    }
    return [...byDay].map(([key, times]) => ({ key, date: times[0], times }))
  }, [data])

  // A start that isn't open any more (another length, a slot just taken) is dropped
  useEffect(() => {
    if (readOnly || custom || !data?.has_availability || !value) return
    if (!data.slots.some((slot) => new Date(slot).getTime() === value.getTime())) onChange(null)
  // Only when new slots arrive, not on every pick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const freeEntry = custom || !supported || Boolean(error) || data?.has_availability === false
  if (freeEntry && !readOnly) {
    return (
      <>
        <DateTimeFields value={value} onChange={onChange} />
        {custom && (
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { setCustom(false); onChange(null) }}>
            Choose from open times
          </button>
        )}
      </>
    )
  }

  const activeKey = days.some((d) => d.key === day) ? day
    : value && days.some((d) => d.key === dayKey(value)) ? dayKey(value)
      : days[0]?.key
  const active = days.find((d) => d.key === activeKey)

  function pickDay(key) {
    setDay(key)
    if (value && dayKey(value) !== key) onChange(null)
  }

  return (
    <div className="field">
      <span>{label}</span>
      {loading ? (
        <div className="skeleton" style={{ height: 88 }} aria-busy="true" />
      ) : data?.has_availability === false ? (
        <div className="slot-note">No weekly hours set yet.</div>
      ) : days.length ? (
        <div className="slot-picker">
          <div className="slot-days" role="tablist" aria-label="Day">
            {days.map((d) => (
              <button key={d.key} type="button" role="tab" aria-selected={d.key === activeKey}
                aria-label={d.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                className={`slot-day ${d.key === activeKey ? 'on' : ''}`} onClick={() => pickDay(d.key)}>
                <small>{d.date.toLocaleDateString('en-GB', { weekday: 'short' })}</small>
                <b>{d.date.getDate()} {d.date.toLocaleDateString('en-GB', { month: 'short' })}</b>
              </button>
            ))}
            {weeks < MAX_WEEKS && (
              <button type="button" className="slot-day more" onClick={() => setWeeks((w) => Math.min(MAX_WEEKS, w + 3))}>
                More
              </button>
            )}
          </div>
          <div className="slot-times" role={readOnly ? undefined : 'radiogroup'}
            aria-label={active?.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}>
            {active?.times.map((t) => {
              if (readOnly) return <span key={t.getTime()} className="slot-time">{formatTime(t)}</span>
              const on = value?.getTime() === t.getTime()
              return (
                <button key={t.getTime()} type="button" role="radio" aria-checked={on}
                  className={`slot-time ${on ? 'on' : ''}`} onClick={() => onChange(t)}>
                  {formatTime(t)}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="slot-note">
          No open times in the next {weeks} weeks.
          {weeks < MAX_WEEKS && (
            <button type="button" className="link-btn" onClick={() => setWeeks((w) => Math.min(MAX_WEEKS, w + 3))}>
              Look further ahead
            </button>
          )}
        </div>
      )}
      {allowCustom && !readOnly && (
        <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { setCustom(true); onChange(null) }}>
          Another time
        </button>
      )}
    </div>
  )
}
