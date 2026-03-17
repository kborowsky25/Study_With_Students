import { useEffect, useState } from 'react'
import { getPayments, createCheckout, verifyPayment } from '../api/payments'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const CORAL = '#ff725e'
const GREEN = CORAL   // student page — use coral for "paid" state
const BLUE  = '#60a5fa'
const AMBER = '#fbbf24'

// ── CountUp hook ──────────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(target ?? 0); return }
    const start = performance.now()
    let raf
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - t, 3)) * 100) / 100)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function SpendingGraph({ events, loading }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t) }, [])

  const now    = new Date()
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

  const max     = Math.max(...months.map(m => m.total), 1)
  const CHART_H = 80
  const BAR_W   = 32
  const GAP     = 12
  const totalW  = months.length * (BAR_W + GAP) - GAP
  const isCurr  = m => m.year === now.getFullYear() && m.month === now.getMonth()

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'flex-end', gap:'12px', height:'100px', padding:'10px 0' }}>
        {[0.4,0.7,0.5,0.9,0.6,1.0].map((h,i) => (
          <div key={i} className="skeleton" style={{ flex:1, height:`${h*70}px`, borderRadius:'8px' }} />
        ))}
      </div>
    )
  }

  return (
    <svg width="100%" viewBox={`0 0 ${totalW + 4} ${CHART_H + 30}`} style={{ overflow:'visible', display:'block' }}>
      <defs>
        <linearGradient id="pg-active" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={CORAL} />
          <stop offset="100%" stopColor="#ff9a3c" />
        </linearGradient>
        <linearGradient id="pg-past" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={`${CORAL}44`} />
          <stop offset="100%" stopColor={`${CORAL}18`} />
        </linearGradient>
      </defs>
      {months.map((m, i) => {
        const x    = i * (BAR_W + GAP)
        const barH = m.total > 0 ? Math.max((m.total / max) * CHART_H, 8) : 4
        const y    = CHART_H - barH
        const curr = isCurr(m)
        return (
          <g key={`${m.year}-${m.month}`}>
            <rect x={x} y={mounted ? y : CHART_H} width={BAR_W} height={mounted ? barH : 4} rx={7}
              fill={curr ? 'url(#pg-active)' : 'url(#pg-past)'}
              style={{ transition:`y 0.8s cubic-bezier(0.4,0,0.2,1) ${i*80}ms, height 0.8s cubic-bezier(0.4,0,0.2,1) ${i*80}ms` }}
            />
            {m.total > 0 && (
              <text x={x + BAR_W/2} y={y - 7} textAnchor="middle" fontSize={9}
                fill={curr ? CORAL : 'var(--text-muted)'} fontWeight={curr ? 700 : 400}
                style={{ transition:`y 0.8s cubic-bezier(0.4,0,0.2,1) ${i*80}ms` }}>
                £{m.total.toFixed(0)}
              </text>
            )}
            <text x={x + BAR_W/2} y={CHART_H + 18} textAnchor="middle" fontSize={10}
              fill={curr ? CORAL : 'var(--text-faint)'} fontWeight={curr ? 700 : 400}>
              {m.label}
            </text>
            {curr && <circle cx={x + BAR_W/2} cy={CHART_H + 27} r={3} fill={CORAL} />}
          </g>
        )
      })}
    </svg>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  paid:      { bg:`${CORAL}18`,  text:CORAL,       border:`${CORAL}30`  },
  confirmed: { bg:'rgba(96,165,250,0.12)',  text:BLUE,        border:'rgba(96,165,250,0.25)'  },
  pending:   { bg:'rgba(251,191,36,0.12)',  text:AMBER,       border:'rgba(251,191,36,0.25)'  },
  canceled:  { bg:'rgba(248,113,113,0.12)', text:'#f87171',   border:'rgba(248,113,113,0.25)' },
}
function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  return (
    <span style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'0.04em', background:s.bg, color:s.text, border:`1px solid ${s.border}`, borderRadius:'20px', padding:'3px 8px' }}>
      {status}
    </span>
  )
}

