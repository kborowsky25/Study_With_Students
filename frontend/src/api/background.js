import client from './client'

// Tutor background checks (enhanced DBS). See server/routes/background.py.

export const getBackgroundCheck    = ()                     => client.get('/background-check')
export const submitBackgroundCheck = (formData)             => client.post('/background-check', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

export const getDbsChecks          = (status = 'pending')   => client.get('/admin/background-checks', { params: { status } })
export const verifyDbsCheck        = (id)                   => client.post(`/admin/background-checks/${id}/verify`)
export const rejectDbsCheck        = (id, note)             => client.post(`/admin/background-checks/${id}/reject`, { note })
export const getDbsDocument        = (id)                   => client.get(`/admin/background-checks/${id}/document`, { responseType: 'blob' })

/** GOV.UK DBS Update Service status check for organisations (free, needs the tutor's consent). */
export const DBS_STATUS_CHECK_URL = 'https://secure.crbonline.gov.uk/crsc/check'

export const CHECK_TYPES = [
  { value: 'enhanced_barred', label: 'Enhanced with children’s barred list' },
  { value: 'enhanced',        label: 'Enhanced' },
  { value: 'standard',        label: 'Standard' },
  { value: 'basic',           label: 'Basic' },
]
export const ACCEPTED_TYPES = ['enhanced_barred', 'enhanced']
export const checkTypeLabel = (value) => CHECK_TYPES.find((t) => t.value === value)?.label ?? value

/** "2026-01-15" → a local Date (no timezone shift). */
export function parseDay(value) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The API sends naive UTC timestamps, e.g. "2026-11-02T10:04:31". */
export function parseUtc(value) {
  const iso = String(value).replace(/(\.\d{3})\d+/, '$1')
  return new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`)
}
