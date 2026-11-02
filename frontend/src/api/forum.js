import client from './client'

export const getCategories    = ()                           => client.get('/forum/categories')
export const getCategory      = (id)                         => client.get(`/forum/categories/${id}`)
export const getRecentThreads = (limit = 5)                  => client.get('/forum/recent', { params: { limit } })
export const createThread     = (categoryId, title, content) => client.post(`/forum/categories/${categoryId}/threads`, { title, content })
export const getThread        = (id)                         => client.get(`/forum/threads/${id}`)
export const deleteThread     = (id)                         => client.delete(`/forum/threads/${id}`)
export const createPost       = (threadId, content)          => client.post(`/forum/threads/${threadId}/posts`, { content })
export const deletePost       = (id)                         => client.delete(`/forum/posts/${id}`)
