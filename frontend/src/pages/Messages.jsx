import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Avatar, EmptyState, Icon, Kbd, Pill, SkeletonRows } from '../components/ui'
import { getConversations, getMessages, searchUsers, sendMessage } from '../api/messages'
import { getUserProfile } from '../api/users'
import { errorMessage } from '../api/client'
import { useAutoFocus } from '../hooks/useAutoFocus'
import { notifyUnreadChanged } from '../hooks/useUnreadCount'
import { formatDay, formatTime, timeAgo } from '../lib/format'
import './Messages.css'

const THREAD_POLL_MS = 4000
const INBOX_POLL_MS = 15000

function NewMessageDialog({ onPick, onClose }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [index, setIndex] = useState(0)
  const inputRef = useAutoFocus()

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(() => {
      searchUsers(q.trim())
        .then(({ data }) => { setResults(data.users ?? []); setIndex(0) })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[index]) { e.preventDefault(); onPick(results[index]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="dialog palette inbox-picker" role="dialog" aria-label="New message" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="person_search" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Search by name or email address…" aria-label="Search people" />
          <span className="hide-mobile"><Kbd>esc</Kbd></span>
          <button type="button" className="icon-btn inbox-picker-close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="palette-list">
          {q.trim().length < 2 ? (
            <div className="palette-empty">Type at least two letters.</div>
          ) : loading ? (
            <div className="palette-empty">Searching…</div>
          ) : results.length === 0 ? (
            <div className="palette-empty">No one matches “{q}”.</div>
          ) : results.map((u, i) => (
            <button key={u.id_user} type="button" className={`palette-item ${i === index ? 'on' : ''}`}
              onMouseMove={() => setIndex(i)} onClick={() => onPick(u)}>
              <Avatar name={u.name} size={26} />
              <span className="grow" style={{ color: 'var(--text)' }}>{u.name}</span>
              {u.is_tutor && <Pill tone="coral">Tutor</Pill>}
              {u.university && <span className="hide-mobile" style={{ fontSize: 12, color: 'var(--text-faint)' }}>{u.university}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function groupByDay(messages) {
  const groups = []
  for (const m of messages) {
    const day = new Date(m.message_timestamp).toDateString()
    const last = groups[groups.length - 1]
    if (last?.day === day) last.items.push(m)
    else groups.push({ day, label: formatDay(m.message_timestamp), items: [m] })
  }
  return groups
}

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const search = useSearch({ strict: false })
  const partnerId = search.user ? Number(search.user) : null

  const [conversations, setConversations] = useState([])
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [partner, setPartner] = useState(null)      // { user_id, name }
  const [messages, setMessages] = useState([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [composing, setComposing] = useState(false)
  const threadRef = useRef(null)
  const inputRef = useRef(null)
  const stickToBottom = useRef(true)
  const lastSeen = useRef(null) // "<partner>:<newest message id>" the unread badge was last synced for

  const loadInbox = useCallback(() =>
    getConversations()
      .then(({ data }) => setConversations(data.conversations ?? []))
      .catch(() => {})
      .finally(() => setLoadingInbox(false)), [])

  // Opening a thread marks it read on the server. The sidebar badge only needs a refresh
  // when that can have changed: on open, and when a new message arrives.
  const loadThread = useCallback((id) =>
    getMessages(id).then(({ data }) => {
      const list = data.messages ?? []
      setMessages(list)
      const seen = `${id}:${list[list.length - 1]?.id_message ?? 0}`
      if (seen !== lastSeen.current) {
        lastSeen.current = seen
        setConversations((all) => all.map((c) => (c.user_id === id ? { ...c, unread: 0 } : c)))
        notifyUnreadChanged()
      }
    }), [])

  // Inbox: load + poll
  useEffect(() => {
    loadInbox()
    const t = setInterval(loadInbox, INBOX_POLL_MS)
    return () => clearInterval(t)
  }, [loadInbox])

  // You can't message yourself: drop a ?user= that points at your own account.
  useEffect(() => {
    if (partnerId && partnerId === user?.id) navigate({ to: '/messages', search: {}, replace: true })
  }, [partnerId, user?.id, navigate])

  // Selected conversation follows ?user=. Someone new (no conversation yet) is looked up once.
  const knownName = conversations.find((c) => c.user_id === partnerId)?.name
  useEffect(() => {
    if (!partnerId) { setPartner(null); return }
    if (knownName) { setPartner({ user_id: partnerId, name: knownName }); return }
    let live = true
    setPartner((p) => (p?.user_id === partnerId ? p : null))
    getUserProfile(partnerId)
      .then(({ data }) => { if (live) setPartner({ user_id: partnerId, name: data.user.name }) })
      .catch(() => {
        if (!live) return
        toast.error('That user could not be found')
        navigate({ to: '/messages', search: {} })
      })
    return () => { live = false }
  }, [partnerId, knownName, navigate])

  // Thread: load + poll
  useEffect(() => {
    if (!partnerId) { setMessages([]); return }
    setMessages([])
    setLoadingThread(true)
    stickToBottom.current = true
    loadThread(partnerId).catch(() => {}).finally(() => setLoadingThread(false))
    const t = setInterval(() => loadThread(partnerId).catch(() => {}), THREAD_POLL_MS)
    // Focus the composer with a mouse; on touch screens that would pop the keyboard over the thread.
    if (window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus()
    return () => clearInterval(t)
  }, [partnerId, loadThread])

  // Keep the newest message in view unless the user scrolled up
  useEffect(() => {
    const el = threadRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  function open(id) {
    navigate({ to: '/messages', search: { user: id } })
  }

  async function send(e) {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || !partnerId || sending) return
    setSending(true)
    try {
      const { data } = await sendMessage(partnerId, text)
      setDraft('')
      stickToBottom.current = true
      setMessages((list) => [...list, data.data])
      loadInbox()
    } catch (err) {
      toast.error(errorMessage(err, 'Message not sent'))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? conversations.filter((c) => c.name.toLowerCase().includes(q)) : conversations
  }, [conversations, filter])

  const groups = useMemo(() => groupByDay(messages), [messages])
  const lastMine = [...messages].reverse().find((m) => m.id_sender === user?.id)
  const partnerFirst = partner?.name?.split(' ')[0]

  return (
    <HubLayout raw noScroll>
      <PageTitle title="Messages" icon="chat" />
      <div className={`inbox ${partnerId ? 'has-thread' : ''}`}>
        {/* ── Conversation list ── */}
        <aside className="inbox-list">
          <div className="inbox-list-head">
            <h2>Inbox</h2>
            <button className="btn btn-coral btn-sm" onClick={() => setComposing(true)}><Icon name="edit_square" />New</button>
          </div>
          <label className="inbox-filter">
            <Icon name="search" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter conversations"
              aria-label="Filter conversations" />
          </label>
          <div className="inbox-scroll">
            {loadingInbox ? <SkeletonRows rows={4} /> : visible.length === 0 ? (
              <EmptyState title={filter ? 'No matches.' : 'No conversations yet.'}
                action={!filter && <button className="btn btn-ghost btn-sm" onClick={() => setComposing(true)}>Start one</button>} />
            ) : visible.map((c) => (
              <button key={c.user_id} className={`convo ${c.user_id === partnerId ? 'on' : ''} ${c.unread ? 'unread' : ''}`}
                onClick={() => open(c.user_id)} aria-current={c.user_id === partnerId ? 'true' : undefined}>
                <Avatar name={c.name} size={36} />
                <span className="convo-main">
                  <span className="convo-top">
                    <span className="convo-name">{c.name}</span>
                    <span className="convo-time">{timeAgo(c.last_ts)}</span>
                  </span>
                  <span className="convo-preview">{c.last_from_me ? 'You: ' : ''}{c.last_message}</span>
                </span>
                {c.unread > 0 && <span className="nav-badge" aria-label={`${c.unread} unread`}>{c.unread}</span>}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Thread ── */}
        <section className="inbox-thread">
          {!partnerId ? (
            <div className="thread-empty">
              <EmptyState title="Pick a conversation, or start a new one."
                action={<button className="btn btn-coral" onClick={() => setComposing(true)}><Icon name="edit_square" />New message</button>} />
            </div>
          ) : (
            <>
              <header className="thread-head">
                <button className="icon-btn thread-back" onClick={() => navigate({ to: '/messages', search: {} })} aria-label="Back to inbox">
                  <Icon name="arrow_back" />
                </button>
                <Avatar name={partner?.name ?? '…'} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="thread-name">{partner?.name ?? 'Loading…'}</div>
                  <div className="thread-sub">Direct messages</div>
                </div>
                <Link to="/student/$userId" params={{ userId: String(partnerId) }} className="btn btn-quiet btn-sm" aria-label="Profile">
                  <Icon name="person" /><span className="hide-mobile">Profile</span>
                </Link>
              </header>

              <div className="thread-scroll" ref={threadRef}
                onScroll={(e) => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
                {loadingThread && messages.length === 0 ? <SkeletonRows rows={3} /> : messages.length === 0 ? (
                  <div className="thread-empty">
                    <EmptyState title={partnerFirst ? `Say hi to ${partnerFirst}.` : 'Say hi.'} />
                  </div>
                ) : groups.map((g) => (
                  <div key={g.day}>
                    <div className="day-sep"><span>{g.label}</span></div>
                    {g.items.map((m, i) => {
                      const mine = m.id_sender === user?.id
                      const next = g.items[i + 1]
                      const tail = !next || next.id_sender !== m.id_sender
                      return (
                        <div key={m.id_message} className={`bubble-row ${mine ? 'mine' : ''} ${tail ? 'tail' : ''}`}>
                          <div className="bubble" title={new Date(m.message_timestamp).toLocaleString('en-GB')}>{m.message}</div>
                          {tail && (
                            <div className="bubble-meta">
                              {formatTime(m.message_timestamp)}
                              {mine && m.id_message === lastMine?.id_message && m.read_at && <> · Seen</>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              <form className="composer" onSubmit={send}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  maxLength={4000}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e) }}
                  placeholder={partnerFirst ? `Message ${partnerFirst}…` : 'Message…'}
                  aria-label="Message"
                />
                <button className="btn btn-coral" type="submit" disabled={!draft.trim() || sending} aria-label="Send">
                  <Icon name="send" />
                </button>
              </form>
              <div className="composer-hint hide-mobile"><Kbd>↵</Kbd> send · <Kbd>⇧</Kbd><Kbd>↵</Kbd> new line</div>
            </>
          )}
        </section>
      </div>

      {composing && (
        <NewMessageDialog onClose={() => setComposing(false)} onPick={(u) => { setComposing(false); open(u.id_user) }} />
      )}
    </HubLayout>
  )
}
