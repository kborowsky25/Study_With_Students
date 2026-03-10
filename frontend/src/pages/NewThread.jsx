import { useState } from 'react'
import { Link, useParams, useNavigate } from '@tanstack/react-router'
import { createThread } from '../api/forum'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

export default function NewThread() {
  const { categoryId } = useParams({ from: '/forum/category/$categoryId/new' })
  const navigate = useNavigate()
  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setLoading(true)
    try {
      const { data } = await createThread(categoryId, title, content)
      toast.success('Thread created!')
      navigate({ to: '/forum/thread/$threadId', params: { threadId: String(data.thread.id) } })
    } catch { toast.error('Failed to create thread') }
    finally { setLoading(false) }
  }

  return (
    <HubLayout>
      <Link to="/forum/category/$categoryId" params={{ categoryId }} className="text-white/40 hover:text-white text-sm mb-6 inline-block transition-colors">
        ← Back to category
      </Link>

      <h1 className="text-3xl font-black text-white mb-8">Start a new thread</h1>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="glass p-6 space-y-4">
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Thread title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Ask your question or describe your topic…"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Content</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                rows={6}
                placeholder="Share more details, context, or examples…"
                className="input-field resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Posting…' : 'Post thread →'}
            </button>
            <Link to="/forum/category/$categoryId" params={{ categoryId }} className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </HubLayout>
  )
}
