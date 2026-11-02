import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Card, DateChip, EmptyState, Icon, SkeletonRows, Stat, StatusPill } from '../components/ui'
import { getPayments } from '../api/payments'
import { formatMoney, formatTime, weekBuckets } from '../lib/format'

const LIST_PREVIEW = 8

// Status labels from the tutor's side of a session.
const TUTOR_LABEL = { pending: 'To confirm', confirmed: 'Unpaid' }

const FILTERS = [
  ['all', 'All', () => true],
  ['paid', 'Paid', (e) => e.status === 'paid'],
  ['unpaid', 'Unpaid', (e) => e.status === 'confirmed'],
]

const sum = (list) => list.reduce((s, e) => s + Number(e.amount || 0), 0)
const byStart = (a, b) => new Date(a.start_time) - new Date(b.start_time)
const sameMonth = (value, now) => {
  const d = new Date(value)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function EarningsChart({ paid }) {
  const weeks = weekBuckets(8).map((b) => ({
    ...b,
    amount: sum(paid.filter((e) => { const t = new Date(e.start_time); return t >= b.start && t < b.end })),
  }))
  const max = Math.max(1, ...weeks.map((w) => w.amount))

  return (
    <Card title="Paid by week" count={`${formatMoney(sum(weeks))} · 8 weeks`}>
      <div style={{ padding: '14px 18px 16px' }}>
        <div className="bars">
          {weeks.map((w, i) => (
            <div className={`bar ${i === weeks.length - 1 ? 'hot' : ''}`} key={w.label} title={`${formatMoney(w.amount)} · week of ${w.label}`}>
              <i style={{ height: `${(w.amount / max) * 100}%`, animationDelay: `${i * 40}ms` }} />
              <span>{w.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function SessionRow({ ev, children }) {
  return (
    <div className="row">
      <DateChip value={ev.start_time} />
      <div className="main">
        <div className="title">{ev.title || 'Tutoring session'}</div>
        <div className="meta">{ev.student_name} · {formatTime(ev.start_time)}–{formatTime(ev.end_time)}</div>
      </div>
      {children}
    </div>
  )
}

function Amount({ ev }) {
  const cancelled = ev.status === 'canceled'
  return (
    <span style={{
      fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
      color: cancelled ? 'var(--text-faint)' : 'var(--text)', textDecoration: cancelled ? 'line-through' : 'none',
    }}>
      {formatMoney(ev.amount)}
    </span>
  )
}

export default function Earnings() {
  const [events, setEvents] = useState([])
  const [phase, setPhase] = useState('loading') // loading | ready | error
  const [filter, setFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)

  async function load() {
    setPhase('loading')
    try {
      const { data } = await getPayments({ role: 'tutor' })
      setEvents(data.events ?? [])
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }

  useEffect(() => { load() }, [])

  const now = new Date()
  const paid = events.filter((e) => e.status === 'paid')
  const unpaid = events.filter((e) => e.status === 'confirmed').sort(byStart)
  const matches = FILTERS.find(([key]) => key === filter)[2]
  const listed = events.filter(matches) // newest first, as the API sends them
  const visible = showAll ? listed : listed.slice(0, LIST_PREVIEW)
  const loading = phase === 'loading'
  const show = (value) => (loading ? '—' : value)

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="Earnings" icon="account_balance" />

      <div className="dash-head">
        <h1>Earnings</h1>
        <div className="dash-actions">
          <Link to="/tutor-profile" className="btn btn-ghost"><Icon name="sell" />Edit rate</Link>
        </div>
      </div>

      {phase === 'error' ? (
        <Card>
          <EmptyState title="Couldn’t load your earnings." action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
        </Card>
      ) : (
        <>
          <section className="card stat-grid">
            <Stat label="Earned this month" value={show(formatMoney(sum(paid.filter((e) => sameMonth(e.start_time, now)))))} />
            <Stat label="All-time" value={show(formatMoney(sum(paid)))} />
            <Stat label="Awaiting payment" value={show(formatMoney(sum(unpaid)))} />
            <Stat label="You keep" value="100%" />
          </section>

          <div className="dash-grid">
            <div className="dash-col">
              <EarningsChart paid={paid} />

              <section>
                <div className="tabs" role="tablist" aria-label="Sessions">
                  {FILTERS.map(([key, label, test]) => (
                    <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? 'on' : ''}
                      onClick={() => { setFilter(key); setShowAll(false) }}>
                      {label}{!loading && <span className="count">{events.filter(test).length}</span>}
                    </button>
                  ))}
                </div>
                <Card>
                  {loading ? <SkeletonRows rows={4} /> : listed.length ? (
                    <div className="row-list">
                      {visible.map((ev) => (
                        <SessionRow key={ev.id_event} ev={ev}>
                          <Amount ev={ev} />
                          <StatusPill status={ev.status} label={TUTOR_LABEL[ev.status]} />
                        </SessionRow>
                      ))}
                      {listed.length > LIST_PREVIEW && (
                        <button className="row" onClick={() => setShowAll((v) => !v)}
                          style={{ justifyContent: 'center', fontSize: 12.5, fontWeight: 500, color: 'var(--text-muted)' }}>
                          {showAll ? 'Show less' : `Show all ${listed.length}`}
                        </button>
                      )}
                    </div>
                  ) : <EmptyState title={filter === 'all' ? 'No sessions yet.' : `No ${filter} sessions.`} />}
                </Card>
              </section>
            </div>

            <div className="dash-col">
              <Card title="Awaiting payment" count={unpaid.length || null}>
                {loading ? <SkeletonRows rows={2} /> : unpaid.length ? (
                  <div className="row-list">
                    {unpaid.map((ev) => (
                      <SessionRow key={ev.id_event} ev={ev}>
                        <Amount ev={ev} />
                        <Link to="/messages" search={{ user: ev.student_user_id }} className="icon-btn" aria-label={`Message ${ev.student_name}`}>
                          <Icon name="chat" />
                        </Link>
                      </SessionRow>
                    ))}
                  </div>
                ) : <EmptyState title="Nothing outstanding." />}
              </Card>
            </div>
          </div>
        </>
      )}
    </HubLayout>
  )
}
