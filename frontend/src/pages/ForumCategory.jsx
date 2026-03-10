import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { getCategory } from '../api/forum'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

export default function ForumCategory() {
  const { categoryId } = useParams({ from: '/forum/category/$categoryId' })
  const [category, setCategory] = useState(null)
  const [threads,  setThreads]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getCategory(categoryId)
      .then(({ data }) => { setCategory(data.category); setThreads(data.threads ?? []) })
      .catch(() => toast.error('Could not load category'))
      .finally(() => setLoading(false))
  }, [categoryId])

  return (
    <HubLayout>
      <div className="mb-6">
        <Link to="/forum" className="text-white/40 hover:text-white text-sm mb-4 inline-block transition-colors">
          ← Forum
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">{category?.name ?? '…'}</h1>
            <p className="text-white/50">{category?.description}</p>
          </div>
          <Link
            to="/forum/category/$categoryId/new"
            params={{ categoryId }}
            className="btn-primary"
          >
            + New thread
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="glass h-20 animate-pulse" />)}
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">💬</p>
          <p className="text-white/60 mb-4">No threads yet — be the first!</p>
          <Link to="/forum/category/$categoryId/new" params={{ categoryId }} className="btn-primary">
            Start a thread
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => (
            <Link
              key={thread.id}
              to="/forum/thread/$threadId"
              params={{ threadId: String(thread.id) }}
              className="glass-hover p-4 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                🗣️
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white mb-0.5 truncate">{thread.title}</h3>
                <p className="text-white/50 text-sm line-clamp-1">{thread.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                  <span>by {thread.author_name}</span>
                  <span>·</span>
                  <span>{thread.created_at ? new Date(thread.created_at).toLocaleDateString() : ''}</span>
                  {thread.post_count != null && (
                    <>
                      <span>·</span>
                      <span>{thread.post_count} replies</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </HubLayout>
  )
}
