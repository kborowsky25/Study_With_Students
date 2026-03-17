import client from './client'

export const getNotes       = (subject = '') => client.get('/study-notes', { params: subject ? { subject } : {} })
export const createNote     = (formData)     => client.post('/study-notes', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteNote     = (id)           => client.delete(`/study-notes/${id}`)
export const noteFileUrl    = (filename)     => `/api/uploads/study-notes/${filename}`
