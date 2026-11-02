import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Avatar, Icon, SkeletonRows } from '../components/ui'
import client, { errorMessage } from '../api/client'
import { getTutorProfile, saveTutorProfile } from '../api/tutors'

const SUBJECTS = [
  'Maths', 'Further Maths', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics',
  'English', 'History', 'Geography', 'Law', 'Psychology', 'Statistics', 'Philosophy',
  'Engineering', 'Medicine', 'Finance', 'Accounting',
]
const RATE_MIN = 5
const RATE_MAX = 200
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

// One line under the title while a tutor isn't approved yet: [message, link label]
const SCREENING = {
  none:     ['Verify your university to appear in search.', 'Start verification'],
  pending:  ['Your application is under review.', 'View status'],
  rejected: ['Your application wasn’t approved.', 'Update and resubmit'],
}

const chipOn = { background: 'var(--coral-soft)', borderColor: 'var(--coral)', color: 'var(--coral)' }
const emptyLine = { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', fontSize: 13, color: 'var(--text-faint)' }

const sameText = (a, b) => a.toLowerCase() === b.toLowerCase()

function splitSubjects(value) {
  const out = []
  for (const s of String(value ?? '').split(',').map((x) => x.trim())) {
    if (s && !out.some((o) => sameText(o, s))) out.push(s)
  }
  return out
}

const toForm = (p) => ({
  university: p?.university ?? '',
  course: p?.course ?? '',
  age: p?.age == null ? '' : String(p.age),
  linkedin_url: p?.linkedin_url ?? '',
  subjects: splitSubjects(p?.subjects),
  availability: p?.availability ?? '',
  about_me: p?.about_me ?? '',
  hourly_rate: String(Number(p?.hourly_rate ?? 20)),
})

function toPayload(form) {
  const linkedin = form.linkedin_url.trim()
  return {
    university: form.university.trim(),
    course: form.course.trim(),
    age: form.age === '' ? null : Number(form.age),
    linkedin_url: linkedin && !/^https?:\/\//i.test(linkedin) ? `https://${linkedin}` : linkedin,
    subjects: form.subjects.join(', '),
    availability: form.availability.trim(),
    about_me: form.about_me.trim(),
    hourly_rate: Number(form.hourly_rate),
  }
}

function Section({ title, children }) {
  return (
    <section>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{title}</h2>
      {children}
    </section>
  )
}

/** A label/control pair; stacks on narrow screens. */
function Setting({ label, htmlFor, top = false, children }) {
  const Label = htmlFor ? 'label' : 'div'
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: top ? 'flex-start' : 'center', gap: '8px 24px',
      padding: '12px 0', borderTop: '1px solid var(--border)',
    }}>
      <Label htmlFor={htmlFor} style={{ flex: '0 0 170px', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', paddingTop: top ? 8 : 0 }}>
        {label}
      </Label>
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>{children}</div>
    </div>
  )
}

