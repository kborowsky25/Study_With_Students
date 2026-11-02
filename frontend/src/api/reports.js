import client from './client'

// The admin queue for reports and hidden contact details (server/routes/safety.py).
export const getReports        = (status = 'open') => client.get('/admin/reports', { params: { status } })
export const getReport         = (id)              => client.get(`/admin/reports/${id}`)
export const closeReport       = (id, outcome, note) => client.post(`/admin/reports/${id}/close`, { outcome, note })
export const getHiddenMessages = ()                => client.get('/admin/hidden-messages')
