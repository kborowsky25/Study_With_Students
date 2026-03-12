import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getConversations, getMessages, sendMessage, searchUsers } from '../api/messages'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const CORAL = '#ff725e'

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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <HubLayout raw>
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

        {/* ── Left sidebar: conversation list ────────────────────────── */}
        <div style={{
          width: '280px', minWidth: '280px', flexShrink: 0,
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          display: selected ? 'none' : 'flex',
          flexDirection: 'column',
          overflowY: 'hidden',
        }}
          className="sm:flex"
          // always show on sm+
        >
          {/* Header */}
          <div style={{
            padding: '14px 14px 10px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '15px' }}>Messages</h2>
              <button
                onClick={openCompose}
                title="New conversation"
                style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: `${CORAL}18`, border: `1px solid ${CORAL}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${CORAL}28`}
                onMouseLeave={e => e.currentTarget.style.background = `${CORAL}18`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: CORAL }}>edit</span>
              </button>
            </div>

            {/* Conversation filter search */}
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '16px', color: 'var(--text-faint)',
              }}>search</span>
              <input
                value={convoSearch}
                onChange={e => setConvoSearch(e.target.value)}
                placeholder="Search conversations…"
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 34px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Convo list */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="scrollbar-hide">
            {loading ? (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--border)' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ height: '12px', borderRadius: '6px', background: 'var(--border)', width: '60%' }} />
                      <div style={{ height: '10px', borderRadius: '6px', background: 'var(--border)', width: '80%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvos.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>💬</p>
                <p style={{ color: 'var(--text-faint)', fontSize: '13px', marginBottom: '12px' }}>
                  {convoSearch ? 'No match found' : 'No messages yet'}
                </p>
                {!convoSearch && (
                  <button
                    onClick={openCompose}
                    style={{ color: CORAL, fontSize: '12px', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Start a conversation →
                  </button>
                )}
              </div>
            ) : (
              filteredConvos.map(convo => (
                <button
                  key={convo.user_id}
                  onClick={() => selectConvo(convo)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 14px',
                    background: selected?.user_id === convo.user_id ? `${CORAL}10` : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                    borderLeft: selected?.user_id === convo.user_id ? `3px solid ${CORAL}` : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (selected?.user_id !== convo.user_id) e.currentTarget.style.background = 'var(--border)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = selected?.user_id === convo.user_id ? `${CORAL}10` : 'transparent' }}
                >
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: `${CORAL}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: CORAL, fontSize: '13px', fontWeight: '700', flexShrink: 0,
                  }}>
                    {convo.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'var(--text)', fontWeight: '600', fontSize: '13px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.name}</p>
                    {convo.last_message && (
                      <p style={{ color: 'var(--text-faint)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.last_message}</p>
                    )}
                  </div>
                  {convo.unread > 0 && (
                    <span style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: CORAL, color: 'white',
                      fontSize: '10px', fontWeight: '700',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {convo.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Chat area ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '48px', marginBottom: '12px' }}>💬</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '6px' }}>Select a conversation</p>
              <p style={{ color: 'var(--text-faint)', fontSize: '13px', marginBottom: '20px' }}>or start a new one</p>
              <button
                onClick={openCompose}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '10px',
                  background: `${CORAL}18`, border: `1px solid ${CORAL}30`,
                  color: CORAL, fontWeight: '700', fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                New Message
              </button>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-card)',
                flexShrink: 0,
              }}>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: '4px', display: 'flex' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
                </button>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${CORAL}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CORAL, fontSize: '13px', fontWeight: '700' }}>
                  {selected.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '14px' }}>{selected.name}</p>
                  {selected.email && <p style={{ color: 'var(--text-faint)', fontSize: '11px' }}>{selected.email}</p>}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }} className="scrollbar-hide">
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <p style={{ color: 'var(--text-faint)', fontSize: '13px' }}>No messages yet — say hello!</p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.id_sender === user?.id
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '65%',
                        padding: '10px 14px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? CORAL : 'var(--bg-card)',
                        color: isMe ? 'white' : 'var(--text)',
                        border: isMe ? 'none' : '1px solid var(--border)',
                        fontSize: '13px',
                        lineHeight: 1.5,
                      }}>
                        {msg.message}
                        <p style={{ fontSize: '10px', marginTop: '4px', color: isMe ? 'rgba(255,255,255,0.55)' : 'var(--text-faint)' }}>
                          {msg.message_timestamp
                            ? new Date(msg.message_timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} style={{
                display: 'flex', gap: '10px',
                padding: '12px 16px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-card)',
                flexShrink: 0,
              }}>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={`Message ${selected.name}…`}
                  className="input-field"
                  style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  style={{
                    padding: '10px 18px', borderRadius: '10px',
                    background: CORAL, color: 'white',
                    border: 'none', fontWeight: '700', fontSize: '13px',
                    cursor: 'pointer', opacity: (sending || !text.trim()) ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', display: 'block' }}>send</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── Compose overlay ───────────────────────────────────────────── */}
      {composing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div
            ref={composeRef}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '18px',
              padding: '24px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.40)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '16px' }}>New Message</h3>
              <button
                onClick={closeCompose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: '4px', display: 'flex' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            {/* User search input */}
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>To:</p>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '18px', color: 'var(--text-faint)',
              }}>search</span>
              <input
                autoFocus
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                placeholder="Search by name or email…"
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              {searching && (
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '11px' }}>
                  Searching…
                </span>
              )}
            </div>

            {/* Results */}
            {userQuery.trim().length >= 2 && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                overflow: 'hidden',
                maxHeight: '240px',
                overflowY: 'auto',
              }} className="scrollbar-hide">
                {userResults.length === 0 && !searching ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '13px' }}>
                    No users found for "{userQuery}"
                  </div>
                ) : (
                  userResults.map(u => (
                    <button
                      key={u.id_user}
                      onClick={() => startNewConvo(u)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '11px 14px',
                        background: 'transparent',
                        border: 'none', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: `${CORAL}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: CORAL, fontSize: '13px', fontWeight: '700', flexShrink: 0,
                      }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ color: 'var(--text)', fontWeight: '600', fontSize: '13px' }}>{u.name}</p>
                        <p style={{ color: 'var(--text-faint)', fontSize: '11px' }}>{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {userQuery.trim().length < 2 && (
              <p style={{ color: 'var(--text-faint)', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                Type at least 2 characters to search
              </p>
            )}
          </div>
        </div>
      )}
    </HubLayout>
  )
}
