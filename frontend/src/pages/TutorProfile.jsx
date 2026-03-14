import { useEffect, useState } from 'react'
import { getTutorProfile, saveTutorProfile } from '../api/tutors'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const SUBJECTS_LIST = [
  'Maths', 'Further Maths', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Economics', 'English', 'History', 'Geography',
  'Law', 'Psychology', 'Statistics', 'Philosophy', 'Engineering',
  'Medicine', 'Finance', 'Accounting',
]

const BIO_PROMPTS = [
  { emoji: '📚', text: 'My study style is...' },
  { emoji: '🎯', text: 'I specialize in...' },
  { emoji: '🏫', text: "I'm at..." },
]

const MAX_BIO = 500

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
}

// ── Live Preview Card ─────────────────────────────────────────────────────────
function PreviewCard({ form, userName }) {
  const initials = getInitials(userName)
  const selectedSubjects = form.subjects
    ? form.subjects.split(',').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '18px',
      backdropFilter: 'blur(12px)',
      padding: '28px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff725e, #ff9a8b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          fontWeight: '900',
          color: 'white',
          flexShrink: 0,
          boxShadow: '0 4px 16px rgba(255,114,94,0.35)',
        }}>
          {initials}
        </div>
        <div>
          <p style={{ color: 'var(--text)', fontWeight: '800', fontSize: '18px', lineHeight: 1.2 }}>
            {userName || 'Your Name'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '3px' }}>
            {form.university || 'University'}{form.course ? ` · ${form.course}` : ''}
          </p>
          {form.age && (
            <p style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '2px' }}>
              Age {form.age}
            </p>
          )}
        </div>
      </div>

      {/* Subject pills */}
      {selectedSubjects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {selectedSubjects.slice(0, 8).map(sub => (
            <span key={sub} style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#ff725e',
              background: 'rgba(255,114,94,0.10)',
              border: '1px solid rgba(255,114,94,0.30)',
              borderRadius: '20px',
              padding: '3px 10px',
            }}>
              {sub}
            </span>
          ))}
          {selectedSubjects.length > 8 && (
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--text-faint)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '3px 10px',
            }}>
              +{selectedSubjects.length - 8} more
            </span>
          )}
        </div>
      )}

      {/* About me preview */}
      {form.about_me && (
        <div>
          <p style={{ color: 'var(--text-faint)', fontSize: '10px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '5px' }}>
            About
          </p>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '12px',
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {form.about_me}
          </p>
        </div>
      )}

      {/* Availability */}
      {form.availability && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ff725e' }}>schedule</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{form.availability}</span>
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #ff725e, #ff9a8b)',
          border: 'none',
          color: 'white',
          fontWeight: '700',
          fontSize: '13px',
          cursor: 'default',
          opacity: 0.85,
        }}
      >
        Contact Tutor
      </button>

      <p style={{ color: 'var(--text-faint)', fontSize: '10px', textAlign: 'center', marginTop: '-8px' }}>
        Students will see this on your profile
      </p>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TutorProfile() {
  const { user, updateUser } = useAuth()
  const [form,    setForm]    = useState({ age: '', university: '', course: '', about_me: '', subjects: '', availability: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    getTutorProfile()
      .then(({ data }) => {
        if (data.profile) setForm(data.profile)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function toggleSubject(sub) {
    setForm(f => {
      const current = f.subjects ? f.subjects.split(',').map(s => s.trim()).filter(Boolean) : []
      const idx = current.indexOf(sub)
      const next = idx === -1 ? [...current, sub] : current.filter((_, i) => i !== idx)
      return { ...f, subjects: next.join(', ') }
    })
  }

  function appendPrompt(text) {
    setForm(f => {
      const current = f.about_me || ''
      const joined = current ? (current.endsWith(' ') ? current : current + ' ') + text : text
      return { ...f, about_me: joined.slice(0, MAX_BIO) }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveTutorProfile(form)
      updateUser({ is_tutor: true })
      toast.success('Profile saved!')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const selectedSubjects = form.subjects ? form.subjects.split(',').map(s => s.trim()).filter(Boolean) : []
  const bioLen = (form.about_me || '').length

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <HubLayout initialMode="tutor">
        <div className="space-y-4 max-w-4xl mx-auto">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: "56px", borderRadius: "10px" }} />
          ))}
        </div>
      </HubLayout>
    )
  }

  return (
    <HubLayout initialMode="tutor">
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Page heading */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text)', marginBottom: '4px' }}>
            Your Profile
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            This is what students see when they find you
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

          {/* ── Left: Form (flex 3) ───────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}
          >

            {/* Section 1: Personal Info */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              backdropFilter: 'blur(12px)',
              padding: '24px',
            }}>
              <h2 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text)', marginBottom: '20px' }}>
                Personal Info
              </h2>

              {/* Avatar circle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '22px', gap: '8px' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff725e, #ff9a8b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  fontWeight: '900',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(255,114,94,0.35)',
                  cursor: 'default',
                }}>
                  {getInitials(user?.name)}
                </div>
                <span style={{ color: 'var(--text-faint)', fontSize: '11px', fontWeight: '600' }}>
                  Change photo
                </span>
              </div>

              {/* Name (read-only) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>
                  Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.name ?? ''}
                  className="input-field"
                  style={{ opacity: 0.6, cursor: 'default' }}
                />
              </div>

              {/* Age + University side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>
                    Age
                  </label>
                  <input
                    type="number"
                    min="16"
                    max="100"
                    value={form.age}
                    onChange={update('age')}
                    className="input-field"
                    placeholder="21"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>
                    University
                  </label>
                  <input
                    type="text"
                    value={form.university}
                    onChange={update('university')}
                    className="input-field"
                    placeholder="e.g. University of Oxford"
                  />
                </div>
              </div>

              {/* Course */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>
                  Course / Degree
                </label>
                <input
                  type="text"
                  value={form.course}
                  onChange={update('course')}
                  className="input-field"
                  placeholder="e.g. Mathematics BSc"
                />
              </div>
            </div>

            {/* Section 2: Availability */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              backdropFilter: 'blur(12px)',
              padding: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ff725e' }}>schedule</span>
                <h2 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text)', margin: 0 }}>
                  Availability
                </h2>
              </div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>
                When are you available to tutor?
              </label>
              <textarea
                value={form.availability}
                onChange={update('availability')}
                rows={3}
                className="input-field resize-none"
                placeholder="Mon-Fri 6pm-9pm, Weekends flexible"
              />
            </div>

            {/* Section 3: Subjects */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              backdropFilter: 'blur(12px)',
              padding: '24px',
            }}>
              <h2 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text)', marginBottom: '16px' }}>
                Subjects You Teach
              </h2>

              {/* Toggle grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                {SUBJECTS_LIST.map(sub => {
                  const active = selectedSubjects.includes(sub)
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: active ? 'rgba(255,114,94,0.15)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#ff725e' : 'var(--text-muted)',
                        border: active ? '1.5px solid rgba(255,114,94,0.45)' : '1.5px solid var(--border)',
                      }}
                    >
                      {sub}
                    </button>
                  )
                })}
              </div>

              {/* Selected tags */}
              {selectedSubjects.length > 0 && (
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Selected ({selectedSubjects.length})
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedSubjects.map(sub => (
                      <span key={sub} style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#ff725e',
                        background: 'rgba(255,114,94,0.12)',
                        border: '1px solid rgba(255,114,94,0.30)',
                      }}>
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: About Me */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              backdropFilter: 'blur(12px)',
              padding: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text)', margin: 0 }}>
                  About Me
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: bioLen > MAX_BIO * 0.9 ? '#ff725e' : 'var(--text-faint)',
                }}>
                  {bioLen}/{MAX_BIO}
                </span>
              </div>
              <textarea
                value={form.about_me}
                onChange={e => {
                  if (e.target.value.length <= MAX_BIO) update('about_me')(e)
                }}
                rows={5}
                className="input-field resize-none"
                placeholder="Tell students about yourself — your university, what you love teaching, your style..."
                maxLength={MAX_BIO}
              />

              {/* Prompt chips */}
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {BIO_PROMPTS.map(({ emoji, text }) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => appendPrompt(`${emoji} ${text}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,114,94,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(255,114,94,0.30)'
                      e.currentTarget.style.color = '#ff725e'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                  >
                    <span>{emoji}</span>
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '700' }}
            >
              {saving ? 'Saving…' : 'Save Profile →'}
            </button>

          </form>

          {/* ── Right: Live Preview (flex 2) ───────────────────────── */}
          <div style={{ flex: 2, position: 'sticky', top: '20px', minWidth: 0 }}>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>visibility</span>
              <h2 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text)', margin: 0 }}>
                Preview
              </h2>
            </div>
            <PreviewCard form={form} userName={user?.name} />
          </div>

        </div>
      </div>
    </HubLayout>
  )
}
