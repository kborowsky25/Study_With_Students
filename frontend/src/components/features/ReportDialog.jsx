// Report someone, or one of their messages, to the admin team (POST /api/reports).
//   <ReportDialog person={{ user_id, name }} messages={theirMessages} onClose={…} onBlocked={…} />
//   messages   messages they sent (to me, or to my child): one can be picked; newest first
//   canBlock   offer "Also block them" (not in a child's conversation, which the parent only reads)
import { useState } from 'react'
import toast from 'react-hot-toast'
import { blockUser, reportUser } from '../../api/messages'
import { errorMessage } from '../../api/client'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { useEscape } from '../../hooks/useEscape'
import { firstName, formatDay, formatTime } from '../../lib/format'
import { REPORT_REASONS } from '../../lib/messages'
import { Icon } from '../ui'
import './safety.css'

const MAX_MESSAGES = 20
const excerpt = (text, length = 64) => (text.length > length ? `${text.slice(0, length - 1)}…` : text)

export default function ReportDialog({ person, messages = [], canBlock = false, onClose, onBlocked }) {
  const [reason, setReason] = useState('')
  const [messageId, setMessageId] = useState('')
  const [note, setNote] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(false)
  const [busy, setBusy] = useState(false)
  const firstRef = useAutoFocus()
  useEscape(onClose)
  const name = firstName(person.name)

  async function submit(e) {
    e.preventDefault()
    if (!reason || busy) return
    setBusy(true)
    try {
      await reportUser(person.user_id, { reason, note: note.trim() || undefined, message_id: messageId ? Number(messageId) : undefined })
      if (alsoBlock) {
        await blockUser(person.user_id)
        onBlocked?.()
      }
      toast.success(alsoBlock ? `Report sent and ${name} blocked` : 'Report sent. Our team will look at it.')
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the report'))
      setBusy(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog report-dialog" role="dialog" aria-label={`Report ${name}`} onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>Report {name}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="dialog-body">
          <fieldset className="report-reasons">
            <legend>What’s wrong?</legend>
            {REPORT_REASONS.map(([key, label], i) => (
              <label key={key} className={reason === key ? 'on' : ''}>
                <input ref={i === 0 ? firstRef : undefined} type="radio" name="reason" value={key}
                  checked={reason === key} onChange={() => setReason(key)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          {reason === 'safety' && <p className="report-urgent">If someone is in immediate danger, call 999.</p>}

          {messages.length > 0 && (
            <label className="field">
              <span>Message</span>
              <select className="input" value={messageId} onChange={(e) => setMessageId(e.target.value)}>
                <option value="">Not about one message</option>
                {messages.slice(0, MAX_MESSAGES).map((m) => (
                  <option key={m.id_message} value={m.id_message}>
                    {formatDay(m.message_timestamp)} {formatTime(m.message_timestamp)} · {excerpt(m.message)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            <span>Anything else we should know</span>
            <textarea className="input" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {canBlock && (
            <label className="report-block">
              <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
              <span>Also block {name}</span>
            </label>
          )}
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={!reason || busy}>{busy ? 'Sending…' : 'Send report'}</button>
        </div>
      </form>
    </div>
  )
}
