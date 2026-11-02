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
import { notifyUnreadChanged } from '../hooks/useUnreadCount'
import { formatDay, formatTime, timeAgo } from '../lib/format'
import './Messages.css'

const THREAD_POLL_MS = 4000
const INBOX_POLL_MS = 15000

function NewMessageDialog({ onPick, onClose }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(() => {
      searchUsers(q.trim())
        .then(({ data }) => setResults(data.users ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="dialog palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="person_search" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email address…"
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && results[0]) onPick(results[0]) }} />
          <Kbd>esc</Kbd>
        </div>
        <div className="palette-list">
          {q.trim().length < 2 ? (
            <div className="palette-empty">Type at least two letters.</div>
          ) : loading ? (
            <div className="palette-empty">Searching…</div>
          ) : results.length === 0 ? (
            <div className="palette-empty">No one matches “{q}”.</div>
          ) : results.map((u) => (
            <div key={u.id_user} className="palette-item" onClick={() => onPick(u)}>
              <Avatar name={u.name} size={26} />
              <span className="grow" style={{ color: 'var(--text)' }}>{u.name}</span>
              {u.is_tutor && <Pill tone="coral">Tutor</Pill>}
              {u.university && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{u.university}</span>}
            </div>
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

  const loadInbox = useCallback(() =>
    getConversations()
      .then(({ data }) => setConversations(data.conversations ?? []))
      .catch(() => {})
      .finally(() => setLoadingInbox(false)), [])

  const loadThread = useCallback((id) =>
    getMessages(id).then(({ data }) => {
      setMessages(data.messages ?? [])
      setConversations((list) => list.map((c) => (c.user_id === id ? { ...c, unread: 0 } : c)))
      notifyUnreadChanged()
    }), [])

  // Inbox: load + poll
  useEffect(() => {
    loadInbox()
    const t = setInterval(loadInbox, INBOX_POLL_MS)
    return () => clearInterval(t)
  }, [loadInbox])

  // Selected conversation follows ?user=
  useEffect(() => {
    if (!partnerId) { setPartner(null); setMessages([]); return }
    const known = conversations.find((c) => c.user_id === partnerId)
    if (known) setPartner({ user_id: known.user_id, name: known.name })
    else if (partner?.user_id !== partnerId) {
      getUserProfile(partnerId)
        .then(({ data }) => setPartner({ user_id: partnerId, name: data.user.name }))
        .catch(() => { toast.error('That user could not be found'); navigate({ to: '/messages', search: {} }) })
    }
  }, [partnerId, conversations])

  // Thread: load + poll
  useEffect(() => {
    if (!partnerId) return
    setLoadingThread(true)
    stickToBottom.current = true
    loadThread(partnerId).catch(() => {}).finally(() => setLoadingThread(false))
    const t = setInterval(() => loadThread(partnerId).catch(() => {}), THREAD_POLL_MS)
    inputRef.current?.focus()
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
          <div className="inbox-filter">
            <Icon name="search" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter conversations" />
          </div>
          <div className="inbox-scroll">
            {loadingInbox ? <SkeletonRows rows={4} /> : visible.length === 0 ? (
              <EmptyState icon="forum" title={filter ? 'No matches' : 'No conversations yet'}
                action={!filter && <button className="btn btn-ghost btn-sm" onClick={() => setComposing(true)}>Start one</button>}>
                {!filter && 'Message a tutor or student to get started.'}
              </EmptyState>
            ) : visible.map((c) => (
              <button key={c.user_id} className={`convo ${c.user_id === partnerId ? 'on' : ''} ${c.unread ? 'unread' : ''}`} onClick={() => open(c.user_id)}>
                <Avatar name={c.name} size={36} />
                <span className="convo-main">
                  <span className="convo-top">
                    <span className="convo-name">{c.name}</span>
                    <span className="convo-time">{timeAgo(c.last_ts)}</span>
                  </span>
                  <span className="convo-preview">{c.last_from_me ? 'You: ' : ''}{c.last_message}</span>
                </span>
                {c.unread > 0 && <span className="nav-badge">{c.unread}</span>}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Thread ── */}
        <section className="inbox-thread">
          {!partnerId ? (
            <div className="thread-empty">
              <EmptyState icon="chat_bubble" title="Your conversations live here"
                action={<button className="btn btn-coral" onClick={() => setComposing(true)}><Icon name="edit_square" />New message</button>}>
                Pick a conversation on the left, or start a new one with a tutor or student.
              </EmptyState>
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
                <Link to="/student/$userId" params={{ userId: String(partnerId) }} className="btn btn-quiet btn-sm hide-mobile">
                  <Icon name="person" />Profile
                </Link>
              </header>

              <div className="thread-scroll" ref={threadRef}
                onScroll={(e) => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
                {loadingThread && messages.length === 0 ? <SkeletonRows rows={3} /> : messages.length === 0 ? (
                  <div className="thread-empty">
                    <EmptyState icon="waving_hand" title={`Say hi to ${partner?.name?.split(' ')[0] ?? 'them'}`}>
                      Introduce yourself and what you’d like help with.
                    </EmptyState>
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
                  placeholder={`Message ${partner?.name?.split(' ')[0] ?? ''}…`}
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
