import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import BookSessionModal from '../components/features/BookSessionModal'
import TutorCard from '../components/features/TutorCard'
import { Card, Icon, SkeletonRows } from '../components/ui'
import { getActiveTutors, getLikedTutors, getTutorRequestsSent, likeTutor, requestTutor } from '../api/tutors'
import { errorMessage } from '../api/client'
import { firstName } from '../lib/format'

const emptyLine = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 18px', fontSize: 13, color: 'var(--text-faint)' }

export default function LikedTutors() {
  const { user } = useAuth()
  const [tutors, setTutors] = useState([])
  const [liked, setLiked] = useState(() => new Set())
  const [connected, setConnected] = useState(() => new Set())
  const [requested, setRequested] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [booking, setBooking] = useState(null)

  const load = useCallback(() => Promise.allSettled([getLikedTutors(), getActiveTutors(), getTutorRequestsSent()])
    .then(([saved, mine, sent]) => {
      const ok = (r, key) => (r.status === 'fulfilled' ? r.value.data[key] ?? [] : [])
      if (saved.status === 'rejected') toast.error(errorMessage(saved.reason, 'Could not load saved tutors'))
      const list = ok(saved, 'tutors')
      setTutors(list)
      setLiked(new Set(list.map((t) => t.id_tutor)))
      setConnected(new Set(ok(mine, 'tutors').map((t) => t.id_tutor)))
      setRequested(new Set(ok(sent, 'requests').filter((r) => r.status === 'pending').map((r) => r.tutor_id)))
      setLoading(false)
    }), [])

  useEffect(() => { load() }, [load])

  // Un-saving keeps the row (with an empty heart) until the next visit, so a slip is easy to undo.
  async function toggleLike(t) {
    const flip = (on) => setLiked((prev) => {
      const next = new Set(prev)
      if (on) next.add(t.id_tutor); else next.delete(t.id_tutor)
      return next
    })
    const was = liked.has(t.id_tutor)
    flip(!was)
    try {
      const { data } = await likeTutor(t.id_tutor)
      flip(data.liked)
    } catch (err) {
      flip(was)
      toast.error(errorMessage(err, 'Could not update saved tutors'))
    }
  }

  async function sendRequest(t) {
    setBusy(t.id_tutor)
    try {
      await requestTutor(t.id_tutor)
      toast.success(`Request sent to ${firstName(t.name)}`)
      setRequested((prev) => new Set(prev).add(t.id_tutor))
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the request'))
      load()
    } finally {
      setBusy(null)
    }
  }

  function status(t) {
    if (t.id_user === user?.id) return 'self'
    if (connected.has(t.id_tutor)) return 'connected'
    if (requested.has(t.id_tutor)) return 'pending'
    return null
  }

  function actions(t) {
    const s = status(t)
    if (s === 'self') return <Link to="/tutor/$tutorId" params={{ tutorId: String(t.id_tutor) }} className="btn btn-ghost btn-sm">View profile</Link>
    if (s === 'connected') {
      return <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBooking(t)}><Icon name="add" />Book</button>
    }
    if (s === 'pending') return <button type="button" className="btn btn-ghost btn-sm" disabled>Requested</button>
    return (
      <button type="button" className="btn btn-coral btn-sm" onClick={() => sendRequest(t)} disabled={busy === t.id_tutor}>
        <Icon name="person_add" />Request
      </button>
    )
  }

  return (
    <HubLayout initialMode="student">
      <PageTitle title="Saved tutors" icon="favorite" />

      <div className="dash-head">
        <h1>Saved tutors</h1>
        <div className="dash-actions">
          <Link to="/find-tutors" className="btn btn-ghost"><Icon name="person_search" />Find tutors</Link>
        </div>
      </div>

      <Card>
        {loading ? <SkeletonRows rows={3} /> : tutors.length ? (
          <div className="row-list">
            {tutors.map((t) => (
              <TutorCard key={t.id_tutor} tutor={t} liked={liked.has(t.id_tutor)} onToggleLike={toggleLike}
                status={status(t)} actions={actions(t)} />
            ))}
          </div>
        ) : (
          <div style={emptyLine}>No saved tutors yet.</div>
        )}
      </Card>

      {booking && <BookSessionModal tutor={booking} onClose={() => setBooking(null)} />}
    </HubLayout>
  )
}
