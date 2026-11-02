import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { saveLearningProfile } from '../../api/learning'
import { errorMessage } from '../../api/client'
import { invalidate, setQueryData } from '../../lib/query'
import { Icon } from '../ui'

const SUBJECTS = ['Maths', 'Further Maths', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'English', 'History', 'French', 'Spanish', 'Psychology']
const LEVELS = ['GCSE', 'A-level', 'IB', 'University', 'Other']
const DAYS = [['weekday', 'Weekdays'], ['weekend', 'Weekends']]
const TIMES = [['morning', 'Mornings'], ['afternoon', 'Afternoons'], ['evening', 'Evenings']]

const splitList = (text) => (text || '').split(/[,/;&]/).map((s) => s.trim()).filter(Boolean)

function parseSlots(text) {
  const t = (text || '').toLowerCase()
  const slots = new Set()
  for (const [d] of DAYS) for (const [p] of TIMES) {
    if (t.includes(`${d} ${p}`) || t.includes(`${d}s ${p}`)) slots.add(`${d}:${p}`)
  }
  return slots
}

function slotsToText(slots) {
  return DAYS.flatMap(([d, dl]) => TIMES.filter(([p]) => slots.has(`${d}:${p}`)).map(([, pl]) => `${dl.slice(0, -1)} ${pl.toLowerCase()}`))
    .join(', ')
}

/** What the student needs — drives tutor recommendations. */
export default function LearningProfileDialog({ profile, onClose }) {
  const [subjects, setSubjects] = useState(() => splitList(profile?.subjects))
  const [custom, setCustom] = useState('')
  const [level, setLevel] = useState(profile?.level ?? '')
  const [budget, setBudget] = useState(profile?.budget ?? '')
  const [slots, setSlots] = useState(() => parseSlots(profile?.availability))
  const [goals, setGoals] = useState(profile?.goals ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggleSubject = (name) =>
    setSubjects((list) => (list.includes(name) ? list.filter((s) => s !== name) : [...list, name]))
  const toggleSlot = (key) =>
    setSlots((set) => { const next = new Set(set); next.has(key) ? next.delete(key) : next.add(key); return next })

  function addCustom(e) {
    e.preventDefault()
    const name = custom.trim()
    if (name && !subjects.includes(name)) setSubjects((list) => [...list, name])
    setCustom('')
  }

  async function save(e) {
    e.preventDefault()
    if (!subjects.length) { toast.error('Pick at least one subject'); return }
    setSaving(true)
    try {
      const { data } = await saveLearningProfile({
        subjects: subjects.join(', '),
        level: level || null,
        budget: budget === '' ? null : Number(budget),
        availability: slotsToText(slots) || null,
        goals: goals.trim() || null,
      })
      setQueryData('learning:profile', data)
      invalidate('tutors')
      toast.success('Preferences saved')
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your preferences'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog" style={{ maxWidth: 540 }} onMouseDown={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="dialog-head">
          <h2>What do you need help with?</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="dialog-body">
          <div className="field">
            <span>Subjects</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[...new Set([...SUBJECTS, ...subjects])].map((name) => (
                <button type="button" key={name} onClick={() => toggleSubject(name)}
                  className={`btn btn-sm ${subjects.includes(name) ? 'btn-coral' : 'btn-ghost'}`}>
                  {name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Another subject"
                onKeyDown={(e) => { if (e.key === 'Enter') addCustom(e) }} />
              <button type="button" className="btn btn-ghost" onClick={addCustom} disabled={!custom.trim()}>Add</button>
            </div>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Level</span>
              <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Choose…</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Budget (£ per hour)</span>
              <input className="input" type="number" min={5} max={200} step={1} value={budget}
                onChange={(e) => setBudget(e.target.value)} placeholder="Any" />
            </label>
          </div>

          <div className="field">
            <span>Usually free</span>
            <div className="choice-grid">
              <span />
              {TIMES.map(([, label]) => <span key={label} style={{ textAlign: 'center' }}>{label}</span>)}
              {DAYS.map(([d, dl]) => (
                <Row key={d} label={dl}>
                  {TIMES.map(([p]) => (
                    <button type="button" key={p} className={slots.has(`${d}:${p}`) ? 'on' : ''}
                      aria-pressed={slots.has(`${d}:${p}`)} aria-label={`${dl} ${p}`} onClick={() => toggleSlot(`${d}:${p}`)}>
                      {slots.has(`${d}:${p}`) ? <Icon name="check" size={15} /> : ''}
                    </button>
                  ))}
                </Row>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Goal</span>
            <input className="input" value={goals} onChange={(e) => setGoals(e.target.value)} maxLength={200} placeholder="e.g. An A in A-level Maths" />
          </label>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}

const Row = ({ label, children }) => <><span>{label}</span>{children}</>
