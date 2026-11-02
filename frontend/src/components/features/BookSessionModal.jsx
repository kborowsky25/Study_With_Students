import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createEvent } from '../../api/events'
import { errorMessage } from '../../api/client'
import { invalidate } from '../../lib/query'
import { firstName, formatMoney } from '../../lib/format'
import { Avatar, Icon } from '../ui'

// Families pay the tutor's price plus this fee; tutors keep 100% of their price.
export const BOOKING_FEE_PERCENT = 5

const DURATIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 90, label: '1 h 30' },
  { minutes: 120, label: '2 h' },
]

const pad = (n) => String(n).padStart(2, '0')
const dateOnly = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const localISO = (d) => `${dateOnly(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

/** Student books a 1-to-1 session with a tutor they're connected to. */
export default function BookSessionModal({ tutor, onClose, onBooked }) {
  const [form, setForm] = useState(() => ({
    title: '', date: dateOnly(new Date(Date.now() + 86_400_000)), time: '17:00', minutes: 60, notes: '',
  }))
  const [saving, setSaving] = useState(false)
  const rate = Number(tutor.hourly_rate || 20)

  const price = useMemo(() => {
    const amount = Math.round(rate * form.minutes / 60 * 100) / 100
    const fee = Math.round(amount * BOOKING_FEE_PERCENT) / 100
    return { amount, fee, total: amount + fee }
  }, [rate, form.minutes])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const start = new Date(`${form.date}T${form.time}`)
    if (Number.isNaN(start.getTime()) || start < new Date()) {
      toast.error('Pick a time in the future')
      return
    }
    const end = new Date(start.getTime() + form.minutes * 60_000)
    setSaving(true)
    try {
      const { data } = await createEvent({
        tutor_id: tutor.id_tutor,
        title: form.title.trim() || 'Tutoring session',
        description: form.notes.trim(),
        start_time: localISO(start),
        end_time: localISO(end),
      })
      toast.success(`Request sent to ${firstName(tutor.name)}`)
      invalidate('events')
      onBooked?.(data.event)
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not book the session'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="dialog-head">
          <Avatar name={tutor.name} src={tutor.avatar_url} size={26} />
          <h2>Book {firstName(tutor.name)} · {formatMoney(rate)}/hr</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="dialog-body">
          <label className="field">
            <span>Topic</span>
            <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Integration by parts" maxLength={120} autoFocus />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Date</span>
              <input className="input" type="date" value={form.date} min={dateOnly(new Date())} onChange={set('date')} required />
            </label>
            <label className="field">
              <span>Start</span>
              <input className="input" type="time" value={form.time} step={900} onChange={set('time')} required />
            </label>
          </div>
          <div className="field">
            <span>Length</span>
            <div className="mode-switch">
              {DURATIONS.map((d) => (
                <button type="button" key={d.minutes} className={form.minutes === d.minutes ? 'on' : ''}
                  onClick={() => setForm((f) => ({ ...f, minutes: d.minutes }))}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Notes for {firstName(tutor.name)}</span>
            <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="Exam board, what you're stuck on…" />
          </label>
        </div>

        <div className="dialog-foot">
          <div style={{ marginRight: 'auto', fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.35 }}>
            <div><b style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{formatMoney(price.total, { decimals: 2 })}</b> total</div>
            <div>{formatMoney(price.amount, { decimals: 2 })} to {firstName(tutor.name)} + {formatMoney(price.fee, { decimals: 2 })} booking fee</div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={saving}>{saving ? 'Sending…' : 'Send request'}</button>
        </div>
      </form>
    </div>
  )
}
