import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { getCategory } from '../api/forum'
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

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

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
          Back to Forum
        </Link>

        {/* Top banner */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
          {/* Banner header strip */}
          <div style={{
            height: '72px',
            background: `linear-gradient(135deg, ${CORAL}bb, #ff8f7e88)`,
            position: 'relative',
          }} />

          <div style={{ padding: '16px 22px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: CORAL + '20', border: `2.5px solid var(--bg-card)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '-38px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
                flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '26px', color: CORAL }}>forum</span>
              </div>
              <div>
                <h1 style={{ color: 'var(--text)', fontWeight: '900', fontSize: '22px', letterSpacing: '-0.4px', marginBottom: '3px' }}>
                  {category?.name ?? '…'}
                </h1>
                {category?.description && (
                  <p style={{ color: 'var(--text-faint)', fontSize: '13px' }}>{category.description}</p>
                )}
              </div>
            </div>
            <Link
              to="/forum/category/$categoryId/new"
              params={{ categoryId }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '10px 20px', borderRadius: '10px',
                background: CORAL, color: 'white',
                fontWeight: '700', fontSize: '13px', textDecoration: 'none',
                transition: 'opacity 0.15s',
                boxShadow: `0 3px 12px ${CORAL}40`,
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add</span>
              New Thread
            </Link>
          </div>
        </div>

        {/* Thread list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                height: '92px', borderRadius: '14px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '52px', color: 'var(--text-faint)', marginBottom: '12px', display: 'block' }}>chat_bubble_outline</span>
            <p style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>No threads yet</p>
            <p style={{ color: 'var(--text-faint)', fontSize: '13px', marginBottom: '20px' }}>Be the first to start a discussion!</p>
            <Link
              to="/forum/category/$categoryId/new"
              params={{ categoryId }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '10px 22px', borderRadius: '10px',
                background: CORAL, color: 'white',
                fontWeight: '700', fontSize: '13px', textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add</span>
              Start a thread
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {threads.map((thread, i) => {
              const authorColor = getAvatarColor(thread.author_name ?? '')
              return (
                <div
                  key={thread.id}
                  className={`animate-slide-up delay-${Math.min(i * 100, 500)}`}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'stretch',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.16)'
                    e.currentTarget.style.borderColor = CORAL + '40'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  {/* Vote column */}
                  <div style={{
                    width: '52px', flexShrink: 0,
                    background: 'var(--bg)',
                    borderRight: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '4px', padding: '16px 0',
                  }}>
                    <button
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-faint)', padding: '2px',
                        display: 'flex', borderRadius: '6px', transition: 'color 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = CORAL}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                      onClick={e => e.preventDefault()}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>arrow_drop_up</span>
                    </button>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>0</span>
                    <button
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-faint)', padding: '2px',
                        display: 'flex', borderRadius: '6px', transition: 'color 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#3a86ff'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                      onClick={e => e.preventDefault()}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>arrow_drop_down</span>
                    </button>
                  </div>

                  {/* Thread content */}
                  <Link
                    to="/forum/thread/$threadId"
                    params={{ threadId: String(thread.id) }}
                    style={{ flex: 1, minWidth: 0, padding: '16px 18px', textDecoration: 'none', display: 'block' }}
                  >
                    {/* Author row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: authorColor + '28',
                        border: `1.5px solid ${authorColor}45`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: '700', color: authorColor, flexShrink: 0,
                      }}>
                        {thread.author_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span style={{ color: 'var(--text-faint)', fontSize: '12px' }}>
                        Posted by <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{thread.author_name}</span>
                        {thread.created_at && (
                          <span style={{ marginLeft: '6px' }}>· {formatDate(thread.created_at)}</span>
                        )}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{
                      color: 'var(--text)', fontWeight: '700', fontSize: '15px',
                      marginBottom: '6px', lineHeight: 1.4,
                    }}>
                      {thread.title}
                    </h3>

                    {/* Content preview */}
                    {thread.content && (
                      <p style={{
                        color: 'var(--text-faint)', fontSize: '13px', lineHeight: 1.5,
                        marginBottom: '12px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {thread.content.length > 120 ? thread.content.slice(0, 120) + '…' : thread.content}
                      </p>
                    )}

                    {/* Footer row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        color: 'var(--text-faint)', fontSize: '12px', fontWeight: '500',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat_bubble_outline</span>
                        <span>{thread.post_count ?? 0} replies</span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        color: 'var(--text-faint)', fontSize: '12px', fontWeight: '500',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>share</span>
                        <span>Share</span>
                      </div>
                    </div>
                  </Link>

                  {/* Right: reply count badge */}
                  <div style={{
                    width: '64px', flexShrink: 0,
                    borderLeft: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '4px',
                    padding: '16px 8px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-faint)' }}>chat_bubble</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700' }}>{thread.post_count ?? 0}</span>
                    <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>replies</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </HubLayout>
  )
}
