// Progress by exam-spec topic, from the tutors' lesson notes.
//   /progress                the signed-in student's own progress (every tutor's notes)
//   /progress?student=<id>   a tutor's view of one of their students (user id; only their own notes)
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import { useAuth } from '../context/AuthContext'
import { Avatar, Card, EmptyState, Icon, SkeletonRows } from '../components/ui'
import { ConfidenceMeter, HomeworkItem, Trend } from '../components/features/LessonNote'
import LessonNotesDialog from '../components/features/LessonNotesDialog'
import ProgressTimeline from '../components/features/ProgressTimeline'
import { errorMessage } from '../api/client'
import { firstName, formatDate } from '../lib/format'
import { useQuery } from '../lib/query'
import { Q } from '../lib/queries'
import { CONFIDENCE, NQ } from '../lib/progress'
import '../components/features/progress.css'

const plural = (n, word) => `${word}${n === 1 ? '' : 's'}`

function TopicRow({ topic: t }) {
  if (!t.confidence) {
    return <div className="row topic-row untouched"><div className="main"><div className="title">{t.name}</div></div></div>
  }
  return (
    <div className="row topic-row">
      <div className="main">
        <div className="title">{t.name}</div>
        <div className="meta">
          Last covered {formatDate(t.last_covered)}{t.times > 1 ? ` · ${t.times} lessons` : ''}
        </div>
      </div>
      <span className="trend-slot"><Trend value={t.confidence} previous={t.previous} /></span>
      <ConfidenceMeter value={t.confidence} />
      <span className="conf-label">{CONFIDENCE[t.confidence]}</span>
    </div>
  )
}

function TopicsCard({ subject: s }) {
  const covered = s.topics.filter((t) => t.confidence)
  const untouched = s.topics.filter((t) => !t.confidence)
  return (
    <Card title="Topics" count={`${s.topics_covered} of ${s.topics_total}`}>
      <div className="row-list">
        {covered.length > 0 && <div className="group-head">Covered <span className="count">{covered.length}</span></div>}
        {covered.map((t) => <TopicRow key={t.key} topic={t} />)}
        {untouched.length > 0 && <div className="group-head">Not covered yet <span className="count">{untouched.length}</span></div>}
        {untouched.map((t) => <TopicRow key={t.key} topic={t} />)}
      </div>
    </Card>
  )
}

