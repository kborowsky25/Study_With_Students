import client from './client'

export const getNotes   = (subject = '') => client.get('/study-notes', { params: subject ? { subject } : {} })
export const createNote = (formData)     => client.post('/study-notes', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteNote = (id)           => client.delete(`/study-notes/${id}`)

/** Download an attachment through the authenticated API and save it locally. */
export async function downloadNote(note) {
  const { data } = await client.get(`/study-notes/${note.id}/file`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = note.file_name || `${note.title}.${note.file_type || 'file'}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
