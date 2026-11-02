import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { reviewSession } from '../../api/reviews'
import { errorMessage } from '../../api/client'
import { invalidate } from '../../lib/query'
import { firstName } from '../../lib/format'
import { Icon } from '../ui'

const LABELS = ['', 'Poor', 'Okay', 'Good', 'Great', 'Excellent']

/** Student rates a finished session (1–5 stars + optional comment). */
export default function ReviewDialog({ event, onClose, onDone }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key >= '1' && e.key <= '5' && document.activeElement?.tagName !== 'TEXTAREA') setRating(Number(e.key))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    if (!rating) { toast.error('Pick a rating'); return }
    setSaving(true)
    try {
      await reviewSession(event.id_event, { rating, comment: comment.trim() })
      toast.success('Thanks — review posted')
      invalidate('events')
      onDone?.()
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not post the review'))
    } finally {
      setSaving(false)
    }
  }

  const shown = hover || rating
  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="dialog" style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="dialog-head">
          <h2>How was {event.title || 'your session'} with {firstName(event.tutor_name)}?</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="dialog-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="star-input" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} className={n <= shown ? 'on' : ''} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
                  <Icon name="star" fill={n <= shown} size={24} />
                </button>
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{LABELS[shown]}</span>
          </div>
          <label className="field">
            <span>Review</span>
            <textarea className="input" value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)}
              placeholder={`What was ${firstName(event.tutor_name)} like?`} />
          </label>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Not now</button>
          <button type="submit" className="btn btn-coral" disabled={saving || !rating}>{saving ? 'Posting…' : 'Post review'}</button>
        </div>
      </form>
    </div>
  )
}
