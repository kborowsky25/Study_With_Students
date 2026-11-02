// Formatting helpers shared by the hub pages. All dates are local time.

const DAY = 86_400_000

export const toDate = (value) => (value instanceof Date ? value : new Date(value))

export function formatMoney(amount, { decimals } = {}) {
  const n = Number(amount || 0)
  const digits = decimals ?? (Number.isInteger(n) ? 0 : 2)
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export const formatTime = (value) =>
  toDate(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export const formatDate = (value, opts = {}) =>
  toDate(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...opts })

export function formatDay(value) {
  const d = toDate(value)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const that = new Date(d); that.setHours(0, 0, 0, 0)
  const diff = Math.round((that - today) / DAY)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' })
  return formatDate(d, { weekday: 'short' })
}

export const formatWhen = (value) => `${formatDay(value)} · ${formatTime(value)}`

export function timeAgo(value) {
  if (!value) return ''
  const seconds = Math.round((Date.now() - toDate(value)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export const hoursBetween = (start, end) => Math.max(0, (toDate(end) - toDate(start)) / 3_600_000)

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there'

export const initials = (name = '?') =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'

/** Monday-start week buckets for the last `weeks` weeks (oldest first). */
export function weekBuckets(weeks = 8, now = new Date()) {
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(monday.getTime() - (weeks - 1 - i) * 7 * DAY)
    return { start, end: new Date(start.getTime() + 7 * DAY), label: formatDate(start) }
  })
}
