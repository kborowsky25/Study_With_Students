import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import EventCard, { CompactSession, MonthGrid } from '../components/features/EventCard'
import { BookSessionButton } from '../components/features/TutorCard'
import { Card, Icon, SkeletonRows } from '../components/ui'
import { getEvents } from '../api/events'
import { getActiveTutors } from '../api/tutors'
import { errorMessage } from '../api/client'

const LEGEND = [
  { status: 'pending', label: 'Awaiting tutor' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'paid', label: 'Paid' },
  { status: 'canceled', label: 'Cancelled' },
]

const emptyLine = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 18px', fontSize: 13, color: 'var(--text-faint)' }

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const byStart = (a, b) => new Date(a.start_time) - new Date(b.start_time)

export default function CalendarStudent() {
  const [events, setEvents] = useState([])
  const [tutors, setTutors] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => startOfDay(new Date()))

  const load = useCallback(() => Promise.allSettled([getEvents(), getActiveTutors()]).then(([ev, tu]) => {
    if (ev.status === 'fulfilled') setEvents((ev.value.data.events ?? []).filter((e) => e.role === 'student'))
    else toast.error(errorMessage(ev.reason, 'Could not load your sessions'))
    if (tu.status === 'fulfilled') setTutors(tu.value.data.tutors ?? [])
    setLoading(false)
  }), [])

  useEffect(() => { load() }, [load])

  function select(day) {
    const d = startOfDay(day)
    setSelected(d)
    setMonth((m) => (m.getFullYear() === d.getFullYear() && m.getMonth() === d.getMonth() ? m : startOfMonth(d)))
  }

  function onBooked(ev) {
    load()
    if (ev?.start_time) select(new Date(ev.start_time))
  }

  const now = new Date()
  const dayEvents = events.filter((e) => sameDay(new Date(e.start_time), selected)).sort(byStart)
  const upcoming = events
    .filter((e) => e.status !== 'canceled' && new Date(e.end_time) > now && !(e.status === 'pending' && new Date(e.start_time) <= now))
    .sort(byStart)

  return (
    <HubLayout initialMode="student">
      <PageTitle title="Calendar" icon="calendar_month" />

      <div className="dash-head">
        <h1>Calendar</h1>
        <div className="dash-actions">
          {tutors.length || loading
            ? <BookSessionButton tutors={tutors} onBooked={onBooked} />
            : <Link to="/find-tutors" className="btn btn-coral"><Icon name="person_search" />Find a tutor</Link>}
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <MonthGrid month={month} onMonthChange={setMonth} selected={selected} onSelect={select}
            events={events} legend={LEGEND} />
        </div>

        <div className="dash-col">
          <Card title={selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            count={dayEvents.length || null}>
            {loading ? <SkeletonRows rows={2} /> : dayEvents.length ? (
              <div className="row-list">
                {dayEvents.map((ev) => <EventCard key={ev.id_event} event={ev} variant="time" onChanged={load} />)}
              </div>
            ) : (
              <div style={emptyLine}>Nothing on this day.</div>
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
              <div style={emptyLine}>No upcoming sessions.</div>
            )}
          </Card>
        </div>
      </div>
    </HubLayout>
  )
}
