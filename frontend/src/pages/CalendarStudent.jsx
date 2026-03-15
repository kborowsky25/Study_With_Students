import { useEffect, useState } from 'react'
import { getEvents } from '../api/events'
import { getActiveTutors } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
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

function XPRing({ level, progress, totalXP, xpToNext }) {
  const r    = 30
  const circ = 2 * Math.PI * r
  const dash = circ * (progress / 100)
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,114,94,0.12), rgba(255,114,94,0.04))',
      border: '1px solid rgba(255,114,94,0.22)',
      borderRadius: '14px', padding: '14px',
      display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0,
    }}>
      <div style={{ position: 'relative', width: '68px', height: '68px', flexShrink: 0 }}>
        <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="xpG" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff725e" />
              <stop offset="100%" stopColor="#ff9a3c" />
            </linearGradient>
          </defs>
          <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,114,94,0.15)" strokeWidth="6" />
          <circle cx="34" cy="34" r={r} fill="none" stroke="url(#xpG)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>{level}</span>
          <span style={{ fontSize: '8px', color: 'var(--text-faint)', fontWeight: '700', letterSpacing: '0.08em' }}>LEVEL</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#ff725e' }}>military_tech</span>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#ff725e' }}>{totalXP} XP earned</span>
        </div>
        <div style={{ height: '5px', background: 'rgba(255,114,94,0.15)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#ff725e,#ff9a3c)', borderRadius: '3px', transition: 'width 1s ease' }} />
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{xpToNext} XP to Level {level + 1}</p>
        <div style={{ marginTop: '5px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['+30 per session', '+10 per tutor'].map(t => (
            <span key={t} style={{ fontSize: '9px', color: 'rgba(255,114,94,0.6)', background: 'rgba(255,114,94,0.08)', padding: '1px 5px', borderRadius: '4px' }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CalendarStudent() {
  const [events,       setEvents]       = useState([])
  const [activeTutors, setActiveTutors] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [viewDate,     setViewDate]     = useState(new Date())
  const [selectedDay,  setSelectedDay]  = useState(toDateStr(new Date()))

  async function load() {
    try {
      const results = await Promise.allSettled([getEvents(), getActiveTutors()])
      const ev = results[0].status === 'fulfilled' ? results[0].value.data.events ?? [] : []
      const at = results[1].status === 'fulfilled' ? results[1].value.data.tutors ?? [] : []
      setEvents(ev)
      setActiveTutors(at)
    } catch { toast.error('Could not load calendar') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstWeekday   = new Date(year, month, 1).getDay()
  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const cells          = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const numRows = Math.ceil(cells.length / 7)

  const today       = toDateStr(new Date())
  const todayDt     = new Date(); todayDt.setHours(0,0,0,0)
  const todayIdx    = cells.indexOf(new Date().getDate())
  const todayRow    = todayIdx >= 0 ? Math.floor(todayIdx / 7) : -1
  const isThisMonth = year === new Date().getFullYear() && month === new Date().getMonth()
  const todayWeekday = new Date().getDay()

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

  const confirmedCount = events.filter(e => e.status === 'confirmed' || e.status === 'paid').length
  const totalXP    = 30 + activeTutors.length * 10 + confirmedCount * 30
  const level      = Math.floor(totalXP / 100) + 1
  const xpProgress = totalXP % 100
  const xpToNext   = 100 - xpProgress

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }

  return (
    <HubLayout noScroll>
      <PageTitle title="Calendar" icon="calendar_month" />
      <style>{`
        @keyframes todayPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,114,94,0.45); }
          50%      { box-shadow: 0 0 0 7px rgba(255,114,94,0); }
        }
        .daycell { transition: all 0.14s ease; }
        .daycell:hover { transform: scale(1.08) !important; }
      `}</style>

      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

        {/* Header */}
        <PageHeader
          icon="calendar_month"
          iconColor="#ff725e"
          title="My Calendar"
          subtitle={upcoming.length > 0
            ? <><span style={{ color:'#34d399', fontWeight:'700' }}>{upcoming.length}</span> upcoming session{upcoming.length!==1?'s':''}</>
            : '0 upcoming sessions'}
          right={!isThisMonth && (
            <button onClick={() => setViewDate(new Date())} style={{
              display:'flex', alignItems:'center', gap:'5px', padding:'7px 14px',
              borderRadius:'10px', border:'1px solid rgba(255,114,94,0.30)',
              background:'rgba(255,114,94,0.08)', color:'#ff725e',
              fontSize:'12px', fontWeight:'700', cursor:'pointer',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize:'14px' }}>today</span>Today
            </button>
          )}
          compact
          style={{ flexShrink: 0 }}
        />

        {/* Grid */}
        <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1fr 300px', gap:'14px', overflow:'hidden' }}>

          {/* Calendar */}
          <div className="glass" style={{ padding:'18px 20px', display:'flex', flexDirection:'column', overflow:'hidden' }}>

            {/* Month nav */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexShrink:0 }}>
              <button onClick={prevMonth} className="daycell" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'10px', padding:'7px', cursor:'pointer', display:'flex', alignItems:'center' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.10)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--bg-card)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize:'20px', color:'var(--text-muted)' }}>chevron_left</span>
              </button>
              <div style={{ textAlign:'center' }}>
                <h2 style={{ fontWeight:700, fontSize:'17px', color:'var(--text)' }}>{MONTHS[month]} {year}</h2>
                {isThisMonth && <p style={{ fontSize:'10px', color:'var(--text-faint)', marginTop:'1px' }}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</p>}
              </div>
              <button onClick={nextMonth} className="daycell" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'10px', padding:'7px', cursor:'pointer', display:'flex', alignItems:'center' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.10)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--bg-card)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize:'20px', color:'var(--text-muted)' }}>chevron_right</span>
              </button>
            </div>

            {/* Weekday headers */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px', marginBottom:'6px', flexShrink:0 }}>
              {WEEK_DAYS.map((d, i) => {
                const col = isThisMonth && i === todayWeekday
                return (
                  <div key={d} style={{
                    textAlign:'center', fontSize:'11px', fontWeight:'700',
                    color: col ? '#ff725e' : 'var(--text-faint)',
                    padding:'4px 0', letterSpacing:'0.05em',
                    borderRadius:'6px',
                    background: col ? 'rgba(255,114,94,0.08)' : 'transparent',
                  }}>{d}</div>
                )
              })}
            </div>

            {/* Day grid */}
            {loading ? (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexDirection:'column', gap:'8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'32px', opacity:0.4 }}>calendar_month</span>
                Loading…
              </div>
            ) : (
              <div style={{
                flex:1, minHeight:0,
                display:'grid',
                gridTemplateColumns:'repeat(7,1fr)',
                gridTemplateRows:`repeat(${numRows},1fr)`,
                gap:'3px',
              }}>
                {cells.map((day, idx) => {
                  if (!day) return <div key={`pad-${idx}`} />
                  const dateStr    = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  const isToday    = dateStr === today
                  const isSelected = dateStr === selectedDay
                  const hasEvents  = Boolean(eventsByDate[dateStr])
                  const past       = dateStr < today
                  const rowIdx     = Math.floor(idx / 7)
                  const isTodayRow = isThisMonth && rowIdx === todayRow

                  return (
                    <button
                      key={dateStr}
                      className="daycell"
                      onClick={() => setSelectedDay(dateStr)}
                      title={hasEvents ? `${eventsByDate[dateStr].length} session${eventsByDate[dateStr].length>1?'s':''}` : undefined}
                      style={{
                        borderRadius:'10px',
                        border: isSelected
                          ? '2px solid #ff725e'
                          : isToday
                            ? '2px solid rgba(255,114,94,0.55)'
                            : isTodayRow && !past
                              ? '2px solid rgba(255,114,94,0.10)'
                              : '2px solid transparent',
                        background: isSelected
                          ? 'linear-gradient(135deg,#ff725e,#ff9a3c)'
                          : isToday
                            ? 'rgba(255,114,94,0.14)'
                            : isTodayRow ? 'rgba(255,114,94,0.04)' : 'transparent',
                        cursor:'pointer',
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        gap:'3px', minHeight:0,
                        opacity: past && !isSelected ? 0.28 : 1,
                        animation: isToday ? 'todayPulse 2.5s ease-in-out infinite' : 'none',
                        boxShadow: isSelected ? '0 4px 12px rgba(255,114,94,0.30)' : 'none',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.opacity = '1' }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isToday ? 'rgba(255,114,94,0.14)' : isTodayRow ? 'rgba(255,114,94,0.04)' : 'transparent'
                          e.currentTarget.style.opacity = past ? '0.28' : '1'
                        }
                      }}
                    >
                      <span style={{
                        fontSize:'13px',
                        fontWeight: isToday || isSelected ? '800' : '400',
                        color: isSelected ? 'white' : isToday ? '#ff725e' : 'var(--text)',
                        lineHeight:1,
                      }}>{day}</span>
                      {hasEvents && (
                        <span style={{
                          width:'5px', height:'5px', borderRadius:'50%',
                          background: isSelected ? 'rgba(255,255,255,0.9)' : '#ff725e',
                          display:'block', flexShrink:0,
                          boxShadow: isSelected ? 'none' : '0 0 4px rgba(255,114,94,0.55)',
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <div style={{ flexShrink:0, marginTop:'8px', paddingTop:'8px', borderTop:'1px solid var(--border)', display:'flex', gap:'14px', flexWrap:'wrap' }}>
              {[
                { bg:'linear-gradient(135deg,#ff725e,#ff9a3c)', label:'Today' },
                { bg:'rgba(255,114,94,0.04)', label:'Current week', border:'1px solid rgba(255,114,94,0.12)' },
                { bg:'rgba(255,114,94,0.55)', dot:true, label:'Has session' },
                { bg:'rgba(255,255,255,0.12)', label:'Past (faded)' },
              ].map(({ bg, label, border, dot }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  {dot
                    ? <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:bg, boxShadow:'0 0 4px rgba(255,114,94,0.5)', display:'inline-block' }} />
                    : <span style={{ width:'14px', height:'10px', borderRadius:'4px', background:bg, border:border||'none', display:'inline-block' }} />
                  }
                  <span style={{ fontSize:'10px', color:'var(--text-faint)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', overflow:'hidden' }}>

            {/* XP Widget */}
            <XPRing level={level} progress={xpProgress} totalXP={totalXP} xpToNext={xpToNext} />

            {/* Selected day */}
            <div className="glass" style={{ padding:'14px', overflow:'auto', flex:'0 0 auto', maxHeight:'36%' }}>
              <h3 style={{ fontWeight:700, fontSize:'13px', color:'var(--text)', marginBottom:'10px', display:'flex', alignItems:'center', gap:'5px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'14px', color:'#ff725e' }}>today</span>
                {fmtDate(selectedDay)}
              </h3>
              {selectedEvents.length === 0 ? (
                <div style={{ textAlign:'center', padding:'14px 0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'28px', color:'var(--text-faint)', display:'block', marginBottom:'5px' }}>event_busy</span>
                  <p style={{ color:'var(--text-muted)', fontSize:'12px' }}>No sessions on this day</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {selectedEvents.map(ev => <EventCard key={ev.id_event} ev={ev} />)}
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div className="glass" style={{ padding:'14px', flex:1, overflow:'auto', minHeight:0 }}>
              <h3 style={{ fontWeight:700, fontSize:'13px', color:'var(--text)', marginBottom:'10px', display:'flex', alignItems:'center', gap:'5px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'14px', color:'#34d399' }}>upcoming</span>
                Upcoming Sessions
              </h3>
              {upcoming.length === 0 ? (
                <div style={{ textAlign:'center', padding:'12px 0' }}>
                  <p style={{ color:'var(--text-muted)', fontSize:'12px', marginBottom:'8px' }}>No upcoming sessions</p>
                  <a href="/find-tutors" style={{ fontSize:'11px', color:'#ff725e', fontWeight:'700', textDecoration:'none' }}>Find a tutor →</a>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column' }}>
                  {upcoming.map(ev => (
                    <div key={ev.id_event} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ width:'6px', height:'6px', borderRadius:'50%', flexShrink:0, background:STATUS_COLOR[ev.status]??'#fbbf24', boxShadow:`0 0 5px ${STATUS_COLOR[ev.status]??'#fbbf24'}80` }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:'var(--text)', fontSize:'12px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</p>
                        <p style={{ color:'var(--text-muted)', fontSize:'10px' }}>
                          {new Date(ev.start_time).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · {fmtTime(ev.start_time)}
                        </p>
                      </div>
                      <span style={{ fontSize:'9px', fontWeight:'700', color:STATUS_COLOR[ev.status]??'#fbbf24', flexShrink:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>
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

function EventCard({ ev }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)',
      borderRadius:'10px', padding:'11px',
      borderLeft:`3px solid ${STATUS_COLOR[ev.status]??'#fbbf24'}`,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'5px', gap:'8px' }}>
        <p style={{ color:'var(--text)', fontSize:'12px', fontWeight:'700', flex:1 }}>{ev.title}</p>
        <span style={{
          fontSize:'9px', fontWeight:'700', color:STATUS_COLOR[ev.status]??'#fbbf24',
          background:`${STATUS_COLOR[ev.status]??'#fbbf24'}22`, padding:'2px 6px',
          borderRadius:'20px', flexShrink:0, textTransform:'uppercase', letterSpacing:'0.04em',
        }}>{ev.status}</span>
      </div>
      <p style={{ color:'var(--text-muted)', fontSize:'11px', marginBottom:'9px' }}>
        {fmtTime(ev.start_time)} – {fmtTime(ev.end_time)}
      </p>
      <p style={{ fontSize:'9px', color:'var(--text-faint)', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'5px' }}>Add to calendar</p>
      <div style={{ display:'flex', gap:'6px' }}>
        <a href={makeGoogleLink(ev)} target="_blank" rel="noopener noreferrer"
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', fontSize:'11px', fontWeight:'700', color:'#4285F4', background:'rgba(66,133,244,0.10)', border:'1px solid rgba(66,133,244,0.25)', borderRadius:'9px', padding:'6px 8px', textDecoration:'none', transition:'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(66,133,244,0.20)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(66,133,244,0.10)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize:'14px' }}>calendar_add_on</span>Google
        </a>
        <a href={makeOutlookLink(ev)} target="_blank" rel="noopener noreferrer"
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', fontSize:'11px', fontWeight:'700', color:'#0078D4', background:'rgba(0,120,212,0.10)', border:'1px solid rgba(0,120,212,0.25)', borderRadius:'9px', padding:'6px 8px', textDecoration:'none', transition:'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(0,120,212,0.20)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(0,120,212,0.10)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize:'14px' }}>calendar_month</span>Outlook
        </a>
      </div>
    </div>
  )
}
