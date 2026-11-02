import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import ScreeningQueue, { ScreeningPill } from '../components/features/ScreeningQueue'
import { Avatar, Card, DateChip, EmptyState, Icon, SkeletonRows, Stat, StatusPill } from '../components/ui'
import client from '../api/client'
import { getScreeningQueue } from '../api/screening'
import { toDateInput } from '../lib/dates'
import { formatDate, formatMoney } from '../lib/format'
import { bookingFee } from '../lib/sessions'
import DbsReviewPanel from '../components/features/DbsReviewPanel'

const TABS = [
  ['overview', 'Overview'],
  ['applications', 'Applications'],
  ['users', 'Users'],
  ['sessions', 'Sessions'],
  ['checks', 'Background checks'],
]

const ROLES = [
  ['', 'All'],
  ['student', 'Students'],
  ['tutor', 'Tutors'],
]

/** One request per admin panel, loaded independently so a slow one doesn't hold up the rest. */
function useAdminData(fetcher) {
  const [state, setState] = useState({ data: null, status: 'loading' })
  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    return fetcher()
      .then((data) => setState({ data, status: 'ready' }))
      .catch(() => setState({ data: null, status: 'error' }))
  }, [fetcher])
  useEffect(() => { load() }, [load])
  return { ...state, load, setData: (fn) => setState((s) => ({ ...s, data: fn(s.data) })) }
}

const fetchStats = () => client.get('/admin/stats').then((r) => r.data.stats)
const fetchQueue = () => getScreeningQueue().then((r) => r.data.queue ?? [])
const fetchUsers = () => client.get('/admin/users').then((r) => r.data.users ?? [])
const fetchEvents = () => client.get('/admin/recent-events').then((r) => r.data.events ?? [])

function Retry({ title, onRetry }) {
  return <EmptyState title={title} action={<button className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>} />
}

/** The API only lists days that had sign-ups: fill in the quiet days so the bars line up with time. */
function lastDays(rows, days = 30) {
  const counts = new Map((rows ?? []).map((r) => [String(r.day).slice(0, 10), Number(r.signups) || 0]))
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i))
    const key = toDateInput(d)
    return { key, date: d, signups: counts.get(key) ?? 0 }
  })
}