// ── Unpaid card ───────────────────────────────────────────────────────────────
function UnpaidCard({ ev, onPay, paying }) {
  const date         = ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'
  const isPayingThis = paying === ev.id_event

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'14px',
      padding:'16px 18px',
      background:`linear-gradient(135deg, ${CORAL}0c, ${CORAL}04)`,
      border:`1.5px solid ${CORAL}28`,
      borderRadius:'14px',
      transition:'border-color 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=`${CORAL}55`; e.currentTarget.style.boxShadow=`0 4px 20px ${CORAL}14` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=`${CORAL}28`; e.currentTarget.style.boxShadow='none' }}
    >
      <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:`${CORAL}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span className="material-symbols-outlined" style={{ fontSize:'22px', color:CORAL }}>receipt_long</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ color:'var(--text)', fontSize:'14px', fontWeight:'700', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'3px' }}>
          {ev.title}
        </p>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          <p style={{ color:'var(--text-muted)', fontSize:'12px' }}>{date}{ev.tutor_name ? ` · ${ev.tutor_name}` : ''}</p>
          <StatusBadge status={ev.status} />
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px', flexShrink:0 }}>
        {ev.amount && <p style={{ fontWeight:'900', fontSize:'20px', color:'var(--text)', lineHeight:1 }}>£{Number(ev.amount).toFixed(2)}</p>}
        <button
          onClick={() => onPay(ev)}
          disabled={isPayingThis}
          style={{
            display:'flex', alignItems:'center', gap:'6px',
            padding:'9px 20px', borderRadius:'10px', border:'none',
            background:`linear-gradient(135deg, ${CORAL}, #ff9a3c)`,
            color:'white', fontWeight:'800', fontSize:'13px',
            cursor: isPayingThis ? 'default' : 'pointer',
            opacity: isPayingThis ? 0.7 : 1,
            boxShadow:`0 4px 14px ${CORAL}30`, transition:'all 0.15s',
          }}
          onMouseEnter={e => { if (!isPayingThis) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 6px 20px ${CORAL}40` } }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=`0 4px 14px ${CORAL}30` }}
        >
          <span className="material-symbols-outlined" style={{ fontSize:'16px' }}>
            {isPayingThis ? 'hourglass_empty' : 'credit_card'}
          </span>
          {isPayingThis ? 'Redirecting…' : 'Pay Now'}
        </button>
      </div>
    </div>
  )
}

// ── Paid history row ──────────────────────────────────────────────────────────
function PaidRow({ ev }) {
  const date = ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'14px',
      padding:'12px 20px', borderBottom:'1px solid var(--border)',
      transition:'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}
    >
      <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`${CORAL}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span className="material-symbols-outlined" style={{ fontSize:'18px', color:CORAL }}>check_circle</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ color:'var(--text)', fontSize:'13px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</p>
        <p style={{ color:'var(--text-muted)', fontSize:'11px' }}>{date}{ev.tutor_name ? ` · ${ev.tutor_name}` : ''}</p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px', flexShrink:0 }}>
        {ev.amount && <p style={{ fontWeight:'700', fontSize:'14px', color:GREEN }}>£{Number(ev.amount).toFixed(2)}</p>}
        <StatusBadge status={ev.status} />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
        .finally(() => { window.history.replaceState({}, '', '/payments'); loadEvents() })
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
    if (!ev.amount || Number(ev.amount) < 0.50) { toast.error('No payable amount set'); return }
    setPaying(ev.id_event)
    try {
      const { data } = await createCheckout(ev.id_event)
      if (data.url) window.location.href = data.url
      else toast.error(data.error ?? 'Could not start checkout')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Checkout failed')
    } finally {
      setPaying(null)
    }
  }

  const [showAllHistory, setShowAllHistory] = useState(false)

  const paid     = events.filter(e => e.status === 'paid')
  const unpaid   = events.filter(e => (e.status === 'confirmed' || e.status === 'pending') && Number(e.amount ?? 0) >= 0.50)
  const total    = paid.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const totalDue = unpaid.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const now      = new Date()
  const thisMonth = paid
    .filter(e => { const d = new Date(e.start_time); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const animTotal    = useCountUp(Math.round(total * 100) / 100, 1000)
  const animMonth    = useCountUp(Math.round(thisMonth * 100) / 100, 800)
  const visiblePaid  = showAllHistory ? paid : paid.slice(0, 6)

  return (
    <HubLayout>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* ── HERO — compact spending summary ─────────────────────────────── */}
        <div className={mounted ? 'animate-slide-up' : ''} style={{
          borderRadius: '16px', marginBottom: '16px',
          background: `linear-gradient(135deg, ${CORAL}12, rgba(255,154,60,0.06))`,
          border: `1px solid ${CORAL}22`,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
        }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'13px', background:`${CORAL}20`, border:`1.5px solid ${CORAL}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span className="material-symbols-outlined" style={{ fontSize:'22px', color:CORAL }}>wallet</span>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <p style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 2px' }}>Total Spent</p>
            {loading ? (
              <div className="skeleton" style={{ width:'100px', height:'28px', borderRadius:'6px' }} />
            ) : (
              <span style={{ fontSize:'28px', fontWeight:'900', color:'var(--text)', lineHeight:1, letterSpacing:'-0.03em' }}>£{animTotal.toFixed(2)}</span>
            )}
            <p style={{ fontSize:'11px', color:'var(--text-faint)', marginTop:'2px' }}>0% platform fee</p>
          </div>
          <div style={{ display:'flex', gap:'10px', flexShrink:0, flexWrap:'wrap' }}>
            {[
              { icon:'calendar_month',  label:'This month', value:`£${animMonth.toFixed(2)}`,                                                  color:BLUE  },
              { icon:'check_circle',    label:'Paid',       value:`${paid.length} sessions`,                                                   color:GREEN },
              { icon:'hourglass_empty', label:'Due',        value: unpaid.length > 0 ? `£${totalDue.toFixed(2)}` : 'None',                     color: unpaid.length > 0 ? AMBER : 'var(--text-faint)' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', padding:'8px 14px', borderRadius:'10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', minWidth:'80px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'16px', color }}>{icon}</span>
                <span style={{ fontSize:'13px', fontWeight:'800', color }}>{loading ? '—' : value}</span>
                <span style={{ fontSize:'10px', color:'var(--text-faint)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sessions due ────────────────────────────────────────────────── */}
        {unpaid.length > 0 ? (
          <div className={mounted ? 'animate-slide-up delay-100' : ''} style={{ marginBottom: '20px' }}>
            <div style={{
              padding:'14px 20px', borderRadius:'14px 14px 0 0',
              background:`linear-gradient(135deg, ${AMBER}16, ${CORAL}0c)`,
              border:`1.5px solid ${AMBER}28`, borderBottom:'none',
              display:'flex', alignItems:'center', gap:'10px',
            }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:`${AMBER}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:'18px', color:AMBER }}>payments</span>
              </div>
              <div style={{ flex:1 }}>
                <h2 style={{ color:'var(--text)', fontWeight:'800', fontSize:'14px', margin:0 }}>
                  <span style={{ color:AMBER }}>{unpaid.length}</span> session{unpaid.length !== 1 ? 's' : ''} awaiting payment
                  {' '}—{' '}<span style={{ color:CORAL }}>£{totalDue.toFixed(2)} due</span>
                </h2>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'4px 10px', borderRadius:'20px', background:`${AMBER}14`, border:`1px solid ${AMBER}28` }}>
                <div className="animate-pulse-dot" style={{ width:'6px', height:'6px', borderRadius:'50%', background:AMBER }} />
                <span style={{ fontSize:'10px', fontWeight:'700', color:AMBER }}>Action required</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', padding:'14px', border:`1.5px solid ${AMBER}18`, borderTop:'none', borderRadius:'0 0 14px 14px', background:'var(--bg-card)' }}>
              {unpaid.map(ev => <UnpaidCard key={ev.id_event} ev={ev} onPay={handlePay} paying={paying} />)}
            </div>
          </div>
        ) : !loading && (
          <div className={mounted ? 'animate-slide-up delay-100' : ''} style={{
            marginBottom:'20px', padding:'16px 22px', borderRadius:'14px',
            background:`linear-gradient(135deg, ${CORAL}12, ${CORAL}05)`,
            border:`1.5px solid ${CORAL}28`,
            display:'flex', alignItems:'center', gap:'14px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize:'30px', color:CORAL }}>check_circle</span>
            <div>
              <p style={{ fontWeight:'800', fontSize:'14px', color:CORAL, marginBottom:'2px' }}>All caught up!</p>
              <p style={{ color:'var(--text-muted)', fontSize:'12px' }}>No sessions awaiting payment. Great job keeping up to date.</p>
            </div>
          </div>
        )}

        {/* ── Chart + History ─────────────────────────────────────────────── */}
        <div className={mounted ? 'animate-slide-up delay-200' : ''} style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'16px' }}>

          {/* Payment History */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'16px', overflow:'hidden', boxShadow:'var(--shadow-card)' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'30px', height:'30px', borderRadius:'9px', background:`${CORAL}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'16px', color:CORAL }}>history</span>
              </div>
              <h2 style={{ fontWeight:'800', fontSize:'14px', color:'var(--text)', margin:0 }}>Payment History</h2>
              <span style={{ marginLeft:'auto', fontSize:'11px', color:'var(--text-faint)' }}>
                {paid.length} paid session{paid.length !== 1 ? 's' : ''}
              </span>
            </div>
            {loading ? (
              <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'12px' }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:'56px', borderRadius:'10px' }} />)}
              </div>
            ) : paid.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'36px', color:'var(--text-faint)', display:'block', marginBottom:'8px' }}>receipt_long</span>
                <p style={{ color:'var(--text-muted)', fontSize:'13px' }}>No paid sessions yet</p>
              </div>
            ) : (
              <>
                {visiblePaid.map(ev => <PaidRow key={ev.id_event} ev={ev} />)}
                {paid.length > 6 && (
                  <button
                    onClick={() => setShowAllHistory(p => !p)}
                    style={{ width:'100%', padding:'10px', textAlign:'center', fontSize:'12px', fontWeight:'700', color:'var(--text-muted)', background:'transparent', border:'none', borderTop:'1px solid var(--border)', cursor:'pointer' }}
                  >
                    {showAllHistory ? 'Show less' : `Show all ${paid.length} payments`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* 6-month chart */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'20px', boxShadow:'var(--shadow-card)', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
              <div>
                <h2 style={{ fontWeight:'800', fontSize:'13px', color:'var(--text)', marginBottom:'2px' }}>Spending</h2>
                <p style={{ fontSize:'11px', color:'var(--text-faint)' }}>Last 6 months</p>
              </div>
              <div style={{ padding:'4px 10px', borderRadius:'20px', background:`${CORAL}12`, border:`1px solid ${CORAL}22` }}>
                <span style={{ fontSize:'10px', fontWeight:'700', color:CORAL }}>£{total.toFixed(0)} total</span>
              </div>
            </div>
            <SpendingGraph events={events} loading={loading} />
          </div>

        </div>
      </div>
    </HubLayout>
  )
}
