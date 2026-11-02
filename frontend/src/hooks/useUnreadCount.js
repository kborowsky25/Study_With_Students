import { useQuery, invalidate } from '../lib/query'
import { Q } from '../lib/queries'

/** Call after reading or sending messages so the sidebar badge updates at once. */
export const notifyUnreadChanged = () => invalidate('messages:unread', 'conversations')

/** Unread direct messages, refreshed every 30 seconds. */
export function useUnreadCount() {
  const { data } = useQuery(...Q.unread, { refreshInterval: 30_000 })
  return data?.unread ?? 0
}
