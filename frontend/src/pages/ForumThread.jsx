import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { getThread, createPost } from '../api/forum'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const CORAL = '#ff725e'

const AVATAR_COLORS = [
  '#6c63ff', '#3a86ff', '#06d6a0', '#f9c74f', '#f4845f',
  '#a8dadc', '#e63946', '#2ec4b6', '#ff9f1c', '#b5838d',
]

function getAvatarColor(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function UserAvatar({ name = '', size = 36 }) {
  const color = getAvatarColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '28',
      border: `1.5px solid ${color}45`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color, fontSize: Math.floor(size * 0.36) + 'px', fontWeight: '700',
      userSelect: 'none',
    }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function VoteBlock({ vertical = true }) {
  const [vote, setVote] = useState(0)
  return (
    <div style={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      alignItems: 'center',
      gap: vertical ? '4px' : '8px',
    }}>
      <button
        onClick={() => setVote(v => v === 1 ? 0 : 1)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
          color: vote === 1 ? CORAL : 'var(--text-faint)',
          display: 'flex', borderRadius: '6px', transition: 'color 0.12s',
        }}
        onMouseEnter={e => { if (vote !== 1) e.currentTarget.style.color = CORAL }}
        onMouseLeave={e => { if (vote !== 1) e.currentTarget.style.color = 'var(--text-faint)' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: vertical ? '22px' : '19px' }}>arrow_drop_up</span>
      </button>
      <span style={{
        fontWeight: '700', fontSize: '13px',
        color: vote === 1 ? CORAL : vote === -1 ? '#3a86ff' : 'var(--text-muted)',
        minWidth: '14px', textAlign: 'center',
      }}>
        {vote}
      </span>
      <button
        onClick={() => setVote(v => v === -1 ? 0 : -1)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
          color: vote === -1 ? '#3a86ff' : 'var(--text-faint)',
          display: 'flex', borderRadius: '6px', transition: 'color 0.12s',
        }}
        onMouseEnter={e => { if (vote !== -1) e.currentTarget.style.color = '#3a86ff' }}
        onMouseLeave={e => { if (vote !== -1) e.currentTarget.style.color = 'var(--text-faint)' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: vertical ? '22px' : '19px' }}>arrow_drop_down</span>
      </button>
    </div>
  )
}

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
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Back link */}
        <Link
          to="/forum"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            color: 'var(--text-faint)', fontSize: '13px', fontWeight: '500',
            textDecoration: 'none', marginBottom: '20px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>arrow_back</span>
          Back to category
        </Link>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ height: '140px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '80px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '80px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        ) : (
          <>
            {/* ── Thread post card ──────────────────────────────────── */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                {/* Vote sidebar */}
                <div style={{
                  width: '52px', flexShrink: 0,
                  background: 'var(--bg)',
                  borderRight: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '20px 0',
                }}>
                  <VoteBlock vertical />
                </div>

                {/* Post content */}
                <div style={{ flex: 1, minWidth: 0, padding: '20px 22px' }}>
                  {/* Author */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <UserAvatar name={thread?.author_name} size={32} />
                    <div>
                      <span style={{ color: 'var(--text)', fontWeight: '700', fontSize: '13px' }}>{thread?.author_name}</span>
                      <span style={{ color: 'var(--text-faint)', fontSize: '12px', marginLeft: '8px' }}>
                        {formatDate(thread?.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h1 style={{
                    color: 'var(--text)', fontWeight: '900', fontSize: '22px',
                    letterSpacing: '-0.4px', lineHeight: 1.35, marginBottom: '14px',
                  }}>
                    {thread?.title}
                  </h1>

                  {/* Content */}
                  <p style={{
                    color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7,
                    marginBottom: '18px',
                  }}>
                    {thread?.content}
                  </p>

                  {/* Action bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      color: 'var(--text-faint)', fontSize: '12px', fontWeight: '600',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>chat_bubble_outline</span>
                      {posts.length} Comments
                    </div>
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      color: 'var(--text-faint)', fontSize: '12px', fontWeight: '600',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                      borderRadius: '6px', transition: 'background 0.1s, color 0.1s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>share</span>
                      Share
                    </button>
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      color: 'var(--text-faint)', fontSize: '12px', fontWeight: '600',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                      borderRadius: '6px', transition: 'background 0.1s, color 0.1s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>bookmark_border</span>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Comments header ───────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-faint)' }}>chat_bubble</span>
              <h2 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '16px' }}>
                {posts.length} {posts.length === 1 ? 'Comment' : 'Comments'}
              </h2>
            </div>

            {/* ── Add comment form ──────────────────────────────────── */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '18px 20px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <UserAvatar name={user?.name ?? 'You'} size={36} />
                <form onSubmit={handlePost} style={{ flex: 1 }}>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    rows={3}
                    placeholder="What are your thoughts?"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'var(--bg)',
                      border: '1.5px solid var(--border)',
                      borderRadius: '10px',
                      color: 'var(--text)',
                      fontSize: '13.5px',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.6,
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                      marginBottom: '10px',
                    }}
                    onFocus={e => e.target.style.borderColor = CORAL + '60'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={posting || !reply.trim()}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                        padding: '9px 20px', borderRadius: '10px',
                        background: reply.trim() ? CORAL : 'var(--border)',
                        color: reply.trim() ? 'white' : 'var(--text-faint)',
                        border: 'none', fontWeight: '700', fontSize: '13px',
                        cursor: reply.trim() ? 'pointer' : 'not-allowed',
                        transition: 'background 0.15s, color 0.15s, opacity 0.15s',
                        opacity: posting ? 0.7 : 1,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>send</span>
                      {posting ? 'Posting…' : 'Comment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* ── Reply list ────────────────────────────────────────── */}
            {posts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {posts.map((post, i) => {
                  const isMe = post.user_id === user?.id
                  const authorColor = getAvatarColor(post.author_name ?? '')
                  return (
                    <div
                      key={post.id}
                      className={`animate-slide-up delay-${Math.min(i * 100, 500)}`}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        borderLeft: `3px solid ${isMe ? CORAL + '80' : authorColor + '50'}`,
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'stretch' }}>
                        {/* Vote column */}
                        <div style={{
                          width: '44px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '14px 0',
                          borderRight: '1px solid var(--border)',
                          background: 'var(--bg)',
                        }}>
                          <VoteBlock vertical />
                        </div>

                        {/* Comment body */}
                        <div style={{ flex: 1, minWidth: 0, padding: '14px 16px' }}>
                          {/* Author row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
                            <UserAvatar name={post.author_name} size={28} />
                            <span style={{
                              color: isMe ? CORAL : 'var(--text)', fontWeight: '700', fontSize: '13px',
                            }}>
                              {post.author_name}
                            </span>
                            {isMe && (
                              <span style={{
                                background: CORAL + '20', color: CORAL,
                                fontSize: '10px', fontWeight: '700',
                                padding: '2px 8px', borderRadius: '20px',
                                border: `1px solid ${CORAL}35`,
                              }}>
                                You
                              </span>
                            )}
                            <span style={{ color: 'var(--text-faint)', fontSize: '12px', marginLeft: 'auto' }}>
                              {formatDate(post.created_at)}
                            </span>
                          </div>

                          {/* Content */}
                          <p style={{
                            color: 'var(--text-muted)', fontSize: '13.5px', lineHeight: 1.65,
                            marginBottom: '10px',
                          }}>
                            {post.content}
                          </p>

                          {/* Reply action */}
                          <button style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            color: 'var(--text-faint)', fontSize: '12px', fontWeight: '600',
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '3px 8px', borderRadius: '6px', transition: 'background 0.1s, color 0.1s',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>reply</span>
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {posts.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '48px 20px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '14px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--text-faint)', marginBottom: '10px', display: 'block' }}>chat_bubble_outline</span>
                <p style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>No comments yet</p>
                <p style={{ color: 'var(--text-faint)', fontSize: '13px' }}>Be the first to share your thoughts!</p>
              </div>
            )}
          </>
        )}
      </div>
    </HubLayout>
  )
}
