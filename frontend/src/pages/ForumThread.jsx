import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import UserBadges from '../components/features/UserBadges'
import { Avatar, Card, EmptyState, Icon, SkeletonRows } from '../components/ui'
import { useConfirm } from '../components/ui/confirm'
import { createPost, deletePost, deleteThread, getThread } from '../api/forum'
import { notifyError } from '../lib/errors'
import { authorOf } from '../lib/forum'
import { formatDate, fullDate, plural, timeAgo } from '../lib/format'
import { isSubmitShortcut, SUBMIT_KEYS } from '../lib/keyboard'

const bodyText = (text) => String(text ?? '').replace(/\s+$/, '')
const sameUser = (a, b) => a != null && b != null && Number(a) === Number(b)

// Post bodies keep the author's line breaks.
const BODY = { fontSize: 13.5, lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }

/** One post in the thread: the opening post (`op`) or a reply. */
function Post({ post, op = false, byAuthor = false, mine = false, busy = false, onDelete }) {
  const name = authorOf(post)
  return (
    <div id={op ? undefined : `post-${post.id}`} className="row" style={{ alignItems: 'flex-start', padding: op ? '14px 14px 16px' : '12px 14px' }}>
      <Avatar name={name} size={op ? 30 : 26} />
      <div className="main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minHeight: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
          {post.author_is_tutor && <UserBadges isTutor />}
          {byAuthor && <span className="pill plain">Author</span>}
          <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }} title={fullDate(post.created_at)}>{timeAgo(post.created_at)}</span>
        </div>
        <div style={{ ...BODY, ...(op && { fontSize: 14, lineHeight: 1.7 }), marginTop: op ? 8 : 4 }}>{bodyText(post.content)}</div>
      </div>
      {mine && onDelete && (
        <button type="button" className="icon-btn" style={{ opacity: busy ? 0.5 : 1 }}
          disabled={busy} onClick={() => onDelete(post)} title="Delete reply" aria-label="Delete reply">
          <Icon name="delete" size={17} />
        </button>
      )}
    </div>
  )
}

function Detail({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--text-faint)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', minWidth: 0 }}>{children}</span>
    </div>
  )
}

