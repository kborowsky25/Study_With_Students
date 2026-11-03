import client from './client'

// Admin moderation: the queue for reports and hidden contact details, and suspending accounts
// (server/routes/safety.py).
export const getReports        = (status = 'open')   => client.get('/admin/reports', { params: { status } })
export const getReport         = (id)                => client.get(`/admin/reports/${id}`)
export const closeReport       = (id, outcome, note) => client.post(`/admin/reports/${id}/close`, { outcome, note })
export const getHiddenMessages = ()                  => client.get('/admin/hidden-messages')
export const suspendUser       = (userId, reason)    => client.post(`/admin/users/${userId}/suspend`, { reason })
export const unsuspendUser     = (userId)            => client.post(`/admin/users/${userId}/unsuspend`)
