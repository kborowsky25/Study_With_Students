import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import UserBadges from '../components/features/UserBadges'
import { Avatar, Card, EmptyState, Icon, SkeletonRows } from '../components/ui'
import { getCategory } from '../api/forum'
import { notifyError } from '../lib/errors'
import { authorOf } from '../lib/forum'
import { fullDate, plural, timeAgo } from '../lib/format'

function ThreadRow({ thread: t }) {
  const author = authorOf(t)
  return (
    <Link to="/forum/thread/$threadId" params={{ threadId: String(t.id) }} className="row">
      <Avatar name={author} size={28} />
      <div className="main">
        <div className="title">{t.title}</div>
        <div className="meta" style={{ lineHeight: '20px' }} title={`Started ${fullDate(t.created_at)}`}>
          {author}{t.author_is_tutor && <UserBadges isTutor style={{ marginLeft: 6 }} />}
        </div>
      </div>
      <span className="side hide-mobile" style={{ width: 72, textAlign: 'right' }}>
        {plural(t.post_count ?? 0, 'reply', 'replies')}
      </span>
      <span className="side" style={{ width: 64, textAlign: 'right' }} title={`Last activity ${fullDate(t.last_activity)}`}>
        {timeAgo(t.last_activity)}
      </span>
    </Link>
  )
}

export default function ForumCategory() {
  const { categoryId } = useParams({ strict: false })
  const [category, setCategory] = useState(null)
  const [threads, setThreads] = useState([])
  const [status, setStatus] = useState('loading')
  const request = useRef(0)

  const load = useCallback(() => {
    const id = ++request.current
    setStatus('loading')
    return getCategory(categoryId)
      .then(({ data }) => {
        if (id !== request.current) return
        setCategory(data.category)
        setThreads(data.threads ?? [])
        setStatus('ready')
      })
      .catch((err) => {
        if (id !== request.current) return
        if (err?.response?.status === 404) return setStatus('missing')
        notifyError(err, 'Couldn’t load this category')
        setStatus('error')
      })
  }, [categoryId])

  useEffect(() => { load() }, [load])

  const newThread = { to: '/forum/category/$categoryId/new', params: { categoryId: String(categoryId) } }

  return (
    <HubLayout>
      <PageTitle title={category?.name || 'Forum'} icon="forum" />

      <nav aria-label="Breadcrumb" style={{ marginBottom: 14 }}>
        <Link to="/forum" className="card-link" activeOptions={{ exact: true }}><Icon name="arrow_back" />Forum</Link>
      </nav>

      {status === 'missing' ? (
        <Card>
          <EmptyState title="This category doesn’t exist."
            action={<Link to="/forum" className="btn btn-ghost btn-sm">Back to the forum</Link>} />
        </Card>
      ) : status === 'error' && !category ? (
        <Card>
          <EmptyState title="Couldn’t load this category."
            action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
        </Card>
      ) : (
        <>
          <div className="dash-head">
            {category ? (
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Icon name={category.icon || 'forum'} size={24} style={{ color: 'var(--coral)' }} />
                {category.name}
              </h1>
            ) : (
              <div className="skeleton" style={{ width: 240, height: 30 }} />
            )}
            <div className="dash-actions">
              <Link {...newThread} className="btn btn-coral"><Icon name="add" />New thread</Link>
            </div>
          </div>

          <Card title="Threads" count={status === 'ready' && threads.length ? threads.length : null}>
            {status === 'loading' ? <SkeletonRows rows={4} /> : threads.length ? (
              <div className="row-list">
                {threads.map((t) => <ThreadRow key={t.id} thread={t} />)}
              </div>
            ) : (
              <EmptyState title="No threads yet."
                action={<Link {...newThread} className="btn btn-ghost btn-sm">Start a thread</Link>} />
            )}
          </Card>
        </>
      )}
    </HubLayout>
  )
}
