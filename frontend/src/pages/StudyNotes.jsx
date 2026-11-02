import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Icon, Pill, SkeletonRows } from '../components/ui'
import { createNote, deleteNote, downloadNote, getNotes } from '../api/notes'
import { errorMessage } from '../api/client'
import { timeAgo } from '../lib/format'

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'English', 'History',
  'Law', 'Psychology', 'Engineering', 'Medicine', 'Statistics', 'Finance', 'Philosophy', 'Other',
]

// Same list the API accepts (server/routes/notes.py → ALLOWED_NOTES_EXT)
const FILE_KINDS = {
  pdf:  { icon: 'picture_as_pdf', tone: 'var(--red)',        label: 'PDF' },
  doc:  { icon: 'description',    tone: 'var(--blue)',       label: 'Word document' },
  docx: { icon: 'description',    tone: 'var(--blue)',       label: 'Word document' },
  ppt:  { icon: 'slideshow',      tone: 'var(--amber)',      label: 'Slides' },
  pptx: { icon: 'slideshow',      tone: 'var(--amber)',      label: 'Slides' },
  png:  { icon: 'image',          tone: 'var(--green)',      label: 'Image' },
  jpg:  { icon: 'image',          tone: 'var(--green)',      label: 'Image' },
  jpeg: { icon: 'image',          tone: 'var(--green)',      label: 'Image' },
  txt:  { icon: 'article',        tone: 'var(--text-muted)', label: 'Text file' },
  md:   { icon: 'article',        tone: 'var(--text-muted)', label: 'Markdown file' },
}
const OTHER_FILE = { icon: 'draft', tone: 'var(--text-muted)', label: 'File' }
const NO_FILE = { icon: 'notes', tone: 'var(--text-faint)', label: 'No attachment' }
const ACCEPT = Object.keys(FILE_KINDS).map((ext) => `.${ext}`).join(',')
const MAX_FILE_MB = 25

const extOf = (name = '') => (name.includes('.') ? name.split('.').pop().toLowerCase() : '')
const kindOf = (note) => (note.has_file ? FILE_KINDS[note.file_type] ?? OTHER_FILE : NO_FILE)
const fileSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

const Optional = () => <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>(optional)</span>

function useEscape(handler) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handler() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handler])
}

function NoteRow({ note, busy, onDownload, onDelete }) {
  const kind = kindOf(note)
  return (
    <div className="row">
      <span title={kind.label} style={{ display: 'inline-flex', color: kind.tone, flexShrink: 0 }}>
        <Icon name={kind.icon} size={20} />
      </span>
      <div className="main">
        <div className="title">
          {note.title}
          {note.description && <span style={{ color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>{note.description}</span>}
        </div>
        <div className="meta" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {note.subject && <Pill>{note.subject}</Pill>}
          {!note.is_public && <Pill><Icon name="lock" size={12} />Only you</Pill>}
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{note.is_mine ? 'You' : note.author_name}</span>
          {note.is_tutor && !note.is_mine && <Pill tone="coral">Tutor</Pill>}
          <span style={{ flexShrink: 0 }}>· {timeAgo(note.created_at)}</span>
        </div>
      </div>
      {note.has_file && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onDownload(note)}
          disabled={busy}
          aria-label={`Download ${note.file_name || note.title}`}
        >
          <Icon name="download" /><span className="hide-mobile">Download</span>
        </button>
      )}
      {note.is_mine && (
        <button className="icon-btn" onClick={() => onDelete(note)} disabled={busy} aria-label={`Delete ${note.title}`} title="Delete">
          <Icon name="delete" />
        </button>
      )}
    </div>
  )
}

