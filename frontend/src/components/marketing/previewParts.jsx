// Pieces shared by the homepage's dashboard preview (AppPreview.jsx) and the views it loads
// once the page has painted (AppPreviewViews.jsx).
import { formatTime } from '../../lib/format'

export const range = (s) => `${formatTime(s.start)}–${formatTime(s.end)}`
export const sum = (list, value) => list.reduce((total, item) => total + value(item), 0)
export const lastOf = (list) => list[list.length - 1]
export const replies = (n) => `${n} ${n === 1 ? 'reply' : 'replies'}`

/** A card as in the app (components/ui Card), with its title as text. */
export function Panel({ title, count, action, className = '', children }) {
  return (
    <div className={`card ${className}`}>
      <div className="card-head">
        <span className="mk-card-title">{title}</span>
        {count != null && <span className="count">{count}</span>}
        {action}
      </div>
      {children}
    </div>
  )
}
