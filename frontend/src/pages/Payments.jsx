import { useEffect, useState } from 'react'
import { getPayments, createCheckout, verifyPayment } from '../api/payments'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

// ── Spending graph ───────────────────────────────────────────────────────────

function SpendingGraph({ events, loading }) {
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

  const max = Math.max(...months.map(m => m.total), 1)
  const CHART_H = 72
  const BAR_W   = 32
  const GAP     = 14
  const totalW  = months.length * (BAR_W + GAP) - GAP

  const isCurrent = m => m.year === now.getFullYear() && m.month === now.getMonth()

  if (loading) {
    return (
      <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-faint)', fontSize: '13px' }}>Loading…</span>
      </div>
    )
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalW + 8} ${CHART_H + 30}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      {months.map((m, i) => {
        const x    = i * (BAR_W + GAP)
        const barH = m.total > 0 ? Math.max((m.total / max) * CHART_H, 6) : 3
        const y    = CHART_H - barH
        const curr = isCurrent(m)
        return (
          <g key={`${m.year}-${m.month}`}>
            {/* Bar */}
            <rect x={x} y={y} width={BAR_W} height={barH} rx={6}
              fill={curr ? '#ff725e' : 'rgba(255,114,94,0.30)'}
            />
            {/* Amount label above bar */}
            {m.total > 0 && (
              <text x={x + BAR_W / 2} y={y - 6} textAnchor="middle" fontSize={9}
                fill={curr ? '#ff725e' : 'var(--text-muted)'} fontWeight={curr ? 700 : 400}
              >
                £{m.total.toFixed(0)}
              </text>
            )}
            {/* Month label below */}
            <text x={x + BAR_W / 2} y={CHART_H + 18} textAnchor="middle" fontSize={10}
              fill={curr ? '#ff725e' : 'var(--text-faint)'} fontWeight={curr ? 700 : 400}
            >
              {m.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Status badge styles ──────────────────────────────────────────────────────
const STATUS_STYLES = {
  paid:      { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', border: 'rgba(52,211,153,0.25)'  },
  confirmed: { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa', border: 'rgba(96,165,250,0.25)'  },
  pending:   { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.25)'  },
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

// ── Session row ──────────────────────────────────────────────────────────────
function SessionRow({ ev, onPay, paying }) {
  const date       = ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const payable    = (ev.status === 'confirmed' || ev.status === 'pending') && Number(ev.amount ?? 0) >= 0.50
  const isPayingThis = paying === ev.id_event

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Icon */}
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: ev.status === 'paid' ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: ev.status === 'paid' ? '#34d399' : 'rgba(255,255,255,0.35)' }}>
          {ev.status === 'paid' ? 'check_circle' : 'receipt_long'}
        </span>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.title}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
          {date}{ev.tutor_name ? ` · ${ev.tutor_name}` : ''}
        </p>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
        {ev.amount && (
          <p style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)' }}>
            £{Number(ev.amount).toFixed(2)}
          </p>
        )}
        <StatusBadge status={ev.status} />
        {payable && (
          <button
            onClick={() => onPay(ev)}
            disabled={isPayingThis}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 12px', borderRadius: '20px', border: 'none',
              background: '#ff725e', color: 'white', fontWeight: '700', fontSize: '11px',
              cursor: isPayingThis ? 'default' : 'pointer', opacity: isPayingThis ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isPayingThis) e.currentTarget.style.background = '#e5614f' }}
            onMouseLeave={e => { if (!isPayingThis) e.currentTarget.style.background = '#ff725e' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
              {isPayingThis ? 'hourglass_empty' : 'credit_card'}
            </span>
            {isPayingThis ? 'Redirecting…' : 'Pay now'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Payments() {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState(null)

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
  const paid     = events.filter(e => e.status === 'paid')
  const unpaid   = events.filter(e => (e.status === 'confirmed' || e.status === 'pending') && Number(e.amount ?? 0) >= 0.50)
  const total    = paid.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const now      = new Date()
  const thisMonth = paid
    .filter(e => { const d = new Date(e.start_time); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)

  return (
    <HubLayout>
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', marginBottom: '4px' }}>Payments</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Your session payment history</p>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total spent',  value: `£${total.toFixed(2)}`,   icon: 'payments',      color: '#ff725e' },
          { label: 'Paid sessions', value: paid.length,              icon: 'check_circle',  color: '#34d399' },
          { label: 'This month',   value: `£${thisMonth.toFixed(2)}`, icon: 'calendar_month', color: '#60a5fa' },
          { label: 'Awaiting',     value: unpaid.length,             icon: 'hourglass_empty', color: '#fbbf24' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="glass" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color }}>{icon}</span>
            </div>
            <div>
              <p style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two column layout ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

        {/* ── Left: session lists ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Unpaid sessions */}
          {unpaid.length > 0 && (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#fbbf24' }}>hourglass_empty</span>
                <h2 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)' }}>
                  Awaiting Payment <span style={{ color: '#fbbf24', fontSize: '12px' }}>({unpaid.length})</span>
                </h2>
              </div>
              {unpaid.map(ev => (
                <SessionRow key={ev.id_event} ev={ev} onPay={handlePay} paying={paying} />
              ))}
            </div>
          )}

          {/* Payment history */}
          <div className="glass" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#34d399' }}>history</span>
              <h2 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)' }}>Payment History</h2>
            </div>
            {loading ? (
              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => <div key={i} style={{ height: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
              </div>
            ) : paid.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(255,255,255,0.15)', display: 'block', marginBottom: '10px' }}>receipt_long</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No paid sessions yet</p>
              </div>
            ) : (
              paid.map(ev => <SessionRow key={ev.id_event} ev={ev} onPay={handlePay} paying={paying} />)
            )}
          </div>

        </div>

        {/* ── Right: spending graph + fee banner ───────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: 0 }}>

          {/* Spending chart */}
          <div className="glass" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)' }}>Spending</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>last 6 months</span>
            </div>
            <SpendingGraph events={events} loading={loading} />
            {/* Summary rows */}
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              {[
                { label: 'Total spent',   value: `£${total.toFixed(2)}`,        color: '#ff725e'  },
                { label: 'This month',    value: `£${thisMonth.toFixed(2)}`,    color: 'var(--text)' },
                { label: 'Sessions paid', value: `${paid.length} sessions`,     color: 'var(--text)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 0% fee banner */}
          <div style={{
            borderRadius: '14px', padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(52,211,153,0.10), rgba(52,211,153,0.05))',
            border: '1px solid rgba(52,211,153,0.20)',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#34d399', fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>verified</span>
            <div>
              <p style={{ fontWeight: '700', fontSize: '13px', color: '#34d399', marginBottom: '3px' }}>0% platform fee</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: '1.4' }}>
                100% of every payment goes directly to your tutor. Always.
              </p>
            </div>
          </div>

          {/* How payments work */}
          <div style={{
            borderRadius: '14px', padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ff725e' }}>info</span>
              How payments work
            </p>
            {[
              { step: '1', text: 'Tutor confirms your session' },
              { step: '2', text: 'You click "Pay now" to checkout' },
              { step: '3', text: 'Secure payment via Stripe' },
              { step: '4', text: '100% goes to your tutor' },
            ].map(({ step, text }) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,114,94,0.15)', border: '1px solid rgba(255,114,94,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#ff725e' }}>{step}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{text}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </HubLayout>
  )
}
