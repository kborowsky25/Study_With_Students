import { useEffect, useState } from 'react'
import { getStudyRooms, saveToCalendar } from '../api/studyrooms'
import HubLayout from '../components/layout/HubLayout'
import PaywallGate from '../components/features/PaywallGate'
import toast from 'react-hot-toast'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const AMBER  = '#fbbf24'
const BLUE   = '#60a5fa'
const PURPLE = '#a78bfa'

// Subject → colour + icon
const SUBJECT_META = {
  'Maths':            { color: BLUE,      icon: 'calculate' },
  'Mathematics':      { color: BLUE,      icon: 'calculate' },
  'Physics':          { color: '#c084fc', icon: 'science' },
  'Chemistry':        { color: GREEN,     icon: 'biotech' },
  'Biology':          { color: '#4ade80', icon: 'eco' },
  'Computer Science': { color: CORAL,     icon: 'terminal' },
  'Economics':        { color: AMBER,     icon: 'trending_up' },
  'English':          { color: PURPLE,    icon: 'menu_book' },
  'History':          { color: '#fb923c', icon: 'history_edu' },
  'Law':              { color: '#94a3b8', icon: 'gavel' },
  'Psychology':       { color: '#f472b6', icon: 'psychology' },
  'Statistics':       { color: BLUE,      icon: 'bar_chart' },
}

function getSubjectMeta(subject) {
  if (!subject) return { color: CORAL, icon: 'school' }
  const key = Object.keys(SUBJECT_META).find(k =>
    subject.toLowerCase().includes(k.toLowerCase())
  )
  return SUBJECT_META[key] ?? { color: CORAL, icon: 'school' }
}

function getRoomStatus(room) {
  const now   = new Date()
  const start = room.start_time ? new Date(room.start_time) : null
  const end   = room.end_time   ? new Date(room.end_time)   : null
  if (!start) return { label: 'Scheduled', type: 'upcoming' }
  if (end && now > end) return { label: 'Ended', type: 'ended' }
  if (now >= start) return { label: 'Live Now', type: 'live' }
  const diffMs  = start - now
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return { label: `In ${diffMin}m`, type: 'soon' }
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return { label: `In ${diffHr}h`, type: 'upcoming' }
  return { label: start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), type: 'upcoming' }
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return null
  const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const SORT_OPTIONS = [
  { key: 'hot',      label: 'Hot',      icon: 'local_fire_department' },
  { key: 'new',      label: 'New',      icon: 'schedule' },
  { key: 'upcoming', label: 'Upcoming', icon: 'event' },
]

