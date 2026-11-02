// Tutor dashboard card: sessions from the last two weeks that still need lesson notes.
//   <NotesToWriteCard events={events} />   the tutor's events from GET /events (fetched if omitted)
// Renders nothing when every recent session has notes.
import { useMemo, useState } from 'react'
import { useQuery } from '../../lib/query'
import { Q } from '../../lib/queries'
import { canWriteNotes } from '../../lib/progress'
import { Card, DateChip, Icon } from '../ui'
import LessonNotesDialog from './LessonNotesDialog'
import { useLessonNoteIndex } from './LessonNotesButton'

const WINDOW_MS = 14 * 86_400_000

export default function NotesToWriteCard({ events: given, limit = 5 }) {
  const { data } = useQuery(Q.events[0], Q.events[1], { enabled: !given })
  const events = given ?? data?.events
  const withNotes = useLessonNoteIndex()
  const [writing, setWriting] = useState(null)

  const due = useMemo(() => {
    if (!events || !withNotes) return []
    const since = Date.now() - WINDOW_MS
    return events
      .filter((ev) => canWriteNotes(ev) && new Date(ev.start_time).getTime() >= since && !withNotes.has(ev.id_event))
      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
  }, [events, withNotes])

  if (!due.length) return null
  return (
    <Card title="Lesson notes to write" count={due.length}>
      <div className="row-list">
        {due.slice(0, limit).map((ev) => (
          <div key={ev.id_event} className="row">
            <DateChip value={ev.start_time} />
            <div className="main">
              <div className="title">{ev.title || 'Tutoring session'}</div>
              <div className="meta">{ev.student_name}</div>
            </div>
            <button type="button" className="btn btn-coral btn-sm" onClick={() => setWriting(ev.id_event)}>
              <Icon name="edit_note" />Add notes
            </button>
          </div>
        ))}
      </div>
      {writing && <LessonNotesDialog eventId={writing} onClose={() => setWriting(null)} />}
    </Card>
  )
}
