import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getStudyRooms, createStudyRoom } from '../api/studyrooms'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import { useAuth } from '../context/AuthContext'
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

const EMPTY_FORM = { subject: '', description: '', start_time: '', end_time: '', zoom_link: '' }

// ── Create Room Modal ─────────────────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreated }) {
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  function update(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setCreating(true)
    try {
      await createStudyRoom(form)
      toast.success('Study room created!')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', border: `1px solid ${CORAL}28`,
        borderRadius: '18px', padding: '28px', width: '100%', maxWidth: '480px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: CORAL, fontSize: '18px' }}>add_circle</span>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Create Study Room</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', padding: '4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        <style>{`
          .sws-dt input[type="date"],
          .sws-dt input[type="time"] {
            color-scheme: dark;
            background: var(--input-bg, rgba(255,255,255,0.06));
            border: 1px solid var(--border, rgba(255,255,255,0.10));
            border-radius: 10px;
            color: var(--text, #fff);
            font-size: 12px;
            padding: 8px 10px;
            width: 100%;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .sws-dt input[type="date"]:focus,
          .sws-dt input[type="time"]:focus {
            border-color: rgba(255,114,94,0.5);
            box-shadow: 0 0 0 3px rgba(255,114,94,0.10);
          }
          .sws-dt input[type="date"]::-webkit-calendar-picker-indicator,
          .sws-dt input[type="time"]::-webkit-calendar-picker-indicator {
            filter: invert(0.7) sepia(1) saturate(3) hue-rotate(330deg);
            cursor: pointer; opacity: 0.7;
          }
        `}</style>
        <form onSubmit={handleSubmit} className="sws-dt">
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
                Start *
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="date" value={form.start_date ?? ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, start_time: e.target.value && f.start_clock ? `${e.target.value}T${f.start_clock}` : '' }))} required />
                <input type="time" value={form.start_clock ?? ''} onChange={e => setForm(f => ({ ...f, start_clock: e.target.value, start_time: f.start_date && e.target.value ? `${f.start_date}T${e.target.value}` : '' }))} required style={{ width: '90px', flexShrink: 0 }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                End
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="date" value={form.end_date ?? ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value, end_time: e.target.value && f.end_clock ? `${e.target.value}T${f.end_clock}` : '' }))} />
                <input type="time" value={form.end_clock ?? ''} onChange={e => setForm(f => ({ ...f, end_clock: e.target.value, end_time: f.end_date && e.target.value ? `${f.end_date}T${e.target.value}` : '' }))} style={{ width: '90px', flexShrink: 0 }} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
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
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '800',
                background: CORAL, color: '#fff', border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.6 : 1, transition: 'opacity 0.15s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {creating ? 'sync' : 'add_circle'}
              </span>
              {creating ? 'Creating…' : 'Create Room'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                background: 'var(--btn-secondary-bg)', color: 'var(--text)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function StudyRoomsTutor() {
  const { user }    = useAuth()
  const isApproved  = user?.screening_status === 'approved'

  const [rooms,       setRooms]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [sort,        setSort]        = useState('hot')
  const [subject,     setSubject]     = useState('all')
  const [mounted,     setMounted]     = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreate,  setShowCreate]  = useState(false)

  function loadRooms() {
    return getStudyRooms()
      .then(({ data }) => setRooms(data.rooms ?? []))
      .catch(() => toast.error('Could not load study rooms'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRooms()
    requestAnimationFrame(() => setMounted(true))
  }, [])

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
      // Primary: saved_count descending
      const countDiff = (b.saved_count ?? 0) - (a.saved_count ?? 0)
      if (countDiff !== 0) return countDiff
      // Secondary: live > soon > upcoming > ended
      const order = { live: 0, soon: 1, upcoming: 2, ended: 3 }
      const statusDiff = (order[aS.type] ?? 2) - (order[bS.type] ?? 2)
      if (statusDiff !== 0) return statusDiff
      return new Date(a.start_time) - new Date(b.start_time)
    }
    if (sort === 'new') return (b.id ?? 0) - (a.id ?? 0)
    // upcoming: soonest first
    return new Date(a.start_time) - new Date(b.start_time)
  })

  // Search filter applied last
  const searchFiltered = searchQuery
    ? sorted.filter(r =>
        r.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sorted

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="Study Rooms" icon="groups" />

      {/* Pending approval banner */}
      {!isApproved && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', flexShrink: 0,
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: AMBER, flexShrink: 0 }}>lock</span>
          <p style={{ fontSize: '12px', color: AMBER, margin: 0, lineHeight: 1.5 }}>
            <strong>Pending approval</strong> — you can browse study rooms, but creating new rooms is locked until your tutor profile is approved.
          </p>
        </div>
      )}

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

          {/* Top bar: count + search + sort tabs + create button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '10px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: '500' }}>
              <span style={{ fontWeight: '700', color: 'var(--text)' }}>{subject === 'all' ? 'All' : subject}</span>
              {' · '}{searchFiltered.length} session{searchFiltered.length !== 1 ? 's' : ''}
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '14px', color: 'var(--text-faint)', pointerEvents: 'none',
                }}>search</span>
                <input
                  type="text"
                  placeholder="Search rooms…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '28px', paddingRight: searchQuery ? '28px' : '10px',
                    paddingTop: '6px', paddingBottom: '6px',
                    borderRadius: '10px', fontSize: '11px', width: '140px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    color: 'var(--text)', outline: 'none',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '1px',
                      display: 'flex', color: 'var(--text-faint)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                  </button>
                )}
              </div>

              {/* Sort pill bar */}
              <div style={{
                display: 'flex', gap: '3px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '4px',
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

              {/* Create Room button */}
              <button
                onClick={() => isApproved && setShowCreate(true)}
                disabled={!isApproved}
                title={!isApproved ? 'Available once your profile is approved' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '7px 14px', borderRadius: '10px',
                  fontSize: '12px', fontWeight: '800',
                  background: CORAL, color: '#fff',
                  border: 'none', cursor: isApproved ? 'pointer' : 'not-allowed',
                  boxShadow: isApproved ? `0 2px 8px ${CORAL}40` : 'none',
                  opacity: isApproved ? 1 : 0.45,
                  transition: 'opacity 0.15s, transform 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (isApproved) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                onMouseLeave={e => { e.currentTarget.style.opacity = isApproved ? '1' : '0.45'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {isApproved ? 'add' : 'lock'}
                </span>
                Create Room
              </button>
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

            ) : searchFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 16px',
                  background: 'rgba(96,165,250,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: BLUE }}>
                    {searchQuery ? 'search_off' : 'groups'}
                  </span>
                </div>
                <p style={{ color: 'var(--text)', fontSize: '15px', fontWeight: '700', marginBottom: '5px' }}>
                  {searchQuery ? `No results for "${searchQuery}"` : 'No study rooms found'}
                </p>
                <p style={{ color: 'var(--text-faint)', fontSize: '12px', marginBottom: '14px' }}>
                  {searchQuery
                    ? 'Try a different search term'
                    : subject !== 'all'
                      ? `No ${subject} sessions available yet`
                      : 'Create your first group study session to get started'}
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ padding: '7px 18px', borderRadius: '10px', border: `1px solid ${CORAL}35`, background: `${CORAL}12`, color: CORAL, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Clear search
                    </button>
                  )}
                  {subject !== 'all' && (
                    <button
                      onClick={() => setSubject('all')}
                      style={{ padding: '7px 18px', borderRadius: '10px', border: `1px solid ${BLUE}35`, background: `${BLUE}12`, color: BLUE, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Show all subjects
                    </button>
                  )}
                </div>
              </div>

            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {searchFiltered.map((room, idx) => (
                  <TutorRoomPost
                    key={room.id}
                    room={room}
                    mounted={mounted}
                    animDelay={Math.min(idx * 50, 300)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={loadRooms}
        />
      )}
    </HubLayout>
  )
}

// ── Tutor-specific RoomPost card ──────────────────────────────────────────────
function TutorRoomPost({ room, mounted, animDelay }) {
  const meta       = getSubjectMeta(room.subject)
  const status     = getRoomStatus(room)
  const duration   = formatDuration(room.start_time, room.end_time)
  const isLive     = status.type === 'live'
  const creatorName = room.tutor_name || room.creator_name || null
  const creatorId   = room.creator_user_id || null

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

        {/* Member count + creator chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '600',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            👥 {room.saved_count ?? 0} attending
          </span>
          {creatorName && (
            creatorId ? (
              <Link
                to="/student/$userId"
                params={{ userId: String(creatorId) }}
                style={{ fontSize: '10px', color: CORAL, fontStyle: 'italic', textDecoration: 'none', opacity: 0.8 }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.textDecoration = 'none' }}
              >
                by {creatorName}
              </Link>
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                by {creatorName}
              </span>
            )
          )}
        </div>

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

      {/* Tutor action buttons */}
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
            Start Session
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
            Zoom Link
          </a>
        ) : null}

        {/* Members stat chip (instead of Save button) */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '6px 10px', borderRadius: '10px',
          fontSize: '11px', fontWeight: '700',
          background: 'var(--bg-card)', color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          whiteSpace: 'nowrap',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>group</span>
          Members: {room.saved_count ?? 0}
        </div>
      </div>
    </div>
  )
}
