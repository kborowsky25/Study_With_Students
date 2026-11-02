import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { ScheduleSessionDialog } from '../components/features/EventCard'
import { Avatar, Card, EmptyState, Icon, SkeletonRows } from '../components/ui'
import { getActiveStudents, getTutorRequestsRec, respondTutorRequest } from '../api/tutors'
import { getEvents } from '../api/events'
import { errorMessage } from '../api/client'
import { firstName, formatMoney, formatWhen, timeAgo } from '../lib/format'
import { isStudyRoomCopy } from '../lib/sessions'

export default function ActiveStudents() {
  const [data, setData] = useState({ students: [], requests: [], events: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [scheduling, setScheduling] = useState(null) // { studentId } while the dialog is open

  const load = useCallback(() => Promise.allSettled([getActiveStudents(), getTutorRequestsRec(), getEvents()])
    .then(([students, requests, events]) => {
      const ok = (r, key) => (r.status === 'fulfilled' ? r.value.data[key] ?? [] : [])
      if (students.status === 'rejected') toast.error(errorMessage(students.reason, 'Could not load your students'))
      setData({
        students: ok(students, 'students'),
        requests: ok(requests, 'requests'),
        events: ok(events, 'events').filter((e) => e.role === 'tutor' && !isStudyRoomCopy(e)),
      })
      setLoading(false)
    }), [])

  useEffect(() => { load() }, [load])

  async function respond(r, action) {
    setBusy(r.id)
    try {
      await respondTutorRequest(r.id, action)
      toast.success(action === 'accepted' ? `${firstName(r.student_name)} added to your students` : 'Request declined')
      await load()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not answer the request'))
    } finally {
      setBusy(null)
    }
  }

  const { students, requests, events } = data

  const stats = useMemo(() => {
    const now = new Date()
    const map = new Map(students.map((s) => [s.id_student, { sessions: 0, toConfirm: 0, earned: 0, next: null }]))
    for (const e of events) {
      const s = map.get(e.student_id)
      if (!s) continue
      const start = new Date(e.start_time)
      const booked = e.status === 'confirmed' || e.status === 'paid'
      if (booked) s.sessions += 1
      if (e.status === 'paid') s.earned += Number(e.amount || 0)
      if (e.status === 'pending' && start > now) s.toConfirm += 1
      if (booked && start > now && (!s.next || start < new Date(s.next.start_time))) s.next = e
    }
    return map
  }, [students, events])

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="My students" icon="groups_2" />

      <div className="dash-head">
        <h1>My students</h1>
        <div className="dash-actions">
          <Link to="/calendar/tutor" className="btn btn-ghost"><Icon name="calendar_month" />Schedule</Link>
          <button type="button" className="btn btn-coral" disabled={!students.length} onClick={() => setScheduling({})}>
            <Icon name="add" />Schedule a session
          </button>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <Card title="Students" icon="groups_2" count={students.length || null}>
            {loading ? <SkeletonRows rows={3} /> : students.length ? (
              <div className="row-list">
                {students.map((s) => {
                  const st = stats.get(s.id_student)
                  const meta = [
                    `${st.sessions} session${st.sessions === 1 ? '' : 's'}`,
                    st.next ? `Next: ${formatWhen(st.next.start_time)}` : null,
                    st.toConfirm ? `${st.toConfirm} to confirm` : null,
                  ].filter(Boolean).join(' · ')
                  return (
                    <div key={s.id_student} className="row row-wrap">
                      <Avatar name={s.name} size={36} />
                      <Link to="/student/$userId" params={{ userId: String(s.user_id) }} className="main" style={{ color: 'inherit', textDecoration: 'none' }}>
                        <div className="title">{s.name}</div>
                        <div className="meta">{meta}</div>
                      </Link>
                      <div className="row-actions">
                        {st.earned > 0 && <span className="side hide-mobile">{formatMoney(st.earned)} earned</span>}
                        <Link to="/progress" search={{ student: s.user_id }} className="btn btn-quiet btn-sm">
                          <Icon name="insights" />Progress
                        </Link>
                        <Link to="/messages" search={{ user: s.user_id }} className="icon-btn" title="Message" aria-label={`Message ${s.name}`}>
                          <Icon name="chat" />
                        </Link>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setScheduling({ studentId: s.id_student })}>
                          <Icon name="event" />Schedule
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="No students yet." />
            )}
          </Card>
        </div>

        <div className="dash-col">
          <Card title="Requests" icon="person_add" count={requests.length || null}>
            {loading ? <SkeletonRows rows={2} /> : requests.length ? (
              <div className="row-list">
                {requests.map((r) => (
                  <div key={r.id} className="row row-wrap">
                    <Avatar name={r.student_name} size={32} />
                    <div className="main">
                      <div className="title">{r.student_name}</div>
                      <div className="meta">{timeAgo(r.created_at)}</div>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="btn btn-quiet btn-sm" disabled={busy === r.id} onClick={() => respond(r, 'declined')}>Decline</button>
                      <button type="button" className="btn btn-coral btn-sm" disabled={busy === r.id} onClick={() => respond(r, 'accepted')}>Accept</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No pending requests." />
            )}
          </Card>
        </div>
      </div>

      {scheduling && (
        <ScheduleSessionDialog
          students={students}
          studentId={scheduling.studentId}
          onClose={() => setScheduling(null)}
          onScheduled={load}
        />
      )}
    </HubLayout>
  )
}
