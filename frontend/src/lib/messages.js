// Messages: the contact-detail placeholder and the report reasons (the API checks the same
// list in server/routes/safety.py).

/** What the API puts in place of a phone number, email or handle (server/contact_details.py). */
export const HIDDEN = '[contact details hidden]'

/** A message split into text and hidden contact details, for display: ['Call ', HIDDEN_PART, '!']. */
export function splitHidden(text = '') {
  return String(text ?? '')
    .split(HIDDEN)
    .flatMap((part, i) => (i ? [HIDDEN_PART, part] : [part]))
    .filter((part) => part !== '')
}
export const HIDDEN_PART = Object.freeze({ hidden: true })

export const REPORT_REASONS = [
  ['off_platform', 'Asking to talk or meet off the platform'],
  ['inappropriate', 'Inappropriate or sexual messages'],
  ['bullying', 'Bullying or harassment'],
  ['spam', 'Spam or a scam'],
  ['safety', 'I’m worried about someone’s safety'],
  ['other', 'Something else'],
]

const REASON_LABELS = Object.fromEntries(REPORT_REASONS)
export const reasonLabel = (key) => REASON_LABELS[key] ?? key
