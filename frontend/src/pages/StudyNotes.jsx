import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import PaywallGate from '../components/features/PaywallGate'
import UserBadges from '../components/features/UserBadges'
import { useAuth } from '../context/AuthContext'
import { getNotes, createNote, deleteNote, noteFileUrl } from '../api/notes'

const CORAL = '#ff725e'

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Economics', 'English', 'History',
  'Law', 'Psychology', 'Engineering', 'Medicine',
  'Statistics', 'Finance', 'Philosophy', 'Other',
]

const FILE_ICONS = {
  pdf:  { icon: 'picture_as_pdf', color: '#ef4444' },
  doc:  { icon: 'description',    color: '#3b82f6' },
  docx: { icon: 'description',    color: '#3b82f6' },
  ppt:  { icon: 'slideshow',      color: '#f97316' },
  pptx: { icon: 'slideshow',      color: '#f97316' },
  png:  { icon: 'image',          color: '#22c55e' },
  jpg:  { icon: 'image',          color: '#22c55e' },
  jpeg: { icon: 'image',          color: '#22c55e' },
  txt:  { icon: 'text_snippet',   color: 'rgba(255,255,255,0.50)' },
  md:   { icon: 'text_snippet',   color: 'rgba(255,255,255,0.50)' },
}

function NoteCard({ note, onDelete }) {
  const fileInfo = FILE_ICONS[note.file_type] ?? { icon: 'attach_file', color: 'rgba(255,255,255,0.40)' }

  function handleDownload() {
    if (!note.file_path) return
    const a = document.createElement('a')
    a.href = noteFileUrl(note.file_path)
    a.download = note.file_name || note.file_path
    a.click()
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '18px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,114,94,0.30)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,114,94,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* File icon */}
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${fileInfo.color}18`, border: `1px solid ${fileInfo.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: fileInfo.color }}>{fileInfo.icon}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {note.title}
          </p>
          {note.subject && (
            <span style={{ display: 'inline-block', background: `${CORAL}14`, border: `1px solid ${CORAL}28`, color: CORAL, fontSize: '10px', fontWeight: 700, padding: '1px 8px', borderRadius: '20px' }}>
              {note.subject}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {note.description && (
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.55, margin: 0 }}>
          {note.description}
        </p>
      )}

      {/* Footer: author + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${CORAL}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CORAL, fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
            {(note.author_name ?? '?')[0]}
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {note.author_name}
          </span>
          <UserBadges isTutor={note.is_tutor} isPremium={false} />
        </div>

        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {note.file_path && (
            <button onClick={handleDownload} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = CORAL; e.currentTarget.style.color = CORAL }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
            </button>
          )}
          {note.is_mine && (
            <button onClick={() => onDelete(note.id)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 8px', color: 'rgba(239,68,68,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '11px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'rgba(239,68,68,0.55)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function UploadModal({ onClose, onDone }) {
  const [title, setTitle]           = useState('')
  const [subject, setSubject]       = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic]     = useState(true)
  const [file, setFile]             = useState(null)
  const [dragging, setDragging]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const inputRef = useRef(null)

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return toast.error('Title is required')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title',       title.trim())
      fd.append('subject',     subject)
      fd.append('description', description.trim())
      fd.append('is_public',   String(isPublic))
      if (file) fd.append('file', file)
      await createNote(fd)
      toast.success('Note uploaded!')
      onDone()
    } catch {
      toast.error('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '18px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text)', fontWeight: 800, fontSize: '18px' }}>Upload Study Note</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Title */}
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Integration by Parts Cheatsheet"
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Subject */}
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}>
              <option value="">— Select a subject —</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief summary of what this covers…"
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text)', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* File drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? CORAL : 'var(--border)'}`,
              borderRadius: '12px', padding: '20px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s ease',
              background: dragging ? `${CORAL}08` : 'transparent',
            }}
          >
            <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.md" />
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: file ? CORAL : 'var(--text-faint)', display: 'block', marginBottom: '6px' }}>
              {file ? 'check_circle' : 'upload_file'}
            </span>
            <p style={{ color: file ? CORAL : 'var(--text-muted)', fontSize: '13px', fontWeight: file ? 700 : 400 }}>
              {file ? file.name : 'Drop a file or click to browse'}
            </p>
            {!file && <p style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '4px' }}>PDF, Word, PowerPoint, Image, or Text</p>}
          </div>

          {/* Visibility toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div onClick={() => setIsPublic(v => !v)} style={{
              width: '42px', height: '22px', borderRadius: '11px',
              background: isPublic ? CORAL : 'rgba(255,255,255,0.15)',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
            }}>
              <div style={{ position: 'absolute', top: '3px', left: isPublic ? '23px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s ease' }} />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {isPublic ? 'Public — visible to everyone' : 'Private — only you can see this'}
            </span>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '4px', fontSize: '14px', padding: '12px', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Uploading…' : 'Upload Note'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function StudyNotes() {
  const { user } = useAuth()
  const [notes, setNotes]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterSubject, setFilterSubject] = useState('')
  const [showUpload, setShowUpload]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await getNotes(filterSubject)
      setNotes(res.data.notes ?? [])
    } catch {
      toast.error('Could not load notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterSubject])

  async function handleDelete(id) {
    try {
      await deleteNote(id)
      setNotes(prev => prev.filter(n => n.id !== id))
      toast.success('Note deleted')
    } catch {
      toast.error('Could not delete note')
    }
  }

  return (
    <HubLayout>
      <PageTitle title="Study Notes" icon="menu_book" />
      <PaywallGate feature="Study Notes">
        <div style={{ width: '100%' }}>
          {/* Top action row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
              Upload and browse notes from the community
            </p>
            <button onClick={() => setShowUpload(true)} className="btn-primary" style={{ fontSize: '13px', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload</span>
              Upload Note
            </button>
          </div>

          {/* Subject filter */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {['', ...SUBJECTS].map(s => (
              <button key={s || 'all'} onClick={() => setFilterSubject(s)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  background: filterSubject === s ? CORAL : 'var(--bg-card)',
                  border: `1px solid ${filterSubject === s ? CORAL : 'var(--border)'}`,
                  color: filterSubject === s ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}>
                {s || 'All Subjects'}
              </button>
            ))}
          </div>

          {/* Notes grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '14px' }} />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-faint)', display: 'block', marginBottom: '12px' }}>menu_book</span>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>No notes yet. Be the first to upload one!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {notes.map(note => (
                <NoteCard key={note.id} note={note} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {showUpload && (
          <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load() }} />
        )}
      </PaywallGate>
    </HubLayout>
  )
}
