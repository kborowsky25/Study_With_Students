import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import { useAuth } from '../context/AuthContext'
import { Avatar, Card, EmptyState, Icon, SkeletonRows, Stat } from '../components/ui'
import { getUserProfile, updateStudentBio } from '../api/users'
import { errorMessage } from '../api/client'
import { toDateInput } from '../lib/dates'
import { formatDate } from '../lib/format'
import { refreshFamily } from '../lib/family'

const EDUCATION_LEVELS = [
  'Secondary School (GCSE)',
  'Sixth Form / A-Levels',
  'Foundation Year',
  'Undergraduate (Year 1)',
  'Undergraduate (Year 2)',
  'Undergraduate (Year 3)',
  'Undergraduate (Year 4+)',
  'Postgraduate / Masters',
  'PhD / Doctorate',
  'Professional / Other',
]

const FIELDS = ['education_level', 'school_name', 'study_year', 'bio']
const toForm = (user) => Object.fromEntries(FIELDS.map((k) => [k, user?.[k] ?? '']))

const Optional = () => <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>(optional)</span>

function Detail({ label, children }) {
  return (
    <div className="row">
      <span style={{ width: 120, flexShrink: 0, fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  )
}

function EditForm({ profile, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({ ...toForm(profile), date_of_birth: '' }))
  const [saving, setSaving] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const data = Object.fromEntries(FIELDS.map((k) => [k, form[k].trim()]))
    if (form.date_of_birth) data.date_of_birth = form.date_of_birth // once, for accounts from before sign-up asked
    setSaving(true)
    try {
      await updateStudentBio(data)
      toast.success('Profile updated')
      if (data.date_of_birth) refreshFamily()
      onSaved(data)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your profile'))
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <header className="card-head"><h3>Edit profile</h3></header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 16px' }}>
        <div className="field-row">
          <label className="field">
            <span>Education</span>
            <select className="input" value={form.education_level} onChange={set('education_level')}>
              <option value="">Not set</option>
              {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              {form.education_level && !EDUCATION_LEVELS.includes(form.education_level) && (
                <option value={form.education_level}>{form.education_level}</option>
              )}
            </select>
          </label>
          <label className="field">
            <span>School or university</span>
            <input className="input" value={form.school_name} onChange={set('school_name')} maxLength={200}
              placeholder="King’s College London" />
          </label>
        </div>
        {!profile.date_of_birth && (
          <label className="field">
            <span>Date of birth</span>
            <input className="input" type="date" value={form.date_of_birth} onChange={set('date_of_birth')}
              max={toDateInput(new Date())} />
          </label>
        )}
        <label className="field">
          <span>Year <Optional /></span>
          <input className="input" value={form.study_year} onChange={set('study_year')} maxLength={50}
            placeholder="Year 12, second year…" />
        </label>
        <label className="field">
          <span>About you <Optional /></span>
          <textarea className="input" rows={5} value={form.bio} onChange={set('bio')} maxLength={1000}
            placeholder="What you’re studying and what you’d like help with." />
        </label>
      </div>
      <div className="dialog-foot">
        <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-coral" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

export default function StudentProfile() {
  const { userId } = useParams({ from: '/student/$userId' })
  const { user: me } = useAuth()
  const isOwn = me != null && String(me.id) === String(userId)

  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | missing | error
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => {
    setStatus('loading')
    setEditing(false)
    return getUserProfile(userId)
      .then(({ data }) => { setProfile(data.user); setStatus('ready') })
      .catch((err) => setStatus(err?.response?.status === 404 ? 'missing' : 'error'))
  }, [userId])

  useEffect(() => { load() }, [load])

  const joined = profile?.created_at ? new Date(profile.created_at).getFullYear() : null
  const education = [profile?.education_level, profile?.school_name, profile?.study_year].filter(Boolean)

  let body
  if (status === 'loading') {
    body = <Card><SkeletonRows rows={4} /></Card>
  } else if (status === 'missing') {
    body = <Card><EmptyState title="This person doesn’t exist." action={<Link to="/hub" className="btn btn-ghost btn-sm">Back to the hub</Link>} /></Card>
  } else if (status === 'error') {
    body = <Card><EmptyState title="Couldn’t load this profile." action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} /></Card>
  } else {
    const stats = profile.stats ?? {}
    body = (
      <>
        <section className="card stat-grid">
          <Stat label="Sessions" value={stats.sessions ?? 0} />
          <Stat label="Confirmed" value={stats.confirmed_sessions ?? 0} />
          <Stat label="Forum posts" value={stats.forum_posts ?? 0} />
          <Stat label="Member since" value={joined ?? '—'} />
        </section>

        {editing ? (
          <EditForm
            profile={profile}
            onCancel={() => setEditing(false)}
            onSaved={(data) => { setProfile((p) => ({ ...p, ...data })); setEditing(false) }}
          />
        ) : (
          <Card title="About">
            <div className="row-list">
              <Detail label="Education">{education.length ? education.join(' · ') : <span style={{ color: 'var(--text-faint)' }}>Not added</span>}</Detail>
              {isOwn && profile.date_of_birth && <Detail label="Date of birth">{formatDate(`${profile.date_of_birth}T00:00:00`, { year: 'numeric' })}</Detail>}
              <div className="row" style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
                <p style={{ fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: profile.bio ? 'var(--text)' : 'var(--text-faint)' }}>
                  {profile.bio || (isOwn ? 'Add a few lines about what you’re studying.' : 'No bio yet.')}
                </p>
              </div>
            </div>
          </Card>
        )}
      </>
    )
  }

  return (
    <HubLayout>
      <PageTitle title={profile?.name || 'Profile'} icon="person" />

      <div style={{ maxWidth: 760 }}>
        <div className="dash-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Avatar name={profile?.name || '?'} size={40} />
            <h1 style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{profile?.name || (status === 'loading' ? '' : 'Profile')}</h1>
          </div>
          {status === 'ready' && (
            <div className="dash-actions">
              {profile.id_tutor && (
                <Link to="/tutor/$tutorId" params={{ tutorId: String(profile.id_tutor) }} className="btn btn-ghost">
                  <Icon name="school" />Tutor profile
                </Link>
              )}
              {isOwn ? (
                !editing && me.is_student !== false && (
                  <button className="btn btn-ghost" onClick={() => setEditing(true)}><Icon name="edit" />Edit profile</button>
                )
              ) : profile.can_message && (
                <Link to="/messages" search={{ user: profile.id_user }} className="btn btn-coral"><Icon name="chat" />Message</Link>
              )}
            </div>
          )}
        </div>
        {body}
      </div>
    </HubLayout>
  )
}
