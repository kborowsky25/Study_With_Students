import { useEffect, useState } from 'react'
import { getEvents, updateStatus } from '../api/events'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December']

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtFull(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLOR = {
  pending:   '#fbbf24',
  confirmed: '#34d399',
  canceled:  '#f87171',
  paid:      '#60a5fa',
}

export default function CalendarTutor() {
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

  async function handleStatus(id, status) {
    try {
      await updateStatus(id, status)
      toast.success(status === 'confirmed' ? 'Session confirmed!' : 'Session declined')
      load()
    } catch { toast.error('Could not update status') }
  }

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const today = toDateStr(new Date())

  // Group events by date
  const eventsByDate = {}
  events.forEach(ev => {
    const d = toDateStr(new Date(ev.start_time))
    if (!eventsByDate[d]) eventsByDate[d] = []
    eventsByDate[d].push(ev)
  })

  const selectedEvents = eventsByDate[selectedDay] ?? []

  const pending   = events.filter(e => e.status === 'pending')
  const upcoming  = events
    .filter(e => e.status === 'confirmed' && new Date(e.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5)

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }

  // Dot color per day: yellow if any pending, green if confirmed, coral fallback
  function getDotColor(dateStr) {
    const dayEvents = eventsByDate[dateStr] ?? []
    if (dayEvents.some(e => e.status === 'pending'))   return '#fbbf24'
    if (dayEvents.some(e => e.status === 'confirmed')) return '#34d399'
    return '#ff725e'
  }

  return (
    <HubLayout initialMode="tutor">

      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', marginBottom: '4px' }}>My Schedule</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {pending.length} pending · {upcoming.length} confirmed
        </p>
      </div>

      {/* ── Pending requests (top) ──────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="glass" style={{ padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#fbbf24', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>schedule</span>
            Pending Requests ({pending.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {pending.map(ev => (
              <PendingCard key={ev.id_event} ev={ev} onConfirm={() => handleStatus(ev.id_event, 'confirmed')} onDecline={() => handleStatus(ev.id_event, 'canceled')} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

        {/* ── Calendar grid panel ─────────────────────────────────── */}
        <div className="glass" style={{ padding: '24px' }}>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button
              onClick={prevMonth}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>chevron_left</span>
            </button>
            <h2 style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text)' }}>{MONTHS[month]} {year}</h2>
            <button
              onClick={nextMonth}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>chevron_right</span>
            </button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
            {WEEK_DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', padding: '4px 0', letterSpacing: '0.05em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`pad-${idx}`} />
                const dateStr    = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const isToday    = dateStr === today
                const isSelected = dateStr === selectedDay
                const hasEvents  = Boolean(eventsByDate[dateStr])
                const dotColor   = hasEvents ? getDotColor(dateStr) : null

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(dateStr)}
                    style={{
                      aspectRatio: '1',
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
                      padding: '4px',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#ff725e' : isToday ? 'rgba(255,114,94,0.08)' : 'transparent' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: isToday || isSelected ? '700' : '400', color: isSelected ? 'white' : 'var(--text)', lineHeight: 1 }}>
                      {day}
                    </span>
                    {dotColor && (
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.9)' : dotColor, display: 'block', flexShrink: 0 }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right panel ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Selected day */}
          <div className="glass" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '14px' }}>
              {fmtDate(selectedDay)}
            </h3>
            {selectedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--text-faint)', display: 'block', marginBottom: '8px' }}>event_busy</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No sessions on this day</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedEvents.map(ev => (
                  <TutorEventCard key={ev.id_event} ev={ev} onConfirm={() => handleStatus(ev.id_event, 'confirmed')} onDecline={() => handleStatus(ev.id_event, 'canceled')} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming confirmed */}
          <div className="glass" style={{ padding: '20px', flex: 1 }}>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '14px' }}>
              Confirmed Sessions
            </h3>
            {upcoming.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>No confirmed sessions</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {upcoming.map(ev => (
                  <div key={ev.id_event} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#34d399', fontSize: '18px', flexShrink: 0 }}>event_available</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{fmtFull(ev.start_time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </HubLayout>
  )
}

// ── Pending request card ────────────────────────────────────────────────
function PendingCard({ ev, onConfirm, onDecline }) {
  return (
    <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '14px' }}>
      <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{ev.title}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
        {fmtFull(ev.start_time)} – {fmtTime(ev.end_time)}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onConfirm}
          style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', background: 'rgba(52,211,153,0.15)', color: '#34d399', fontWeight: '700', fontSize: '12px', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.28)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,211,153,0.15)'}
        >
          Confirm
        </button>
        <button
          onClick={onDecline}
          style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', background: 'rgba(248,113,113,0.12)', color: '#f87171', fontWeight: '700', fontSize: '12px', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.12)'}
        >
          Decline
        </button>
      </div>
    </div>
  )
}

// ── Tutor event detail card ─────────────────────────────────────────────
function TutorEventCard({ ev, onConfirm, onDecline }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
        <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: '700', flex: 1 }}>{ev.title}</p>
        <span style={{ fontSize: '11px', fontWeight: '700', color: STATUS_COLOR[ev.status] ?? '#fbbf24', background: `${STATUS_COLOR[ev.status] ?? '#fbbf24'}22`, padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>
          {ev.status}
        </span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
        {fmtTime(ev.start_time)} – {fmtTime(ev.end_time)}
      </p>
      {ev.status === 'pending' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: 'none', background: 'rgba(52,211,153,0.15)', color: '#34d399', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Confirm</button>
          <button onClick={onDecline} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: 'none', background: 'rgba(248,113,113,0.12)', color: '#f87171', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Decline</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <a href={makeGoogleLink(ev)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color: '#4285F4', background: 'rgba(66,133,244,0.10)', border: '1px solid rgba(66,133,244,0.22)', borderRadius: '8px', padding: '5px 10px', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_add_on</span>
          Google
        </a>
        <a href={makeOutlookLink(ev)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color: '#0078D4', background: 'rgba(0,120,212,0.10)', border: '1px solid rgba(0,120,212,0.22)', borderRadius: '8px', padding: '5px 10px', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_month</span>
          Outlook
        </a>
      </div>
    </div>
  )
}
