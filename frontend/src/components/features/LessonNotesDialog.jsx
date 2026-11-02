// Lesson notes for one session.
//   The tutor writes them once the session has started (confirmed or paid) and can edit them
//   for 7 days: the subject, topics covered with a 1–5 confidence rating each, a summary,
//   homework and next steps. The student — and the tutor once the week is up — reads them,
//   and the student ticks off homework.
//
//   <LessonNotesDialog eventId={ev.id_event} onClose={…} onSaved={(note) => …} />
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { createLessonNote, updateLessonNote } from '../../api/progress'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { focusOnMount } from '../../hooks/useAutoFocus'
import { formatDate, formatWhen } from '../../lib/format'
import { useQuery } from '../../lib/query'
import { CONFIDENCE, NQ, refreshProgress } from '../../lib/progress'
import { Icon, SkeletonRows } from '../ui'
import { useConfirm } from '../ui/confirm'
import { LessonNoteBody } from './LessonNote'
import './progress.css'

const OTHER = 'other'
const MAX_HOMEWORK = 10
const LEVELS = ['GCSE', 'A-level']

let nextRow = 0
const blankTask = () => ({ key: `new-${nextRow++}`, id: null, task: '', due_date: '', done_at: null })

function initialForm({ note, editor }) {
  if (!note) return { subject: editor?.subject ?? '', ratings: {}, summary: '', homework: [blankTask()], next_steps: '' }
  return {
    subject: note.subject ?? OTHER,
    ratings: Object.fromEntries(note.topics.map((t) => [t.key, t.confidence])),
    summary: note.summary ?? '',
    homework: note.homework.map((h) => ({ key: `hw-${h.id}`, id: h.id, task: h.task, due_date: h.due_date ?? '', done_at: h.done_at })),
    next_steps: note.next_steps ?? '',
  }
}

