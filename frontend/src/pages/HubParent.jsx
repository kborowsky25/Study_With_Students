// Parent home: for each linked child, their sessions and the ones to pay, homework, progress by
// topic, lesson notes, tutors and conversations with tutors (read-only, in Messages).
// A parent adds a child by email; the child accepts in the app (server/routes/family.py).
//   /hub/parent?child=<user id>   one child (the first by default)
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Avatar, Card, CardLink, DateChip, EmptyState, Icon, SkeletonRows, StatusPill } from '../components/ui'
import { useConfirm } from '../components/ui/confirm'
import { HomeworkItem } from '../components/features/LessonNote'
import ProgressTimeline from '../components/features/ProgressTimeline'
import { inviteChild, removeLink } from '../api/family'
import { createCheckout, verifyPayment } from '../api/payments'
import { errorMessage } from '../api/client'
import { useAutoFocus } from '../hooks/useAutoFocus'
import { useEscape } from '../hooks/useEscape'
import { byStart } from '../lib/dates'
import { FQ, refreshFamily } from '../lib/family'
import { firstName, formatDate, formatMoney, formatTime, greeting, timeAgo } from '../lib/format'
import { NQ } from '../lib/progress'
import { invalidate, useQuery } from '../lib/query'
import { bookingFee, feeWaived, needsPayment, totalPrice } from '../lib/sessions'
import '../components/features/progress.css'
import '../components/features/family.css'

const RECENT = 4
const NOTES = 3

