import { useEffect, useState } from 'react'
import { getStudyRooms, createStudyRoom } from '../api/studyrooms'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const AMBER  = '#fbbf24'
const BLUE   = '#60a5fa'
const PURPLE = '#a78bfa'

const SUBJECT_META = {
  'Maths':            { color: BLUE,   icon: 'calculate' },
  'Mathematics':      { color: BLUE,   icon: 'calculate' },
  'Physics':          { color: '#c084fc', icon: 'science' },
  'Chemistry':        { color: GREEN,  icon: 'biotech' },
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
  if (now >= start) return { label: 'Live', type: 'live' }
  const diffMin = Math.floor((start - now) / 60000)
  if (diffMin < 60) return { label: `In ${diffMin}m`, type: 'soon' }
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return { label: `In ${diffHr}h`, type: 'upcoming' }
  return { label: start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), type: 'upcoming' }
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

const EMPTY_FORM = { subject: '', description: '', start_time: '', end_time: '', zoom_link: '' }

export default function StudyRoomsTutor() {
  const [rooms,    setRooms]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [mounted,  setMounted]  = useState(false)

  async function load() {
    try {
      const { data } = await getStudyRooms()
      setRooms(data.rooms ?? [])
    } catch { toast.error('Could not load rooms') }
    finally  { setLoading(false) }
  }

  useEffect(() => {
    load()
    requestAnimationFrame(() => setMounted(true))
  }, [])

  function update(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      await createStudyRoom(form)
      toast.success('Study room created! 🎉')
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  const now          = new Date()
  const liveRooms    = rooms.filter(r => r.start_time && new Date(r.start_time) <= now && (!r.end_time || new Date(r.end_time) > now))
  const upcomingRoom = rooms.filter(r => r.start_time && new Date(r.start_time) > now)
  const nextRoom     = upcomingRoom.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0]

  return (
    <HubLayout initialMode="tutor">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className={mounted ? 'animate-slide-up' : ''}
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '11px',
              background: 'linear-gradient(135deg, rgba(255,114,94,0.20), rgba(251,191,36,0.20))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '22px' }}>group_work</span>
            </div>
            <h1 className="page-title" style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '-0.03em' }}>
              My Study Rooms
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Manage your group study sessions — all sessions are free
          </p>
          {liveRooms.length > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px',
              background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
              borderRadius: '20px', padding: '4px 12px',
            }}>
              <span className="animate-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: GREEN }}>
                {liveRooms.length} room{liveRooms.length !== 1 ? 's' : ''} live
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowForm(f => !f)}
          className={showForm ? 'btn-secondary' : 'btn-primary'}
          style={{ flexShrink: 0 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {showForm ? 'close' : 'add'}
          </span>
          {showForm ? 'Cancel' : 'Create Room'}
        </button>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────── */}
      {!loading && (
        <div
          className={mounted ? 'animate-slide-up delay-100' : ''}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}
        >
          {[
            { label: 'Total Rooms', value: rooms.length, icon: 'grid_view',   color: 'var(--text)' },
            { label: 'Live Now',    value: liveRooms.length, icon: 'live_tv', color: GREEN },
            { label: 'Upcoming',   value: upcomingRoom.length, icon: 'event', color: BLUE },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${s.color === 'var(--text)' ? CORAL : s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: s.color === 'var(--text)' ? CORAL : s.color, fontSize: '18px' }}>{s.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Next upcoming chip ──────────────────────────────────────── */}
      {nextRoom && !showForm && (
        <div
          className={mounted ? 'animate-slide-up delay-150' : ''}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
            background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.20)',
            borderRadius: '12px', padding: '12px 16px',
          }}
        >
          <span className="material-symbols-outlined" style={{ color: BLUE, fontSize: '18px' }}>upcoming</span>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Next session: </span>
            <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: '700' }}>{nextRoom.subject}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}> · {formatTime(nextRoom.start_time)}</span>
          </div>
          {nextRoom.zoom_link && (
            <a href={nextRoom.zoom_link} target="_blank" rel="noreferrer"
              style={{ marginLeft: 'auto', fontSize: '11px', color: BLUE, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>videocam</span>
              Open Zoom
            </a>
          )}
        </div>
      )}

      {/* ── Create form ─────────────────────────────────────────────── */}
      {showForm && (
        <div
          className="animate-slide-up"
          style={{
            marginBottom: '24px',
            background: 'var(--bg-card)',
            border: `1px solid ${CORAL}28`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '18px' }}>add_circle</span>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>New Study Room</h2>
          </div>

          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Subject *
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={update('subject')}
                  required
                  placeholder="e.g. Advanced Maths"
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Zoom Link
                </label>
                <input
                  type="url"
                  value={form.zoom_link}
                  onChange={update('zoom_link')}
                  placeholder="https://zoom.us/j/…"
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={update('start_time')}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={update('end_time')}
                  required
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={update('description')}
                rows={3}
                placeholder="What topics will you cover? What should students prepare?"
                className="input-field"
                style={{ resize: 'none', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={creating}
                className="btn-primary"
                style={{ opacity: creating ? 0.6 : 1 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {creating ? 'sync' : 'add_circle'}
                </span>
                {creating ? 'Creating…' : 'Create Room'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Rooms grid ──────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '16px' }} />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '22px', margin: '0 auto 20px',
            background: `${CORAL}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: CORAL }}>group_work</span>
          </div>
          <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>
            No study rooms yet
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Create your first group session to get started
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            Create First Room
          </button>
        </div>
      ) : (
        <div
          className={mounted ? 'animate-slide-up delay-200' : ''}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}
        >
          {rooms.map((room, idx) => {
            const meta   = getSubjectMeta(room.subject)
            const status = getRoomStatus(room)
            const isLive = status.type === 'live'
            const isEnded = status.type === 'ended'

            const statusStyle = {
              live:     { bg: 'rgba(52,211,153,0.14)',  color: GREEN, border: 'rgba(52,211,153,0.28)' },
              soon:     { bg: 'rgba(251,191,36,0.14)',  color: AMBER, border: 'rgba(251,191,36,0.28)' },
              upcoming: { bg: 'rgba(96,165,250,0.12)',  color: BLUE,  border: 'rgba(96,165,250,0.25)' },
              ended:    { bg: 'rgba(255,255,255,0.04)', color: 'var(--text-faint)', border: 'var(--border)' },
            }[status.type] ?? {}

            return (
              <div
                key={room.id}
                style={{
                  background: isLive ? 'linear-gradient(135deg, rgba(52,211,153,0.07), var(--bg-card))' : 'var(--bg-card)',
                  border: `1px solid ${isLive ? 'rgba(52,211,153,0.22)' : isEnded ? 'var(--border)' : `${meta.color}20`}`,
                  borderRadius: '16px',
                  padding: '18px 20px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                  opacity: isEnded ? 0.6 : 1,
                  boxShadow: 'var(--shadow-card)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => { if (!isEnded) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ color: meta.color, fontSize: '18px' }}>{meta.icon}</span>
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)', lineHeight: 1.2 }}>
                      {room.subject}
                    </h3>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 9px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', flexShrink: 0,
                    background: statusStyle.bg, color: statusStyle.color,
                    border: `1px solid ${statusStyle.border}`,
                  }}>
                    {isLive && <span className="animate-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: GREEN }} />}
                    {status.label}
                  </span>
                </div>

                {/* Description */}
                {room.description && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {room.description}
                  </p>
                )}

                {/* Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--text-faint)' }}>schedule</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(room.start_time)}</span>
                </div>

                {/* Zoom link */}
                {room.zoom_link && (
                  <a
                    href={room.zoom_link}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                      background: isLive ? 'rgba(52,211,153,0.14)' : 'rgba(96,165,250,0.10)',
                      color: isLive ? GREEN : BLUE,
                      border: `1px solid ${isLive ? 'rgba(52,211,153,0.25)' : 'rgba(96,165,250,0.20)'}`,
                      textDecoration: 'none', marginTop: '2px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>videocam</span>
                    {isLive ? 'Open Live Session' : 'Zoom Link'}
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