export default function TutorProfile() {
  const { user, updateUser, refreshSession } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [profile, setProfile] = useState(null)    // null once loaded = not a tutor yet
  const [form, setForm] = useState(() => toForm(null))
  const [saved, setSaved] = useState(() => toForm(null))
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const fileInput = useRef(null)

  function load() {
    setStatus('loading')
    getTutorProfile()
      .then(({ data }) => {
        const p = data.profile
        setProfile(p)
        setForm(toForm(p))
        setSaved(toForm(p))
        setAvatarUrl(p?.avatar_url ?? null)
        setStatus('ready')
      })
      .catch((err) => {
        toast.error(errorMessage(err, 'Could not load your profile'))
        setStatus('error')
      })
  }

  useEffect(() => { load() }, [])

  const creating = status === 'ready' && !profile
  const dirty = JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(saved))
  const screening = profile && profile.screening_status !== 'approved'
    ? SCREENING[profile.screening_status] ?? SCREENING.none
    : null
  const subjectOptions = [...SUBJECTS, ...form.subjects.filter((s) => !SUBJECTS.some((o) => sameText(o, s)))]

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function toggleSubject(subject) {
    setForm((f) => ({
      ...f,
      subjects: f.subjects.some((s) => sameText(s, subject))
        ? f.subjects.filter((s) => !sameText(s, subject))
        : [...f.subjects, subject],
    }))
  }

  function addSubject() {
    const subject = newSubject.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
    if (!subject) return
    setForm((f) => (f.subjects.some((s) => sameText(s, subject)) ? f : { ...f, subjects: [...f.subjects, subject] }))
    setNewSubject('')
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast.error('Use a PNG, JPG or WEBP image'); return }
    if (file.size > MAX_AVATAR_BYTES) { toast.error('Images can be up to 5 MB'); return }
    const body = new FormData()
    body.append('avatar', file)
    setUploading(true)
    try {
      // The client defaults to JSON, which would serialise the FormData and drop the file.
      const { data } = await client.post('/tutor-profile/avatar', body, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAvatarUrl(`${data.avatar_url}?v=${Date.now()}`)
      toast.success('Photo updated')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not upload the photo'))
    } finally {
      setUploading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    const payload = toPayload(form)
    if (!payload.subjects) { toast.error('Pick at least one subject'); return }
    if (payload.subjects.length > 255) { toast.error('Too many subjects, remove a few'); return }
    if (!(payload.hourly_rate >= RATE_MIN && payload.hourly_rate <= RATE_MAX)) {
      toast.error(`Hourly rate must be between £${RATE_MIN} and £${RATE_MAX}`)
      return
    }
    if (creating && !agreed) { toast.error('Confirm the tutor agreement to continue'); return }

    setSaving(true)
    try {
      const { data } = await saveTutorProfile(payload)
      if (data.is_new) {
        toast.success('Tutor profile created')
        // Fresh claims so the rest of the app knows this account is now a tutor.
        await refreshSession().catch(() => updateUser({ is_tutor: true, screening_status: data.status ?? 'none' }))
        navigate({ to: '/tutor-screening' })
        return
      }
      const next = { ...profile, ...payload, screening_status: data.status ?? profile.screening_status }
      setProfile(next)
      setForm(toForm(next))
      setSaved(toForm(next))
      toast.success('Profile saved')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your profile'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <HubLayout initialMode={user?.is_tutor ? 'tutor' : 'student'}>
      <PageTitle title={creating ? 'Become a tutor' : 'Profile'} icon={creating ? 'school' : 'badge'} />

      <div className="dash-head">
        <h1>{creating ? 'Become a tutor' : 'Tutor profile'}</h1>
        {profile && (
          <div className="dash-actions">
            <Link to="/tutor/$tutorId" params={{ tutorId: String(profile.id_tutor) }} className="btn btn-ghost">
              <Icon name="visibility" />View public profile
            </Link>
          </div>
        )}
      </div>

      {screening && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '-10px 0 22px' }}>
          {screening[0]}{' '}
          <Link to="/tutor-screening" style={{ color: 'var(--coral)', fontWeight: 600, textDecoration: 'none' }}>{screening[1]}</Link>
        </p>
      )}

      {status === 'loading' && <SkeletonRows rows={6} />}

      {status === 'error' && (
        <div style={emptyLine}>
          Your profile couldn’t be loaded.
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {status === 'ready' && (
        <form onSubmit={submit} style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Section title="Profile">
            {profile && (
              <Setting label="Photo">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={user?.name ?? '?'} src={avatarUrl} size={40} />
                  <button type="button" className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
                    {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadAvatar} />
                </div>
              </Setting>
            )}
            <Setting label="University" htmlFor="tp-university">
              <input id="tp-university" className="input" value={form.university} onChange={set('university')}
                required maxLength={255} placeholder="University College London" />
            </Setting>
            <Setting label="Course" htmlFor="tp-course">
              <input id="tp-course" className="input" value={form.course} onChange={set('course')}
                maxLength={255} placeholder="Mathematics (MSci)" />
            </Setting>
            <Setting label="Age" htmlFor="tp-age">
              <input id="tp-age" className="input" type="number" min={16} max={99} value={form.age} onChange={set('age')}
                style={{ maxWidth: 120 }} />
            </Setting>
            <Setting label="LinkedIn" htmlFor="tp-linkedin">
              <input id="tp-linkedin" className="input" inputMode="url" value={form.linkedin_url} onChange={set('linkedin_url')}
                maxLength={500} placeholder="linkedin.com/in/yourname" />
            </Setting>
          </Section>

          <Section title="Teaching">
            <Setting label="Subjects" top>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {subjectOptions.map((s) => {
                  const on = form.subjects.some((x) => sameText(x, s))
                  return (
                    <button key={s} type="button" className="btn btn-ghost btn-sm" aria-pressed={on} style={on ? chipOn : undefined}
                      onClick={() => toggleSubject(s)}>
                      {on && <Icon name="check" />}{s}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, maxWidth: 360 }}>
                <input className="input" value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubject() } }}
                  placeholder="Another subject" maxLength={40} aria-label="Add another subject" />
                <button type="button" className="btn btn-ghost" onClick={addSubject} disabled={!newSubject.trim()}>Add</button>
              </div>
            </Setting>
            <Setting label="Availability" htmlFor="tp-availability">
              <input id="tp-availability" className="input" value={form.availability} onChange={set('availability')}
                maxLength={255} placeholder="Weekday evenings, Sunday afternoons" />
            </Setting>
            <Setting label="About you" htmlFor="tp-about" top>
              <textarea id="tp-about" className="input" rows={5} maxLength={500} value={form.about_me} onChange={set('about_me')} />
            </Setting>
            <Setting label="Hourly rate (£)" htmlFor="tp-rate">
              <input id="tp-rate" className="input" type="number" inputMode="decimal" min={RATE_MIN} max={RATE_MAX} step="0.01"
                required value={form.hourly_rate} onChange={set('hourly_rate')} style={{ maxWidth: 120 }} />
            </Setting>
          </Section>

          {creating && (
            <Section title="Agreement">
              <Setting label="Tutor agreement" htmlFor="tp-agree">
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer' }}>
                  <input id="tp-agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                    style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--coral)', flexShrink: 0 }} />
                  I’m a current university student, I’m 18 or over, and I agree to the tutor code of conduct.
                </label>
              </Setting>
            </Section>
          )}

          {(creating || dirty) && (
            <div style={{
              position: 'sticky', bottom: 16, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 10px 10px 16px', background: 'var(--elevated)', border: '1px solid var(--border-strong)',
              borderRadius: 10, boxShadow: 'var(--shadow-pop)',
            }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)' }}>{creating ? '' : 'Unsaved changes'}</span>
              {!creating && <button type="button" className="btn btn-quiet" onClick={() => setForm(saved)} disabled={saving}>Discard</button>}
              <button type="submit" className="btn btn-coral" disabled={saving || (creating && !agreed)}>
                {saving ? 'Saving…' : creating ? 'Create profile' : 'Save changes'}
              </button>
            </div>
          )}
        </form>
      )}
    </HubLayout>
  )
}
