import { useEffect, useState } from 'react'
import { getEvents } from '../api/events'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December']

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function makeGoogleLink(ev) {
  const fmt = d => new Date(d).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', ev.title)
  url.searchParams.set('dates', `${fmt(ev.start_time)}/${fmt(ev.end_time)}`)
  if (ev.description) url.searchParams.set('details', ev.description)
  return url.toString()
}

function makeOutlookLink(ev) {
  const url = new URL('https://outlook.live.com/calendar/0/addevent')
  url.searchParams.set('subject', ev.title)
  url.searchParams.set('startdt', ev.start_time)
  url.searchParams.set('enddt', ev.end_time)
  if (ev.description) url.searchParams.set('body', ev.description)
  return url.toString()
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUS_COLOR = {
  pending:   '#fbbf24',
  confirmed: '#34d399',
  canceled:  '#f87171',
  paid:      '#60a5fa',
}

export default function CalendarStudent() {
  const [events,      setEvents]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [viewDate,    setViewDate]    = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(toDateStr(new Date()))

  async function load() {
    try {
      const { data } = await getEvents()
      setEvents(data.events ?? [])
    } catch { toast.error('Could not load calendar') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const cells        = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const numRows = Math.ceil(cells.length / 7)

  const today = toDateStr(new Date())

  const eventsByDate = {}
  events.forEach(ev => {
    const d = toDateStr(new Date(ev.start_time))
    if (!eventsByDate[d]) eventsByDate[d] = []
    eventsByDate[d].push(ev)
  })

  const selectedEvents = eventsByDate[selectedDay] ?? []
  const upcoming = events
    .filter(e => e.status !== 'canceled' && new Date(e.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 8)

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }

  return (
    <HubLayout noScroll>
      {/* Outer flex column fills the 100% height from HubLayout's wrapper */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{ marginBottom: '12px', flexShrink: 0 }}>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text)', marginBottom: '2px' }}>My Calendar</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {upcoming.length} upcoming session{upcoming.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Main grid — grows to fill remaining space ─────────── */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '16px',
          overflow: 'hidden',
        }}>

          {/* ── Calendar grid panel ──────────────────────────── */}
          <div className="glass" style={{
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexShrink: 0 }}>
              <button
                onClick={prevMonth}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>chevron_left</span>
              </button>
              <h2 style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text)' }}>{MONTHS[month]} {year}</h2>
              <button
                onClick={nextMonth}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>chevron_right</span>
              </button>
            </div>

            {/* Weekday headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px', flexShrink: 0 }}>
              {WEEK_DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', padding: '4px 0', letterSpacing: '0.05em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells — flex:1 so they fill remaining vertical space */}
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', opacity: 0.4 }}>calendar_month</span>
                Loading…
              </div>
            ) : (
              <div style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridTemplateRows: `repeat(${numRows}, 1fr)`,
                gap: '4px',
              }}>
                {cells.map((day, idx) => {
                  if (!day) return <div key={`pad-${idx}`} />

                  const dateStr    = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  const isToday    = dateStr === today
                  const isSelected = dateStr === selectedDay
                  const hasEvents  = Boolean(eventsByDate[dateStr])

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDay(dateStr)}
                      style={{
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid #ff725e'
                          : isToday
                            ? '2px solid rgba(255,114,94,0.45)'
                            : '2px solid transparent',
                        background: isSelected
                          ? '#ff725e'
                          : isToday
                            ? 'rgba(255,114,94,0.08)'
                            : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.15s ease',
                        minHeight: 0,
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#ff725e' : isToday ? 'rgba(255,114,94,0.08)' : 'transparent' }}
                    >
                      <span style={{
                        fontSize: '13px',
                        fontWeight: isToday || isSelected ? '700' : '400',
                        color: isSelected ? 'white' : 'var(--text)',
                        lineHeight: 1,
                      }}>
                        {day}
                      </span>
                      {hasEvents && (
                        <span style={{
                          width: '5px', height: '5px', borderRadius: '50%',
                          background: isSelected ? 'rgba(255,255,255,0.9)' : '#ff725e',
                          display: 'block', flexShrink: 0,
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right panel ───────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>

            {/* Selected day events */}
            <div className="glass" style={{ padding: '16px', overflow: 'auto', flex: '0 0 auto', maxHeight: '48%' }}>
              <h3 style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>
                {fmtDate(selectedDay)}
              </h3>
              {selectedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--text-faint)', display: 'block', marginBottom: '6px' }}>event_busy</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No sessions on this day</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedEvents.map(ev => <EventCard key={ev.id_event} ev={ev} />)}
                </div>
              )}
            </div>

            {/* Upcoming sessions */}
            <div className="glass" style={{ padding: '16px', flex: 1, overflow: 'auto', minHeight: 0 }}>
              <h3 style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>
                Upcoming Sessions
              </h3>
              {upcoming.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>No upcoming sessions</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {upcoming.map(ev => (
                    <div key={ev.id_event} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#ff725e', fontSize: '16px', flexShrink: 0 }}>event</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.title}
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{fmtTime(ev.start_time)}</p>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: STATUS_COLOR[ev.status] ?? '#fbbf24', flexShrink: 0 }}>
                        {ev.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </HubLayout>
  )
}

// ── Event card with calendar add buttons ──────────────────────────────────

function EventCard({ ev }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
        <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '700', flex: 1 }}>{ev.title}</p>
        <span style={{
          fontSize: '10px', fontWeight: '700',
          color: STATUS_COLOR[ev.status] ?? '#fbbf24',
          background: `${STATUS_COLOR[ev.status] ?? '#fbbf24'}22`,
          padding: '2px 7px', borderRadius: '20px', flexShrink: 0,
        }}>
          {ev.status}
        </span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '10px' }}>
        {fmtTime(ev.start_time)} – {fmtTime(ev.end_time)}
      </p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <a href={makeGoogleLink(ev)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '600', color: '#4285F4', background: 'rgba(66,133,244,0.10)', border: '1px solid rgba(66,133,244,0.22)', borderRadius: '7px', padding: '4px 8px', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>calendar_add_on</span>
          Google
        </a>
        <a href={makeOutlookLink(ev)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '600', color: '#0078D4', background: 'rgba(0,120,212,0.10)', border: '1px solid rgba(0,120,212,0.22)', borderRadius: '7px', padding: '4px 8px', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>calendar_month</span>
          Outlook
        </a>
      </div>
    </div>
  )
}
