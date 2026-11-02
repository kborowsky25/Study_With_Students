import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Avatar, Card, EmptyState, Icon, SkeletonRows } from '../components/ui'
import { getCategories, getRecentThreads } from '../api/forum'
import { useAutoFocus } from '../hooks/useAutoFocus'
import { notifyError } from '../lib/errors'
import { authorOf } from '../lib/forum'
import { plural, timeAgo } from '../lib/format'

function CategoryRow({ category: c }) {
  return (
    <Link to="/forum/category/$categoryId" params={{ categoryId: String(c.id) }} className="row">
      <Icon name={c.icon || 'forum'} size={20} style={{ color: 'var(--coral)', width: 22 }} />
      <div className="main">
        <div className="title">{c.name}</div>
        {c.description && <div className="meta">{c.description}</div>}
      </div>
      <span className="side hide-mobile">
        {plural(c.thread_count ?? 0, 'thread')} · {plural(c.post_count ?? 0, 'reply', 'replies')}
      </span>
      <span className="side" style={{ width: 64, textAlign: 'right' }}>{c.last_activity ? timeAgo(c.last_activity) : '—'}</span>
    </Link>
  )
}

function CategoryPicker({ categories, onPick, onClose }) {
  const first = useAutoFocus()
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="forum-picker-title"
        style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head" style={{ alignItems: 'center' }}>
          <h2 id="forum-picker-title" style={{ flex: 1 }}>Choose a category</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="row-list" style={{ marginTop: 14, paddingBottom: 6, borderTop: '1px solid var(--border)' }}>
          {categories.map((c, i) => (
            <button key={c.id} type="button" className="row" style={{ paddingLeft: 18, paddingRight: 18 }}
              ref={i === 0 ? first : undefined} onClick={() => onPick(c)}>
              <Icon name={c.icon || 'forum'} size={18} style={{ color: 'var(--coral)', width: 20 }} />
              <div className="main"><div className="title">{c.name}</div></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ForumHome() {
  const navigate = useNavigate()
  const [data, setData] = useState({ categories: [], recent: [] })
  const [status, setStatus] = useState('loading')
  const [picking, setPicking] = useState(false)
  const closePicker = useCallback(() => setPicking(false), [])

  const load = useCallback(() => {
    setStatus('loading')
    return Promise.allSettled([getCategories(), getRecentThreads(6)]).then(([cats, recent]) => {
      if (cats.status === 'rejected') notifyError(cats.reason, 'Couldn’t load the forum')
      setData({
        categories: cats.status === 'fulfilled' ? cats.value.data.categories ?? [] : [],
        recent: recent.status === 'fulfilled' ? recent.value.data.threads ?? [] : [],
      })
      setStatus(cats.status === 'fulfilled' ? 'ready' : 'error')
    })
  }, [])

  useEffect(() => { load() }, [load])

  const { categories, recent } = data
  const loading = status === 'loading'

  return (
    <HubLayout>
      <PageTitle title="Forum" icon="forum" />

      <div className="dash-head">
        <h1>Forum</h1>
        <div className="dash-actions">
          <button className="btn btn-coral" onClick={() => setPicking(true)} disabled={!categories.length}>
            <Icon name="add" />New thread
          </button>
        </div>
      </div>

      <div className="dash-grid">
        <Card title="Categories" count={categories.length || null}>
          {loading ? <SkeletonRows rows={6} /> : status === 'error' ? (
            <EmptyState title="Couldn’t load the forum."
              action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
          ) : categories.length ? (
            <div className="row-list">
              {categories.map((c) => <CategoryRow key={c.id} category={c} />)}
            </div>
          ) : (
            <EmptyState title="No categories yet." />
          )}
        </Card>

        <Card title="Latest discussions">
          {loading ? <SkeletonRows rows={4} /> : recent.length ? (
            <div className="row-list">
              {recent.map((t) => (
                <Link key={t.id} to="/forum/thread/$threadId" params={{ threadId: String(t.id) }} className="row">
                  <Avatar name={authorOf(t)} size={28} />
                  <div className="main">
                    <div className="title">{t.title}</div>
                    <div className="meta">
                      {t.category_name} · {plural(t.post_count ?? 0, 'reply', 'replies')} · {timeAgo(t.last_activity)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No discussions yet." />
          )}
        </Card>
      </div>

      {picking && (
        <CategoryPicker
          categories={categories}
          onClose={closePicker}
          onPick={(c) => navigate({ to: '/forum/category/$categoryId/new', params: { categoryId: String(c.id) } })}
        />
      )}
    </HubLayout>
  )
}
