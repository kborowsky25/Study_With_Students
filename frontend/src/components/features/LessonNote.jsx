// Pieces of a lesson note, shared by the notes dialog, the timeline and the progress page:
//   ConfidenceMeter  a 1–5 rating as five small segments
//   Trend            up or down against the topic's previous rating
//   HomeworkItem     one task; the student ticks it off, everyone else sees its state
//   LessonNoteBody   topics with confidence, summary, homework and next steps
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { setHomeworkDone } from '../../api/progress'
import { errorMessage } from '../../api/client'
import { formatDay } from '../../lib/format'
import { CONFIDENCE, isOverdue, refreshProgress } from '../../lib/progress'
import { Icon } from '../ui'
import './progress.css'

export function ConfidenceMeter({ value }) {
  const label = value ? `${CONFIDENCE[value]}, ${value} of 5` : 'Not covered yet'
  return (
    <span className="conf" role="img" aria-label={label} title={label}>
      {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= (value || 0) ? 'on' : undefined} />)}
    </span>
  )
}

/** `from` adds the previous rating as text ("from Shaky"); otherwise it's only in the tooltip. */
export function Trend({ value, previous, from = false }) {
  if (!value || !previous || value === previous) return null
  const up = value > previous
  const label = `${up ? 'Up' : 'Down'} from ${CONFIDENCE[previous]}`
  return (
    <span className={`trend ${up ? 'up' : 'down'}`} title={label}>
      <Icon name={up ? 'arrow_upward' : 'arrow_downward'} />
      {from ? `from ${CONFIDENCE[previous]}` : <span style={srOnly}>{label}</span>}
    </span>
  )
}

const srOnly = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }

/** "Due tomorrow", "Due Thursday", "Due Fri 13 Nov". */
export function dueLabel(dueDate) {
  const day = formatDay(new Date(`${dueDate}T00:00:00`))
  return `Due ${['Today', 'Tomorrow', 'Yesterday'].includes(day) ? day.toLowerCase() : day}`
}

export function HomeworkItem({ item, canTick, context }) {
  const [done, setDone] = useState(Boolean(item.done_at))
  const [busy, setBusy] = useState(false)
  useEffect(() => { setDone(Boolean(item.done_at)) }, [item.done_at])

  async function toggle() {
    const next = !done
    setDone(next)
    setBusy(true)
    try {
      await setHomeworkDone(item.id, next)
      refreshProgress()
    } catch (err) {
      setDone(!next)
      toast.error(errorMessage(err, 'Could not update the homework'))
    } finally {
      setBusy(false)
    }
  }

  const overdue = !done && isOverdue(item)
  const meta = [item.due_date && !done ? dueLabel(item.due_date) : null, context].filter(Boolean)
  return (
    <div className={`hw ${done ? 'done' : ''}`}>
      {canTick ? (
        <button type="button" role="checkbox" aria-checked={done} aria-label={item.task}
          className={`hw-check ${done ? 'on' : ''}`} disabled={busy} onClick={toggle}>
          {done && <Icon name="check" />}
        </button>
      ) : (
        <span className={`hw-check readonly ${done ? 'on' : ''}`} role="img" aria-label={done ? 'Done' : 'Not done yet'}>
          {done && <Icon name="check" />}
        </span>
      )}
      <div className="hw-main">
        <div className="hw-task">{item.task}</div>
        {meta.length > 0 && (
          <div className="hw-meta">
            {meta.map((m, i) => (
              <span key={m} className={i === 0 && overdue && item.due_date ? 'overdue' : undefined}>{i > 0 && ' · '}{m}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function LessonNoteBody({ note, canTick = false }) {
  return (
    <div className="note-body">
      {note.topics.length > 0 && (
        <section>
          <span className="note-label">Covered</span>
          <div className="note-topics">
            {note.topics.map((t) => (
              <div key={t.key} className="note-topic">
                <span className="name" title={t.name}>{t.name}</span>
                <Trend value={t.confidence} previous={t.previous} from />
                <ConfidenceMeter value={t.confidence} />
                <span className="conf-label">{CONFIDENCE[t.confidence]}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {note.summary && (
        <section>
          <span className="note-label">Summary</span>
          <p className="note-text">{note.summary}</p>
        </section>
      )}
      {note.homework.length > 0 && (
        <section>
          <span className="note-label">Homework</span>
          <div className="hw-list">
            {note.homework.map((h) => <HomeworkItem key={h.id} item={h} canTick={canTick} />)}
          </div>
        </section>
      )}
      {note.next_steps && (
        <section>
          <span className="note-label">Next steps</span>
          <p className="note-text">{note.next_steps}</p>
        </section>
      )}
    </div>
  )
}
