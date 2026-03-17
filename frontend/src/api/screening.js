import client from './client'

export const sendUniCode        = (uni_email)        => client.post('/tutor-screening/send-uni-code', { uni_email })
export const verifyUniEmail     = (uni_email, code)  => client.post('/tutor-screening/verify-uni-email', { uni_email, code })
export const uploadProof        = (formData)         => client.post('/tutor-screening/upload-proof', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getScreeningStatus = ()                 => client.get('/tutor-screening/status')

export const getScreeningQueue  = ()                 => client.get('/admin/screening-queue')
export const approveScreening   = (id)               => client.post(`/admin/screening/${id}/approve`)
export const rejectScreening    = (id, notes)        => client.post(`/admin/screening/${id}/reject`, { notes })
