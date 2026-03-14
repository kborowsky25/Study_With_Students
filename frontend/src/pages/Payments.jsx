import { useEffect, useState } from 'react'
import { getPayments, createCheckout, verifyPayment } from '../api/payments'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const CORAL = '#ff725e'
const GREEN = '#34d399'
const BLUE  = '#60a5fa'
const AMBER = '#fbbf24'

// ── CountUp hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(target ?? 0); return }
    const start = performance.now()
    let raf
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(target * eased * 100) / 100)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

// ── Spending graph (6-month bars) ─────────────────────────────────────────────
function SpendingGraph({ events, loading }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200)
    return () => clearTimeout(t)
  }, [])

  const now    = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-GB', { month: 'short' }), total: 0 }
  })

  if (!loading) {
    events.filter(e => e.status === 'paid').forEach(e => {
      const d = new Date(e.start_time)
      const bucket = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
      if (bucket) bucket.total += Number(e.amount ?? 0)
    })
  }

  const max      = Math.max(...months.map(m => m.total), 1)
  const CHART_H  = 90
  const BAR_W    = 36
  const GAP      = 10
  const totalW   = months.length * (BAR_W + GAP) - GAP
  const isCurrent = m => m.year === now.getFullYear() && m.month === now.getMonth()

  if (loading) {
    return (
      <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '10px 0' }}>
        {[0.4, 0.7, 0.5, 0.9, 0.6, 1.0].map((h, i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: `${h * 80}px`, borderRadius: '8px' }} />
        ))}
      </div>
    )
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalW + 8} ${CHART_H + 36}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <linearGradient id="bar-grad-active" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={CORAL} />
          <stop offset="100%" stopColor="#ff9a3c" />
        </linearGradient>
        <linearGradient id="bar-grad-past" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={`${CORAL}55`} />
          <stop offset="100%" stopColor={`${CORAL}22`} />
        </linearGradient>
      </defs>
      {months.map((m, i) => {
        const x    = i * (BAR_W + GAP)
        const barH = m.total > 0 ? Math.max((m.total / max) * CHART_H, 8) : 4
        const y    = CHART_H - barH
        const curr = isCurrent(m)
        return (
          <g key={`${m.year}-${m.month}`}>
            {/* Bar */}
            <rect
              x={x} y={mounted ? y : CHART_H} width={BAR_W}
              height={mounted ? barH : 4}
              rx={7}
              fill={curr ? 'url(#bar-grad-active)' : 'url(#bar-grad-past)'}
              style={{ transition: `y 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms, height 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms` }}
            />
            {/* Amount label */}
            {m.total > 0 && (
              <text
                x={x + BAR_W / 2} y={y - 8}
                textAnchor="middle" fontSize={9}
                fill={curr ? CORAL : 'var(--text-muted)'}
                fontWeight={curr ? 700 : 400}
                style={{ transition: `y 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms` }}
              >
                £{m.total.toFixed(0)}
              </text>
            )}
            {/* Month label */}
            <text
              x={x + BAR_W / 2} y={CHART_H + 20}
              textAnchor="middle" fontSize={10}
              fill={curr ? CORAL : 'var(--text-faint)'}
              fontWeight={curr ? 700 : 400}
            >
              {m.label}
            </text>
            {/* Current month dot */}
            {curr && (
              <circle cx={x + BAR_W / 2} cy={CHART_H + 30} r={3} fill={CORAL} />
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  paid:      { bg: 'rgba(52,211,153,0.12)',  text: GREEN, border: 'rgba(52,211,153,0.25)'  },
  confirmed: { bg: 'rgba(96,165,250,0.12)',  text: BLUE,  border: 'rgba(96,165,250,0.25)'  },
  pending:   { bg: 'rgba(251,191,36,0.12)',  text: AMBER, border: 'rgba(251,191,36,0.25)'  },
  canceled:  { bg: 'rgba(248,113,113,0.12)', text: '#f87171', border: 'rgba(248,113,113,0.25)' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  return (
    <span style={{
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.04em',
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      borderRadius: '20px', padding: '3px 8px',
    }}>
      {status}
    </span>
  )
}

// ── Unpaid session — hero card ────────────────────────────────────────────────
function UnpaidCard({ ev, onPay, paying }) {
  const date       = ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
  const isPayingThis = paying === ev.id_event

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px',
      padding: '16px 20px',
      background: `linear-gradient(135deg, ${CORAL}0c, ${CORAL}05)`,
      border: `1.5px solid ${CORAL}30`,
      borderRadius: '14px',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${CORAL}60`; e.currentTarget.style.boxShadow = `0 4px 24px ${CORAL}15` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${CORAL}30`; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Receipt icon */}
      <div style={{
        width: '46px', height: '46px', borderRadius: '12px',
        background: `${CORAL}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL }}>receipt_long</span>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
          {ev.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            {date}{ev.tutor_name ? ` · ${ev.tutor_name}` : ''}
          </p>
          <StatusBadge status={ev.status} />
        </div>
      </div>

      {/* Amount + Pay button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
        {ev.amount && (
          <p style={{ fontWeight: '900', fontSize: '20px', color: 'var(--text)', lineHeight: 1 }}>
            £{Number(ev.amount).toFixed(2)}
          </p>
        )}
        <button
          onClick={() => onPay(ev)}
          disabled={isPayingThis}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 20px', borderRadius: '10px', border: 'none',
            background: `linear-gradient(135deg, ${CORAL}, #ff9a3c)`,
            color: 'white', fontWeight: '800', fontSize: '13px',
            cursor: isPayingThis ? 'default' : 'pointer',
            opacity: isPayingThis ? 0.7 : 1,
            transition: 'all 0.15s',
            boxShadow: `0 4px 14px ${CORAL}30`,
          }}
          onMouseEnter={e => { if (!isPayingThis) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${CORAL}40` } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 14px ${CORAL}30` }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {isPayingThis ? 'hourglass_empty' : 'credit_card'}
          </span>
          {isPayingThis ? 'Redirecting…' : 'Pay Now'}
        </button>
      </div>
    </div>
  )
}

// ── Paid session row (history) ────────────────────────────────────────────────
function PaidRow({ ev }) {
  const date = ev.start_time
    ? new Date(ev.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '11px 16px',
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: GREEN }}>check_circle</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.title}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
          {date}{ev.tutor_name ? ` · ${ev.tutor_name}` : ''}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        {ev.amount && (
          <p style={{ fontWeight: '700', fontSize: '14px', color: GREEN }}>£{Number(ev.amount).toFixed(2)}</p>
        )}
        <StatusBadge status={ev.status} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Payments() {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const params         = new URLSearchParams(window.location.search)
    const successEventId = params.get('success') && params.get('event_id') ? Number(params.get('event_id')) : null
    const wasCanceled    = Boolean(params.get('canceled'))

    if (successEventId) {
      verifyPayment(successEventId)
        .then(() => toast.success('Payment successful!'))
        .catch(() => toast.error('Could not record payment'))
        .finally(() => {
          window.history.replaceState({}, '', '/payments')
          loadEvents()
        })
    } else if (wasCanceled) {
      toast.error('Payment was cancelled')
      window.history.replaceState({}, '', '/payments')
      loadEvents()
    } else {
      loadEvents()
    }

    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  function loadEvents() {
    setLoading(true)
    getPayments()
      .then(({ data }) => setEvents(data.events ?? []))
      .catch(() => toast.error('Could not load payments'))
      .finally(() => setLoading(false))
  }

  async function handlePay(ev) {
    if (!ev.amount || Number(ev.amount) < 0.50) {
      toast.error('No payable amount set for this session')
      return
    }
    setPaying(ev.id_event)
    try {
      const { data } = await createCheckout(ev.id_event)
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error ?? 'Could not start checkout')
      }
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Checkout failed')
    } finally {
      setPaying(null)
    }
  }

  // Derived data
  const paid      = events.filter(e => e.status === 'paid')
  const unpaid    = events.filter(e => (e.status === 'confirmed' || e.status === 'pending') && Number(e.amount ?? 0) >= 0.50)
  const total     = paid.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const totalDue  = unpaid.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const now       = new Date()
  const thisMonth = paid
    .filter(e => { const d = new Date(e.start_time); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const animatedTotal    = useCountUp(Math.round(total * 100) / 100, 1000)
  const animatedThisMonth = useCountUp(Math.round(thisMonth * 100) / 100, 800)

  return (
    <HubLayout>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className={mounted ? 'animate-slide-up' : ''} style={{ marginBottom: '22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text)', marginBottom: '4px' }}>
              Payments
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {unpaid.length > 0
                ? <><span style={{ color: AMBER, fontWeight: '700' }}>{unpaid.length} session{unpaid.length !== 1 ? 's' : ''}</span> awaiting payment</>
                : 'All sessions paid up'}
            </p>
          </div>
          {/* 0% fee pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: GREEN }}>verified</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: GREEN }}>0% platform fee</span>
          </div>
        </div>

        {/* ── PAY NOW HERO — sessions awaiting payment ─────────────────── */}
        {unpaid.length > 0 ? (
          <div className={mounted ? 'animate-slide-up delay-100' : ''} style={{ marginBottom: '22px' }}>
            {/* Hero banner */}
            <div style={{
              padding: '18px 22px',
              borderRadius: '16px 16px 0 0',
              background: `linear-gradient(135deg, ${AMBER}18, ${CORAL}10)`,
              border: `1.5px solid ${AMBER}30`,
              borderBottom: 'none',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${AMBER}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: AMBER }}>payments</span>
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '15px', marginBottom: '2px' }}>
                  Sessions Awaiting Payment
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  <span style={{ color: AMBER, fontWeight: '700' }}>{unpaid.length} session{unpaid.length !== 1 ? 's' : ''}</span>
                  {' '}— total due:{' '}
                  <span style={{ color: CORAL, fontWeight: '800', fontSize: '15px' }}>£{totalDue.toFixed(2)}</span>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '20px', background: `${AMBER}15`, border: `1px solid ${AMBER}30` }}>
                <div className="animate-pulse-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: AMBER }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: AMBER }}>Action required</span>
              </div>
            </div>
            {/* Sessions */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '10px',
              padding: '16px',
              border: `1.5px solid ${AMBER}20`,
              borderTop: 'none',
              borderRadius: '0 0 16px 16px',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(12px)',
            }}>
              {unpaid.map(ev => (
                <UnpaidCard key={ev.id_event} ev={ev} onPay={handlePay} paying={paying} />
              ))}
            </div>
          </div>
        ) : !loading && (
          /* All paid up banner */
          <div className={mounted ? 'animate-slide-up delay-100' : ''} style={{
            marginBottom: '22px', padding: '18px 22px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(52,211,153,0.10), rgba(52,211,153,0.05))',
            border: '1.5px solid rgba(52,211,153,0.25)',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: GREEN }}>check_circle</span>
            <div>
              <p style={{ fontWeight: '800', fontSize: '15px', color: GREEN, marginBottom: '3px' }}>All caught up!</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No sessions awaiting payment. Great job keeping up to date.</p>
            </div>
          </div>
        )}

        {/* ── SPENDING OVERVIEW — total left, graph right ───────────────── */}
        <div className={mounted ? 'animate-slide-up delay-200' : ''} style={{
          display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px',
          marginBottom: '22px',
        }}>

          {/* Left: Big total + stats */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '22px',
            backdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${CORAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: CORAL }}>wallet</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Total Spent</span>
              </div>
              {loading ? (
                <div className="skeleton" style={{ width: '140px', height: '52px', borderRadius: '8px', marginBottom: '6px' }} />
              ) : (
                <div key={total} className="animate-number-pop">
                  <span style={{ fontSize: '48px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>
                    £{animatedTotal.toFixed(2)}
                  </span>
                </div>
              )}
              <p style={{ color: 'var(--text-faint)', fontSize: '12px', marginTop: '4px' }}>lifetime spend</p>
            </div>

            {/* Stat chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
              {[
                { icon: 'calendar_month', label: 'This month',    value: `£${animatedThisMonth.toFixed(2)}`, color: BLUE   },
                { icon: 'check_circle',   label: 'Paid sessions', value: `${paid.length}`,                   color: GREEN  },
                { icon: 'hourglass_empty',label: 'Due now',       value: unpaid.length > 0 ? `£${totalDue.toFixed(2)}` : '—', color: unpaid.length > 0 ? AMBER : 'var(--text-faint)' },
              ].map(({ icon, label, value, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color }}>{icon}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color }}>{loading ? '—' : value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 6-month spending chart */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '22px',
            backdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)', marginBottom: '2px' }}>Spending Chart</h2>
                <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Last 6 months</p>
              </div>
              <div style={{ padding: '4px 10px', borderRadius: '20px', background: `${CORAL}12`, border: `1px solid ${CORAL}25` }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: CORAL }}>£{total.toFixed(0)} total</span>
              </div>
            </div>
            <SpendingGraph events={events} loading={loading} />
          </div>
        </div>

        {/* ── PAYMENT HISTORY ──────────────────────────────────────────── */}
        <div className={mounted ? 'animate-slide-up delay-300' : ''}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: GREEN }}>history</span>
              </div>
              <h2 style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)' }}>Payment History</h2>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-faint)' }}>
                {paid.length} paid session{paid.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Rows */}
            {loading ? (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '10px' }} />)}
              </div>
            ) : paid.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '44px', color: 'var(--text-faint)', display: 'block', marginBottom: '12px' }}>receipt_long</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>No paid sessions yet</p>
                <p style={{ color: 'var(--text-faint)', fontSize: '12px' }}>Sessions will appear here after payment</p>
              </div>
            ) : (
              paid.map(ev => <PaidRow key={ev.id_event} ev={ev} />)
            )}
          </div>

          {/* How payments work */}
          <div style={{
            marginTop: '14px',
            padding: '16px 20px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
          }}>
            {[
              { step: '1', icon: 'calendar_month', text: 'Tutor confirms session' },
              { step: '2', icon: 'credit_card',    text: 'Click Pay Now above'  },
              { step: '3', icon: 'lock',           text: 'Secure Stripe checkout' },
              { step: '4', icon: 'arrow_forward',  text: '100% goes to your tutor' },
            ].map(({ step, icon, text }) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${CORAL}14`, border: `1px solid ${CORAL}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: CORAL }}>{icon}</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </HubLayout>
  )
}
