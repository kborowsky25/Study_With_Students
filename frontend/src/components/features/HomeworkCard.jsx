// Student dashboard card: open homework from lesson notes, ticked off in place.
//   <HomeworkCard />
// Renders nothing when there is no homework to do. Shares its data with the progress page.
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '../../lib/query'
import { NQ } from '../../lib/progress'
import { Card, CardLink } from '../ui'
import { HomeworkItem } from './LessonNote'

export default function HomeworkCard({ limit = 5 }) {
  const { user } = useAuth()
  const [key, fetcher] = NQ.progress(user?.id)
  const { data } = useQuery(key, fetcher, { enabled: Boolean(user?.id) })
  const open = (data?.homework ?? []).filter((h) => !h.done_at)

  if (!open.length) return null
  return (
    <Card title="Homework" count={open.length} action={<CardLink to="/progress">Progress</CardLink>}>
      <div className="hw-rows hw-list">
        {open.slice(0, limit).map((h) => <HomeworkItem key={h.id} item={h} canTick context={h.session_title} />)}
      </div>
    </Card>
  )
}
