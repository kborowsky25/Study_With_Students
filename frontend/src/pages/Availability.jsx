import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import AvailabilityEditor, { copyMondayToWeekdays } from '../components/features/AvailabilityEditor'
import SlotPicker from '../components/features/SlotPicker'
import { Card, Icon, SkeletonRows } from '../components/ui'
import { addDaysOff, getAvailability, removeDaysOff, saveAvailability } from '../api/scheduling'
import { errorMessage } from '../api/client'
import { formatDate } from '../lib/format'
import { invalidate, useQuery } from '../lib/query'

const NOTICE_LABELS = { 2: '2 hours', 6: '6 hours', 12: '12 hours', 24: '1 day', 48: '2 days' }

const pad = (n) => String(n).padStart(2, '0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const asDate = (day) => new Date(`${day}T00:00:00`)
const sameHours = (a, b) => {
  const key = (list) => list.map((r) => `${r.weekday} ${r.start} ${r.end}`).sort().join(',')
  return key(a) === key(b)
}

function daysOffLabel({ start_date: from, end_date: to }) {
  const first = formatDate(asDate(from), { weekday: 'short' })
  return from === to ? first : `${first} – ${formatDate(asDate(to), { weekday: 'short' })}`
}

/** Tutors set the weekly hours students can book, the notice they need and days off. */
export default function Availability() {
  const { data, error, loading, mutate } = useQuery('availability', getAvailability, { staleTime: 0 })
  const [weekly, setWeekly] = useState(null)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [off, setOff] = useState({ from: '', to: '', note: '' })
  const [adding, setAdding] = useState(false)

  // The editor works on a draft; the saved hours come back merged and sorted
  useEffect(() => {
    if (data && weekly === null) {
      setWeekly(data.weekly)
      setNotice(data.notice_hours)
    }
  }, [data, weekly])

  const dirty = Boolean(data && weekly) && (!sameHours(weekly, data.weekly) || notice !== data.notice_hours)

  async function save() {
    setSaving(true)
    try {
      const { data: saved } = await saveAvailability({ weekly, notice_hours: notice })
      mutate(saved)
      setWeekly(saved.weekly)
      setNotice(saved.notice_hours)
      invalidate('slots', 'booking', 'tutor:profile')
      toast.success('Availability saved')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your availability'))
    } finally {
      setSaving(false)
    }
  }

  function discard() {
    setWeekly(data.weekly)
    setNotice(data.notice_hours)
  }

  async function addOff(e) {
    e.preventDefault()
    setAdding(true)
    try {
      const { data: saved } = await addDaysOff({ start_date: off.from, end_date: off.to || off.from, note: off.note.trim() })
      mutate(saved)
      setOff({ from: '', to: '', note: '' })
      invalidate('slots')
      toast.success('Days off added')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add those days'))
    } finally {
      setAdding(false)
    }
  }

  async function removeOff(block) {
    try {
      const { data: saved } = await removeDaysOff(block.id)
      mutate(saved)
      invalidate('slots')
      toast.success(`${daysOffLabel(block)} ${block.start_date === block.end_date ? 'is' : 'are'} bookable again`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove those days'))
    }
  }

  const hasMonday = weekly?.some((r) => r.weekday === 0)

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="Availability" icon="event_available" />

      <div className="dash-head">
        <h1>Availability</h1>
        <div className="dash-actions">
          {dirty && <button type="button" className="btn btn-ghost" onClick={discard}>Discard</button>}
          <button type="button" className="btn btn-coral" disabled={!dirty || saving} onClick={save}>
            <Icon name="check" />{saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {error ? (
        <Card>
          <div className="empty">{errorMessage(error, 'Could not load your availability')}</div>
        </Card>
      ) : (
        <div className="dash-grid">
          <div className="dash-col">
            <Card title="Weekly hours"
              action={hasMonday && (
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setWeekly(copyMondayToWeekdays(weekly))}>
                  <Icon name="content_copy" />Copy Monday to weekdays
                </button>
              )}>
              {loading || !weekly ? <SkeletonRows rows={7} /> : <AvailabilityEditor value={weekly} onChange={setWeekly} />}
            </Card>
          </div>

          <div className="dash-col">
            <Card title="Booking">
              <div className="row-list">
                <label className="row" htmlFor="notice">
                  <div className="main"><div className="title">Minimum notice</div></div>
                  <select id="notice" className="input" style={{ width: 128 }} value={notice ?? ''} disabled={!data}
                    onChange={(e) => setNotice(Number(e.target.value))}>
                    {(data?.notice_choices ?? []).map((h) => <option key={h} value={h}>{NOTICE_LABELS[h] ?? `${h} hours`}</option>)}
                  </select>
                </label>
                <div className="row">
                  <div className="main">
                    <div className="title">On your profile</div>
                    <div className="meta">{data?.summary || 'No weekly hours yet'}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Days off" count={data?.blocked.length || null}>
              {data?.blocked.length > 0 && (
                <div className="row-list">
                  {data.blocked.map((block) => (
                    <div className="row" key={block.id}>
                      <div className="main">
                        <div className="title">{daysOffLabel(block)}</div>
                        {block.note && <div className="meta">{block.note}</div>}
                      </div>
                      <button type="button" className="icon-btn" title="Remove" aria-label={`Remove ${daysOffLabel(block)}`}
                        onClick={() => removeOff(block)}>
                        <Icon name="close" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form className="card-pad" onSubmit={addOff}
                style={{ display: 'grid', gap: 10, borderTop: data?.blocked.length ? '1px solid var(--border)' : 0 }}>
                <div className="field-row">
                  <label className="field">
                    <span>From</span>
                    <input className="input" type="date" required min={today()} value={off.from}
                      onChange={(e) => setOff((o) => ({ ...o, from: e.target.value, to: o.to && o.to < e.target.value ? '' : o.to }))} />
                  </label>
                  <label className="field">
                    <span>Until</span>
                    <input className="input" type="date" min={off.from || today()} value={off.to}
                      onChange={(e) => setOff((o) => ({ ...o, to: e.target.value }))} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="Note (optional)" maxLength={120} value={off.note}
                    onChange={(e) => setOff((o) => ({ ...o, note: e.target.value }))} />
                  <button type="submit" className="btn btn-ghost" disabled={!off.from || adding}><Icon name="add" />Add</button>
                </div>
              </form>
            </Card>

            {data?.weekly.length > 0 && (
              <Card title="What students can book">
                <div className="card-pad">
                  <SlotPicker tutorId={data.tutor_id} minutes={60} readOnly label="1-hour sessions" />
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </HubLayout>
  )
}