function Overview({ stats, status, onRetry }) {
  if (status === 'error') return <Card><Retry title="Couldn’t load the numbers." onRetry={onRetry} /></Card>
  const v = (key) => (stats ? stats[key] ?? 0 : '—')
  const days = lastDays(stats?.signups_last_30d)
  const max = Math.max(1, ...days.map((d) => d.signups))
  const total = days.reduce((s, d) => s + d.signups, 0)

  return (
    <>
      <section className="card stat-grid">
        <Stat label="Users" value={v('total_users')} />
        <Stat label="Tutors" value={v('total_tutors')} unit={stats ? `${stats.approved_tutors} verified` : undefined} />
        <Stat label="Pending applications" value={v('pending_screenings')} />
        <Stat label="Sessions" value={v('total_sessions')} unit={stats ? `${stats.completed_sessions} paid` : undefined} />
      </section>
      <Card title="Sign-ups" count={stats ? `${total} in 30 days` : null}>
        {status === 'loading' ? <SkeletonRows rows={2} /> : (
          <div style={{ padding: '4px 0 12px' }}>
            <div className="bars" style={{ gap: 3 }} role="img" aria-label={`${total} sign-ups in the last 30 days`}>
              {days.map((d) => (
                <div key={d.key} className="bar" title={`${formatDate(d.date)}: ${d.signups}`}>
                  <i style={{ height: `${(d.signups / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px 0', fontSize: 11.5, color: 'var(--text-faint)' }}>
              <span>{formatDate(days[0].date)}</span>
              <span>Today</span>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}

function Users({ users, status, onRetry }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const list = users ?? []
  const q = query.trim().toLowerCase()
  const shown = list.filter((u) => {
    const text = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const kind = !role || (role === 'tutor' && u.is_tutor) || (role === 'student' && !u.is_tutor)
    return text && kind
  })

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 360 }}>
          <Icon name="search" size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
          <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email" aria-label="Search users" style={{ paddingLeft: 34 }} />
        </div>
        <div className="mode-switch" role="group" aria-label="Filter by role" style={{ flex: '0 1 auto' }}>
          {ROLES.map(([key, label]) => (
            <button key={label} type="button" className={role === key ? 'on' : ''} aria-pressed={role === key}
              onClick={() => setRole(key)} style={{ padding: '0 10px' }}>{label}</button>
          ))}
        </div>
      </div>
      <Card count={users ? `${shown.length} of ${list.length}` : null} title="Users">
        {status === 'loading' ? <SkeletonRows rows={5} /> : status === 'error' ? <Retry title="Couldn’t load users." onRetry={onRetry} /> : shown.length ? (
          <div className="row-list">
            {shown.map((u) => (
              <Link key={u.id_user} to="/student/$userId" params={{ userId: String(u.id_user) }} className="row row-wrap">
                <Avatar name={u.name || '?'} size={28} />
                <div className="main">
                  <div className="title">{u.name || 'No name'}</div>
                  <div className="meta">{u.email}</div>
                </div>
                <div className="row-actions">
                  {u.is_tutor ? <ScreeningPill status={u.screening_status} /> : <span className="side hide-mobile">Student</span>}
                </div>
              </Link>
            ))}
          </div>
        ) : <EmptyState title="No one matches." />}
      </Card>
    </>
  )
}

function Sessions({ events, status, onRetry }) {
  return (
    <Card title="Latest sessions" count={events?.length || null}>
      {status === 'loading' ? <SkeletonRows rows={5} /> : status === 'error' ? <Retry title="Couldn’t load sessions." onRetry={onRetry} /> : events?.length ? (
        <div className="row-list">
          {events.map((ev) => (
            <div key={ev.id_event} className="row row-wrap">
              <DateChip value={ev.start_time} />
              <div className="main">
                <div className="title">{ev.title || 'Tutoring session'}</div>
                <div className="meta">{ev.student_name} with {ev.tutor_name}</div>
              </div>
              <div className="row-actions">
                <span className="side">
                  {formatMoney(ev.amount)}{bookingFee(ev) > 0 && ` + ${formatMoney(bookingFee(ev))} fee`}
                </span>
                <StatusPill status={ev.status} />
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState title="No sessions yet." />}
    </Card>
  )
}

export default function SuperAdmin() {
  const [tab, setTab] = useState('overview')
  const stats = useAdminData(fetchStats)
  const queue = useAdminData(fetchQueue)
  const users = useAdminData(fetchUsers)
  const events = useAdminData(fetchEvents)

  const pending = useMemo(() => (queue.data ?? []).filter((t) => t.screening_status === 'pending').length, [queue.data])

  // An approval or rejection changes the numbers and the users' screening status too.
  function patchApplication(id, change) {
    queue.setData((list) => list.map((t) => (t.id_tutor === id ? { ...t, ...change } : t)))
    stats.load()
    users.load()
  }

  return (
    <HubLayout>
      <PageTitle title="Admin" icon="admin_panel_settings" />

      <div className="dash-head">
        <h1>Admin</h1>
      </div>

      <div className="tabs" role="tablist" aria-label="Admin sections">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
            {label}
            {key === 'applications' && pending > 0 && <span className="nav-badge">{pending}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview stats={stats.data} status={stats.status} onRetry={stats.load} />}
      {tab === 'applications' && (
        <ScreeningQueue queue={queue.data ?? []} loading={queue.status === 'loading'} failed={queue.status === 'error'}
          onReload={queue.load} onChange={patchApplication} />
      )}
      {tab === 'users' && <Users users={users.data} status={users.status} onRetry={users.load} />}
      {tab === 'sessions' && <Sessions events={events.data} status={events.status} onRetry={events.load} />}
      {tab === 'checks' && <DbsReviewPanel />}
    </HubLayout>
  )
}
