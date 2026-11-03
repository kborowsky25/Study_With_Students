// Suspending an account (admins): a reason for the record, and what it does, before it happens.
//   <SuspendDialog user={{ id, name }} reason="…" onClose={…} onDone={…} />
//   if (await liftSuspension(confirm, user)) …     confirm from useConfirm()
import { useState } from 'react'
import toast from 'react-hot-toast'
import { suspendUser, unsuspendUser } from '../../api/moderation'
import { errorMessage } from '../../api/client'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { useEscape } from '../../hooks/useEscape'
import { firstName, plural } from '../../lib/format'

export default function SuspendDialog({ user, reason: suggested = '', onClose, onDone }) {
  const [reason, setReason] = useState(suggested)
  const [busy, setBusy] = useState(false)
  const reasonRef = useAutoFocus()
  useEscape(onClose)
  const name = firstName(user.name)

  async function submit(e) {
    e.preventDefault()
    if (!reason.trim() || busy) return
    setBusy(true)
    try {
      const { data } = await suspendUser(user.id, reason.trim())
      const cancelled = data.cancelled
        ? `. ${plural(data.cancelled, 'session')} cancelled${data.cancelled_paid ? `: refund ${data.cancelled_paid} paid in Stripe` : ''}`
        : ''
      toast.success(`${data.message}${cancelled}`, { duration: 6000 })
      onDone?.()
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t suspend this account'))
      setBusy(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="suspend-title" style={{ maxWidth: 440 }}
        onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-body" style={{ paddingTop: 18, gap: 10 }}>
          <h2 id="suspend-title" style={{ fontSize: 14.5, fontWeight: 600 }}>Suspend {user.name}?</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {name} is signed out and can’t log in, be messaged or be booked. Their upcoming sessions are
            cancelled: refund any paid ones in Stripe.
          </div>
          <label className="field">
            <span>Why, for the record</span>
            <textarea ref={reasonRef} className="input" rows={3} maxLength={2000} required value={reason}
              onChange={(e) => setReason(e.target.value)} />
          </label>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-danger" disabled={!reason.trim() || busy}>
            {busy ? 'Suspending…' : 'Suspend'}
          </button>
        </div>
      </form>
    </div>
  )
}

export async function liftSuspension(confirm, user) {
  const ok = await confirm({
    title: `Lift ${firstName(user.name)}’s suspension?`,
    body: 'They can log in again. Sessions the suspension cancelled stay cancelled.',
    confirmLabel: 'Lift suspension',
  })
  if (!ok) return false
  try {
    const { data } = await unsuspendUser(user.id)
    toast.success(data.message)
    return true
  } catch (err) {
    toast.error(errorMessage(err, 'Couldn’t lift the suspension'))
    return false
  }
}