function toPayload(form) {
  return {
    subject: form.subject && form.subject !== OTHER ? form.subject : null,
    topics: Object.entries(form.ratings).map(([key, confidence]) => ({ key, confidence })),
    summary: form.summary.trim(),
    homework: form.homework
      .filter((h) => h.task.trim())
      .map((h) => ({ id: h.id, task: h.task.trim(), due_date: h.due_date || null })),
    next_steps: form.next_steps.trim(),
  }
}

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (value) => {
  const d = new Date(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function LessonNotesDialog({ eventId, onClose, onSaved }) {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [noteKey, fetchNote] = NQ.note(eventId)
  const { data, error } = useQuery(noteKey, fetchNote, { staleTime: 0 })
  const { data: catalogue } = useQuery(NQ.topics[0], NQ.topics[1], { staleTime: Infinity })

  const [form, setForm] = useState(null)
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const initial = useRef('')
  const asking = useRef(false)   // a confirmation is open: ignore our own shortcuts
  const focusRow = useRef(null)

  const session = data?.session
  const note = data?.note ?? null
  const isTutor = Boolean(session && session.tutor_user_id === user?.id)
  const editing = Boolean(data && isTutor && (note ? note.can_edit : data.can_write))
  const dirty = Boolean(form) && JSON.stringify(toPayload(form)) !== initial.current

  useEffect(() => {
    if (!editing || form) return
    const start = initialForm(data)
    initial.current = JSON.stringify(toPayload(start))
    setForm(start)
  }, [editing, data, form])

  const ask = useCallback(async (options) => {
    asking.current = true
    try { return await confirm(options) } finally { asking.current = false }
  }, [confirm])

  const requestClose = useCallback(async () => {
    if (dirty && !(await ask({ title: 'Discard your notes?', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) return
    onClose()
  }, [dirty, ask, onClose])

  const save = useCallback(async () => {
    if (!form || saving) return
    const payload = toPayload(form)
    if (!payload.topics.length && !payload.summary && !payload.homework.length && !payload.next_steps) {
      toast.error('Add what you covered first')
      return
    }
    setSaving(true)
    try {
      const { data: res } = note ? await updateLessonNote(eventId, payload) : await createLessonNote(eventId, payload)
      toast.success(note ? 'Notes updated' : 'Notes saved')
      refreshProgress()
      onSaved?.(res.note)
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the notes'))
      setSaving(false)
    }
  }, [form, saving, note, eventId, onSaved, onClose])

  useEffect(() => {
    const onKey = (e) => {
      if (asking.current) return
      if (e.key === 'Escape') { e.preventDefault(); requestClose() }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && editing) { e.preventDefault(); save() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose, save, editing])

  async function changeSubject(subject) {
    if (Object.keys(form.ratings).length && !(await ask({ title: 'Change the subject?', body: 'The topics you rated will be cleared.', confirmLabel: 'Change subject' }))) return
    setForm((f) => ({ ...f, subject, ratings: {} }))
    setFilter('')
  }

  const setRating = (topic, value) => setForm((f) => {
    const ratings = { ...f.ratings }
    if (value) ratings[topic] = value
    else delete ratings[topic]
    return { ...f, ratings }
  })

  function onRateKey(e, topic, value) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = Math.min(5, Math.max(1, (value || 0) + step))
    setRating(topic, next)
    e.currentTarget.parentElement.children[next - 1]?.focus()
  }

  const setTask = (key, patch) => setForm((f) => ({ ...f, homework: f.homework.map((h) => (h.key === key ? { ...h, ...patch } : h)) }))
  const removeTask = (key) => setForm((f) => ({ ...f, homework: f.homework.filter((h) => h.key !== key) }))
  function addTask() {
    if (form.homework.length >= MAX_HOMEWORK) return
    const row = blankTask()
    focusRow.current = row.key
    setForm((f) => ({ ...f, homework: [...f.homework, row] }))
  }

  const who = session && (isTutor ? session.student_name : `with ${session.tutor_name}`)
  const head = (
    <div className="dialog-head">
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 id="notes-title">{session ? session.title || 'Tutoring session' : 'Lesson notes'}</h2>
        {session && (
          <div className="sub">
            {[formatWhen(session.start_time), who, note?.subject_name].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      <button type="button" className="icon-btn" onClick={requestClose} aria-label="Close"><Icon name="close" /></button>
    </div>
  )

  let content
  if (error) {
    content = (
      <>
        {head}
        <div className="dialog-body"><div className="empty" style={{ padding: 0 }}>{errorMessage(error, 'Could not load the notes')}</div></div>
      </>
    )
  } else if (!data || (editing && (!form || !catalogue))) {
    content = <>{head}<div className="dialog-body"><SkeletonRows rows={4} /></div></>
  } else if (!editing) {
    const progressLink = isTutor ? { student: session.student_user_id } : {}
    content = (
      <>
        {head}
        <div className="dialog-body">
          {note
            ? <LessonNoteBody note={note} canTick={session.student_user_id === user?.id} />
            : <div className="empty" style={{ padding: 0 }}>No notes for this session yet.</div>}
        </div>
        <div className="dialog-foot">
          <Link to="/progress" search={progressLink} className="btn btn-quiet" style={{ marginRight: 'auto' }}>
            <Icon name="insights" />Progress
          </Link>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </>
    )
  } else {
    const spec = catalogue.subjects.find((s) => s.key === form.subject)
    const previous = data.editor?.previous?.[form.subject] ?? {}
    const query = filter.trim().toLowerCase()
    const topics = (spec?.topics ?? []).filter((t) => !query || t.name.toLowerCase().includes(query))
    const rated = Object.keys(form.ratings).length

    content = (
      <form onSubmit={(e) => { e.preventDefault(); save() }}>
        {head}
        <div className="dialog-body">
          <label className="field">
            <span>Subject</span>
            <select className="input" value={form.subject} onChange={(e) => changeSubject(e.target.value)} ref={form.subject ? undefined : focusOnMount}>
              {!form.subject && <option value="" disabled>Choose a subject</option>}
              {LEVELS.map((level) => (
                <optgroup key={level} label={level}>
                  {catalogue.subjects.filter((s) => s.level === level).map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
                </optgroup>
              ))}
              <option value={OTHER}>Another subject</option>
            </select>
          </label>

          {spec && (
            <div className="field">
              <div className="field-head">
                <span id="topics-label">Topics covered</span>
                {rated > 0 && <span className="count">{rated} rated</span>}
                <input className="input" value={filter} onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter topics" aria-label="Filter topics" />
              </div>
              <div className="topic-pick" role="list" aria-labelledby="topics-label">
                {topics.map((t) => {
                  const value = form.ratings[t.key]
                  return (
                    <div key={t.key} className={`topic-pick-row ${value ? 'on' : ''}`} role="listitem">
                      <span className="name">
                        {t.name}
                        {previous[t.key] && <span className="was">Last rated {CONFIDENCE[previous[t.key]]}</span>}
                      </span>
                      <div className="rate" role="radiogroup" aria-label={`Confidence in ${t.name}`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" role="radio" aria-checked={value === n}
                            title={CONFIDENCE[n]} aria-label={`${n}, ${CONFIDENCE[n]}`}
                            tabIndex={(value || 1) === n ? 0 : -1}
                            className={value === n ? 'on' : value > n ? 'fill' : undefined}
                            onClick={() => setRating(t.key, value === n ? 0 : n)}
                            onKeyDown={(e) => onRateKey(e, t.key, value)}>
                            {n}
                          </button>
                        ))}
                      </div>
                      <span className="rate-label">{value ? CONFIDENCE[value] : ''}</span>
                    </div>
                  )
                })}
                {!topics.length && <div className="topic-pick-empty">No topics match “{filter}”.</div>}
              </div>
            </div>
          )}

          <label className="field">
            <span>Summary</span>
            <textarea className="input" rows={3} maxLength={4000} value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="What you worked on and how it went" />
          </label>

          <div className="field">
            <span>Homework</span>
            {form.homework.map((h) => (
              <div key={h.key} className="hw-edit">
                {h.done_at && <span title="Ticked off"><Icon name="task_alt" className="ticked" /></span>}
                <input className="input task" value={h.task} maxLength={300} aria-label="Homework task"
                  placeholder="e.g. Exercise 4B, questions 1–10"
                  ref={(el) => { if (el && focusRow.current === h.key) { el.focus(); focusRow.current = null } }}
                  onChange={(e) => setTask(h.key, { task: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); addTask() } }} />
                <input className="input" type="date" value={h.due_date} min={dayKey(session.start_time)} aria-label="Due date"
                  onChange={(e) => setTask(h.key, { due_date: e.target.value })} />
                <button type="button" className="icon-btn" onClick={() => removeTask(h.key)} aria-label="Remove task" title="Remove">
                  <Icon name="close" />
                </button>
              </div>
            ))}
            <div>
              <button type="button" className="btn btn-quiet btn-sm" onClick={addTask} disabled={form.homework.length >= MAX_HOMEWORK}>
                <Icon name="add" />Add homework
              </button>
            </div>
          </div>

          <label className="field">
            <span>Next steps</span>
            <textarea className="input" rows={2} maxLength={2000} value={form.next_steps}
              onChange={(e) => setForm((f) => ({ ...f, next_steps: e.target.value }))}
              placeholder="What to cover next time" />
          </label>
        </div>

        <div className="dialog-foot">
          {note && (
            <span style={{ marginRight: 'auto', fontSize: 12.5, color: 'var(--text-faint)' }}>
              Editable until {formatDate(note.editable_until, { weekday: 'short' })}
            </span>
          )}
          <button type="button" className="btn btn-quiet" onClick={requestClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={saving}>
            {saving ? 'Saving…' : note ? 'Save changes' : 'Save notes'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="overlay center" onMouseDown={requestClose}>
      <div className="dialog notes-dialog" role="dialog" aria-modal="true" aria-labelledby="notes-title"
        onMouseDown={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  )
}
