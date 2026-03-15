import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getConversations, getMessages, sendMessage, searchUsers } from '../api/messages'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import toast from 'react-hot-toast'

const CORAL = '#ff725e'

// Soft avatar colors for variety
const AVATAR_COLORS = [
  '#6c63ff', '#3a86ff', '#06d6a0', '#f9c74f', '#f4845f',
  '#a8dadc', '#e63946', '#2ec4b6', '#ff9f1c', '#b5838d',
]

function getAvatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ name = '', size = 38 }) {
  const color = getAvatarColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '30',
      border: `1.5px solid ${color}60`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color, fontSize: Math.floor(size * 0.36) + 'px', fontWeight: '700',
      flexShrink: 0, userSelect: 'none',
    }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatConvoTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' })
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function Messages() {
  const { user } = useAuth()
  const [convos,      setConvos]      = useState([])
  const [selected,    setSelected]    = useState(null)
  const [messages,    setMessages]    = useState([])
  const [text,        setText]        = useState('')
  const [loading,     setLoading]     = useState(true)
  const [sending,     setSending]     = useState(false)

  // Conversation search
  const [convoSearch, setConvoSearch] = useState('')

  // Compose / user search
  const [composing,   setComposing]   = useState(false)
  const [userQuery,   setUserQuery]   = useState('')
  const [userResults, setUserResults] = useState([])
  const [searching,   setSearching]   = useState(false)

  const bottomRef    = useRef(null)
  const searchTimer  = useRef(null)
  const composeRef   = useRef(null)
  const inputRef     = useRef(null)

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    if (!selected) return
    const id = setInterval(() => loadMessages(selected.user_id), 5000)
    return () => clearInterval(id)
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close compose overlay on outside click
  useEffect(() => {
    if (!composing) return
    function onClickOutside(e) {
      if (composeRef.current && !composeRef.current.contains(e.target)) {
        closeCompose()
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [composing])

  // Debounced user search
  useEffect(() => {
    if (!userQuery.trim() || userQuery.trim().length < 2) {
      setUserResults([])
      return
    }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await searchUsers(userQuery.trim())
        setUserResults((data.users ?? []).filter(u => u.id_user !== user?.id))
      } catch {
        setUserResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [userQuery])

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function loadConversations() {
    try {
      const { data } = await getConversations()
      setConvos(data.conversations ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  async function loadMessages(userId) {
    try {
      const { data } = await getMessages(userId)
      setMessages(data.messages ?? [])
    } catch {}
  }

  function selectConvo(convo) {
    setSelected(convo)
    setComposing(false)
    loadMessages(convo.user_id)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function openCompose() {
    setComposing(true)
    setUserQuery('')
    setUserResults([])
  }

  function closeCompose() {
    setComposing(false)
    setUserQuery('')
    setUserResults([])
  }

  function startNewConvo(foundUser) {
    // Treat the found user as the selected conversation partner
    const pseudoConvo = {
      user_id: foundUser.id_user,
      name: foundUser.name,
      email: foundUser.email,
      last_message: null,
      unread: 0,
    }
    // Add to convos list if not already there
    setConvos(prev => {
      if (prev.some(c => c.user_id === foundUser.id_user)) return prev
      return [pseudoConvo, ...prev]
    })
    selectConvo(pseudoConvo)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() || !selected) return
    setSending(true)
    try {
      await sendMessage(selected.user_id, text)
      setText('')
      await loadMessages(selected.user_id)
      // Refresh convos so last_message updates
      loadConversations()
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  // Filtered conversations by search
  const filteredConvos = convoSearch.trim()
    ? convos.filter(c => c.name?.toLowerCase().includes(convoSearch.toLowerCase()))
    : convos

  // Group consecutive messages by sender
  function groupMessages(msgs) {
    const groups = []
    msgs.forEach((msg, i) => {
      const prev = msgs[i - 1]
      const isFirst = !prev || prev.id_sender !== msg.id_sender
      groups.push({ ...msg, isFirst })
    })
    return groups
  }

  const groupedMessages = groupMessages(messages)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <HubLayout raw>
      <PageTitle title="Messages" icon="message" />
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

        {/* ── Left panel: conversation list ──────────────────────────── */}
        <div
          className="sm:flex"
          style={{
            width: '300px', minWidth: '300px', flexShrink: 0,
            background: 'var(--bg-card)',
            borderRight: '1px solid var(--border)',
            display: selected ? 'none' : 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            background: 'var(--bg-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: CORAL + '18', border: `1px solid ${CORAL}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: CORAL }}>message</span>
                </div>
                <div>
                  <h2 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '15px', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.2 }}>
                    Messages
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0' }}>
                    {loading ? '…' : `${convos.length} conversation${convos.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <button
                onClick={openCompose}
                title="New conversation"
                style={{
                  width: '34px', height: '34px', borderRadius: '10px',
                  background: CORAL + '18',
                  border: `1.5px solid ${CORAL}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                  color: CORAL,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = CORAL + '30'
                  e.currentTarget.style.borderColor = CORAL + '60'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = CORAL + '18'
                  e.currentTarget.style.borderColor = CORAL + '35'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>edit</span>
              </button>
            </div>

            {/* Search bar */}
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '17px', color: 'var(--text-faint)', pointerEvents: 'none',
              }}>search</span>
              <input
                value={convoSearch}
                onChange={e => setConvoSearch(e.target.value)}
                placeholder="Search conversations…"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  background: 'var(--bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = CORAL + '60'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="scrollbar-hide">
            {loading ? (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <div style={{ height: '13px', borderRadius: '6px', background: 'var(--border)', width: '55%' }} />
                      <div style={{ height: '11px', borderRadius: '6px', background: 'var(--border)', width: '75%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvos.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px 20px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '44px', color: 'var(--text-faint)', marginBottom: '12px' }}>chat_bubble_outline</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  {convoSearch ? 'No match found' : 'No messages yet'}
                </p>
                <p style={{ color: 'var(--text-faint)', fontSize: '12px', marginBottom: '16px', lineHeight: 1.5 }}>
                  {convoSearch ? `No conversations matching "${convoSearch}"` : 'Start a conversation with a tutor or student'}
                </p>
                {!convoSearch && (
                  <button
                    onClick={openCompose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '9px 16px', borderRadius: '10px',
                      background: CORAL + '18', border: `1.5px solid ${CORAL}35`,
                      color: CORAL, fontWeight: '700', fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
                    New Message
                  </button>
                )}
              </div>
            ) : (
              filteredConvos.map(convo => {
                const isActive = selected?.user_id === convo.user_id
                return (
                  <button
                    key={convo.user_id}
                    onClick={() => selectConvo(convo)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px 12px 12px',
                      background: isActive ? CORAL + '12' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                      border: 'none',
                      borderLeft: `3px solid ${isActive ? CORAL : 'transparent'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s, border-color 0.12s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? CORAL + '12' : 'transparent' }}
                  >
                    <Avatar name={convo.name} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <p style={{
                          color: 'var(--text)', fontWeight: convo.unread > 0 ? '700' : '600',
                          fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1, marginRight: '8px',
                        }}>{convo.name}</p>
                        {convo.last_message_at && (
                          <span style={{ color: 'var(--text-faint)', fontSize: '11px', flexShrink: 0 }}>
                            {formatConvoTime(convo.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{
                          color: convo.unread > 0 ? 'var(--text-muted)' : 'var(--text-faint)',
                          fontSize: '12px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1, marginRight: '6px',
                          fontWeight: convo.unread > 0 ? '500' : '400',
                        }}>
                          {convo.last_message ?? 'Say hello!'}
                        </p>
                        {convo.unread > 0 && (
                          <span style={{
                            minWidth: '19px', height: '19px', borderRadius: '999px',
                            background: CORAL, color: 'white',
                            fontSize: '10px', fontWeight: '700',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, padding: '0 4px',
                          }}>
                            {convo.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right panel: chat area ──────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)', overflow: 'hidden' }}>
          {!selected ? (
            /* Empty state */
            <div
              className="animate-fade-in"
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '40px',
              }}
            >
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: CORAL + '15', border: `2px solid ${CORAL}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '38px', color: CORAL + 'aa' }}>forum</span>
              </div>
              <p style={{ color: 'var(--text)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                Your messages
              </p>
              <p style={{ color: 'var(--text-faint)', fontSize: '14px', marginBottom: '6px', lineHeight: 1.6, maxWidth: '280px' }}>
                Select a conversation from the list or start a new one
              </p>
              <button
                onClick={openCompose}
                style={{
                  marginTop: '16px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '11px 22px', borderRadius: '12px',
                  background: CORAL, color: 'white',
                  border: 'none', fontWeight: '700', fontSize: '13px',
                  cursor: 'pointer', transition: 'opacity 0.15s',
                  boxShadow: `0 4px 16px ${CORAL}40`,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                New Message
              </button>
            </div>
          ) : (
            <>
              {/* Chat top bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-card)',
                flexShrink: 0,
                boxShadow: '0 1px 8px rgba(0,0,0,0.10)',
              }}>
                {/* Back button (mobile) */}
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-faint)', padding: '4px',
                    display: 'flex', borderRadius: '8px',
                    transition: 'color 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '21px' }}>arrow_back</span>
                </button>

                <Avatar name={selected.name} size={40} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '14px', lineHeight: 1.2 }}>{selected.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                    <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: '500' }}>Online</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                className="animate-fade-in scrollbar-hide"
                style={{
                  flex: 1, overflowY: 'auto',
                  padding: '20px 20px 8px',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}
              >
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', margin: 'auto', padding: '40px 20px' }}>
                    <Avatar name={selected.name} size={56} />
                    <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '15px', marginTop: '14px', marginBottom: '6px' }}>
                      {selected.name}
                    </p>
                    <p style={{ color: 'var(--text-faint)', fontSize: '13px' }}>No messages yet — say hello!</p>
                  </div>
                )}

                {groupedMessages.map((msg, i) => {
                  const isMe = msg.id_sender === user?.id
                  const nextMsg = groupedMessages[i + 1]
                  const isLast = !nextMsg || nextMsg.id_sender !== msg.id_sender
                  const showTime = isLast || (nextMsg && nextMsg.isFirst)

                  // Bubble border radius: consecutive messages from same sender get one flat corner
                  let borderRadius
                  if (isMe) {
                    borderRadius = msg.isFirst
                      ? '18px 18px 4px 18px'
                      : isLast
                        ? '18px 4px 18px 18px'
                        : '18px 4px 4px 18px'
                  } else {
                    borderRadius = msg.isFirst
                      ? '18px 18px 18px 4px'
                      : isLast
                        ? '4px 18px 18px 18px'
                        : '4px 18px 18px 4px'
                  }

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: isMe ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        gap: '8px',
                        marginBottom: isLast ? '10px' : '2px',
                      }}
                    >
                      {/* Avatar for received messages - only on last in group */}
                      {!isMe && (
                        <div style={{ width: '28px', flexShrink: 0 }}>
                          {isLast && <Avatar name={selected.name} size={28} />}
                        </div>
                      )}

                      <div style={{ maxWidth: '62%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          padding: '10px 14px',
                          borderRadius,
                          background: isMe
                            ? `linear-gradient(135deg, ${CORAL}, #ff8f7e)`
                            : 'var(--bg-card)',
                          color: isMe ? 'white' : 'var(--text)',
                          border: isMe ? 'none' : '1px solid var(--border)',
                          fontSize: '13.5px',
                          lineHeight: 1.55,
                          wordBreak: 'break-word',
                          boxShadow: isMe
                            ? `0 2px 12px ${CORAL}30`
                            : '0 1px 4px rgba(0,0,0,0.08)',
                        }}>
                          {msg.message}
                        </div>
                        {showTime && (
                          <p style={{
                            fontSize: '10px', marginTop: '4px',
                            color: 'var(--text-faint)',
                            padding: '0 2px',
                          }}>
                            {formatTime(msg.message_timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <form
                onSubmit={handleSend}
                style={{
                  display: 'flex', gap: '10px', alignItems: 'center',
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  flexShrink: 0,
                }}
              >
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={`Message ${selected.name}…`}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      background: 'var(--bg)',
                      border: '1.5px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text)',
                      fontSize: '13px',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = CORAL + '60'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        handleSend(e)
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: text.trim() ? CORAL : 'var(--border)',
                    color: text.trim() ? 'white' : 'var(--text-faint)',
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: text.trim() ? 'pointer' : 'not-allowed',
                    transition: 'background 0.15s, color 0.15s, transform 0.1s',
                    flexShrink: 0,
                    boxShadow: text.trim() ? `0 2px 10px ${CORAL}40` : 'none',
                  }}
                  onMouseEnter={e => { if (text.trim()) e.currentTarget.style.transform = 'scale(1.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>send</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── Compose overlay ──────────────────────────────────────────────── */}
      {composing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.60)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.15s ease',
        }}>
          <div
            ref={composeRef}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '28px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.50)',
              animation: 'slideUp 0.2s ease',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <div>
                <h3 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '17px', marginBottom: '3px' }}>New Message</h3>
                <p style={{ color: 'var(--text-faint)', fontSize: '12px' }}>Search for a user to start chatting</p>
              </div>
              <button
                onClick={closeCompose}
                style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            {/* To: label + search */}
            <div style={{ marginBottom: '6px' }}>
              <label style={{ color: 'var(--text-faint)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>To</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '18px', color: 'var(--text-faint)', pointerEvents: 'none',
                }}>search</span>
                <input
                  autoFocus
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'var(--bg)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '12px',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = CORAL + '60'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                {searching && (
                  <span style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-faint)', fontSize: '11px',
                  }}>
                    Searching…
                  </span>
                )}
              </div>
            </div>

            {/* Results list */}
            {userQuery.trim().length >= 2 && (
              <div style={{
                background: 'var(--bg)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                maxHeight: '260px',
                overflowY: 'auto',
                marginTop: '8px',
              }} className="scrollbar-hide">
                {userResults.length === 0 && !searching ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--text-faint)', marginBottom: '8px', display: 'block' }}>person_search</span>
                    <p style={{ color: 'var(--text-faint)', fontSize: '13px' }}>No users found for "{userQuery}"</p>
                  </div>
                ) : (
                  userResults.map(u => (
                    <button
                      key={u.id_user}
                      onClick={() => startNewConvo(u)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px',
                        background: 'transparent',
                        border: 'none', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Avatar name={u.name} size={40} />
                      <div>
                        <p style={{ color: 'var(--text)', fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>{u.name}</p>
                        <p style={{ color: 'var(--text-faint)', fontSize: '11px' }}>{u.email}</p>
                      </div>
                      <span className="material-symbols-outlined" style={{ marginLeft: 'auto', fontSize: '18px', color: 'var(--text-faint)' }}>chevron_right</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {userQuery.trim().length < 2 && (
              <p style={{ color: 'var(--text-faint)', fontSize: '12px', textAlign: 'center', marginTop: '14px' }}>
                Type at least 2 characters to search
              </p>
            )}
          </div>
        </div>
      )}
    </HubLayout>
  )
}
