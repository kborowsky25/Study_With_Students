import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getActiveTutors, deactivateTutor, getTutorRequestsSent } from '../api/tutors'
import { getEvents } from '../api/events'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import EventCard from '../components/features/EventCard'
import toast from 'react-hot-toast'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const BLUE   = '#60a5fa'
const AMBER  = '#fbbf24'
const PURPLE = '#a78bfa'

const TUTOR_GRADS = [
  `linear-gradient(135deg, ${CORAL}, #ff9a3c)`,
  'linear-gradient(135deg, #60a5fa, #818cf8)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #f472b6, #ec4899)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #fb923c, #ef4444)',
  'linear-gradient(135deg, #22d3ee, #0284c7)',
]

const STATUS_COLOR = { pending: AMBER, confirmed: GREEN, canceled: '#f87171', paid: BLUE }

export default function ActiveTutors() {
  const [tutors,   setTutors]   = useState([])
  const [events,   setEvents]   = useState([])
  const [requests, setRequests] = useState([])   // pending tutor requests sent by this student
  const [loading,  setLoading]  = useState(true)
  const [mounted,  setMounted]  = useState(false)
  const [expanded, setExpanded] = useState(new Set())

  async function load() {
    const [tutorsRes, eventsRes, requestsRes] = await Promise.allSettled([
      getActiveTutors(),
      getEvents(),
      getTutorRequestsSent(),
    ])
    if (tutorsRes.status === 'fulfilled')   setTutors(tutorsRes.value.data.tutors ?? [])
    else toast.error('Could not load tutors')
    if (eventsRes.status === 'fulfilled')   setEvents(eventsRes.value.data.events ?? [])
    if (requestsRes.status === 'fulfilled') setRequests((requestsRes.value.data.requests ?? []).filter(r => r.status === 'pending'))
    setLoading(false)
    setTimeout(() => setMounted(true), 80)
  }

  useEffect(() => { load() }, [])

  async function handleRemove(id) {
    if (!confirm('Remove this tutor from your active list?')) return
    try { await deactivateTutor(id); toast.success('Tutor removed'); load() }
    catch { toast.error('Failed') }
  }

  function toggleExpanded(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const tutorEvents = id => events.filter(e => String(e.tutor_id) === String(id))

  return (
    <HubLayout>
      <PageTitle title="My Tutors" icon="cast_for_education" />

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '18px' }} />)}
        </div>

      ) : (
        <>
          {/* ── Pending Requests section ─────────────────────────────────────── */}
          {requests.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: CORAL }}>hourglass_top</span>
                <h2 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '13px', letterSpacing: '-0.01em', margin: 0 }}>
                  Pending Requests
                </h2>
                <span style={{ background: `${CORAL}18`, color: CORAL, fontSize: '9px', fontWeight: '800', padding: '2px 7px', borderRadius: '9px' }}>
                  {requests.length} AWAITING
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {requests.map((req, idx) => {
                  const name     = req.tutor_name || 'Unknown Tutor'
                  const initials = name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'
                  const subjects = req.subjects?.split(',').map(s => s.trim()).filter(Boolean) ?? []
                  const gradIdx  = (req.tutor_id ?? idx) % TUTOR_GRADS.length
                  const DELAYS   = ['', 'delay-50', 'delay-100', 'delay-150']
                  return (
                    <div
                      key={req.id}
                      className={mounted ? `animate-slide-up ${DELAYS[Math.min(idx, DELAYS.length - 1)]}` : ''}
                      style={{
                        background: 'var(--bg-card)',
                        border: `1px solid var(--border)`,
                        borderLeft: `3px solid ${CORAL}`,
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: '12px',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0, background: TUTOR_GRADS[gradIdx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '900' }}>
                        {initials}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: '800', color: 'var(--text)', fontSize: '13px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                        <p style={{ color: 'var(--text-faint)', fontSize: '11px', margin: subjects.length > 0 ? '0 0 6px' : 0 }}>
                          {req.university ?? 'Tutor'} · awaiting response
                        </p>
                        {subjects.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {subjects.slice(0, 3).map((s, i) => {
                              const colors = [CORAL, BLUE, PURPLE, GREEN]
                              const c = colors[i % colors.length]
                              return <span key={s} style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px', background: `${c}12`, color: c, border: `1px solid ${c}25` }}>{s}</span>
                            })}
                          </div>
                        )}
                      </div>
                      {/* Waiting badge */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: CORAL, fontVariationSettings: '"FILL" 1' }}>hourglass_top</span>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: CORAL, letterSpacing: '0.05em' }}>PENDING</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Active Tutors section ─────────────────────────────────────────── */}
          {tutors.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: BLUE }}>cast_for_education</span>
              <h2 style={{ color: 'var(--text)', fontWeight: '800', fontSize: '13px', letterSpacing: '-0.01em', margin: 0 }}>
                Active Tutors
              </h2>
              <span style={{ background: `${GREEN}18`, color: GREEN, fontSize: '9px', fontWeight: '800', padding: '2px 7px', borderRadius: '9px' }}>
                {tutors.length} ACTIVE
              </span>
            </div>
          )}

          {/* Empty state — no tutors and no requests */}
          {tutors.length === 0 && requests.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: `${BLUE}14`, border: `1px solid ${BLUE}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: BLUE }}>cast_for_education</span>
              </div>
              <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>No tutors yet</p>
              <p style={{ color: 'var(--text-faint)', fontSize: '14px', marginBottom: '24px' }}>Send a request to connect with a tutor</p>
              <Link to="/find-tutors" className="btn-primary">Find a Tutor</Link>
            </div>
          )}

          {/* Active tutor cards */}
          {tutors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tutors.map((tutor, idx) => {
            const initials  = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
            const myEvents  = tutorEvents(tutor.id_tutor)
            const gradIdx   = (tutor.id_tutor ?? idx) % TUTOR_GRADS.length
            const subjects  = tutor.subjects?.split(',').map(s => s.trim()).filter(Boolean) ?? []
            const isOpen    = expanded.has(tutor.id_tutor)
            const upcoming  = myEvents.filter(e => e.status === 'confirmed' || e.status === 'pending')
            const DELAYS    = ['', 'delay-50', 'delay-100', 'delay-150', 'delay-200']

            return (
              <div
                key={tutor.id_tutor}
                className={mounted ? `animate-slide-up ${DELAYS[Math.min(idx, DELAYS.length - 1)]}` : ''}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}
              >
                {/* Tutor header */}
                <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Avatar */}
                  <div style={{ width: '50px', height: '50px', borderRadius: '14px', flexShrink: 0, background: TUTOR_GRADS[gradIdx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '17px', fontWeight: '900', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    {initials}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: '800', color: 'var(--text)', fontSize: '15px', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tutor.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {tutor.university && (
                        <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{tutor.university}</span>
                      )}
                      {upcoming.length > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: `${GREEN}15`, color: GREEN, border: `1px solid ${GREEN}28` }}>
                          {upcoming.length} upcoming
                        </span>
                      )}
                    </div>
                    {subjects.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {subjects.slice(0, 3).map((s, i) => {
                          const colors = [CORAL, BLUE, PURPLE, GREEN, AMBER]
                          const c = colors[i % colors.length]
                          return <span key={s} style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: `${c}14`, color: c, border: `1px solid ${c}28` }}>{s}</span>
                        })}
                        {subjects.length > 3 && <span style={{ fontSize: '10px', color: 'var(--text-faint)', padding: '2px 6px' }}>+{subjects.length - 3}</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
                    <Link
                      to="/messages"
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', padding: '7px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', textDecoration: 'none', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chat</span>
                      Message
                    </Link>
                    <Link
                      to="/tutor/$tutorId"
                      params={{ tutorId: String(tutor.id_tutor) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', padding: '7px 12px', borderRadius: '10px', background: `${CORAL}14`, border: `1px solid ${CORAL}28`, color: CORAL, textDecoration: 'none', transition: 'all 0.15s' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                      Profile
                    </Link>
                    <button
                      onClick={() => handleRemove(tutor.id_tutor)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', padding: '7px 12px', borderRadius: '10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person_remove</span>
                      Remove
                    </button>
                    {myEvents.length > 0 && (
                      <button
                        onClick={() => toggleExpanded(tutor.id_tutor)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'var(--text-faint)', transition: 'all 0.2s' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>expand_more</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sessions — collapsible */}
                {isOpen && myEvents.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                    <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
                      Sessions ({myEvents.length})
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {myEvents.slice(0, 4).map(ev => (
                        <EventCard key={ev.id_event} event={ev} onRefresh={load} />
                      ))}
                    </div>
                    {myEvents.length > 4 && (
                      <p style={{ fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center', marginTop: '10px' }}>
                        +{myEvents.length - 4} more sessions —{' '}
                        <Link to="/calendar/student" style={{ color: CORAL, textDecoration: 'none', fontWeight: '600' }}>View all</Link>
                      </p>
                    )}
                  </div>
                )}

                {/* Expand hint if sessions but not open */}
                {!isOpen && myEvents.length > 0 && (
                  <div
                    onClick={() => toggleExpanded(tutor.id_tutor)}
                    style={{ borderTop: '1px solid var(--border)', padding: '9px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-faint)', fontSize: '12px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_more</span>
                    Show {myEvents.length} session{myEvents.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )
          })}
          </div>
          )}
        </>
      )}
    </HubLayout>
  )
}
