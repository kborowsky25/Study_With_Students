import { useEffect, useState } from 'react'
import { getEvents, updateStatus } from '../api/events'
import HubLayout from '../components/layout/HubLayout'
import PageHeader from '../components/features/PageHeader'
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

// ── iCal helpers ───────────────────────────────────────────────────────────
function generateICS(events) {
  const fmt = d => new Date(d).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const esc = s => (s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const vevs = events.map(ev => [
    'BEGIN:VEVENT',
    `DTSTART:${fmt(ev.start_time)}`,
    `DTEND:${fmt(ev.end_time)}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : null,
    `UID:sws-${ev.id_event}@studywithstudents`,
    `STATUS:${ev.status === 'confirmed' ? 'CONFIRMED' : ev.status === 'canceled' ? 'CANCELLED' : 'TENTATIVE'}`,
    'END:VEVENT',
  ].filter(Boolean).join('\r\n')).join('\r\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Study With Students//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:SWS Sessions',
    vevs, 'END:VCALENDAR',
  ].join('\r\n')
}

function downloadICS(events, filename = 'sws-sessions.ics') {
  const blob = new Blob([generateICS(events)], { type: 'text/calendar;charset=utf-8' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
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
  confirmed: '#34d399',
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
  const [loading,     setLoading]     = useState(true)
  const [viewDate,    setViewDate]    = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(toDateStr(new Date()))
  const [clickedDay,  setClickedDay]  = useState(null)

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

  // Earnings XP for tutor
  const paidSessions  = events.filter(e => e.status === 'paid').length
  const totalEarnings = events.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const totalXP   = 30 + paidSessions * 50 + upcoming.length * 20
  const level     = Math.floor(totalXP / 100) + 1
  const xpProg    = totalXP % 100

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
    if (dayEvents.some(e => e.status === 'confirmed')) return '#34d399'
    return '#ff725e'
  }

  return (
    <HubLayout initialMode="tutor" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

        {/* ── Header ───────────────────────────────────────────── */}
        <PageHeader
          icon="calendar_month"
          iconColor="#ff725e"
          title="My Schedule"
          subtitle={<>
            {pending.length > 0 && <span style={{ color: '#fbbf24', fontWeight: '700' }}>{pending.length} pending · </span>}
            {upcoming.length} confirmed upcoming
          </>}
          right={!isViewingCurrentMonth && (
            <button
              onClick={goToday}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px', borderRadius: '10px',
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
          )}
          compact
          style={{ flexShrink: 0 }}
        />

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
                      <span className="material-symbols-outlined" style={{ color: '#34d399', fontSize: '16px', flexShrink: 0 }}>event_available</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text)', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{fmtFull(ev.start_time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tutor XP / earnings snapshot */}
            <div style={{
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(52,211,153,0.10), rgba(52,211,153,0.04))',
              border: '1px solid rgba(52,211,153,0.20)',
              padding: '12px 14px',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#34d399' }}>trending_up</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text)' }}>Tutor Level {level}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '700' }}>
                  £{totalEarnings.toFixed(2)} earned
                </span>
              </div>
              <div style={{ height: '7px', background: 'rgba(52,211,153,0.15)', borderRadius: '6px', overflow: 'hidden', marginBottom: '5px' }}>
                <div style={{
                  height: '100%',
                  width: `${xpProg}%`,
                  background: 'linear-gradient(90deg, #34d399, #10b981)',
                  borderRadius: '6px',
                  transition: 'width 1s ease',
                }} />
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                {100 - xpProg} XP to Level {level + 1} · {paidSessions} paid session{paidSessions !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Calendar sync */}
            <TutorCalendarSyncCard events={events} />

          </div>
        </div>

      </div>
    </HubLayout>
  )
}

// ── Calendar sync card ────────────────────────────────────────────────────
function TutorCalendarSyncCard({ events }) {
  const upcoming = events.filter(e => e.status !== 'canceled' && new Date(e.start_time) > new Date())

  function handleDownload() {
    downloadICS(upcoming)
    toast.success(`${upcoming.length} session${upcoming.length !== 1 ? 's' : ''} exported!`)
  }

  return (
    <div style={{
      background: 'rgba(96,165,250,0.06)',
      border: '1px solid rgba(96,165,250,0.18)',
      borderRadius: '14px',
      padding: '13px 14px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '9px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#60a5fa' }}>sync</span>
        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text)' }}>Sync Calendar</span>
        {upcoming.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '700', color: '#60a5fa', background: 'rgba(96,165,250,0.12)', padding: '1px 7px', borderRadius: '20px' }}>
            {upcoming.length} upcoming
          </span>
        )}
      </div>

      <button
        onClick={handleDownload}
        disabled={upcoming.length === 0}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '8px 10px', borderRadius: '10px', marginBottom: '8px',
          background: upcoming.length > 0 ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${upcoming.length > 0 ? 'rgba(96,165,250,0.28)' : 'rgba(255,255,255,0.08)'}`,
          color: upcoming.length > 0 ? '#60a5fa' : 'var(--text-faint)',
          fontSize: '12px', fontWeight: '700',
          cursor: upcoming.length > 0 ? 'pointer' : 'default',
          opacity: upcoming.length === 0 ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (upcoming.length > 0) e.currentTarget.style.background = 'rgba(96,165,250,0.20)' }}
        onMouseLeave={e => { e.currentTarget.style.background = upcoming.length > 0 ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>download</span>
        Download .ics file
      </button>

      <p style={{ fontSize: '9px', color: 'var(--text-faint)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '700' }}>
        Then import in
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
        <a
          href="https://calendar.google.com/calendar/r/settings/import"
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 8px', borderRadius: '8px', textDecoration: 'none', fontSize: '11px', fontWeight: '600', color: '#4285F4', background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.18)', transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(66,133,244,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(66,133,244,0.08)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
          Google
        </a>
        <a
          href="https://outlook.live.com/calendar/0/addcalendar"
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 8px', borderRadius: '8px', textDecoration: 'none', fontSize: '11px', fontWeight: '600', color: '#0078D4', background: 'rgba(0,120,212,0.08)', border: '1px solid rgba(0,120,212,0.18)', transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,120,212,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,120,212,0.08)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
          Outlook
        </a>
      </div>
    </div>
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
          style={{ flex: 1, padding: '5px', borderRadius: '7px', border: 'none', background: 'rgba(52,211,153,0.15)', color: '#34d399', fontWeight: '700', fontSize: '11px', cursor: 'pointer', transition: 'background 0.15s' }}
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
          <button onClick={onConfirm} style={{ flex: 1, padding: '5px', borderRadius: '7px', border: 'none', background: 'rgba(52,211,153,0.15)', color: '#34d399', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Confirm</button>
          <button onClick={onDecline} style={{ flex: 1, padding: '5px', borderRadius: '7px', border: 'none', background: 'rgba(248,113,113,0.12)', color: '#f87171', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Decline</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <a href={makeGoogleLink(ev)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '600', color: '#4285F4', background: 'rgba(66,133,244,0.10)', border: '1px solid rgba(66,133,244,0.22)', borderRadius: '7px', padding: '4px 7px', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>calendar_add_on</span>Google
        </a>
        <a href={makeOutlookLink(ev)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '600', color: '#0078D4', background: 'rgba(0,120,212,0.10)', border: '1px solid rgba(0,120,212,0.22)', borderRadius: '7px', padding: '4px 7px', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>calendar_month</span>Outlook
        </a>
      </div>
    </div>
  )
}
