// Admin queue for reports from users, and the messages whose contact details were hidden.
// Self-contained: mount it on an admin page.
//
//   <ReportsPanel onOpenCount={(n) => …} />
//
// A report opens with the conversation it's about. Hidden contact details show what was
// actually written; users never see that text.
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Avatar, EmptyState, Icon, SkeletonRows, StatusPill } from '../ui'
import { closeReport, getHiddenMessages, getReport, getReports } from '../../api/reports'
import { errorMessage } from '../../api/client'
import { useEscape } from '../../hooks/useEscape'
import { fullDate, timeAgo } from '../../lib/format'
import { reasonLabel } from '../../lib/messages'
import './safety.css'

const TABS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'hidden', label: 'Contact details hidden' },
]

const OUTCOME = {
  open:      <StatusPill status="pending" label="Open" />,
  resolved:  <StatusPill status="accepted" label="Resolved" />,
  dismissed: <StatusPill status="declined" label="Dismissed" />,
}

function Quote({ shown, original }) {
  return (
    <div className="report-quote">
      {shown}
      {original && <span className="original">Written: {original}</span>}
    </div>
  )
}

function ReviewDialog({ id, onClose, onClosed }) {
  const [report, setReport] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEscape(onClose)

  useEffect(() => {
    getReport(id)
      .then(({ data }) => setReport(data.report))
      .catch((err) => { toast.error(errorMessage(err, 'Couldn’t load the report')); onClose() })
  }, [id, onClose])

  async function close(outcome) {
    setBusy(true)
    try {
      const { data } = await closeReport(id, outcome, note.trim() || undefined)
      toast.success(data.message)
      onClosed()
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t close the report'))
      setBusy(false)
    }
  }

  const r = report
  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog report-review" role="dialog" aria-label="Report" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>{r ? `${reasonLabel(r.reason)}` : 'Report'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {!r ? <div className="dialog-body"><SkeletonRows rows={4} /></div> : (
          <>
            <div className="dialog-body">
              <dl className="report-facts">
                <dt>Reported</dt>
                <dd>{r.reported_name} · {r.reported_email}{r.reported_tutor_id ? ' · tutor' : ''}{r.reports_on_user > 1 ? ` · ${r.reports_on_user} reports in all` : ''}</dd>
                <dt>By</dt>
                <dd>{r.reporter_name} · {r.reporter_email}{r.for_child ? ` · parent of ${r.for_child}` : ''}</dd>
                <dt>When</dt>
                <dd>{fullDate(r.created_at)}</dd>
                {r.note && <><dt>Note</dt><dd>{r.note}</dd></>}
                {r.status !== 'open' && (
                  <>
                    <dt>Outcome</dt>
                    <dd>{OUTCOME[r.status]} by {r.reviewed_by}, {fullDate(r.reviewed_at)}{r.admin_note ? ` · ${r.admin_note}` : ''}</dd>
                  </>
                )}
              </dl>
              {r.message_id && <Quote shown={r.message} original={r.original_message} />}
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Conversation</div>
                {r.conversation.length ? (
                  <div className="report-log">
                    {r.conversation.map((m) => (
                      <div key={m.id_message}>
                        <span className="who" title={fullDate(m.message_timestamp)}>{m.sender_name}</span>
                        <span className={`what ${m.id_message === r.message_id ? 'flagged' : ''}`}>
                          {m.message}
                          {m.original_message && <span className="original">Written: {m.original_message}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState title="They haven’t messaged each other." />}
              </div>
              {r.status === 'open' && (
                <label className="field">
                  <span>Note for the record</span>
                  <textarea className="input" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
              )}
            </div>
            {r.status === 'open' && (
              <div className="dialog-foot">
                <button className="btn btn-ghost" disabled={busy} onClick={() => close('dismissed')}>Dismiss</button>
                <button className="btn btn-coral" disabled={busy} onClick={() => close('resolved')}>Resolve</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ReportsPanel({ onOpenCount }) {
  const [tab, setTab] = useState('open')
  const [rows, setRows] = useState([])
  const [phase, setPhase] = useState('loading') // loading | ready | error
  const [open, setOpen] = useState(null)
  const [reviewing, setReviewing] = useState(null)

  const load = useCallback((which) => {
    setPhase('loading')
    const request = which === 'hidden'
      ? getHiddenMessages().then(({ data }) => data.messages ?? [])
      : getReports(which).then(({ data }) => { setOpen(data.open); return data.reports ?? [] })
    return request.then((list) => { setRows(list); setPhase('ready') }).catch(() => setPhase('error'))
  }, [])

  // Tell the page the open count when it changes (the latest callback, without re-running for a new one)
  const onOpenCountRef = useRef(onOpenCount)
  useEffect(() => { onOpenCountRef.current = onOpenCount })
  useEffect(() => { load(tab) }, [tab, load])
  useEffect(() => { if (open != null) onOpenCountRef.current?.(open) }, [open])
  const closeReview = useCallback(() => setReviewing(null), [])

  let body
  if (phase === 'loading') {
    body = <SkeletonRows rows={3} />
  } else if (phase === 'error') {
    body = <EmptyState title="Couldn’t load this list." action={<button className="btn btn-ghost btn-sm" onClick={() => load(tab)}>Try again</button>} />
  } else if (!rows.length) {
    body = <EmptyState title={{ open: 'No open reports.', closed: 'No closed reports yet.', hidden: 'No contact details hidden yet.' }[tab]} />
  } else if (tab === 'hidden') {
    body = (
      <div className="row-list">
        {rows.map((m) => (
          <div key={m.id_message} className="row" style={{ alignItems: 'flex-start' }}>
            <Avatar name={m.sender_name} size={28} />
            <div className="main">
              <div className="title">{m.sender_name}{m.sender_is_tutor ? ' (tutor)' : ''} to {m.receiver_name}</div>
              <div className="report-quote" style={{ marginTop: 6 }}>{m.original_message}</div>
            </div>
            <span className="side" title={fullDate(m.message_timestamp)}>{timeAgo(m.message_timestamp)}</span>
          </div>
        ))}
      </div>
    )
  } else {
    body = (
      <div className="row-list">
        {rows.map((r) => (
          <button key={r.id} type="button" className="row row-wrap" onClick={() => setReviewing(r.id)}>
            <Avatar name={r.reported_name} size={28} />
            <div className="main">
              <div className="title">{r.reported_name}{r.reported_tutor_id ? ' · tutor' : ''}</div>
              <div className="meta">
                {reasonLabel(r.reason)} · by {r.reporter_name}{r.for_child ? `, parent of ${r.for_child}` : ''} · {timeAgo(r.created_at)}
              </div>
            </div>
            <div className="row-actions">
              {r.reports_on_user > 1 && <span className="side">{r.reports_on_user} reports</span>}
              {OUTCOME[r.status]}
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <section>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={tab === t.value}
            className={tab === t.value ? 'on' : ''} onClick={() => setTab(t.value)}>
            {t.label}{t.value === 'open' && open ? <span className="count">{open}</span> : null}
          </button>
        ))}
      </div>
      <div className="card">{body}</div>

      {reviewing && (
        <ReviewDialog id={reviewing} onClose={closeReview} onClosed={() => { setReviewing(null); load(tab) }} />
      )}
    </section>
  )
}