/** One bar per lesson: topics covered so far, with the confident ones in coral. */
function GrowthCard({ subject: s }) {
  const points = s.history.slice(-8)
  const max = Math.max(1, ...points.map((p) => p.covered))
  const last = points[points.length - 1]
  return (
    <Card title="Topics over time" count={last ? `${last.confident} of ${last.covered} confident` : null}>
      <div className="cov-chart" role="img"
        aria-label={last ? `After ${s.lessons} ${plural(s.lessons, 'lesson')}: ${last.covered} topics covered, ${last.confident} confident` : 'No ratings yet'}>
        {points.map((p, i) => (
          <div className="col" key={`${p.date}-${i}`} title={`${formatDate(p.date)}: ${p.covered} covered, ${p.confident} confident`}>
            <div className="stack">
              <i className="covered" style={{ height: `${(p.covered / max) * 100}%` }} />
              <i className="confident" style={{ height: `${(p.confident / max) * 100}%` }} />
            </div>
            <span>{formatDate(p.date)}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span><i style={{ background: 'rgb(var(--fg) / 0.18)' }} />Covered</span>
        <span><i style={{ background: 'var(--coral)' }} />Confident</span>
      </div>
    </Card>
  )
}

function HomeworkPanel({ items, canTick }) {
  const open = items.filter((h) => !h.done_at)
  const done = items.filter((h) => h.done_at).slice(0, 5)
  return (
    <Card title="Homework" count={open.length ? `${open.length} to do` : null}>
      {open.length ? (
        <div className="hw-rows hw-list">
          {open.map((h) => <HomeworkItem key={h.id} item={h} canTick={canTick} context={h.session_title} />)}
        </div>
      ) : (
        <EmptyState title={done.length ? 'All homework done' : 'No homework set'} />
      )}
      {done.length > 0 && (
        <>
          <div className="group-head">Done</div>
          <div className="hw-rows hw-list">
            {done.map((h) => <HomeworkItem key={h.id} item={h} canTick={canTick} context={`Done ${formatDate(h.done_at)}`} />)}
          </div>
        </>
      )}
    </Card>
  )
}

function SubjectsCard({ subjects, onOpen }) {
  return (
    <Card title="Subjects" count={subjects.length || null}>
      {subjects.length ? (
        <div className="row-list">
          {subjects.map((s) => (
            <button type="button" key={s.key} className="row subject-row" onClick={() => onOpen(s.key)}>
              <div className="main">
                <div className="title">{s.name}</div>
                <div className="meta">
                  {s.topics_covered} of {s.topics_total} topics · {s.topics_confident} confident · {s.lessons} {plural(s.lessons, 'lesson')}
                </div>
              </div>
              <div className="progress" role="img" aria-label={`${s.topics_covered} of ${s.topics_total} topics covered`}>
                <i style={{ width: `${(s.topics_covered / s.topics_total) * 100}%` }} />
              </div>
              <Icon name="chevron_right" size={18} style={{ color: 'var(--text-faint)' }} />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="No topics rated yet" />
      )}
    </Card>
  )
}

export default function Progress() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const search = useSearch({ strict: false })
  const studentId = Number(search.student) || user?.id
  const isSelf = studentId === user?.id
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState(null) // event id of the note being edited

  const [progressKey, fetchProgress] = NQ.progress(studentId)
  const [notesKey, fetchNotes] = NQ.notes(studentId)
  const progress = useQuery(progressKey, fetchProgress, { enabled: Boolean(studentId) })
  const notes = useQuery(notesKey, fetchNotes, { enabled: Boolean(studentId) })
  const students = useQuery(Q.activeStudents[0], Q.activeStudents[1], { enabled: !isSelf })

  useEffect(() => { setTab('overview') }, [studentId])

  const data = progress.data
  const name = data?.student.name ?? ''
  const subjects = data?.subjects ?? []
  const subject = subjects.find((s) => s.key === tab)
  const allNotes = notes.data?.notes ?? []
  const shownNotes = subject ? allNotes.filter((n) => n.subject === subject.key) : allNotes
  const homework = (data?.homework ?? []).filter((h) => !subject || h.subject === subject.key)
  const openHomework = (data?.homework ?? []).filter((h) => !h.done_at).length

  const studentList = students.data?.students ?? []
  const switcher = !isSelf && studentList.length > 1 && (
    <select className="input" style={{ width: 'auto' }} value={studentId} aria-label="Student"
      onChange={(e) => navigate({ to: '/progress', search: { student: Number(e.target.value) } })}>
      {!studentList.some((s) => s.user_id === studentId) && <option value={studentId}>{name}</option>}
      {studentList.map((s) => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
    </select>
  )

  let body
  if (progress.error) {
    body = <Card><EmptyState title={errorMessage(progress.error, 'Could not load progress')} /></Card>
  } else if (!data) {
    body = <Card><SkeletonRows rows={5} /></Card>
  } else if (!data.lessons) {
    body = (
      <Card>
        <EmptyState title={isSelf ? 'Your tutor’s notes appear here after each session' : `No lesson notes for ${firstName(name)} yet`} />
      </Card>
    )
  } else {
    const timeline = (
      <Card title="Lesson notes" count={shownNotes.length || null}>
        {notes.data
          ? <ProgressTimeline notes={shownNotes} canTick={isSelf} showTutor={isSelf} onEdit={(n) => setEditing(n.event_id)} />
          : <SkeletonRows rows={3} />}
      </Card>
    )
    body = (
      <>
        {subjects.length > 0 && (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={!subject} className={subject ? '' : 'on'} onClick={() => setTab('overview')}>
              Overview
            </button>
            {subjects.map((s) => (
              <button type="button" role="tab" key={s.key} aria-selected={subject?.key === s.key}
                className={subject?.key === s.key ? 'on' : ''} onClick={() => setTab(s.key)}>
                {s.name}<span className="count">{s.topics_covered}/{s.topics_total}</span>
              </button>
            ))}
          </div>
        )}

        {subject ? (
          <div className="metrics">
            <span><b>{subject.topics_covered}</b>of {subject.topics_total} topics covered</span>
            <span><b>{subject.topics_confident}</b>confident</span>
            {subject.topics_improved > 0 && <span><b>{subject.topics_improved}</b>improved</span>}
            {subject.average != null && <span><b>{subject.average.toFixed(1)}</b>average confidence</span>}
            <span><b>{subject.lessons}</b>{plural(subject.lessons, 'lesson')}</span>
          </div>
        ) : (
          <div className="metrics">
            <span><b>{data.lessons}</b>{plural(data.lessons, 'lesson')}</span>
            {subjects.length > 0 && <span><b>{subjects.length}</b>{plural(subjects.length, 'subject')}</span>}
            <span><b>{openHomework}</b>homework to do</span>
            <span>Last lesson <b>{formatDate(data.last_lesson)}</b></span>
          </div>
        )}

        <div className="progress-grid">
          <div className="area-main">
            {subject ? <TopicsCard subject={subject} /> : <SubjectsCard subjects={subjects} onOpen={setTab} />}
          </div>
          <div className="area-side">
            {subject && subject.history.length > 0 && <GrowthCard subject={subject} />}
            <HomeworkPanel items={homework} canTick={isSelf} />
          </div>
          <div className="area-notes">{timeline}</div>
        </div>
      </>
    )
  }

  return (
    <HubLayout initialMode={isSelf ? undefined : 'tutor'}>
      <PageTitle title={isSelf || !name ? 'Progress' : `${name} · Progress`} icon="insights" />

      <div className="dash-head">
        {isSelf ? <h1>Progress</h1> : (
          <div className="progress-head">
            {name && <Avatar name={name} size={30} />}
            <h1>{name || 'Progress'}</h1>
          </div>
        )}
        {!isSelf && (
          <div className="dash-actions">
            {switcher}
            <Link to="/messages" search={{ user: studentId }} className="btn btn-ghost"><Icon name="chat" />Message</Link>
          </div>
        )}
      </div>

      {body}

      {editing && <LessonNotesDialog eventId={editing} onClose={() => setEditing(null)} />}
    </HubLayout>
  )
}
