// Messages: the inbox and one conversation at a time.
//   /messages?user=<id>              my conversation with someone
//   /messages?child=<id>&user=<id>   a parent reading their child's conversation with a tutor (read-only)
// Who can write to whom, hidden contact details, reports and blocks: server/routes/messages.py.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import ReportDialog from '../components/features/ReportDialog'
import { Avatar, EmptyState, Icon, Kbd, Pill, SkeletonRows } from '../components/ui'
import { useConfirm } from '../components/ui/confirm'
import { blockUser, getConversations, getMessages, searchUsers, sendMessage, unblockUser } from '../api/messages'
import { getChildThread } from '../api/family'
import { getUserProfile } from '../api/users'
import { errorMessage } from '../api/client'
import { useAutoFocus } from '../hooks/useAutoFocus'
import { notifyUnreadChanged } from '../hooks/useUnreadCount'
import { FQ, parentsLine } from '../lib/family'
import { firstName, formatDay, formatTime, timeAgo } from '../lib/format'
import { HIDDEN, splitHidden } from '../lib/messages'
import { invalidate, useQuery } from '../lib/query'
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
            <div className="palette-empty">No one you can message matches “{q}”.</div>
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

/** Thread actions under the ⋯ button. `items`: { icon, label, run, danger }. */
function ThreadMenu({ items, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const onDown = (e) => { if (!ref.current?.parentElement.contains(e.target)) onClose() }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div className="menu thread-menu" ref={ref} role="menu">
      {items.map((item) => (
        <button key={item.label} type="button" role="menuitem" className={`menu-item ${item.danger ? 'danger' : ''}`}
          onClick={() => { onClose(); item.run() }}>
          <Icon name={item.icon} />{item.label}
        </button>
      ))}
    </div>
  )
}

