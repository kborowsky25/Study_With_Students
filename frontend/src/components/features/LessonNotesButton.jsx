// "Add notes" / "Notes" on a session row, opening the lesson-notes dialog.
//   <LessonNotesButton event={ev} />   ev from GET /events (id_event, role, status, start_time)
// Renders nothing when there is nothing to show: no notes yet and the viewer can't write them.
// Every button on a page shares one request for which sessions have notes.
import { useMemo, useState } from 'react'
import { useQuery } from '../../lib/query'
import { NQ, canWriteNotes } from '../../lib/progress'
import { Icon } from '../ui'
import LessonNotesDialog from './LessonNotesDialog'

/** Set of event ids that have notes, or null until it has loaded. */
export function useLessonNoteIndex() {
  const { data } = useQuery(NQ.index[0], NQ.index[1])
  return useMemo(() => (data ? new Set(data.notes.map((n) => n.event_id)) : null), [data])
}

export default function LessonNotesButton({ event: ev, size = 'sm' }) {
  const withNotes = useLessonNoteIndex()
  const [open, setOpen] = useState(false)
  if (!withNotes) return null
  const has = withNotes.has(ev.id_event)
  if (!has && !canWriteNotes(ev)) return null
  return (
    <>
      <button type="button" className={`btn ${has ? 'btn-ghost' : 'btn-coral'} ${size ? `btn-${size}` : ''}`} onClick={() => setOpen(true)}>
        <Icon name={has ? 'description' : 'edit_note'} />{has ? 'Notes' : 'Add notes'}
      </button>
      {open && <LessonNotesDialog eventId={ev.id_event} onClose={() => setOpen(false)} />}
    </>
  )
}
