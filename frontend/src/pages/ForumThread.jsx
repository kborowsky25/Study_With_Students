import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { getThread, createPost } from '../api/forum'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

export default function ForumThread() {
  const { threadId } = useParams({ from: '/forum/thread/$threadId' })
  const { user } = useAuth()
  const [thread,  setThread]  = useState(null)
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [reply,   setReply]   = useState('')
  const [posting, setPosting] = useState(false)

  async function load() {
    try {
      const { data } = await getThread(threadId)
      setThread(data.thread)
      setPosts(data.posts ?? [])
    } catch { toast.error('Could not load thread') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [threadId])

  async function handlePost(e) {
    e.preventDefault()
    if (!reply.trim()) return
    setPosting(true)
    try {
      await createPost(threadId, reply)
      setReply('')
      load()
    } catch { toast.error('Failed to post') }
    finally { setPosting(false) }
  }

  return (
    <HubLayout>
      <Link to="/forum" className="text-white/40 hover:text-white text-sm mb-6 inline-block transition-colors">
        ← Forum
      </Link>

      {loading ? (
        <div className="space-y-4">
          <div className="glass h-32 animate-pulse" />
          <div className="glass h-20 animate-pulse" />
        </div>
      ) : (
        <>
          {/* Thread header */}
          <div className="glass p-6 mb-6">
            <h1 className="text-2xl font-black text-white mb-3">{thread?.title}</h1>
            <p className="text-white/70 leading-relaxed">{thread?.content}</p>
            <div className="flex items-center gap-3 mt-4 text-xs text-white/30">
              <span>by {thread?.author_name}</span>
              <span>·</span>
              <span>{thread?.created_at ? new Date(thread.created_at).toLocaleDateString() : ''}</span>
            </div>
          </div>

          {/* Replies */}
          {posts.length > 0 && (
            <div className="space-y-4 mb-6">
              <h2 className="text-white font-bold">{posts.length} replies</h2>
              {posts.map(post => {
                const isMe = post.user_id === user?.id
                return (
                  <div key={post.id} className={`glass p-4 ${isMe ? 'border-coral-400/20' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                        {post.author_name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium">{post.author_name}</span>
                      {isMe && <span className="badge bg-coral-400/10 text-coral-400 text-[10px]">You</span>}
                      <span className="text-white/30 text-xs ml-auto">
                        {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{post.content}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Reply form */}
          <div className="glass p-5">
            <h3 className="font-bold text-white mb-4">Add a reply</h3>
            <form onSubmit={handlePost} className="space-y-3">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={4}
                placeholder="Share your thoughts…"
                className="input-field resize-none"
              />
              <button type="submit" disabled={posting || !reply.trim()} className="btn-primary disabled:opacity-50">
                {posting ? 'Posting…' : 'Post reply →'}
              </button>
            </form>
          </div>
        </>
      )}
    </HubLayout>
  )
}
