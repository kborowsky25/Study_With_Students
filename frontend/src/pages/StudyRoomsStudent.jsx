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
  'Maths':            { color: BLUE,   icon: 'calculate' },
  'Mathematics':      { color: BLUE,   icon: 'calculate' },
  'Physics':          { color: '#c084fc', icon: 'science' },
  'Chemistry':        { color: '#34d399', icon: 'biotech' },
  'Biology':          { color: GREEN,  icon: 'eco' },
  'Computer Science': { color: CORAL,  icon: 'terminal' },
  'Economics':        { color: AMBER,  icon: 'trending_up' },
  'English':          { color: PURPLE, icon: 'menu_book' },
  'History':          { color: '#fb923c', icon: 'history_edu' },
  'Law':              { color: '#94a3b8', icon: 'gavel' },
  'Psychology':       { color: '#f472b6', icon: 'psychology' },
  'Statistics':       { color: BLUE,   icon: 'bar_chart' },
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
  return { label: formatRelDate(start), type: 'upcoming' }
}

function formatRelDate(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
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

export default function StudyRoomsStudent() {
  const [rooms,   setRooms]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(null)
  const [filter,  setFilter]  = useState('all')
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

  const now    = new Date()
  const liveRooms     = rooms.filter(r => r.start_time && new Date(r.start_time) <= now && (!r.end_time || new Date(r.end_time) > now))
  const upcomingRooms = rooms.filter(r => r.start_time && new Date(r.start_time) > now)

  const filtered = filter === 'live'
    ? liveRooms
    : filter === 'upcoming'
    ? upcomingRooms
    : rooms.filter(r => !r.end_time || new Date(r.end_time) > now)

  return (
    <HubLayout>
      <PaywallGate feature="Study Rooms">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className={`mb-8 ${mounted ? 'animate-slide-up' : ''}`} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '11px',
                background: 'linear-gradient(135deg, rgba(96,165,250,0.20), rgba(167,139,250,0.20))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ color: BLUE, fontSize: '22px' }}>groups</span>
              </div>
              <h1 className="page-title" style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '-0.03em' }}>
                Study Rooms
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Live group sessions hosted by your tutors
            </p>

            {/* Live indicator */}
            {liveRooms.length > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px',
                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                borderRadius: '20px', padding: '4px 12px',
              }}>
                <span className="animate-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
                <span style={{ fontSize: '12px', fontWeight: '700', color: GREEN }}>
                  {liveRooms.length} session{liveRooms.length !== 1 ? 's' : ''} live right now
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          {!loading && rooms.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <div style={{ fontSize: '20px', fontWeight: '900', color: GREEN }}>{liveRooms.length}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '600', marginTop: '1px' }}>LIVE</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <div style={{ fontSize: '20px', fontWeight: '900', color: BLUE }}>{upcomingRooms.length}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '600', marginTop: '1px' }}>UPCOMING</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Filter tabs ─────────────────────────────────────────────── */}
        {!loading && rooms.length > 0 && (
          <div className={mounted ? 'animate-slide-up delay-100' : ''} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[
              { key: 'all',      label: 'All Sessions',   icon: 'grid_view' },
              { key: 'live',     label: 'Live Now',        icon: 'play_circle', accent: GREEN },
              { key: 'upcoming', label: 'Upcoming',        icon: 'schedule',    accent: BLUE },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '10px',
                  background: filter === tab.key ? (tab.accent ? `${tab.accent}18` : `${CORAL}18`) : 'var(--bg-card)',
                  border: `1px solid ${filter === tab.key ? (tab.accent ?? CORAL) + '35' : 'var(--border)'}`,
                  color: filter === tab.key ? (tab.accent ?? CORAL) : 'var(--text-muted)',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{tab.icon}</span>
                {tab.label}
                {tab.key === 'live' && liveRooms.length > 0 && (
                  <span style={{ background: GREEN, color: '#000', fontSize: '9px', fontWeight: '800', padding: '1px 5px', borderRadius: '8px' }}>
                    {liveRooms.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Content ────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton" style={{ height: '220px', borderRadius: '16px' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 20px',
              background: 'rgba(96,165,250,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: BLUE }}>groups</span>
            </div>
            <p style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>
              {filter === 'live' ? 'No live sessions right now' : 'No study rooms available'}
            </p>
            <p style={{ color: 'var(--text-faint)', fontSize: '13px' }}>
              {filter === 'live'
                ? 'Check the upcoming tab for scheduled sessions'
                : 'Check back later — tutors are always creating new sessions'}
            </p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="btn-secondary" style={{ marginTop: '16px', fontSize: '13px' }}>
                Show all rooms
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map((room, idx) => (
              <RoomCard
                key={room.id}
                room={room}
                saving={saving}
                onSave={handleSave}
                animDelay={Math.min(idx * 60, 350)}
                mounted={mounted}
              />
            ))}
          </div>
        )}

      </PaywallGate>
    </HubLayout>
  )
}

function RoomCard({ room, saving, onSave, animDelay, mounted }) {
  const meta     = getSubjectMeta(room.subject)
  const status   = getRoomStatus(room)
  const duration = formatDuration(room.start_time, room.end_time)
  const isLive   = status.type === 'live'

  const statusStyle = {
    live:     { background: 'rgba(52,211,153,0.14)',  color: GREEN,  border: '1px solid rgba(52,211,153,0.28)' },
    soon:     { background: 'rgba(251,191,36,0.14)',  color: AMBER,  border: '1px solid rgba(251,191,36,0.28)' },
    upcoming: { background: 'rgba(96,165,250,0.12)',  color: BLUE,   border: '1px solid rgba(96,165,250,0.25)' },
    ended:    { background: 'rgba(255,255,255,0.05)', color: 'var(--text-faint)', border: '1px solid var(--border)' },
  }[status.type] ?? {}

  return (
    <div
      className={mounted ? 'animate-slide-up' : ''}
      style={{
        animationDelay: `${animDelay}ms`,
        background: isLive
          ? 'linear-gradient(135deg, rgba(52,211,153,0.07) 0%, var(--bg-card) 60%)'
          : 'var(--bg-card)',
        border: `1px solid ${isLive ? 'rgba(52,211,153,0.20)' : 'var(--border)'}`,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
    >
      {/* Ambient glow for live */}
      {isLive && (
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(52,211,153,0.10)', borderRadius: '50%', filter: 'blur(24px)', pointerEvents: 'none' }} />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        {/* Subject icon */}
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
          background: `${meta.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ color: meta.color, fontSize: '22px' }}>{meta.icon}</span>
        </div>

        {/* Status pill */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
          ...statusStyle, flexShrink: 0,
        }}>
          {isLive && <span className="animate-pulse-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: GREEN }} />}
          {status.label}
        </span>
      </div>

      {/* Title + description */}
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: '5px', lineHeight: 1.3 }}>
          {room.subject}
        </h3>
        {room.description && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {room.description}
          </p>
        )}
      </div>

      {/* Time info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-faint)' }}>schedule</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatTime(room.start_time)}</span>
        </div>
        {duration && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-faint)' }}>timelapse</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{duration} session</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        {room.zoom_link && isLive && (
          <a
            href={room.zoom_link}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '9px', borderRadius: '10px', fontSize: '13px', fontWeight: '800',
              background: `linear-gradient(135deg, ${GREEN}, rgba(52,211,153,0.7))`,
              color: '#0d1f1a', textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(52,211,153,0.30)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>videocam</span>
            Join Live
          </a>
        )}
        {room.zoom_link && !isLive && (
          <a
            href={room.zoom_link}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ flex: 1, fontSize: '12px', padding: '8px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>videocam</span>
            Zoom Link
          </a>
        )}
        <button
          onClick={() => onSave(room.id)}
          disabled={saving === room.id}
          style={{
            flex: room.zoom_link ? '0 0 auto' : 1,
            padding: '9px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
            background: 'var(--btn-secondary-bg)', color: 'var(--text)',
            border: '1px solid var(--border)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            opacity: saving === room.id ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            {saving === room.id ? 'sync' : 'calendar_add_on'}
          </span>
          {saving === room.id ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