/** A message, with any contact details the API hid shown quietly. */
function MessageText({ text }) {
  return splitHidden(text).map((part, i) => (part.hidden ? <span key={i} className="hidden-detail">{HIDDEN}</span> : part))
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

function ConvoRow({ convo: c, on, prefix, onOpen }) {
  return (
    <button className={`convo ${on ? 'on' : ''} ${c.unread ? 'unread' : ''}`} onClick={onOpen} aria-current={on ? 'true' : undefined}>
      <Avatar name={c.name} size={36} />
      <span className="convo-main">
        <span className="convo-top">
          <span className="convo-name">{c.name}</span>
          {c.blocked && <Icon name="block" className="convo-blocked" title="Blocked" />}
          <span className="convo-time">{timeAgo(c.last_ts)}</span>
        </span>
        <span className="convo-preview">{c.last_from_me ? prefix : ''}{c.last_message}</span>
      </span>
      {c.unread > 0 && <span className="nav-badge" aria-label={`${c.unread} unread`}>{c.unread}</span>}
    </button>
  )
}

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const search = useSearch({ strict: false })
  const partnerId = search.user ? Number(search.user) : null
  const childId = search.child ? Number(search.child) : null
  const readOnly = Boolean(childId) // a parent reading their child's conversation with a tutor

  const [conversations, setConversations] = useState([])
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [partner, setPartner] = useState(null)      // { user_id, name }
  const [messages, setMessages] = useState([])
  const [thread, setThread] = useState(null)        // my thread's can_send, reason, blocked, parents_can_read
  const [loadingThread, setLoadingThread] = useState(false)
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [composing, setComposing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const threadRef = useRef(null)
  const inputRef = useRef(null)
  const stickToBottom = useRef(true)
  const lastSeen = useRef(null) // "<partner>:<newest message id>" the unread badge was last synced for

  // Parents also see their children's conversations with tutors, read-only
  const { data: family } = useQuery(...FQ.conversations, { enabled: Boolean(user?.is_parent), refreshInterval: INBOX_POLL_MS })
  const children = useMemo(() => family?.children ?? [], [family])
  const child = children.find((c) => c.user_id === childId)

  const loadInbox = useCallback(() =>
    getConversations()
      .then(({ data }) => setConversations(data.conversations ?? []))
      .catch(() => {})
      .finally(() => setLoadingInbox(false)), [])

  // Opening a thread marks it read on the server. The sidebar badge only needs a refresh
  // when that can have changed: on open, and when a new message arrives.
  const loadThread = useCallback((id) =>
    getMessages(id).then(({ data }) => {
      const { messages: list = [], ...state } = data
      setMessages(list)
      setThread(state)
      const seen = `${id}:${list[list.length - 1]?.id_message ?? 0}`
      if (seen !== lastSeen.current) {
        lastSeen.current = seen
        setConversations((all) => all.map((c) => (c.user_id === id ? { ...c, unread: 0 } : c)))
        notifyUnreadChanged()
      }
    }), [])

  const loadChildThread = useCallback((kid, id) =>
    getChildThread(kid, id).then(({ data }) => {
      setMessages(data.messages ?? [])
      setPartner(data.partner)
    }), [])

  // Inbox: load + poll
  useEffect(() => {
    loadInbox()
    const t = setInterval(loadInbox, INBOX_POLL_MS)
    return () => clearInterval(t)
  }, [loadInbox])

  // You can't message yourself: drop a ?user= that points at your own account.
  useEffect(() => {
    if (partnerId && partnerId === user?.id && !readOnly) navigate({ to: '/messages', search: {}, replace: true })
  }, [partnerId, user?.id, readOnly, navigate])

  // Selected conversation follows ?user=. Someone new (no conversation yet) is looked up once.
  const knownName = readOnly
    ? child?.conversations.find((c) => c.user_id === partnerId)?.name
    : conversations.find((c) => c.user_id === partnerId)?.name
  useEffect(() => {
    if (!partnerId) { setPartner(null); return }
    if (knownName) { setPartner({ user_id: partnerId, name: knownName }); return }
    setPartner((p) => (p?.user_id === partnerId ? p : null))
    if (readOnly) return // the thread brings the name
    let live = true
    getUserProfile(partnerId)
      .then(({ data }) => { if (live) setPartner({ user_id: partnerId, name: data.user.name }) })
      .catch(() => {
        if (!live) return
        toast.error('That user could not be found')
        navigate({ to: '/messages', search: {} })
      })
    return () => { live = false }
  }, [partnerId, knownName, readOnly, navigate])

  // Thread: load + poll
  useEffect(() => {
    setMenuOpen(false)
    setThread(null)
    if (!partnerId) { setMessages([]); return }
    setMessages([])
    setLoadingThread(true)
    stickToBottom.current = true
    const load = () => (readOnly ? loadChildThread(childId, partnerId) : loadThread(partnerId))
    load()
      .catch((err) => {
        if (!readOnly) return
        toast.error(errorMessage(err, 'Could not open this conversation'))
        navigate({ to: '/messages', search: {} })
      })
      .finally(() => setLoadingThread(false))
    const t = setInterval(() => load().catch(() => {}), THREAD_POLL_MS)
    // Focus the composer with a mouse; on touch screens that would pop the keyboard over the thread.
    if (!readOnly && window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus()
    return () => clearInterval(t)
  }, [partnerId, childId, readOnly, loadThread, loadChildThread, navigate])

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
      if (data.hidden?.length) toast('Contact details are hidden in messages, so everyone stays safe on the platform.', { duration: 6000 })
      loadInbox()
    } catch (err) {
      toast.error(errorMessage(err, 'Message not sent'))
      if (err.response?.status === 403) loadThread(partnerId).catch(() => {})
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const name = firstName(partner?.name ?? '')

  function afterBlockChange() {
    loadThread(partnerId).catch(() => {})
    loadInbox()
    invalidate('family')
    notifyUnreadChanged()
  }

  async function toggleBlock() {
    const blocking = !thread?.blocked
    const ok = await confirm(blocking ? {
      title: `Block ${name}?`,
      body: `${name} won’t be able to message you, and you won’t be able to message ${name}. You can unblock them from this menu.`,
      confirmLabel: 'Block',
      danger: true,
    } : {
      title: `Unblock ${name}?`,
      body: 'You’ll be able to message each other again.',
      confirmLabel: 'Unblock',
    })
    if (!ok) return
    try {
      await (blocking ? blockUser(partnerId) : unblockUser(partnerId))
      toast.success(blocking ? `Blocked ${name}` : `Unblocked ${name}`)
      afterBlockChange()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? conversations.filter((c) => c.name.toLowerCase().includes(q)) : conversations
  }, [conversations, filter])

  const childGroups = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return children
      .map((c) => ({ ...c, conversations: c.conversations.filter((x) => !q || x.name.toLowerCase().includes(q)) }))
      .filter((c) => c.conversations.length)
  }, [children, filter])

  const groups = useMemo(() => groupByDay(messages), [messages])
  const me = readOnly ? childId : user?.id
  const lastMine = [...messages].reverse().find((m) => m.id_sender === me)
  const childFirst = firstName(child?.name ?? '')
  const visibleTo = !readOnly && parentsLine(thread?.parents_can_read, user?.id)
  const theirMessages = messages.filter((m) => m.id_sender === partnerId).reverse()
  const menuItems = readOnly ? [
    { icon: 'flag', label: 'Report a message', run: () => setReporting(true) },
    { icon: 'chat', label: `Message ${name}`, run: () => open(partnerId) },
  ] : [
    { icon: 'flag', label: `Report ${name}`, run: () => setReporting(true) },
    thread?.blocked
      ? { icon: 'block', label: `Unblock ${name}`, run: toggleBlock }
      : { icon: 'block', label: `Block ${name}`, run: toggleBlock, danger: true },
  ]

  let composer
  if (readOnly) {
    composer = <div className="composer-note">Only {childFirst || 'your child'} and {name} can write here</div>
  } else if (thread && !thread.can_send) {
    composer = (
      <div className="composer-note">
        {thread.blocked ? <>You blocked {name}.<button className="btn btn-ghost btn-sm" onClick={toggleBlock}>Unblock</button></> : thread.reason}
      </div>
    )
  } else {
    composer = (
      <>
        <form className="composer" onSubmit={send}>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={4000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e) }}
            placeholder={name ? `Message ${name}…` : 'Message…'}
            aria-label="Message"
          />
          <button className="btn btn-coral" type="submit" disabled={!draft.trim() || sending} aria-label="Send">
            <Icon name="send" />
          </button>
        </form>
        <div className="composer-hint hide-mobile"><Kbd>↵</Kbd> send · <Kbd>⇧</Kbd><Kbd>↵</Kbd> new line</div>
      </>
    )
  }

  return (
    <HubLayout raw noScroll initialMode={readOnly ? 'parent' : undefined}>
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
            {loadingInbox ? <SkeletonRows rows={4} /> : visible.length === 0 && childGroups.length === 0 ? (
              <EmptyState title={filter ? 'No matches.' : 'No conversations yet.'}
                action={!filter && <button className="btn btn-ghost btn-sm" onClick={() => setComposing(true)}>Start one</button>} />
            ) : (
              <>
                {childGroups.length > 0 && visible.length > 0 && <div className="inbox-group">Yours</div>}
                {visible.map((c) => (
                  <ConvoRow key={c.user_id} convo={c} prefix="You: " on={!readOnly && c.user_id === partnerId} onOpen={() => open(c.user_id)} />
                ))}
                {childGroups.map((g) => (
                  <div key={g.user_id}>
                    <div className="inbox-group">{firstName(g.name)}’s conversations</div>
                    {g.conversations.map((c) => (
                      <ConvoRow key={c.user_id} convo={c} prefix={`${firstName(g.name)}: `}
                        on={childId === g.user_id && c.user_id === partnerId}
                        onOpen={() => navigate({ to: '/messages', search: { child: g.user_id, user: c.user_id } })} />
                    ))}
                  </div>
                ))}
              </>
            )}
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
                  <div className="thread-sub">
                    {readOnly ? `${childFirst ? `${childFirst}’s conversation` : 'Your child’s conversation'} · read only`
                      : visibleTo ? <><Icon name="visibility" />{visibleTo}</> : 'Direct messages'}
                  </div>
                </div>
                {!readOnly && (
                  <Link to="/student/$userId" params={{ userId: String(partnerId) }} className="btn btn-quiet btn-sm" aria-label="Profile">
                    <Icon name="person" /><span className="hide-mobile">Profile</span>
                  </Link>
                )}
                <div className="thread-actions">
                  <button className="icon-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="More" aria-haspopup="menu"
                    aria-expanded={menuOpen}>
                    <Icon name="more_horiz" />
                  </button>
                  {menuOpen && <ThreadMenu items={menuItems} onClose={() => setMenuOpen(false)} />}
                </div>
              </header>

              <div className="thread-scroll" ref={threadRef}
                onScroll={(e) => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
                {loadingThread && messages.length === 0 ? <SkeletonRows rows={3} /> : messages.length === 0 ? (
                  <div className="thread-empty">
                    <EmptyState title={readOnly || thread?.can_send === false ? 'No messages yet.' : name ? `Say hi to ${name}.` : 'Say hi.'} />
                  </div>
                ) : groups.map((g) => (
                  <div key={g.day}>
                    <div className="day-sep"><span>{g.label}</span></div>
                    {g.items.map((m, i) => {
                      const mine = m.id_sender === me
                      const next = g.items[i + 1]
                      const tail = !next || next.id_sender !== m.id_sender
                      return (
                        <div key={m.id_message} className={`bubble-row ${mine ? 'mine' : ''} ${readOnly ? 'read-only' : ''} ${tail ? 'tail' : ''}`}>
                          <div className="bubble" title={new Date(m.message_timestamp).toLocaleString('en-GB')}><MessageText text={m.message} /></div>
                          {tail && (
                            <div className="bubble-meta">
                              {readOnly && `${mine ? childFirst : name} · `}{formatTime(m.message_timestamp)}
                              {!readOnly && mine && m.id_message === lastMine?.id_message && m.read_at && <> · Seen</>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {composer}
            </>
          )}
        </section>
      </div>

      {composing && (
        <NewMessageDialog onClose={() => setComposing(false)} onPick={(u) => { setComposing(false); open(u.id_user) }} />
      )}
      {reporting && partner && (
        <ReportDialog person={partner} messages={theirMessages} canBlock={!readOnly && !thread?.blocked}
          onClose={() => setReporting(false)} onBlocked={afterBlockChange} />
      )}
    </HubLayout>
  )
}
