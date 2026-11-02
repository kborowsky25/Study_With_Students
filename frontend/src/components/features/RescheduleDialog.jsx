import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { errorMessage } from '../../api/client'
import { proposeTime } from '../../api/scheduling'
import { firstName, formatTime, formatWhen } from '../../lib/format'
import { invalidate } from '../../lib/query'
import { sessionMinutes } from '../../lib/sessions'
import { Icon } from '../ui'
import SlotPicker from './SlotPicker'

const pad = (n) => String(n).padStart(2, '0')
const localISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

/**
 * Propose a new time for a session; it moves once the other side accepts. A student's own
 * request moves straight away, since the tutor hasn't agreed to a time yet.
 */
export default function RescheduleDialog({ event: ev, onClose, onDone }) {
  // Starts on the current time (highlighted among the open times), which can't be sent unchanged
  const [start, setStart] = useState(() => new Date(ev.start_time))
  const [saving, setSaving] = useState(false)
  const unchanged = start?.getTime() === new Date(ev.start_time).getTime()
  const asTutor = ev.role === 'tutor'
  const moveNow = !asTutor && ev.status === 'pending'
  const other = firstName(asTutor ? ev.student_name : ev.tutor_name)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    if (!start || start < new Date()) {
      toast.error('Pick a time in the future')
      return
    }
    setSaving(true)
    try {
      await proposeTime(ev.id_event, localISO(start))
      toast.success(moveNow ? 'Request moved' : `New time sent to ${other}`)
      invalidate('events', 'slots')
      await onDone?.()
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not change the time'))
      if (err.response?.status === 409) invalidate('slots')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="reschedule-title"
        onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="dialog-head">
          <h2 id="reschedule-title">{moveNow ? 'Change the time' : `Propose a new time to ${other}`}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="dialog-body">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {ev.title || 'Tutoring session'} · now {formatWhen(ev.start_time)}–{formatTime(ev.end_time)}
          </div>
          <SlotPicker tutorId={ev.tutor_id} minutes={sessionMinutes(ev)} event={ev.id_event}
            value={start} onChange={setStart} allowCustom={asTutor} label="New time" />
        </div>

        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={saving || !start || unchanged}>
            {saving ? 'Sending…' : moveNow ? 'Move request' : 'Send new time'}
          </button>
        </div>
      </form>
    </div>
  )
}