function ThreadDetails({ thread, posts }) {
  const people = useMemo(() => {
    const byUser = new Map([[thread.user_id, { id: thread.user_id, name: authorOf(thread), tutor: thread.author_is_tutor, replies: 0, author: true }]])
    for (const p of posts) {
      const person = byUser.get(p.user_id) ?? { id: p.user_id, name: authorOf(p), tutor: p.author_is_tutor, replies: 0, author: false }
      person.replies += 1
      byUser.set(p.user_id, person)
    }
    return [...byUser.values()]
  }, [thread, posts])
  const lastReply = posts.length ? posts[posts.length - 1].created_at : null

  return (
    <Card title="Details">
      <div style={{ padding: '4px 14px 8px' }}>
        <Detail label="Category">
          <Link to="/forum/category/$categoryId" params={{ categoryId: String(thread.category_id) }} className="card-link" style={{ fontSize: 13 }}>
            {thread.category_name}
          </Link>
        </Detail>
        <Detail label="Started"><span title={fullDate(thread.created_at)}>{formatDate(thread.created_at, { year: 'numeric' })}</span></Detail>
        <Detail label="Replies">{posts.length}</Detail>
        <Detail label="Last reply">{lastReply ? <span title={fullDate(lastReply)}>{timeAgo(lastReply)}</span> : '—'}</Detail>
      </div>
      <div style={{ padding: '10px 14px 4px', borderTop: '1px solid var(--border)', fontSize: 12.5, fontWeight: 500, color: 'var(--text-muted)' }}>
        Participants
      </div>
      <div style={{ paddingBottom: 8 }}>
        {people.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 14px' }}>
            <Avatar name={p.name} size={22} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            {p.tutor && <UserBadges isTutor />}
            <span style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
              {p.author ? 'Author' : plural(p.replies, 'reply', 'replies')}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ThreadSkeleton() {
  return (
    <>
      <div className="dash-head">
        <div className="skeleton" style={{ width: '52%', height: 30 }} />
      </div>
      <div className="dash-grid">
        <section className="card"><SkeletonRows rows={3} /></section>
        <section className="card"><SkeletonRows rows={2} /></section>
      </div>
    </>
  )
}

export default function ForumThread() {
  const { threadId } = useParams({ strict: false })
  const navigate = useNavigate()
  const { user } = useAuth()
  const confirm = useConfirm()
  const [thread, setThread] = useState(null)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [reply, setReply] = useState('')
  const [posting, setPosting] = useState(false)
  const [busy, setBusy] = useState(null)        // 'thread', or the id of a reply being deleted
  const [revealPost, setRevealPost] = useState(null)
  const composerRef = useRef(null)
  const request = useRef(0)

  const load = useCallback(async ({ quiet = false } = {}) => {
    const id = ++request.current
    if (!quiet) setStatus('loading')
    try {
      const { data } = await getThread(threadId)
      if (id !== request.current) return
      setThread(data.thread)
      setPosts(data.posts ?? [])
      setStatus('ready')
    } catch (err) {
      if (id !== request.current) return
      if (err?.response?.status === 404) return setStatus('missing')
      notifyError(err, 'Couldn’t load this thread')
      if (!quiet) setStatus('error')
    }
  }, [threadId])

  useEffect(() => { load() }, [load])

  // Bring a reply you just posted into view once it has rendered.
  useEffect(() => {
    if (!revealPost) return
    document.getElementById(`post-${revealPost}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setRevealPost(null)
  }, [revealPost, posts])

  async function submitReply(e) {
    e?.preventDefault()
    const text = reply.trim()
    if (!text || posting) return
    setPosting(true)
    try {
      const { data } = await createPost(threadId, text)
      setReply('')
      toast.success('Reply posted')
      await load({ quiet: true })
      setRevealPost(data.post?.id ?? null)
    } catch (err) {
      notifyError(err, 'Couldn’t post your reply')
    } finally {
      setPosting(false)
    }
  }

  function onComposerKeyDown(e) {
    if (isSubmitShortcut(e)) {
      e.preventDefault()
      submitReply()
    }
  }

  function focusComposer() {
    const el = composerRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  }

  async function removeThread() {
    const ok = await confirm({
      title: 'Delete this thread?',
      body: 'Its replies are deleted too. This can’t be undone.',
      confirmLabel: 'Delete thread',
      danger: true,
    })
    if (!ok) return
    setBusy('thread')
    try {
      await deleteThread(thread.id)
      toast.success('Thread deleted')
      navigate({ to: '/forum/category/$categoryId', params: { categoryId: String(thread.category_id) }, replace: true })
    } catch (err) {
      notifyError(err, 'Couldn’t delete the thread')
      setBusy(null)
    }
  }

  async function removePost(post) {
    const ok = await confirm({ title: 'Delete this reply?', body: 'This can’t be undone.', confirmLabel: 'Delete reply', danger: true })
    if (!ok) return
    setBusy(post.id)
    try {
      await deletePost(post.id)
      setPosts((list) => list.filter((p) => p.id !== post.id))
      toast.success('Reply deleted')
    } catch (err) {
      notifyError(err, 'Couldn’t delete the reply')
    } finally {
      setBusy(null)
    }
  }

  const ownThread = sameUser(thread?.user_id, user?.id)

  return (
    <HubLayout>
      <PageTitle title={thread?.category_name || 'Forum'} icon="forum" />

      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, minWidth: 0 }}>
        <Link to="/forum" className="card-link" activeOptions={{ exact: true }}><Icon name="arrow_back" />Forum</Link>
        {thread && (
          <>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>/</span>
            <Link to="/forum/category/$categoryId" params={{ categoryId: String(thread.category_id) }} className="card-link">
              {thread.category_name}
            </Link>
          </>
        )}
      </nav>

      {status === 'loading' ? <ThreadSkeleton /> : status === 'missing' ? (
        <Card>
          <EmptyState title="This thread doesn’t exist or was deleted."
            action={<Link to="/forum" className="btn btn-ghost btn-sm">Back to the forum</Link>} />
        </Card>
      ) : status === 'error' || !thread ? (
        <Card>
          <EmptyState title="Couldn’t load this thread."
            action={<button className="btn btn-ghost btn-sm" onClick={() => load()}>Try again</button>} />
        </Card>
      ) : (
        <>
          <div className="dash-head">
            <h1 style={{ flex: '1 1 420px', minWidth: 0, overflowWrap: 'anywhere' }}>{thread.title}</h1>
            <div className="dash-actions">
              {ownThread && (
                <button className="btn btn-danger" onClick={removeThread} disabled={busy === 'thread'}>
                  {busy === 'thread' ? 'Deleting…' : 'Delete'}
                </button>
              )}
              <button className="btn btn-ghost" onClick={focusComposer}>Reply</button>
            </div>
          </div>

          <div className="dash-grid">
            <section className="card">
              <div className="row-list">
                <Post post={thread} op />
                <div className="row" style={{ minHeight: 34, padding: '0 14px', background: 'rgb(var(--fg) / 0.03)', fontSize: 12.5, fontWeight: 500, color: 'var(--text-muted)' }}>
                  {posts.length ? plural(posts.length, 'reply', 'replies') : 'No replies yet'}
                </div>
                {posts.map((p) => (
                  <Post key={p.id} post={p} byAuthor={sameUser(p.user_id, thread.user_id)} mine={sameUser(p.user_id, user?.id)}
                    busy={busy === p.id} onDelete={removePost} />
                ))}
              </div>

              <form onSubmit={submitReply} style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)' }}>
                <textarea ref={composerRef} className="input" rows={3} value={reply}
                  onChange={(e) => setReply(e.target.value)} onKeyDown={onComposerKeyDown}
                  placeholder="Write a reply…" aria-label="Write a reply" />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="submit" className="btn btn-coral btn-sm" disabled={posting || !reply.trim()} title={`Post reply (${SUBMIT_KEYS})`}>
                    {posting ? 'Posting…' : 'Post reply'}
                  </button>
                </div>
              </form>
            </section>

            <ThreadDetails thread={thread} posts={posts} />
          </div>
        </>
      )}
    </HubLayout>
  )
}
