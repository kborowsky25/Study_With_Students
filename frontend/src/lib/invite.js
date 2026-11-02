// The code from an invite link (/signup?ref=CODE), kept until the account exists in case the
// visitor looks around first. A code is forgotten after INVITE_DAYS.

const KEY = 'sws_invite'
const DAY = 86_400_000
export const INVITE_DAYS = 30

/** An invite code as the API stores it (upper case), or null if `value` can't be one. */
export function normalizeInvite(value) {
  const code = String(value ?? '').trim().toUpperCase()
  return /^[A-Z0-9]{8}$/.test(code) ? code : null
}

export function rememberInvite(value, now = Date.now()) {
  const code = normalizeInvite(value)
  if (code) {
    try { localStorage.setItem(KEY, JSON.stringify({ code, at: now })) } catch { /* storage off */ }
  }
  return code
}

export function storedInvite(now = Date.now()) {
  try {
    const { code, at } = JSON.parse(localStorage.getItem(KEY)) ?? {}
    if (normalizeInvite(code) && now - at < INVITE_DAYS * DAY) return code
    localStorage.removeItem(KEY)
  } catch { /* nothing readable stored */ }
  return null
}

export function forgetInvite() {
  try { localStorage.removeItem(KEY) } catch { /* storage off */ }
}

/** The code in this page's address (`?ref=`), saved for later; otherwise one saved earlier. */
export const currentInvite = (search = window.location.search, now = Date.now()) =>
  rememberInvite(new URLSearchParams(search).get('ref'), now) ?? storedInvite(now)

/** The link that signs someone up with `code`. */
export const inviteLink = (code, origin = window.location.origin) => `${origin}/signup?ref=${code}`
