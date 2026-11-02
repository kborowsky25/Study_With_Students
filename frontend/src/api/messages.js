import client from './client'

export const getConversations = ()                    => client.get('/messages')
export const getMessages      = (userId)              => client.get(`/messages/${userId}`)
export const sendMessage      = (receiverId, message) => client.post('/messages', { receiver_id: receiverId, message })
export const getUnreadCount   = ()                    => client.get('/messages/unread-count')
export const searchUsers      = (q)                   => client.get('/users/search', { params: { q } })