export default function StudyRoomsStudent() {
  const [rooms,   setRooms]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(null)
  const [sort,    setSort]    = useState('hot')
  const [subject, setSubject] = useState('all')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    getStudyRooms()
      .then(({ data }) => setRooms(data.rooms ?? []))
      .catch(() => toast.error('Could not load study rooms'))
      .finally(() => setLoading(false))
    requestAnimationFrame(() => setMounted(true))
  }, [])

  async function handleSave(roomId) {
    setSaving(roomId)
    try {
      await saveToCalendar(roomId)
      toast.success('Added to your calendar! 📅')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed')
    } finally {
      setSaving(null)
    }
  }

  const now        = new Date()
  const liveRooms  = rooms.filter(r => r.start_time && new Date(r.start_time) <= now && (!r.end_time || new Date(r.end_time) > now))
  const activeRooms = rooms.filter(r => !r.end_time || new Date(r.end_time) > now)

  // Unique subjects from active rooms
  const subjects = ['all', ...new Set(activeRooms.map(r => r.subject).filter(Boolean))]

  // Filter by selected subject
  const subjectFiltered = subject === 'all'
    ? activeRooms
    : activeRooms.filter(r => r.subject === subject)

  // Sort
  const sorted = [...subjectFiltered].sort((a, b) => {
    const aS = getRoomStatus(a)
    const bS = getRoomStatus(b)
    if (sort === 'hot') {
      const order = { live: 0, soon: 1, upcoming: 2, ended: 3 }
      const diff = (order[aS.type] ?? 2) - (order[bS.type] ?? 2)
      if (diff !== 0) return diff
      return new Date(a.start_time) - new Date(b.start_time)
    }
    if (sort === 'new') return (b.id ?? 0) - (a.id ?? 0)
    // upcoming: soonest first
    return new Date(a.start_time) - new Date(b.start_time)
  })

  return (
    <HubLayout>
      <PaywallGate feature="Study Rooms">
        <div style={{ display: 'flex', height: '100%', gap: '20px', minHeight: 0 }}>

          {/* ── Left sidebar: subject categories ─────────────────────────────── */}
          <div style={{ width: '168px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>

            {/* Sidebar header */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-faint)' }}>category</span>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Subjects</span>
              </div>
              {/* Live indicator */}
              {liveRooms.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.22)',
                  borderRadius: '8px', padding: '5px 9px',
                }}>
                  <span className="animate-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: GREEN, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: GREEN }}>
                    {liveRooms.length} live now
                  </span>
                </div>
              )}
            </div>

            {/* Category pills */}
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="skeleton" style={{ height: '36px', borderRadius: '10px', marginBottom: '3px' }} />
              ))
            ) : subjects.map(sub => {
              const meta   = sub === 'all' ? { color: CORAL, icon: 'apps' } : getSubjectMeta(sub)
              const active = subject === sub
              const count  = sub === 'all'
                ? activeRooms.length
                : activeRooms.filter(r => r.subject === sub).length
              const hasLive = sub !== 'all' && liveRooms.some(r => r.subject === sub)

              return (
                <button
                  key={sub}
                  onClick={() => setSubject(sub)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', borderRadius: '10px', width: '100%', textAlign: 'left',
                    background: active ? `${meta.color}18` : 'transparent',
                    border: `1px solid ${active ? meta.color + '35' : 'transparent'}`,
                    color: active ? meta.color : 'var(--text-muted)',
                    fontSize: '12px', fontWeight: active ? '700' : '500',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'
                      e.currentTarget.style.color = 'var(--text)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.border = '1px solid transparent'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', flexShrink: 0 }}>{meta.icon}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sub === 'all' ? 'All Rooms' : sub}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                    {hasLive && (
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                    )}
                    <span style={{
                      fontSize: '9px', fontWeight: '700',
                      background: active ? `${meta.color}28` : 'rgba(255,255,255,0.06)',
                      color: active ? meta.color : 'var(--text-faint)',
                      borderRadius: '5px', padding: '1px 5px', minWidth: '16px', textAlign: 'center',
                    }}>
                      {count}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Main feed ────────────────────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Top bar: title + sort tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {subject === 'all' ? 'Study Rooms' : subject}
                </h1>
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                  {sorted.length} session{sorted.length !== 1 ? 's' : ''} · Live group sessions by your tutors
                </p>
              </div>

              {/* Sort pill bar */}
              <div style={{
                display: 'flex', gap: '3px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '4px',
                flexShrink: 0,
              }}>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSort(opt.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 11px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                      background: sort === opt.key ? `${CORAL}18` : 'transparent',
                      border: `1px solid ${sort === opt.key ? CORAL + '35' : 'transparent'}`,
                      color: sort === opt.key ? CORAL : 'var(--text-muted)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed list */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '2px' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '14px' }} />
                  ))}
                </div>

              ) : sorted.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 16px',
                    background: 'rgba(96,165,250,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: BLUE }}>groups</span>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: '15px', fontWeight: '700', marginBottom: '5px' }}>No study rooms found</p>
                  <p style={{ color: 'var(--text-faint)', fontSize: '12px', marginBottom: '14px' }}>
                    {subject !== 'all'
                      ? `No ${subject} sessions available yet`
                      : 'Check back later — tutors create new sessions regularly'}
                  </p>
                  {subject !== 'all' && (
                    <button
                      onClick={() => setSubject('all')}
                      style={{
                        padding: '7px 18px', borderRadius: '10px',
                        border: `1px solid ${BLUE}35`, background: `${BLUE}12`,
                        color: BLUE, fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                      }}
                    >
                      Show all subjects
                    </button>
                  )}
                </div>

              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {sorted.map((room, idx) => (
                    <RoomPost
                      key={room.id}
                      room={room}
                      saving={saving}
                      onSave={handleSave}
                      mounted={mounted}
                      animDelay={Math.min(idx * 50, 300)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PaywallGate>
    </HubLayout>
  )
}

// ── Reddit-style room post ────────────────────────────────────────────────────
function RoomPost({ room, saving, onSave, mounted, animDelay }) {
  const meta     = getSubjectMeta(room.subject)
  const status   = getRoomStatus(room)
  const duration = formatDuration(room.start_time, room.end_time)
  const isLive   = status.type === 'live'
  const isSoon   = status.type === 'soon'

  const statusStyles = {
    live:     { bg: 'rgba(52,211,153,0.14)',  color: GREEN,              border: 'rgba(52,211,153,0.28)' },
    soon:     { bg: 'rgba(251,191,36,0.14)',  color: AMBER,              border: 'rgba(251,191,36,0.28)' },
    upcoming: { bg: 'rgba(96,165,250,0.12)',  color: BLUE,               border: 'rgba(96,165,250,0.25)' },
    ended:    { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-faint)', border: 'var(--border)' },
  }
  const ss = statusStyles[status.type] ?? statusStyles.upcoming

  return (
    <div
      className={mounted ? 'animate-slide-up' : ''}
      style={{
        animationDelay: `${animDelay}ms`,
        background: isLive
          ? 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, var(--bg-card) 60%)'
          : 'var(--bg-card)',
        border: `1px solid ${isLive ? 'rgba(52,211,153,0.22)' : `${meta.color}18`}`,
        borderRadius: '14px',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '14px',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
    >
      {/* Live left stripe */}
      {isLive && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
          background: `linear-gradient(180deg, ${GREEN}, rgba(52,211,153,0.3))`,
          borderRadius: '14px 0 0 14px',
        }} />
      )}

      {/* Subject icon */}
      <div style={{
        width: '46px', height: '46px', borderRadius: '13px', flexShrink: 0,
        background: `${meta.color}18`,
        border: `1px solid ${meta.color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ color: meta.color, fontSize: '23px' }}>{meta.icon}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '14px', fontWeight: '800', color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {room.subject}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', flexShrink: 0,
            background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
          }}>
            {isLive && <span className="animate-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: GREEN }} />}
            {status.label}
          </span>
        </div>

        {/* Description */}
        {room.description && (
          <p style={{
            fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '6px',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
          }}>
            {room.description}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--text-faint)' }}>schedule</span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{formatTime(room.start_time)}</span>
          </div>
          {duration && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--text-faint)' }}>timelapse</span>
              <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{duration}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, alignItems: 'flex-end' }}>
        {room.zoom_link && isLive ? (
          <a
            href={room.zoom_link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 14px', borderRadius: '10px',
              fontSize: '12px', fontWeight: '800',
              background: `linear-gradient(135deg, ${GREEN}, rgba(52,211,153,0.7))`,
              color: '#0d1f1a', textDecoration: 'none',
              boxShadow: '0 3px 12px rgba(52,211,153,0.28)',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>videocam</span>
            Join Live
          </a>
        ) : room.zoom_link ? (
          <a
            href={room.zoom_link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '10px',
              fontSize: '11px', fontWeight: '700',
              background: 'rgba(96,165,250,0.10)', color: BLUE,
              border: '1px solid rgba(96,165,250,0.22)', textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>videocam</span>
            Zoom
          </a>
        ) : null}

        <button
          onClick={() => onSave(room.id)}
          disabled={saving === room.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '7px 12px', borderRadius: '10px',
            fontSize: '11px', fontWeight: '700',
            background: 'var(--btn-secondary-bg)', color: 'var(--text)',
            border: '1px solid var(--border)', cursor: 'pointer',
            opacity: saving === room.id ? 0.6 : 1,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--btn-secondary-bg)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
            {saving === room.id ? 'sync' : 'calendar_add_on'}
          </span>
          {saving === room.id ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
