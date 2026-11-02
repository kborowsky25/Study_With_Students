// Weekly hours: for each weekday, the time ranges students can book a tutor in.
import { Icon } from '../ui'
import './scheduling.css'

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const STEP = 30
const FIRST = 6 * 60
const LAST = 23 * 60

const pad = (n) => String(n).padStart(2, '0')
const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
const toHHMM = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
const TIMES = Array.from({ length: (LAST - FIRST) / STEP + 1 }, (_, i) => toHHMM(FIRST + i * STEP))

/** Times to offer in a select, keeping a saved value that isn't on the half-hour grid. */
const optionsWith = (times, current) => (times.includes(current) ? times : [...times, current].sort())

/** Monday's hours on every weekday (Tuesday to Friday are replaced). */
export function copyMondayToWeekdays(ranges) {
  const monday = ranges.filter((r) => r.weekday === 0)
  return [
    ...ranges.filter((r) => r.weekday === 0 || r.weekday > 4),
    ...[1, 2, 3, 4].flatMap((weekday) => monday.map(({ start, end }) => ({ weekday, start, end }))),
  ]
}

/** value: [{ weekday: 0–6 (Monday first), start: 'HH:MM', end: 'HH:MM' }] */
export default function AvailabilityEditor({ value, onChange }) {
  const byDay = WEEKDAYS.map((_, day) => value
    .map((range, index) => ({ ...range, index }))
    .filter((range) => range.weekday === day))

  function update(index, patch) {
    onChange(value.map((range, i) => {
      if (i !== index) return range
      const next = { ...range, ...patch }
      // Keep at least half an hour between start and end
      if (toMinutes(next.end) - toMinutes(next.start) < STEP) {
        next.end = toHHMM(Math.min(LAST, toMinutes(next.start) + 60))
      }
      return next
    }))
  }

  function add(day) {
    const ends = byDay[day].map((r) => toMinutes(r.end))
    const start = ends.length ? Math.min(Math.max(...ends) + 60, LAST - 60) : day >= 5 ? 10 * 60 : 17 * 60
    onChange([...value, { weekday: day, start: toHHMM(start), end: toHHMM(Math.min(LAST, start + 120)) }])
  }

  const remove = (index) => onChange(value.filter((_, i) => i !== index))

  return (
    <div>
      {WEEKDAYS.map((dayName, day) => (
        <div className="hours-row" key={dayName}>
          <div className={`hours-day ${byDay[day].length ? '' : 'off'}`}>{dayName}</div>
          <div className="hours-ranges">
            {byDay[day].map((r) => (
              <div className="hours-range" key={r.index}>
                <select className="input" aria-label={`${dayName} from`} value={r.start}
                  onChange={(e) => update(r.index, { start: e.target.value })}>
                  {optionsWith(TIMES.slice(0, -1), r.start).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="dash">–</span>
                <select className="input" aria-label={`${dayName} until`} value={r.end}
                  onChange={(e) => update(r.index, { end: e.target.value })}>
                  {optionsWith(TIMES.filter((t) => toMinutes(t) - toMinutes(r.start) >= STEP), r.end)
                    .map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button type="button" className="icon-btn" aria-label={`Remove ${dayName} ${r.start}–${r.end}`}
                  title="Remove" onClick={() => remove(r.index)}>
                  <Icon name="close" />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!byDay[day].length && <span className="hours-none">Unavailable</span>}
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => add(day)}>
                <Icon name="add" />Add hours
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