function ShareNotesDialog({ defaultSubject = '', onClose, onShared }) {
  const [form, setForm] = useState({ title: '', subject: defaultSubject, description: '', isPublic: true })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef(null)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  useEscape(onClose)

  function pick(f) {
    if (!f) return
    if (!FILE_KINDS[extOf(f.name)]) { toast.error('Use a PDF, Word, PowerPoint, image or text file'); return }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`Files can be up to ${MAX_FILE_MB} MB`); return }
    setFile(f)
    // Name the notes after the file unless a title was already typed
    setForm((v) => (v.title.trim() ? v : { ...v, title: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() }))
  }

  async function submit(e) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) { toast.error('Add a title'); return }
    if (!form.subject) { toast.error('Pick a subject'); return }

    const data = new FormData()
    data.append('title', title)
    data.append('subject', form.subject)
    data.append('description', form.description.trim())
    data.append('is_public', String(form.isPublic))
    if (file) data.append('file', file)

    setSaving(true)
    try {
      await createNote(data)
      toast.success(form.isPublic ? 'Notes shared' : 'Notes saved')
      onShared()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not upload your notes'))
      setSaving(false)
    }
  }

  return (
    <div
      className="overlay center"
      onMouseDown={onClose}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }}
    >
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-notes-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="dialog-head">
          <h2 id="share-notes-title" style={{ flex: 1 }}>Share notes</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="dialog-body">
          <label className="field">
            <span>Title</span>
            <input className="input" value={form.title} onChange={set('title')} maxLength={255} required autoFocus />
          </label>
          <label className="field">
            <span>Subject</span>
            <select className="input" value={form.subject} onChange={set('subject')} required>
              <option value="" disabled>Choose a subject</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Description <Optional /></span>
            <textarea className="input" value={form.description} onChange={set('description')} maxLength={2000} />
          </label>
          <div className="field">
            <span>File <Optional /></span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()}>
                <Icon name="attach_file" />{file ? 'Replace' : 'Choose file'}
              </button>
              {file && (
                <>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--text-faint)' }}>{fileSize(file.size)}</span>
                  <button type="button" className="icon-btn" onClick={() => setFile(null)} aria-label="Remove file">
                    <Icon name="close" />
                  </button>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }}
              />
            </div>
          </div>
          <div className="field">
            <span>Visibility</span>
            <div className="mode-switch" role="radiogroup" aria-label="Visibility">
              <button
                type="button"
                role="radio"
                aria-checked={form.isPublic}
                className={form.isPublic ? 'on' : ''}
                onClick={() => setForm((f) => ({ ...f, isPublic: true }))}
              >
                <Icon name="public" />Everyone
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!form.isPublic}
                className={form.isPublic ? '' : 'on'}
                onClick={() => setForm((f) => ({ ...f, isPublic: false }))}
              >
                <Icon name="lock" />Only me
              </button>
            </div>
          </div>
        </div>

        <div className="dialog-foot">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-coral" disabled={saving}>
            {saving ? 'Uploading…' : form.isPublic ? 'Share' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

function DeleteNoteDialog({ note, busy, onCancel, onConfirm }) {
  useEscape(onCancel)
  return (
    <div className="overlay center" onMouseDown={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-note-title"
        style={{ maxWidth: 420 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dialog-head" style={{ paddingBottom: 20 }}>
          <h2 id="delete-note-title" style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>Delete “{note.title}”?</h2>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-quiet" onClick={onCancel} autoFocus>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudyNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [subject, setSubject] = useState('')
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('all')
  const [reloadKey, setReloadKey] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(null)

  // The subject filter runs on the API; search and "Mine" filter what's loaded.
  useEffect(() => {
    let live = true
    setLoading(true)
    getNotes(subject)
      .then(({ data }) => { if (live) { setNotes(data.notes ?? []); setFailed(false) } })
      .catch((err) => { if (live) { setFailed(true); toast.error(errorMessage(err, 'Could not load notes')) } })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [subject, reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  async function download(note) {
    setBusy(note.id)
    try {
      await downloadNote(note)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not download the file'))
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    const note = deleting
    setBusy(note.id)
    try {
      await deleteNote(note.id)
      setNotes((list) => list.filter((n) => n.id !== note.id))
      setDeleting(null)
      toast.success('Note deleted')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete the note'))
    } finally {
      setBusy(null)
    }
  }

  function clearFilters() {
    setQuery('')
    setSubject('')
    setScope('all')
  }

  const q = query.trim().toLowerCase()
  const visible = notes.filter((n) => (scope === 'all' || n.is_mine)
    && (!q || [n.title, n.description, n.author_name, n.file_name].some((v) => v?.toLowerCase().includes(q))))

  let empty
  if (failed) {
    empty = { text: 'Couldn’t load notes', action: <button className="btn btn-ghost btn-sm" onClick={reload}>Try again</button> }
  } else if (scope === 'mine' && !q) {
    empty = {
      text: subject ? `You haven’t shared any ${subject} notes` : 'You haven’t shared any notes',
      action: <button className="btn btn-ghost btn-sm" onClick={() => setSharing(true)}>Share notes</button>,
    }
  } else if (q || subject) {
    empty = { text: 'No notes match', action: <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button> }
  } else {
    empty = { text: 'No notes yet', action: <button className="btn btn-ghost btn-sm" onClick={() => setSharing(true)}>Share notes</button> }
  }

  return (
    <HubLayout>
      <PageTitle title="Study notes" icon="menu_book" />

      <div className="dash-head">
        <h1>Study notes</h1>
        <div className="dash-actions">
          <button className="btn btn-coral" onClick={() => setSharing(true)}><Icon name="upload" />Share notes</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
          <Icon
            name="search"
            size={18}
            style={{ position: 'absolute', left: 11, top: 10, color: 'var(--text-faint)', pointerEvents: 'none' }}
          />
          <input
            className="input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search notes"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="Subject"
          style={{ width: 'auto', minWidth: 170 }}
        >
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="mode-switch" role="tablist" aria-label="Whose notes" style={{ minWidth: 150 }}>
          <button role="tab" aria-selected={scope === 'all'} className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>
            All
          </button>
          <button role="tab" aria-selected={scope === 'mine'} className={scope === 'mine' ? 'on' : ''} onClick={() => setScope('mine')}>
            Mine
          </button>
        </div>
      </div>

      <section>
        <header className="card-head">
          <h3>
            {scope === 'mine' ? 'Your notes' : subject || 'All notes'}
            {!loading && visible.length > 0 && <span className="count">{visible.length}</span>}
          </h3>
        </header>
        {loading ? <SkeletonRows rows={5} /> : visible.length ? (
          <div className="row-list">
            {visible.map((n) => (
              <NoteRow key={n.id} note={n} busy={busy === n.id} onDownload={download} onDelete={setDeleting} />
            ))}
          </div>
        ) : (
          <div className="empty"><p>{empty.text}</p>{empty.action}</div>
        )}
      </section>

      {sharing && (
        <ShareNotesDialog
          defaultSubject={subject}
          onClose={() => setSharing(false)}
          onShared={() => { setSharing(false); reload() }}
        />
      )}
      {deleting && (
        <DeleteNoteDialog
          note={deleting}
          busy={busy === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </HubLayout>
  )
}
