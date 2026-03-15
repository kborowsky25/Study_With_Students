import { useEffect, useRef, useState } from 'react'
import { getPayments } from '../api/payments'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import PageHeader from '../components/features/PageHeader'
import toast from 'react-hot-toast'

// ── CountUp hook ───────────────────────────────────────────────────────────────
function useCountUp(target, { duration = 950, enabled = true } = {}) {
  const [val, setVal] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    if (!enabled) { setVal(target); return }
    cancelAnimationFrame(rafRef.current)
    const startTime = performance.now()
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(ease * target)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, enabled])
  return val
}

// ── Animated bar chart ────────────────────────────────────────────────────────
function EarningsGraph({ events, loading }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!loading) setTimeout(() => setMounted(true), 60)
  }, [loading])

  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-GB', { month: 'short' }), total: 0 }
  })
  if (!loading) {
    events.filter(e => e.status === 'paid').forEach(e => {
      const d = new Date(e.start_time)
      const b = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
      if (b) b.total += Number(e.amount ?? 0)
    })
  }

  const max = Math.max(...months.map(m => m.total), 1)
  const CHART_H = 90
  const isCurrent = m => m.year === now.getFullYear() && m.month === now.getMonth()

  if (loading) return (
    <div style={{ height: '130px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton" style={{ flex: 1, height: `${30 + i * 10}px`, borderRadius: '6px' }} />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', userSelect: 'none' }}>
      {months.map((m, i) => {
        const barH = m.total > 0 ? Math.max((m.total / max) * CHART_H, 8) : 4
        const curr = isCurrent(m)
        return (
          <div key={`${m.year}-${m.month}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <span style={{
              fontSize: '9px', fontWeight: curr ? 700 : 400,
              color: curr ? '#34d399' : 'rgba(255,255,255,0.35)',
              height: '12px', display: 'flex', alignItems: 'center',
              opacity: m.total > 0 ? 1 : 0,
            }}>£{m.total.toFixed(0)}</span>
            <div style={{ width: '100%', height: `${CHART_H}px`, borderRadius: '6px', background: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: mounted ? `${(barH / CHART_H) * 100}%` : '0%',
                background: curr ? 'linear-gradient(to bottom, #34d399, rgba(52,211,153,0.5))' : 'rgba(52,211,153,0.3)',
                borderRadius: '6px',
                transition: `height 0.65s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s`,
                boxShadow: curr ? '0 0 14px rgba(52,211,153,0.4)' : 'none',
              }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: curr ? 700 : 400, color: curr ? '#34d399' : 'rgba(255,255,255,0.35)' }}>{m.label}</span>
            {curr
              ? <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#34d399' }} />
              : <div style={{ width: '4px', height: '4px' }} />
            }
          </div>
        )
      })}
    </div>
  )
}

// ── Animated donut chart ──────────────────────────────────────────────────────
function DonutChart({ paidAmt, pendingAmt, confirmedAmt, mounted }) {
  const RADIUS = 46
  const CIRCUM = 2 * Math.PI * RADIUS
  const totalAmt = paidAmt + pendingAmt + confirmedAmt || 1

  const paidFrac = paidAmt / totalAmt
  const pendFrac = pendingAmt / totalAmt
  const confFrac = confirmedAmt / totalAmt

  const paidLen = paidFrac * CIRCUM
  const pendLen = pendFrac * CIRCUM
  const confLen = confFrac * CIRCUM
  const GAP = 3

  const segments = [
    { length: Math.max(paidAmt > 0 ? paidLen - GAP : 0, 0), offset: 0,                  color: '#34d399', delay: '0.1s' },
    { length: Math.max(pendingAmt > 0 ? pendLen - GAP : 0, 0), offset: -paidLen,         color: '#fbbf24', delay: '0.3s' },
    { length: Math.max(confirmedAmt > 0 ? confLen - GAP : 0, 0), offset: -(paidLen + pendLen), color: '#60a5fa', delay: '0.5s' },
  ]

  return (
    <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto' }}>
      <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
        {segments.map((seg, i) => (
          <circle key={i}
            cx="60" cy="60" r={RADIUS} fill="none"
            stroke={seg.color} strokeWidth="16"
            strokeDasharray={`${mounted ? seg.length : 0} ${CIRCUM}`}
            strokeDashoffset={seg.offset}
            style={{ transition: `stroke-dasharray 0.85s cubic-bezier(0.34,1.56,0.64,1) ${seg.delay}` }}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '20px', fontWeight: '900', color: '#34d399', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
          £{paidAmt.toFixed(0)}
        </p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', margin: '3px 0 0' }}>earned</p>
      </div>
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_CFG = {
  paid:      { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', border: 'rgba(52,211,153,0.25)'  },
  confirmed: { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa', border: 'rgba(96,165,250,0.25)'  },
  pending:   { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.25)'  },
  canceled:  { bg: 'rgba(248,113,113,0.12)', text: '#f87171', border: 'rgba(248,113,113,0.25)' },
}
function StatusBadge({ status }) {
  const s = STATUS_CFG[status] ?? STATUS_CFG.pending
  return (
    <span style={{
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase',
      background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: '20px', padding: '3px 8px',
    }}>{status}</span>
  )
}

// ── Session row ────────────────────────────────────────────────────────────────
function EarningRow({ ev, index }) {
  const date   = ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const earned = ev.status === 'paid'
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: hovered ? 'rgba(52,211,153,0.04)' : 'transparent',
        transition: 'background 0.2s',
        borderLeft: `3px solid ${earned ? '#34d399' : 'rgba(255,255,255,0.08)'}`,
        animation: `slideIn 0.35s ease ${index * 0.04}s both`,
      }}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: earned ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '17px', color: earned ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
          {earned ? 'payments' : 'hourglass_empty'}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.title}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
          {date}{ev.student_name ? ` · ${ev.student_name}` : ''}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        {ev.amount && Number(ev.amount) > 0 && (
          <p style={{ fontWeight: '800', fontSize: '14px', color: earned ? '#34d399' : 'var(--text)', letterSpacing: '-0.02em' }}>
            £{Number(ev.amount).toFixed(2)}
          </p>
        )}
        <StatusBadge status={ev.status} />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Earnings() {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [ready,   setReady]   = useState(false)

  useEffect(() => {
    getPayments({ role: 'tutor' })
      .then(({ data }) => setEvents(data.events ?? []))
      .catch(() => toast.error('Could not load earnings'))
      .finally(() => { setLoading(false); requestAnimationFrame(() => setReady(true)) })
  }, [])

  const paid         = events.filter(e => e.status === 'paid')
  const pending      = events.filter(e => e.status === 'pending')
  const confirmed    = events.filter(e => e.status === 'confirmed')
  const awaitingList = events.filter(e => e.status === 'pending' || e.status === 'confirmed')
  const total        = paid.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const pendingAmt   = pending.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const confirmedAmt = confirmed.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const now          = new Date()
  const thisMonth    = paid
    .filter(e => { const d = new Date(e.start_time); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const totalDisplay   = useCountUp(total,    { enabled: ready && !loading })
  const monthDisplay   = useCountUp(thisMonth, { enabled: ready && !loading })
  const pendingDisplay = useCountUp(pendingAmt + confirmedAmt, { enabled: ready && !loading })

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="Earnings" icon="payments" />
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(16px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes pulsePend {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.5 }
        }
      `}</style>

      <PageHeader
        icon="payments"
        iconColor="#34d399"
        title="Earnings"
        subtitle="Your tutoring income — every penny goes to you"
        badge={
          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
            0% fee
          </span>
        }
      />

      {/* ── Top row: hero total + 6-month chart ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Hero total card */}
        <div style={{
          borderRadius: '20px', padding: '24px',
          background: 'linear-gradient(135deg, rgba(52,211,153,0.14) 0%, rgba(52,211,153,0.04) 100%)',
          border: '1px solid rgba(52,211,153,0.22)',
          animation: 'slideIn 0.4s ease 0.05s both',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(52,211,153,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Total Earned</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '44px', fontWeight: '900', color: '#34d399', lineHeight: 1, letterSpacing: '-0.04em', textShadow: '0 0 28px rgba(52,211,153,0.5)' }}>
              £{totalDisplay.toFixed(2)}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>lifetime</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              { label: 'This month',    value: `£${monthDisplay.toFixed(2)}`,   icon: 'calendar_month',  color: '#60a5fa' },
              { label: 'Sessions paid', value: paid.length,                      icon: 'check_circle',    color: '#34d399' },
              { label: 'Awaiting',      value: `£${pendingDisplay.toFixed(2)}`,  icon: 'hourglass_empty', color: '#fbbf24' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '7px 12px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color }}>{icon}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)', lineHeight: 1, margin: 0 }}>{value}</p>
                  <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', margin: '2px 0 0' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6-month chart */}
        <div className="glass" style={{ padding: '20px 22px', animation: 'slideIn 0.4s ease 0.1s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)', margin: 0 }}>6-Month Overview</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: '2px 0 0' }}>Monthly earnings breakdown</p>
            </div>
            <span style={{ fontSize: '10px', color: '#34d399', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
              ↑ Last 6 months
            </span>
          </div>
          <EarningsGraph events={events} loading={loading} />
        </div>
      </div>

      {/* ── Bottom row: donut chart + session lists ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px' }}>

        {/* Donut chart + breakdown */}
        <div className="glass" style={{ padding: '20px', animation: 'slideIn 0.4s ease 0.15s both', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text)', margin: 0 }}>Breakdown</h3>
          <DonutChart
            paidAmt={total}
            pendingAmt={pendingAmt}
            confirmedAmt={confirmedAmt}
            mounted={ready && !loading}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { color: '#34d399', label: 'Paid',      value: `£${total.toFixed(2)}` },
              { color: '#60a5fa', label: 'Confirmed', value: `£${confirmedAmt.toFixed(2)}` },
              { color: '#fbbf24', label: 'Pending',   value: `£${pendingAmt.toFixed(2)}` },
            ].map(({ color, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700', color }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <span className="material-symbols-outlined" style={{ color: '#34d399', fontSize: '15px' }}>verified</span>
              <p style={{ fontWeight: '700', fontSize: '12px', color: '#34d399', margin: 0 }}>0% Platform Fee</p>
            </div>
            <p style={{ color: 'var(--text-faint)', fontSize: '11px', lineHeight: '1.5', margin: 0 }}>
              You keep <strong style={{ color: 'var(--text)' }}>100%</strong> of every payment.
            </p>
          </div>
        </div>

        {/* Session lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>

          {/* Awaiting / upcoming */}
          {awaitingList.length > 0 && (
            <div className="glass" style={{ overflow: 'hidden', animation: 'slideIn 0.4s ease 0.2s both', border: '1px solid rgba(251,191,36,0.18)' }}>
              <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#fbbf24', animation: 'pulsePend 2s ease-in-out infinite' }}>hourglass_empty</span>
                  <h2 style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text)', margin: 0 }}>Upcoming / Awaiting</h2>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '20px', padding: '2px 8px' }}>
                  {awaitingList.length}
                </span>
              </div>
              {awaitingList.map((ev, i) => <EarningRow key={ev.id_event} ev={ev} index={i} />)}
            </div>
          )}

          {/* Earnings history */}
          <div className="glass" style={{ overflow: 'hidden', animation: 'slideIn 0.4s ease 0.25s both' }}>
            <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#34d399' }}>history</span>
                <h2 style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text)', margin: 0 }}>Earnings History</h2>
              </div>
              {paid.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{paid.length} sessions</span>
              )}
            </div>
            {loading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '58px', borderRadius: '8px' }} />)}
              </div>
            ) : paid.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(255,255,255,0.12)', display: 'block', marginBottom: '10px' }}>payments</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No earnings yet</p>
                <p style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '4px' }}>Confirm sessions to start earning</p>
              </div>
            ) : paid.map((ev, i) => <EarningRow key={ev.id_event} ev={ev} index={i} />)}
          </div>
        </div>
      </div>
    </HubLayout>
  )
}