function InviteForm({ onSent }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useAutoFocus()

  async function submit(e) {
    e.preventDefault()
    const address = email.trim()
    setBusy(true)
    try {
      await inviteChild(address)
      toast.success(`Invite sent to ${address}. They accept it when they next log in.`, { duration: 5000 })
      setEmail('')
      refreshFamily()
      onSent?.()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the invite'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="invite-form" onSubmit={submit}>
      <input ref={inputRef} className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="Your child’s email address" aria-label="Your child’s email address" autoComplete="off" />
      <button className="btn btn-coral" type="submit" disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send invite'}</button>
    </form>
  )
}

function InviteDialog({ onClose }) {
  useEscape(onClose)
  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-label="Add a child" style={{ maxWidth: 440 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>Add a child</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="dialog-body"><InviteForm onSent={onClose} /></div>
      </div>
    </div>
  )
}

function SessionRow({ ev, children }) {
  return (
    <div className="row row-wrap">
      <DateChip value={ev.start_time} />
      <div className="main">
        <div className="title">{ev.title || 'Tutoring session'}</div>
        <div className="meta">with {ev.tutor_name} · {formatTime(ev.start_time)}–{formatTime(ev.end_time)}</div>
      </div>
      <div className="row-actions">{children}</div>
    </div>
  )
}

function SessionsCard({ first, data, paying, onPay }) {
  if (!data) return <Card title="Sessions"><SkeletonRows rows={3} /></Card>
  const now = new Date()
  const events = data.events
  const due = events.filter(needsPayment).sort(byStart)
  const upcoming = events
    .filter((e) => new Date(e.end_time) > now && ['pending', 'confirmed', 'paid'].includes(e.status) && !needsPayment(e))
    .sort(byStart)
  const recent = events
    .filter((e) => new Date(e.end_time) <= now && ['confirmed', 'paid'].includes(e.status) && !needsPayment(e))
    .sort(byStart).reverse().slice(0, RECENT)
  const stripeOff = !data.stripe_enabled && due.length > 0

  return (
    <Card title="Sessions" action={stripeOff && <span className="card-note">Card payments switch on once Stripe keys are set</span>}>
      {!events.length ? <EmptyState title={`No sessions booked for ${first} yet`} /> : (
        <div className="row-list">
          {due.length > 0 && <div className="group-head">To pay <span className="count">{due.length}</span></div>}
          {due.map((ev) => {
            const fee = bookingFee(ev)
            const waived = feeWaived(ev)
            return (
              <SessionRow key={ev.id_event} ev={ev}>
                <span className="price">
                  <b>{formatMoney(totalPrice(ev), { decimals: 2 })}</b>
                  {fee > 0 && <small>{formatMoney(ev.amount)} + {formatMoney(fee, { decimals: 2 })} fee</small>}
                  {!fee && waived > 0 && <small><s>{formatMoney(waived, { decimals: 2 })}</s> fee waived</small>}
                </span>
                <button className="btn btn-coral btn-sm" disabled={!data.stripe_enabled || paying !== null} onClick={() => onPay(ev)}>
                  {paying === ev.id_event ? 'Redirecting…' : 'Pay'}
                </button>
              </SessionRow>
            )
          })}
          {upcoming.length > 0 && <div className="group-head">Upcoming <span className="count">{upcoming.length}</span></div>}
          {upcoming.map((ev) => <SessionRow key={ev.id_event} ev={ev}><StatusPill status={ev.status} /></SessionRow>)}
          {recent.length > 0 && <div className="group-head">Recent</div>}
          {recent.map((ev) => <SessionRow key={ev.id_event} ev={ev}><StatusPill status={ev.status} /></SessionRow>)}
        </div>
      )}
    </Card>
  )
}

function ProgressCard({ childId, first, progress }) {
  const subjects = progress?.subjects ?? []
  const link = { to: '/progress', search: { student: childId } }
  return (
    <Card title="Progress" action={subjects.length > 0 && <CardLink {...link}>Details</CardLink>}>
      {!progress ? <SkeletonRows rows={2} /> : subjects.length ? (
        <div className="row-list">
          {subjects.map((s) => (
            <Link key={s.key} {...link} className="row subject-row">
              <div className="main">
                <div className="title">{s.name}</div>
                <div className="meta">{s.topics_covered} of {s.topics_total} topics · {s.topics_confident} confident</div>
              </div>
              <div className="progress" role="img" aria-label={`${s.topics_covered} of ${s.topics_total} topics covered`}>
                <i style={{ width: `${(s.topics_covered / s.topics_total) * 100}%` }} />
              </div>
            </Link>
          ))}
        </div>
      ) : <EmptyState title={`${first}’s progress shows here once a tutor writes lesson notes`} />}
    </Card>
  )
}

function ChildrenCard({ family, onUnlink, onWithdraw }) {
  const { children, sent } = family
  return (
    <Card title="Children" count={children.length || null}>
      <div className="row-list">
        {children.map((c) => (
          <div key={c.link_id} className="row">
            <Avatar name={c.name} size={28} />
            <div className="main">
              <div className="title">{c.name}</div>
              <div className="meta">Linked {formatDate(c.since)}</div>
            </div>
            <button className="btn btn-quiet btn-sm" onClick={() => onUnlink(c)}>Unlink</button>
          </div>
        ))}
        {sent.map((s) => (
          <div key={s.link_id} className="row">
            <span className="row-icon"><Icon name="alternate_email" /></span>
            <div className="main">
              <div className="title">{s.email}</div>
              <div className="meta">{s.status === 'declined' ? 'Declined' : `Invited ${timeAgo(s.created_at)}`}</div>
            </div>
            <button className="btn btn-quiet btn-sm" onClick={() => onWithdraw(s)}>Withdraw</button>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function HubParent() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const search = useSearch({ strict: false })
  const [inviting, setInviting] = useState(false)
  const [paying, setPaying] = useState(null)
  const started = useRef(false)

  const { data: family } = useQuery(...FQ.family)
  const children = family?.children ?? []
  const child = children.find((c) => c.user_id === Number(search.child)) ?? children[0]
  const childId = child?.user_id
  const first = firstName(child?.name)

  const { data: overview } = useQuery(...FQ.child(childId), { enabled: Boolean(childId) })
  const [progressKey, fetchProgress] = NQ.progress(childId)
  const [notesKey, fetchNotes] = NQ.notes(childId)
  const { data: progress } = useQuery(progressKey, fetchProgress, { enabled: Boolean(childId) })
  const { data: notesData } = useQuery(notesKey, fetchNotes, { enabled: Boolean(childId) })
  const { data: convData } = useQuery(...FQ.conversations, { enabled: Boolean(childId) })

  // Back from Stripe Checkout: /hub/parent?event_id=…&session_id=… (or ?canceled=1). Verify once,
  // and drop the params first so a refresh can't verify again.
  useEffect(() => {
    if (started.current) return
    started.current = true
    const { event_id: eventId, session_id: sessionId, canceled } = search ?? {}
    if (!eventId && !sessionId && !canceled) return
    navigate({ to: '/hub/parent', search: {}, replace: true })
    if (eventId && sessionId) {
      const id = toast.loading('Confirming your payment…')
      verifyPayment(eventId, String(sessionId))
        .then(() => toast.success('Payment complete', { id }))
        .catch((err) => toast.error(errorMessage(err, 'We couldn’t confirm that payment'), { id }))
        .finally(() => invalidate('family'))
    } else if (canceled) {
      toast('Payment cancelled. You haven’t been charged.')
    }
  }, [search, navigate])

  async function pay(ev) {
    setPaying(ev.id_event)
    try {
      const { data } = await createCheckout(ev.id_event)
      if (!data?.url) throw new Error('No checkout link')
      window.location.assign(data.url)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start checkout'))
      setPaying(null)
    }
  }

  async function unlink(c) {
    const name = firstName(c.name)
    const ok = await confirm({
      title: `Unlink ${name}?`,
      body: `You’ll stop seeing ${name}’s sessions, progress and messages. You can invite them again later.`,
      confirmLabel: 'Unlink',
      danger: true,
    })
    if (!ok) return
    try {
      await removeLink(c.link_id)
      toast.success(`Unlinked ${name}`)
      navigate({ to: '/hub/parent', search: {}, replace: true })
      refreshFamily()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not unlink'))
    }
  }

  async function withdraw(invite) {
    try {
      await removeLink(invite.link_id)
      toast.success('Invite withdrawn')
      refreshFamily()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not withdraw the invite'))
    }
  }

  const events = overview?.events ?? []
  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.end_time) > now && ['pending', 'confirmed', 'paid'].includes(e.status))
  const toPay = events.filter(needsPayment).reduce((sum, e) => sum + totalPrice(e), 0)
  const homework = (progress?.homework ?? []).filter((h) => !h.done_at)
  const notes = notesData?.notes ?? []
  const tutors = overview?.tutors ?? []
  const conversations = convData?.children.find((c) => c.user_id === childId)?.conversations ?? []

  let body
  if (!family) {
    body = <Card><SkeletonRows rows={4} /></Card>
  } else if (!children.length) {
    body = (
      <div className="dash-grid">
        <div className="dash-col">
          <Card title="Add your child">
            <div className="card-pad"><InviteForm /></div>
          </Card>
        </div>
        <div className="dash-col">
          {family.sent.length > 0 && <ChildrenCard family={family} onUnlink={unlink} onWithdraw={withdraw} />}
        </div>
      </div>
    )
  } else {
    body = (
      <>
        <div className="tabs" role="tablist" aria-label="Children">
          {children.map((c) => (
            <button key={c.user_id} type="button" role="tab" aria-selected={c.user_id === childId}
              className={c.user_id === childId ? 'on' : ''}
              onClick={() => navigate({ to: '/hub/parent', search: { child: c.user_id }, replace: true })}>
              <Avatar name={c.name} size={18} />{c.name}
            </button>
          ))}
        </div>

        <div className="metrics">
          <span><b>{upcoming.length}</b>upcoming</span>
          <span><b>{formatMoney(toPay, { decimals: toPay % 1 ? 2 : 0 })}</b>to pay</span>
          <span><b>{homework.length}</b>homework to do</span>
          {progress?.last_lesson && <span>Last lesson <b>{formatDate(progress.last_lesson)}</b></span>}
        </div>

        <div className="dash-grid">
          <div className="dash-col">
            <SessionsCard first={first} data={overview} paying={paying} onPay={pay} />
            <ProgressCard childId={childId} first={first} progress={progress} />
            <Card title="Lesson notes" count={notes.length || null}
              action={notes.length > NOTES && <CardLink to="/progress" search={{ student: childId }}>All notes</CardLink>}>
              {notesData ? <ProgressTimeline notes={notes.slice(0, NOTES)} showTutor empty={`No lesson notes for ${first} yet`} />
                : <SkeletonRows rows={2} />}
            </Card>
          </div>

          <div className="dash-col">
            <Card title="Homework" count={homework.length || null}>
              {!progress ? <SkeletonRows rows={2} /> : homework.length ? (
                <div className="hw-rows hw-list">
                  {homework.slice(0, 6).map((h) => <HomeworkItem key={h.id} item={h} canTick={false} context={h.session_title} />)}
                </div>
              ) : <EmptyState title="No homework to do" />}
            </Card>

            <Card title="Tutors" count={tutors.length || null}>
              {!overview ? <SkeletonRows rows={2} /> : tutors.length ? (
                <div className="row-list">
                  {tutors.map((t) => (
                    <div key={t.id_tutor} className="row">
                      <Avatar name={t.name} src={t.avatar_url} size={28} />
                      <Link to="/tutor/$tutorId" params={{ tutorId: String(t.id_tutor) }} className="main" style={{ color: 'inherit' }}>
                        <div className="title">{t.name}</div>
                        <div className="meta">{t.subjects || t.university}</div>
                      </Link>
                      {t.can_message && (
                        <Link to="/messages" search={{ user: t.user_id }} className="btn btn-ghost btn-sm"><Icon name="chat" />Message</Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : <EmptyState title={`${first} hasn’t connected with a tutor yet`} />}
            </Card>

            <Card title={`${first}’s messages`} count={conversations.length || null}>
              {!convData ? <SkeletonRows rows={2} /> : conversations.length ? (
                <div className="row-list">
                  {conversations.slice(0, 5).map((c) => (
                    <Link key={c.user_id} to="/messages" search={{ child: childId, user: c.user_id }} className="row">
                      <Avatar name={c.name} size={28} />
                      <div className="main">
                        <div className="title">{c.name}</div>
                        <div className="meta">{c.last_from_me ? `${first}: ` : ''}{c.last_message}</div>
                      </div>
                      <span className="side">{timeAgo(c.last_ts)}</span>
                    </Link>
                  ))}
                </div>
              ) : <EmptyState title="No messages with tutors yet" />}
            </Card>

            <ChildrenCard family={family} onUnlink={unlink} onWithdraw={withdraw} />
          </div>
        </div>
      </>
    )
  }

  return (
    <HubLayout initialMode="parent">
      <PageTitle title="Home" icon="space_dashboard" />

      <div className="hello">
        <h1>{greeting()}, <em>{firstName(user?.name)}</em></h1>
        {children.length > 0 && (
          <div className="dash-actions">
            <button className="btn btn-ghost" onClick={() => setInviting(true)}><Icon name="person_add" />Add a child</button>
          </div>
        )}
      </div>

      {body}

      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
    </HubLayout>
  )
}
