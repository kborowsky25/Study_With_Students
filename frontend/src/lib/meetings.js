// Live group sessions — study rooms and classes: their video links and where they are in time.
import { JOIN_EARLY_MS } from './sessions'

/** Links are stored as typed; only http(s) ones are ever rendered (bare domains get https://). */
export function meetingUrl(link) {
  const s = (link || '').trim()
  if (/^https?:\/\/\S+$/i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) return `https://${s}`
  return null
}

/** Form input → a full http(s) URL ("zoom.us/j/123" works too), or null when it isn't one. */
export function normaliseLink(value) {
  const s = String(value ?? '').trim()
  if (!s) return null
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(s) ? s : `https://${s}`)
    return /^https?:$/.test(url.protocol) && url.hostname.includes('.') ? url.href : null
  } catch {
    return null
  }
}

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return null }
}

/**
 * 'upcoming' → 'soon' (the join link shows, 15 minutes before) → 'live' → 'past'.
 * Items without a start time count as upcoming; without an end time they last an hour.
 */
export function livePhase(item, now = Date.now()) {
  if (!item.start_time) return 'upcoming'
  const start = new Date(item.start_time).getTime()
  const end = item.end_time ? new Date(item.end_time).getTime() : start + 3_600_000
  if (now >= end) return 'past'
  if (now >= start) return 'live'
  return start - now <= JOIN_EARLY_MS ? 'soon' : 'upcoming'
}

export const isOpen = (phase) => phase === 'live' || phase === 'soon'

/** Whole minutes until `value`, at least 1 (for "Starts in 3 min"). */
export const minutesUntil = (value, now = Date.now()) => Math.max(1, Math.ceil((new Date(value) - now) / 60_000))

/** "45 min", "1 h", "1 h 30". */
export function formatLength(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60_000)
  if (mins < 60) return `${mins} min`
  return mins % 60 ? `${Math.floor(mins / 60)} h ${mins % 60}` : `${mins / 60} h`
}
