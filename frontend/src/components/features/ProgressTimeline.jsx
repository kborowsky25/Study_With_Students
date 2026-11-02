// Lesson notes, newest first — the record of what each session covered.
// Used by the progress page; written to be reused as-is by the parent view.
//
//   <ProgressTimeline notes={notes} canTick showTutor onEdit={(note) => …} />
//
//   notes      from GET /students/:userId/lesson-notes
//   canTick    the viewer is the student, so homework can be ticked off
//   showTutor  name the tutor on each note (students and parents see several tutors)
//   onEdit     shows "Edit" on notes the viewer may still edit
import { formatTime } from '../../lib/format'
import { DateChip, EmptyState, Pill } from '../ui'
import { LessonNoteBody } from './LessonNote'
import './progress.css'

export default function ProgressTimeline({ notes, canTick = false, showTutor = true, onEdit, empty = 'No lesson notes yet' }) {
  if (!notes.length) return <EmptyState title={empty} />
  return (
    <div className="timeline">
      {notes.map((n) => (
        <article key={n.id} className="note-item">
          <DateChip value={n.session_start} />
          <div style={{ minWidth: 0 }}>
            <header className="note-head">
              <h4 title={n.session_title || 'Tutoring session'}>{n.session_title || 'Tutoring session'}</h4>
              {n.subject_name && <Pill>{n.subject_name}</Pill>}
              {onEdit && n.can_edit && (
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => onEdit(n)}>Edit</button>
              )}
            </header>
            <div className="note-meta">
              {[showTutor ? `with ${n.tutor_name}` : null, formatTime(n.session_start)].filter(Boolean).join(' · ')}
            </div>
            <LessonNoteBody note={n} canTick={canTick} />
          </div>
        </article>
      ))}
    </div>
  )
}
