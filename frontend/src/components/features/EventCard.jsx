import { updateStatus } from '../../api/events'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  pending:   'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  confirmed: 'bg-green-400/10 text-green-400 border-green-400/20',
  canceled:  'bg-red-400/10 text-red-400 border-red-400/20',
  paid:      'bg-blue-400/10 text-blue-400 border-blue-400/20',
}

export default function EventCard({ event, onRefresh }) {
  async function changeStatus(status) {
    try {
      await updateStatus(event.id_event, status)
      toast.success(`Session ${status}`)
      onRefresh?.()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const start = event.start_time ? new Date(event.start_time).toLocaleString() : '—'
  const end   = event.end_time   ? new Date(event.end_time).toLocaleString()   : '—'

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-white">{event.title}</p>
          {event.description && (
            <p className="text-white/50 text-sm mt-0.5">{event.description}</p>
          )}
        </div>
        <span className={`badge border ${STATUS_STYLES[event.status] ?? STATUS_STYLES.pending} flex-shrink-0`}>
          {event.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <InfoRow label="Start" value={start} />
        <InfoRow label="End"   value={end}   />
        {event.amount && <InfoRow label="Amount" value={`£${event.amount}`} />}
      </div>

      {event.status === 'pending' && onRefresh && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => changeStatus('confirmed')} className="btn-primary text-sm py-1.5 flex-1">
            Accept
          </button>
          <button onClick={() => changeStatus('canceled')} className="text-sm py-1.5 flex-1 btn-secondary text-red-400 border-red-400/20 hover:bg-red-400/10">
            Decline
          </button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-white/30 text-xs">{label}</p>
      <p className="text-white/80">{value}</p>
    </div>
  )
}
