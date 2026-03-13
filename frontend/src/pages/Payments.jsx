import { useEffect, useState } from 'react'
import { getPayments, createCheckout, verifyPayment } from '../api/payments'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  paid:      'bg-green-400/10 text-green-400 border-green-400/20',
  pending:   'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  confirmed: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  canceled:  'bg-red-400/10 text-red-400 border-red-400/20',
}

export default function Payments() {
  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [paying,   setPaying]   = useState(null)   // event id currently being paid

  useEffect(() => {
    // Parse ?success=1&event_id=X or ?canceled=1 after Stripe redirect
    const params         = new URLSearchParams(window.location.search)
    const successEventId = params.get('success') && params.get('event_id') ? Number(params.get('event_id')) : null
    const wasCanceled    = Boolean(params.get('canceled'))

    if (successEventId) {
      // Mark the event as paid in our DB, then reload
      verifyPayment(successEventId)
        .then(() => toast.success('Payment successful!'))
        .catch(() => toast.error('Could not record payment'))
        .finally(() => {
          // Clean up the URL params without a full reload
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
        window.location.href = data.url   // redirect to Stripe Checkout
      } else {
        toast.error(data.error ?? 'Could not start checkout')
      }
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Checkout failed'
      toast.error(msg)
    } finally {
      setPaying(null)
    }
  }

  const total = events
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount ?? 0), 0)

  return (
    <HubLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Payments</h1>
        <p className="text-white/50">Your session payment history</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass p-4 text-center">
          <p className="text-2xl font-black text-white">£{total.toFixed(2)}</p>
          <p className="text-white/40 text-xs mt-0.5">Total paid</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-2xl font-black text-white">{events.filter(e => e.status === 'paid').length}</p>
          <p className="text-white/40 text-xs mt-0.5">Paid sessions</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-2xl font-black text-white">{events.filter(e => e.status === 'confirmed' || e.status === 'pending').length}</p>
          <p className="text-white/40 text-xs mt-0.5">Awaiting payment</p>
        </div>
      </div>

      {/* Platform note */}
      <div className="glass p-4 mb-8 flex items-start gap-3" style={{ borderColor: 'rgba(52,211,153,0.20)' }}>
        <span className="material-symbols-outlined" style={{ color: '#34d399', fontSize: '22px', flexShrink: 0, marginTop: '1px' }}>
          verified
        </span>
        <div>
          <p className="font-semibold text-green-400 text-sm">0% platform fee</p>
          <p className="text-white/50 text-sm mt-0.5">100% of what you pay goes directly to your tutor. Always.</p>
        </div>
      </div>

      {/* Sessions list */}
      <h2 className="font-bold text-white mb-4">Session history</h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="glass h-20 animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.20)', display: 'block', marginBottom: '12px' }}>
            payments
          </span>
          <p className="text-white/50">No payment records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const date      = ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—'
            const payable   = (ev.status === 'confirmed' || ev.status === 'pending') && Number(ev.amount ?? 0) >= 0.50
            const isPayingThis = paying === ev.id_event
            return (
              <div key={ev.id_event} className="glass p-4 flex items-center gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'rgba(255,255,255,0.35)' }}>
                    {ev.status === 'paid' ? 'check_circle' : 'receipt_long'}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{ev.title}</p>
                  <p className="text-white/40 text-sm">
                    {date}{ev.tutor_name ? ` · ${ev.tutor_name}` : ''}
                  </p>
                </div>

                {/* Amount + status + pay button */}
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                  {ev.amount && (
                    <p className="font-bold text-white">£{Number(ev.amount).toFixed(2)}</p>
                  )}
                  <span className={`badge border ${STATUS_STYLES[ev.status] ?? STATUS_STYLES.pending}`}>
                    {ev.status}
                  </span>
                  {payable && (
                    <button
                      onClick={() => handlePay(ev)}
                      disabled={isPayingThis}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {isPayingThis ? 'hourglass_empty' : 'credit_card'}
                      </span>
                      {isPayingThis ? 'Redirecting…' : 'Pay now'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
