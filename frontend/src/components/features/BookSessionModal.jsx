import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { createEvent } from '../../api/events'
import { getBookingInfo } from '../../api/scheduling'
import { errorMessage } from '../../api/client'
import { invalidate, useQuery } from '../../lib/query'
import { firstName, formatDate, formatMoney } from '../../lib/format'
import { INTRO_MINUTES, REPEAT_WEEKS } from '../../lib/sessions'
import { Avatar, Icon } from '../ui'
import { useConfirm } from '../ui/confirm'
import SlotPicker from './SlotPicker'

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
const localISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

function ConflictList({ conflicts }) {
  return (
    <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'grid', gap: 3 }}>
      {conflicts.map((c) => (
        <li key={c.start_time}>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{formatDate(c.start_time, { weekday: 'short' })}</span> · {c.message}
        </li>
      ))}
    </ul>
  )
}

/**
 * Student books a tutor they're connected to: an open time from the tutor's weekly hours
 * (any time when they haven't set any), once or every week, or the free intro call.
 */
export default function BookSessionModal({ tutor, onClose, onBooked }) {
  const [kind, setKind] = useState('session')
  const [form, setForm] = useState({ title: '', minutes: 60, repeat: 1, notes: '' })
  const [start, setStart] = useState(null)
  const [saving, setSaving] = useState(false)
  const confirm = useConfirm()
  const confirming = useRef(false)
  const { data: info } = useQuery(`booking:${tutor.id_tutor}`, () => getBookingInfo(tutor.id_tutor), { staleTime: 0 })

  const intro = kind === 'intro'
  const minutes = intro ? INTRO_MINUTES : form.minutes
  const rate = Number(tutor.hourly_rate || 20)
  const name = firstName(tutor.name)

  const price = useMemo(() => {
    const amount = Math.round(rate * form.minutes / 60 * 100) / 100
    const fee = Math.round(amount * BOOKING_FEE_PERCENT) / 100
    return { amount, fee, total: amount + fee }
  }, [rate, form.minutes])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !confirming.current) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const repeat = intro ? 1 : form.repeat
  // Invite credits pay the booking fee of the first weeks booked, one each (server/referrals.py)
  const waivedWeeks = intro ? 0 : Math.min(Number(info?.fee_credits) || 0, repeat)

  const book = (skipConflicts = false) => createEvent({
    tutor_id: tutor.id_tutor,
    kind,
    title: form.title.trim() || 'Tutoring session',
    description: form.notes.trim(),
    start_time: localISO(start),
    end_time: localISO(new Date(start.getTime() + minutes * 60_000)),
    repeat_weeks: repeat,
    skip_conflicts: skipConflicts,
  })

  /** Some weeks of a weekly booking clash: offer to book the others. */
  async function bookFreeWeeks(conflicts) {
    confirming.current = true
    const ok = await confirm({
      title: `${conflicts.length} of ${repeat} weeks ${conflicts.length === 1 ? 'isn’t' : 'aren’t'} free`,
      body: <ConflictList conflicts={conflicts} />,
      confirmLabel: `Book the other ${repeat - conflicts.length}`,
      cancelLabel: 'Change time',
    })
    confirming.current = false
    return ok ? book(true) : null
  }

  async function submit(e) {
    e.preventDefault()
    if (!start || start < new Date()) {
      toast.error('Pick a time in the future')
      return
    }
    setSaving(true)
    try {
      let res
      try {
        res = await book()
      } catch (err) {
        const conflicts = err.response?.data?.conflicts
        if (!conflicts || conflicts.length >= repeat) throw err
        res = await bookFreeWeeks(conflicts)
        if (!res) return
      }
      const count = res.data.events?.length ?? 1
      const waived = (res.data.events ?? []).filter((ev) => Number(ev.fee_waived) > 0).length
      const sent = intro ? `Intro call requested from ${name}`
        : count > 1 ? `${count} weekly sessions requested from ${name}` : `Request sent to ${name}`
      toast.success(waived ? `${sent} · booking fee${waived > 1 ? 's' : ''} waived` : sent)
      invalidate('events', 'slots', 'booking', 'referrals')
      onBooked?.(res.data.event)
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not book the session'))
      if (err.response?.status === 409) invalidate('slots')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="book-title"
        onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="dialog-head">
          <Avatar name={tutor.name} src={tutor.avatar_url} size={26} />
          <h2 id="book-title">Book {name} · {formatMoney(rate)}/hr</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="dialog-body">
          {info?.intro_call && (
            <div className="mode-switch" role="tablist" aria-label="What to book">
              <button type="button" role="tab" aria-selected={!intro} className={intro ? '' : 'on'} onClick={() => setKind('session')}>
                Session
              </button>
              <button type="button" role="tab" aria-selected={intro} className={intro ? 'on' : ''} onClick={() => setKind('intro')}>
                Free intro call · 15 min
              </button>
            </div>
          )}

          {!intro && (
            <>
              <label className="field">
                <span>Topic</span>
                <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Integration by parts" maxLength={120} />
              </label>
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
            </>
          )}

          <SlotPicker tutorId={tutor.id_tutor} minutes={minutes} value={start} onChange={setStart} />

          {!intro && (
            <label className="field">
              <span>Repeat</span>
              <select className="input" value={form.repeat} onChange={(e) => setForm((f) => ({ ...f, repeat: Number(e.target.value) }))}>
                {REPEAT_WEEKS.map((n) => (
                  <option key={n} value={n}>{n === 1 ? 'Just this once' : `Every week for ${n} weeks`}</option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            <span>Notes for {name}</span>
            <textarea className="input" value={form.notes} onChange={set('notes')}
              placeholder={intro ? 'What you’d like help with' : 'Exam board, what you’re stuck on…'} />
          </label>
        </div>

        <div className="dialog-foot">
          <div style={{ marginRight: 'auto', minWidth: 0, fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.35 }}>
            {intro ? (
              <>
                <div><b className="free" style={{ fontSize: 14, fontWeight: 600 }}>Free</b></div>
                <div>15-minute video call</div>
              </>
            ) : (
              <>
                <div>
                  <b style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>
                    {formatMoney(waivedWeeks === repeat ? price.amount : price.total, { decimals: 2 })}
                  </b>
                  {repeat > 1 ? ` a week · ${repeat} weeks` : ' total'}
                </div>
                {waivedWeeks === repeat ? (
                  <div>{formatMoney(price.amount, { decimals: 2 })} to {name} · <s>{formatMoney(price.fee, { decimals: 2 })}</s> booking fee waived</div>
                ) : (
                  <div>
                    {formatMoney(price.amount, { decimals: 2 })} to {name} + {formatMoney(price.fee, { decimals: 2 })} booking fee
                    {waivedWeeks > 0 && `, waived for ${waivedWeeks === 1 ? 'week 1' : `weeks 1–${waivedWeeks}`}`}
                  </div>
                )}
              </>
            )}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={saving || !start}>{saving ? 'Sending…' : 'Send request'}</button>
        </div>
      </form>
    </div>
  )
}
