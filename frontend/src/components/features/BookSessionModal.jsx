import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createEvent } from '../../api/events'
import { errorMessage } from '../../api/client'
import { formatMoney } from '../../lib/format'
import { Avatar, Icon } from '../ui'

const DURATIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1 h 30' },
  { minutes: 120, label: '2 hours' },
]

const pad = (n) => String(n).padStart(2, '0')
const localISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

const dateOnly = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = () => dateOnly(new Date())
const tomorrow = () => dateOnly(new Date(Date.now() + 86_400_000))

/** Student books a 1-to-1 session with a tutor they're connected to. */
export default function BookSessionModal({ tutor, onClose, onBooked }) {
  const [form, setForm] = useState({ title: '', date: tomorrow(), time: '17:00', minutes: 60, notes: '' })
  const [saving, setSaving] = useState(false)
  const rate = Number(tutor.hourly_rate || 20)
  const price = useMemo(() => (rate * form.minutes) / 60, [rate, form.minutes])

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
      toast.success(`Request sent to ${tutor.name.split(' ')[0]}`)
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
          <Avatar name={tutor.name} src={tutor.avatar_url} size={40} />
          <div style={{ flex: 1 }}>
            <h2>Book a session with {tutor.name.split(' ')[0]}</h2>
            <p>{formatMoney(rate)}/hour · they'll confirm before you pay</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="dialog-body">
          <label className="field">
            <span>What do you want to cover?</span>
            <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Integration by parts" maxLength={120} autoFocus />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Date</span>
              <input className="input" type="date" value={form.date} min={today()} onChange={set('date')} required />
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
            <span>Notes for your tutor <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>(optional)</span></span>
            <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="Exam board, topics you're stuck on, links…" />
          </label>

          <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="verified" style={{ color: 'var(--green)' }} />
            <div style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
              You pay <strong style={{ color: 'var(--text)' }}>{tutor.name.split(' ')[0]}</strong> directly. We take 0% commission.
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{formatMoney(price)}</div>
          </div>
        </div>

        <div className="dialog-foot">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={saving}>
            <Icon name="send" />{saving ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </form>
    </div>
  )
}
