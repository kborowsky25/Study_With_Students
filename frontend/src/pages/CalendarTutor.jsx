import { useEffect, useState } from 'react'
import { getEvents, updateStatus } from '../api/events'
import { getStudyRooms } from '../api/studyrooms'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
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

function fmtFull(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLOR = {
  pending:   '#fbbf24',
  confirmed: '#ff725e',
  canceled:  '#f87171',
  paid:      '#60a5fa',
}

// Inject keyframe animations once
if (!document.head.querySelector('#cal-tutor-styles')) {
  const s = document.createElement('style')
  s.id = 'cal-tutor-styles'
  s.innerHTML = `
    @keyframes todayPulseTutor {
      0%,100% { box-shadow: 0 0 0 0 rgba(255,114,94,0.50); }
      50%      { box-shadow: 0 0 0 8px rgba(255,114,94,0); }
    }
  `
  document.head.appendChild(s)
}

export default function CalendarTutor() {
  const [events,      setEvents]      = useState([])
  const [studyRooms,  setStudyRooms]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [viewDate,    setViewDate]    = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(toDateStr(new Date()))
  const [clickedDay,  setClickedDay]  = useState(null)

  async function load() {
    try {
      const [evRes, srRes] = await Promise.allSettled([getEvents(), getStudyRooms()])
      setEvents(evRes.status === 'fulfilled' ? evRes.value.data.events ?? [] : [])
      setStudyRooms(srRes.status === 'fulfilled' ? srRes.value.data.rooms ?? [] : [])
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
  const pending  = events.filter(e => e.status === 'pending')
  const upcoming = events
    .filter(e => e.status === 'confirmed' && new Date(e.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 6)

  const paidSessions     = events.filter(e => e.status === 'paid').length
  const totalEarnings    = events.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const now              = new Date()
  const tutoringSessions = events.filter(e => e.status !== 'canceled' && new Date(e.start_time) > now).length
  const upcomingGroups   = studyRooms.filter(r => new Date(r.end_time) > now).length

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }
  function goToday()   { setViewDate(new Date()); setSelectedDay(today) }

  const isViewingCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()

  function handleDayClick(dateStr) {
    setSelectedDay(dateStr)
    setClickedDay(dateStr)
    setTimeout(() => setClickedDay(null), 300)
  }

  function getDotColor(dateStr) {
    const dayEvents = eventsByDate[dateStr] ?? []
    if (dayEvents.some(e => e.status === 'pending'))   return '#fbbf24'
    if (dayEvents.some(e => e.status === 'confirmed')) return '#ff725e'
    return '#ff725e'
  }

  return (
    <HubLayout initialMode="tutor" noScroll>
      <PageTitle title="My Schedule" icon="calendar_month" />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

        {/* ── Today button (only when not on current month) ─────── */}
        {!isViewingCurrentMonth && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', flexShrink: 0 }}>
            <button
              onClick={goToday}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 14px', borderRadius: '10px',
                background: 'rgba(255,114,94,0.12)', border: '1px solid rgba(255,114,94,0.25)',
                color: '#ff725e', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,114,94,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,114,94,0.12)'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>today</span>
              Today
            </button>
          </div>
        )}

        {/* ── Main grid ─────────────────────────────────────────── */}
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
              {WEEK_DAYS.map((d, i) => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: '11px', fontWeight: '700',
                  color: i === new Date().getDay() && isViewingCurrentMonth ? '#ff725e' : 'var(--text-faint)',
                  padding: '4px 0', letterSpacing: '0.05em',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading…</div>
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
                  const isPast     = dateStr < today
                  const hasEvents  = Boolean(eventsByDate[dateStr])
                  const dotColor   = hasEvents ? getDotColor(dateStr) : null
                  const isClicked  = dateStr === clickedDay

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDayClick(dateStr)}
                      style={{
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid #ff725e'
                          : isToday
                            ? '2px solid rgba(255,114,94,0.55)'
                            : '2px solid transparent',
                        background: isSelected
                          ? 'linear-gradient(135deg, #ff725e, #ff9a3c)'
                          : isToday
                            ? 'rgba(255,114,94,0.12)'
                            : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.18s ease',
                        minHeight: 0,
                        opacity: isPast && !isSelected && !isToday ? 0.35 : 1,
                        transform: isClicked ? 'scale(0.88)' : 'scale(1)',
                        animation: isToday && !isSelected ? 'todayPulseTutor 2.5s ease-in-out infinite' : 'none',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isPast
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(255,255,255,0.09)'
                          e.currentTarget.style.transform = 'scale(1.08)'
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = isSelected
                          ? 'linear-gradient(135deg, #ff725e, #ff9a3c)'
                          : isToday ? 'rgba(255,114,94,0.12)' : 'transparent'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <span style={{
                        fontSize: '13px',
                        fontWeight: isToday || isSelected ? '800' : isPast ? '400' : '500',
                        color: isSelected ? 'white' : isToday ? '#ff725e' : isPast ? 'var(--text-muted)' : 'var(--text)',
                        lineHeight: 1,
                      }}>
                        {day}
                      </span>
                      {dotColor && (
                        <span style={{
                          width: isSelected ? '16px' : '5px',
                          height: '5px',
                          borderRadius: isSelected ? '3px' : '50%',
                          background: isSelected ? 'rgba(255,255,255,0.85)' : dotColor,
                          display: 'block',
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right panel ───────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>

            {/* Pending requests */}
            {pending.length > 0 && (
              <div style={{
                background: 'rgba(251,191,36,0.07)',
                border: '1px solid rgba(251,191,36,0.22)',
                borderRadius: '14px',
                padding: '14px',
                flexShrink: 0,
                maxHeight: '35%',
                overflow: 'auto',
              }}>
                <h3 style={{ fontWeight: 700, fontSize: '13px', color: '#fbbf24', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
                  Pending ({pending.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pending.map(ev => (
                    <PendingCard key={ev.id_event} ev={ev}
                      onConfirm={() => handleStatus(ev.id_event, 'confirmed')}
                      onDecline={() => handleStatus(ev.id_event, 'canceled')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Selected day events */}
            <div className="glass" style={{ padding: '14px', overflow: 'auto', flex: '0 0 auto', maxHeight: pending.length > 0 ? '28%' : '42%' }}>
              <h3 style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)', marginBottom: '10px' }}>
                {fmtDate(selectedDay)}
              </h3>
              {selectedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '26px', color: 'var(--text-faint)', display: 'block', marginBottom: '4px' }}>event_busy</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No sessions on this day</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedEvents.map(ev => (
                    <TutorEventCard key={ev.id_event} ev={ev}
                      onConfirm={() => handleStatus(ev.id_event, 'confirmed')}
                      onDecline={() => handleStatus(ev.id_event, 'canceled')}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirmed upcoming */}
            <div className="glass" style={{ padding: '14px', flex: 1, overflow: 'auto', minHeight: 0 }}>
              <h3 style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)', marginBottom: '10px' }}>
                Confirmed Sessions
              </h3>
              {upcoming.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '8px 0' }}>No confirmed sessions</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {upcoming.map(ev => (
                    <div key={ev.id_event} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#ff725e', fontSize: '16px', flexShrink: 0 }}>event_available</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{fmtFull(ev.start_time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Session type stat chips */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, minWidth: 0 }}>
              {[
                { icon: 'school',  color: '#ff725e', count: tutoringSessions, label: `Tutoring Session${tutoringSessions !== 1 ? 's' : ''}` },
                { icon: 'groups',  color: '#60a5fa', count: upcomingGroups,   label: `Study Group${upcomingGroups !== 1 ? 's' : ''}` },
              ].map(({ icon, color, count, label }) => (
                <div key={label} style={{
                  flex: 1, minWidth: 0,
                  background: `${color}10`, border: `1px solid ${color}28`,
                  borderRadius: '12px', padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  overflow: 'hidden',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color, flexShrink: 0, fontVariationSettings: '"FILL" 1' }}>{icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text)', lineHeight: 1, display: 'block' }}>{count}</span>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{label}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </HubLayout>
  )
}

// ── Pending request card ─────────────────────────────────────────────────
function PendingCard({ ev, onConfirm, onDecline }) {
  return (
    <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '10px', padding: '10px' }}>
      <p style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>{ev.title}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>
        {ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
      </p>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={onConfirm}
          style={{ flex: 1, padding: '5px', borderRadius: '7px', border: 'none', background: 'rgba(52,211,153,0.15)', color: '#ff725e', fontWeight: '700', fontSize: '11px', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.28)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,211,153,0.15)'}
        >Confirm</button>
        <button onClick={onDecline}
          style={{ flex: 1, padding: '5px', borderRadius: '7px', border: 'none', background: 'rgba(248,113,113,0.12)', color: '#f87171', fontWeight: '700', fontSize: '11px', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.12)'}
        >Decline</button>
      </div>
    </div>
  )
}

// ── Tutor event detail card ──────────────────────────────────────────────
function TutorEventCard({ ev, onConfirm, onDecline }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px', gap: '6px' }}>
        <p style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '700', flex: 1 }}>{ev.title}</p>
        <span style={{ fontSize: '10px', fontWeight: '700', color: STATUS_COLOR[ev.status] ?? '#fbbf24', background: `${STATUS_COLOR[ev.status] ?? '#fbbf24'}22`, padding: '2px 6px', borderRadius: '20px', flexShrink: 0 }}>
          {ev.status}
        </span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>
        {fmtTime(ev.start_time)} – {fmtTime(ev.end_time)}
      </p>
      {ev.status === 'pending' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: '5px', borderRadius: '7px', border: 'none', background: 'rgba(52,211,153,0.15)', color: '#ff725e', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Confirm</button>
          <button onClick={onDecline} style={{ flex: 1, padding: '5px', borderRadius: '7px', border: 'none', background: 'rgba(248,113,113,0.12)', color: '#f87171', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Decline</button>
        </div>
      )}
      <p style={{ fontSize: '9px', color: 'var(--text-faint)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>Add to calendar</p>
      <div style={{ display: 'flex', gap: '6px' }}>
        <a href={makeGoogleLink(ev)} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#4285F4', background: 'rgba(66,133,244,0.10)', border: '1px solid rgba(66,133,244,0.25)', borderRadius: '9px', padding: '6px 8px', textDecoration: 'none', transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(66,133,244,0.20)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(66,133,244,0.10)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_add_on</span>Google
        </a>
        <a href={makeOutlookLink(ev)} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#0078D4', background: 'rgba(0,120,212,0.10)', border: '1px solid rgba(0,120,212,0.25)', borderRadius: '9px', padding: '6px 8px', textDecoration: 'none', transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,120,212,0.20)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,120,212,0.10)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_month</span>Outlook
        </a>
      </div>
    </div>
  )
}
