import { useEffect, useState } from 'react'
import { getPayments, setupPayment } from '../api/payments'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  paid:    'bg-green-400/10 text-green-400 border-green-400/20',
  pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  canceled:'bg-red-400/10 text-red-400 border-red-400/20',
}

export default function Payments() {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPayments()
      .then(({ data }) => setEvents(data.events ?? []))
      .catch(() => toast.error('Could not load payments'))
      .finally(() => setLoading(false))
  }, [])

  const total = events
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount ?? 0), 0)

  return (
    <HubLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Payments</h1>
        <p className="text-white/50">Your session payment history</p>
      </div>

      {/* Summary */}
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
          <p className="text-2xl font-black text-white">{events.filter(e => e.status === 'pending').length}</p>
          <p className="text-white/40 text-xs mt-0.5">Pending</p>
        </div>
      </div>

      {/* Platform note */}
      <div className="glass p-4 mb-8 flex items-start gap-3 border-green-400/20">
        <span className="text-2xl">✅</span>
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
          <p className="text-4xl mb-3">💳</p>
          <p className="text-white/50">No payment records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const date = ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—'
            return (
              <div key={ev.id_event} className="glass p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg flex-shrink-0">
                  💳
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{ev.title}</p>
                  <p className="text-white/40 text-sm">{date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {ev.amount && (
                    <p className="font-bold text-white">£{Number(ev.amount).toFixed(2)}</p>
                  )}
                  <span className={`badge border ${STATUS_STYLES[ev.status] ?? STATUS_STYLES.pending} mt-1`}>
                    {ev.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
