import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Card, DateChip, EmptyState, Icon, SkeletonRows, Stat, StatusPill } from '../components/ui'
import { createCheckout, getPayments, verifyPayment } from '../api/payments'
import { errorMessage } from '../api/client'
import { byStart } from '../lib/dates'
import { formatMoney, formatTime } from '../lib/format'
import { bookingFee, feeWaived, needsPayment, totalPrice } from '../lib/sessions'

const HISTORY_PREVIEW = 6

// Families pay the tutor's price (`amount`, all of it the tutor's) plus a 5% booking fee.
const price = (e) => Number(e.amount) || 0
const sum = (list, value = price) => list.reduce((s, e) => s + value(e), 0)

const Muted = ({ children }) => (
  <span style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'right' }}>{children}</span>
)

function SessionRow({ ev, children }) {
  return (
    <div className="row row-wrap">
      <DateChip value={ev.start_time} />
      <div className="main">
        <div className="title">{ev.title || 'Tutoring session'}</div>
        <div className="meta">{ev.tutor_name} · {formatTime(ev.start_time)}–{formatTime(ev.end_time)}</div>
      </div>
      <div className="row-actions">{children}</div>
    </div>
  )
}

/** The total, with the price and booking fee under it when there is a fee (or an invite credit paid it). */
function Price({ ev, muted }) {
  const fee = bookingFee(ev)
  const waived = feeWaived(ev)
  return (
    <span style={{ textAlign: 'right', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: muted ? 'var(--text-muted)' : 'var(--text)' }}>
        {formatMoney(totalPrice(ev))}
      </span>
      {(fee > 0 || waived > 0) && (
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-faint)' }}>
          {fee > 0 ? <>{formatMoney(ev.amount)} + {formatMoney(fee)} fee</>
            : <><s>{formatMoney(waived)}</s> fee waived</>}
        </span>
      )}
    </span>
  )
}

const payTitle = (ev) => {
  const fee = bookingFee(ev)
  const waived = feeWaived(ev)
  return `${formatMoney(ev.amount)} to ${ev.tutor_name}${fee ? ` + ${formatMoney(fee)} booking fee`
    : waived ? ` · ${formatMoney(waived)} booking fee waived` : ''}`
}

export default function Payments() {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const [data, setData] = useState({ events: [], stripeEnabled: false })
  const [phase, setPhase] = useState('loading') // loading | ready | error
  const [paying, setPaying] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const started = useRef(false)

  async function load() {
    setPhase('loading')
    try {
      const { data } = await getPayments({ role: 'student' })
      setData({ events: data.events ?? [], stripeEnabled: Boolean(data.stripe_enabled) })
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }

  // Back from Stripe Checkout: /payments?event_id=…&session_id=… (or ?canceled=1).
  // Verify once, and drop the params first so a refresh can't verify again.
  useEffect(() => {
    if (started.current) return
    started.current = true
    const { event_id: eventId, session_id: sessionId, canceled } = search ?? {}
    if (eventId || sessionId || canceled) navigate({ to: '/payments', search: {}, replace: true })

    if (eventId && sessionId) {
      const id = toast.loading('Confirming your payment…')
      verifyPayment(eventId, String(sessionId))
        .then(() => toast.success('Payment complete', { id }))
        .catch((err) => toast.error(errorMessage(err, 'We couldn’t confirm that payment'), { id }))
        .finally(load)
      return
    }
    if (canceled) toast('Payment cancelled. You haven’t been charged.')
    load()
  }, [search, navigate])

  async function pay(ev) {
    setPaying(ev.id_event)
    try {
      const { data } = await createCheckout(ev.id_event)
      if (!data?.url) throw new Error('No checkout link')
      window.location.assign(data.url)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start checkout'))
      setPaying(null)
    }
  }

  const { events, stripeEnabled } = data
  const now = new Date()
  const due = events.filter(needsPayment).sort(byStart)
  const waiting = events.filter((e) => e.status === 'pending' && new Date(e.end_time) > now).sort(byStart)
  const paid = events.filter((e) => e.status === 'paid') // newest first, as the API sends them
  const history = showAll ? paid : paid.slice(0, HISTORY_PREVIEW)
  const loading = phase === 'loading'
  const show = (value) => (loading ? '—' : value)
  const stripeOff = !loading && !stripeEnabled && due.length > 0 // shown next to the disabled Pay buttons

  return (
    <HubLayout initialMode="student">
      <PageTitle title="Payments" icon="payments" />

      <div className="dash-head">
        <h1>Payments</h1>
        <div className="dash-actions">
          <Link to="/calendar/student" className="btn btn-ghost"><Icon name="calendar_month" />Calendar</Link>
        </div>
      </div>

      {phase === 'error' ? (
        <Card>
          <EmptyState title="Couldn’t load your payments." action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
        </Card>
      ) : (
        <>
          <section className="card stat-grid">
            <Stat label="To pay" value={show(formatMoney(sum(due, totalPrice)))} />
            <Stat label="Paid to tutors" value={show(formatMoney(sum(paid)))} />
            <Stat label="Booking fees" value={show(formatMoney(sum(paid, bookingFee)))} />
            <Stat label="Total paid" value={show(formatMoney(sum(paid, totalPrice)))} />
          </section>

          <div className="dash-grid">
            <div className="dash-col">
              <Card title={<span style={{ whiteSpace: 'nowrap' }}>To pay</span>} count={stripeOff ? null : due.length || null}
                action={stripeOff && <Muted>Card payments switch on once Stripe keys are set</Muted>}>
                {loading ? <SkeletonRows rows={2} /> : due.length ? (
                  <div className="row-list">
                    {due.map((ev) => (
                      <SessionRow key={ev.id_event} ev={ev}>
                        <Price ev={ev} />
                        <button className="btn btn-coral btn-sm" onClick={() => pay(ev)}
                          disabled={!stripeEnabled || paying !== null} title={payTitle(ev)}>
                          {paying === ev.id_event ? 'Redirecting…' : 'Pay'}
                        </button>
                      </SessionRow>
                    ))}
                  </div>
                ) : <EmptyState title="Nothing to pay." />}
              </Card>

              <Card title="History" count={paid.length || null}>
                {loading ? <SkeletonRows rows={3} /> : paid.length ? (
                  <div className="row-list">
                    {history.map((ev) => (
                      <SessionRow key={ev.id_event} ev={ev}>
                        <Price ev={ev} />
                        <StatusPill status="paid" />
                      </SessionRow>
                    ))}
                    {paid.length > HISTORY_PREVIEW && (
                      <button className="row" onClick={() => setShowAll((v) => !v)}
                        style={{ justifyContent: 'center', fontSize: 12.5, fontWeight: 500, color: 'var(--text-muted)' }}>
                        {showAll ? 'Show less' : `Show all ${paid.length}`}
                      </button>
                    )}
                  </div>
                ) : <EmptyState title="No payments yet." />}
              </Card>
            </div>

            <div className="dash-col">
              <Card title="Awaiting tutor" count={waiting.length || null}>
                {loading ? <SkeletonRows rows={1} /> : waiting.length ? (
                  <div className="row-list">
                    {waiting.map((ev) => (
                      <SessionRow key={ev.id_event} ev={ev}>
                        <Price ev={ev} muted />
                      </SessionRow>
                    ))}
                  </div>
                ) : <EmptyState title="No open requests." />}
              </Card>
            </div>
          </div>
        </>
      )}
    </HubLayout>
  )
}
