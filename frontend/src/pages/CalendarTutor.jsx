import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import EventCard, { CompactSession, MonthGrid, ScheduleSessionDialog } from '../components/features/EventCard'
import { Card, Icon, SkeletonRows } from '../components/ui'
import { getEvents } from '../api/events'
import { getActiveStudents } from '../api/tutors'
import { errorMessage } from '../api/client'

const LEGEND = [
  { status: 'pending', label: 'Needs your answer' },
  { status: 'confirmed', label: 'Confirmed, unpaid' },
  { status: 'paid', label: 'Paid' },
  { status: 'canceled', label: 'Cancelled' },
]

const emptyLine = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 18px', fontSize: 13, color: 'var(--text-faint)' }

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const byStart = (a, b) => new Date(a.start_time) - new Date(b.start_time)

export default function CalendarTutor() {
  const [events, setEvents] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const [scheduling, setScheduling] = useState(null) // { date } while the dialog is open

  const load = useCallback(() => Promise.allSettled([getEvents(), getActiveStudents()]).then(([ev, st]) => {
    if (ev.status === 'fulfilled') setEvents((ev.value.data.events ?? []).filter((e) => e.role === 'tutor'))
    else toast.error(errorMessage(ev.reason, 'Could not load your schedule'))
    if (st.status === 'fulfilled') setStudents(st.value.data.students ?? [])
    setLoading(false)
  }), [])

  useEffect(() => { load() }, [load])

  function select(day) {
    const d = startOfDay(day)
    setSelected(d)
    setMonth((m) => (m.getFullYear() === d.getFullYear() && m.getMonth() === d.getMonth() ? m : startOfMonth(d)))
  }

  function onScheduled(ev) {
    load()
    if (ev?.start_time) select(new Date(ev.start_time))
  }

  const now = new Date()
  const dayEvents = events.filter((e) => sameDay(new Date(e.start_time), selected)).sort(byStart)
  const needsAnswer = events.filter((e) => e.status === 'pending' && new Date(e.start_time) > now).sort(byStart)
  const upcoming = events
    .filter((e) => (e.status === 'confirmed' || e.status === 'paid') && new Date(e.end_time) > now)
    .sort(byStart)
  const canSchedule = students.length > 0

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="Schedule" icon="calendar_month" />

      <div className="dash-head">
        <h1>Schedule</h1>
        <div className="dash-actions">
          <Link to="/active-students" className="btn btn-ghost"><Icon name="groups_2" />My students</Link>
          <button type="button" className="btn btn-coral" disabled={!canSchedule}
            title={canSchedule ? undefined : 'Available once you have a student'}
            onClick={() => setScheduling({ date: selected })}>
            <Icon name="add" />Schedule a session
          </button>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <MonthGrid month={month} onMonthChange={setMonth} selected={selected} onSelect={select}
            events={events} chipLabel={(ev) => ev.student_name || ev.title} legend={LEGEND} />
        </div>

        <div className="dash-col">
          {needsAnswer.length > 0 && (
            <Card title="Needs your answer" icon="notifications_active" count={needsAnswer.length}>
              <div className="row-list">
                {needsAnswer.map((ev) => <EventCard key={ev.id_event} event={ev} onChanged={load} />)}
              </div>
            </Card>
          )}

          <Card title={selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            count={dayEvents.length || null}>
            {loading ? <SkeletonRows rows={2} /> : dayEvents.length ? (
              <div className="row-list">
                {dayEvents.map((ev) => <EventCard key={ev.id_event} event={ev} variant="time" onChanged={load} />)}
              </div>
            ) : (
              <div style={emptyLine}>
                Nothing scheduled.
                {canSchedule && startOfDay(new Date()) <= selected && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setScheduling({ date: selected })}>
                    Schedule a session
                  </button>
                )}
              </div>
            )}
          </Card>

          <Card title="Upcoming" icon="event_upcoming" count={upcoming.length || null}>
            {loading ? <SkeletonRows rows={3} /> : upcoming.length ? (
              <div className="row-list">
                {upcoming.slice(0, 6).map((ev) => (
                  <CompactSession key={ev.id_event} event={ev} onClick={() => select(new Date(ev.start_time))} />
                ))}
              </div>
            ) : (
              <div style={emptyLine}>No confirmed sessions coming up.</div>
            )}
          </Card>
        </div>
      </div>

      {scheduling && (
        <ScheduleSessionDialog students={students} date={scheduling.date}
          onClose={() => setScheduling(null)} onScheduled={onScheduled} />
      )}
    </HubLayout>
  )
}
