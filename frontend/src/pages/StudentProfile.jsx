import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import { useAuth } from '../context/AuthContext'
import { getUserProfile, updateStudentBio } from '../api/users'

const CORAL  = '#ff725e'
const BLUE   = '#60a5fa'
const GREEN  = '#34d399'
const AMBER  = '#fbbf24'

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

function Stat({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '9px',
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color }}>{icon}</span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', lineHeight: 1 }}>{value}</span>
    </div>
  )
}

export default function StudentProfile() {
  const { userId }  = useParams({ from: '/student/$userId' })
  const { user: me } = useAuth()
  const isOwn = me && String(me.id) === String(userId)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // edit state
  const [editing, setEditing]             = useState(false)
  const [saving,  setSaving]              = useState(false)
  const [bioForm, setBioForm]             = useState({
    education_level: '', school_name: '', study_year: '', bio: '',
  })

  useEffect(() => {
    setLoading(true)
    getUserProfile(userId)
      .then(({ data }) => {
        setProfile(data.user)
        setBioForm({
          education_level: data.user.education_level || '',
          school_name:     data.user.school_name     || '',
          study_year:      data.user.study_year      || '',
          bio:             data.user.bio             || '',
        })
      })
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false))
  }, [userId])

  async function handleSaveBio(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateStudentBio(bioForm)
      setProfile(p => ({ ...p, ...bioForm }))
      setEditing(false)
      toast.success('Profile updated')
    } catch {
      toast.error('Could not save')
    } finally {
      setSaving(false)
    }
  }

  // Initials avatar
  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const joinedYear = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : null

  return (
    <HubLayout>
      <PageTitle title="Student Profile" icon="person" />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
          <div className="skeleton" style={{ height: '340px', borderRadius: '18px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="skeleton" style={{ height: '120px', borderRadius: '14px' }} />
            <div className="skeleton" style={{ height: '200px', borderRadius: '14px' }} />
          </div>
        </div>
      ) : !profile ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-faint)' }}>person_off</span>
          <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>User not found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>

          {/* ── Left card: avatar + meta ── */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '18px', padding: '28px 22px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
            position: 'sticky', top: '20px',
          }}>
            {/* Avatar */}
            <div style={{
              width: '88px', height: '88px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${CORAL}44, ${BLUE}44)`,
              border: `3px solid ${CORAL}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: '800', color: 'var(--text)',
              flexShrink: 0,
            }}>
              {initials}
            </div>

            {/* Name */}
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', margin: '0 0 4px' }}>
                {profile.name}
              </h2>
              {joinedYear && (
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: 0 }}>
                  Member since {joinedYear}
                </p>
              )}
            </div>

            {/* Education badge */}
            {(profile.education_level || profile.school_name) && (
              <div style={{
                width: '100%', background: `${BLUE}10`, border: `1px solid ${BLUE}25`,
                borderRadius: '10px', padding: '10px 12px',
              }}>
                {profile.education_level && (
                  <p style={{ fontSize: '11px', fontWeight: '700', color: BLUE, margin: '0 0 2px' }}>
                    {profile.education_level}
                  </p>
                )}
                {profile.school_name && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    {profile.school_name}
                    {profile.study_year ? ` · ${profile.study_year}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Edit button (own profile only) */}
            {isOwn && !editing && (
              <button
                onClick={() => setEditing(true)}
                style={{
                  width: '100%', padding: '9px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                Edit Profile
              </button>
            )}
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <Stat icon="school"       label="Sessions"           value={profile.stats?.sessions ?? 0}           color={CORAL} />
              <Stat icon="check_circle" label="Confirmed"          value={profile.stats?.confirmed_sessions ?? 0} color={GREEN} />
              <Stat icon="forum"        label="Forum Posts"        value={profile.stats?.forum_posts ?? 0}        color={BLUE}  />
            </div>

            {/* Bio / About */}
            {editing ? (
              <form onSubmit={handleSaveBio} style={{
                background: 'var(--bg-card)', border: `1px solid ${CORAL}28`,
                borderRadius: '18px', padding: '24px',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: CORAL }}>edit</span>
                  Edit your profile
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Education Level
                    </label>
                    <select
                      value={bioForm.education_level}
                      onChange={e => setBioForm(f => ({ ...f, education_level: e.target.value }))}
                      style={{
                        width: '100%', background: 'var(--input-bg, rgba(255,255,255,0.06))',
                        border: '1px solid var(--border)', borderRadius: '10px',
                        color: 'var(--text)', fontSize: '12px', padding: '9px 10px', outline: 'none',
                      }}
                    >
                      <option value="">— Select —</option>
                      {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      School / University
                    </label>
                    <input
                      type="text"
                      value={bioForm.school_name}
                      onChange={e => setBioForm(f => ({ ...f, school_name: e.target.value }))}
                      placeholder="e.g. King's College London"
                      style={{
                        width: '100%', background: 'var(--input-bg, rgba(255,255,255,0.06))',
                        border: '1px solid var(--border)', borderRadius: '10px',
                        color: 'var(--text)', fontSize: '12px', padding: '9px 10px', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Year / Stage (optional)
                  </label>
                  <input
                    type="text"
                    value={bioForm.study_year}
                    onChange={e => setBioForm(f => ({ ...f, study_year: e.target.value }))}
                    placeholder="e.g. Year 2, Final Year, Year 11…"
                    style={{
                      width: '100%', background: 'var(--input-bg, rgba(255,255,255,0.06))',
                      border: '1px solid var(--border)', borderRadius: '10px',
                      color: 'var(--text)', fontSize: '12px', padding: '9px 10px', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    About Me
                  </label>
                  <textarea
                    value={bioForm.bio}
                    onChange={e => setBioForm(f => ({ ...f, bio: e.target.value }))}
                    rows={4}
                    placeholder="Tell others what subjects you're studying, what you're working on, or what you're looking for in a tutor…"
                    style={{
                      width: '100%', background: 'var(--input-bg, rgba(255,255,255,0.06))',
                      border: '1px solid var(--border)', borderRadius: '10px',
                      color: 'var(--text)', fontSize: '13px', padding: '10px 12px', outline: 'none',
                      resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '800',
                      background: CORAL, color: '#fff', border: 'none',
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving…' : 'Save Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    style={{
                      padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                      background: 'var(--btn-secondary-bg)', color: 'var(--text)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '18px', padding: '24px',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: CORAL }}>person</span>
                  About
                </h3>

                {profile.bio ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                    {profile.bio}
                  </p>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-faint)', fontStyle: 'italic', margin: 0 }}>
                    {isOwn ? 'Add a bio so other students know who you are.' : 'No bio yet.'}
                  </p>
                )}

                {isOwn && (
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      marginTop: '14px', padding: '7px 14px', borderRadius: '8px',
                      background: 'transparent', border: `1px solid ${CORAL}30`,
                      color: CORAL, fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                    {profile.bio ? 'Edit bio' : 'Add bio'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </HubLayout>
  )
}
