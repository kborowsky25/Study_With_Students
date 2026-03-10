import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getConversations, getMessages, sendMessage } from '../api/messages'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

export default function Messages() {
  const { user } = useAuth()
  const [convos,    setConvos]    = useState([])
  const [selected,  setSelected]  = useState(null)
  const [messages,  setMessages]  = useState([])
  const [text,      setText]      = useState('')
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState(false)
  const bottomRef = useRef(null)

  // Poll messages every 5 seconds when a convo is selected
  useEffect(() => {
    if (!selected) return
    const id = setInterval(() => loadMessages(selected.user_id), 5000)
    return () => clearInterval(id)
  }, [selected])

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    loadMessages(convo.user_id)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() || !selected) return
    setSending(true)
    try {
      await sendMessage(selected.user_id, text)
      setText('')
      loadMessages(selected.user_id)
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  return (
    <HubLayout>
      <h1 className="text-3xl font-black text-white mb-6">Messages</h1>

      <div className="glass overflow-hidden flex" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
        {/* Sidebar list */}
        <div className={`flex-shrink-0 border-r border-white/5 overflow-y-auto ${selected ? 'hidden sm:block' : 'block'} w-full sm:w-72`}>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/5 rounded w-2/3" />
                    <div className="h-2.5 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : convos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-white/40 text-sm">No messages yet</p>
            </div>
          ) : (
            <div>
              {convos.map(convo => (
                <button
                  key={convo.user_id}
                  onClick={() => selectConvo(convo)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 ${
                    selected?.user_id === convo.user_id ? 'bg-white/10' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-coral-400/20 flex items-center justify-center text-coral-400 font-bold text-sm flex-shrink-0">
                    {convo.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{convo.name}</p>
                    {convo.last_message && (
                      <p className="text-white/40 text-xs truncate">{convo.last_message}</p>
                    )}
                  </div>
                  {convo.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-coral-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {convo.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${selected ? 'flex' : 'hidden sm:flex'}`}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <p className="text-5xl mb-3">💬</p>
              <p className="text-white/40">Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <button
                  onClick={() => setSelected(null)}
                  className="sm:hidden p-1.5 text-white/40 hover:text-white"
                >
                  ←
                </button>
                <div className="w-8 h-8 rounded-full bg-coral-400/20 flex items-center justify-center text-coral-400 font-bold text-xs">
                  {selected.name?.[0]?.toUpperCase()}
                </div>
                <p className="font-semibold text-white">{selected.name}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {messages.map((msg, i) => {
                  const isMe = msg.id_sender === user?.id
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                          isMe
                            ? 'bg-coral-400 text-white rounded-br-md'
                            : 'bg-white/10 text-white/90 rounded-bl-md'
                        }`}
                      >
                        {msg.message}
                        <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-white/30'}`}>
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
              <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-white/5">
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Type a message…"
                  className="input-field flex-1 py-2.5"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="btn-primary px-4 py-2.5 disabled:opacity-50"
                >
                  →
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </HubLayout>
  )
}
