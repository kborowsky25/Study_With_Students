import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getTutorProfile, saveTutorProfile } from '../api/tutors'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import client from '../api/client'
import toast from 'react-hot-toast'

const CORAL = '#ff725e'
const GREEN = '#e53e3e'
const BLUE  = '#60a5fa'
const RED   = '#e53e3e'

const SUBJECTS_LIST = [
  'Maths', 'Further Maths', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Economics', 'English', 'History', 'Geography',
  'Law', 'Psychology', 'Statistics', 'Philosophy', 'Engineering',
  'Medicine', 'Finance', 'Accounting',
]

const BIO_PROMPTS = [
  { emoji: '📚', text: 'My study style is…' },
  { emoji: '🎯', text: 'I specialise in…' },
  { emoji: '🏫', text: "I'm studying at…" },
]

const MAX_BIO = 500

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
}

// Profile completion calculation
function calcCompletion(form) {
  const fields = [
    form.age, form.university, form.course,
    form.availability, form.subjects, form.about_me,
  ]
  const filled = fields.filter(f => f && String(f).trim().length > 0).length
  return Math.round((filled / fields.length) * 100)
}

// ── Avatar upload button ──────────────────────────────────────────────────────
function AvatarUpload({ avatarUrl, initials, onUploaded }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [hovered,   setHovered]   = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['png','jpg','jpeg','webp'].includes(ext)) { toast.error('PNG, JPG or WEBP only'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const { data } = await client.post('/tutor-profile/avatar', fd)
      onUploaded(data.avatar_url)
      toast.success('Photo updated!')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const showOverlay = hovered || uploading || !avatarUrl

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: '92px', height: '92px' }}>
      {/* Whole circle is the clickable area */}
      <button
        type="button"
        onClick={() => !uploading && fileRef.current?.click()}
        disabled={uploading}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '92px', height: '92px', borderRadius: '50%', overflow: 'hidden',
          background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${RED}, #c53030)`,
          border: `3px solid ${RED}40`,
          boxShadow: `0 6px 24px ${RED}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: '900', color: 'white',
          cursor: uploading ? 'not-allowed' : 'pointer',
          padding: 0, position: 'relative',
          transition: 'box-shadow 0.2s',
        }}
      >
        {avatarUrl && <img src={avatarUrl} alt="Avatar" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {!avatarUrl && <span style={{ position: 'relative', zIndex: 1 }}>{initials}</span>}
        {/* Hover / upload overlay */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: showOverlay ? (uploading ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.50)') : 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
          transition: 'background 0.2s',
          zIndex: 2,
        }}>
          {showOverlay && (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white', fontVariationSettings: '"FILL" 1' }}>
                {uploading ? 'progress_activity' : 'photo_camera'}
              </span>
              {!uploading && (
                <span style={{ fontSize: '8px', fontWeight: '800', color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 1.3, letterSpacing: '0.04em' }}>
                  {avatarUrl ? <>CHANGE<br/>PHOTO</> : <>ADD<br/>PHOTO</>}
                </span>
              )}
            </>
          )}
        </div>
      </button>
      <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

// ── Completion Ring SVG ───────────────────────────────────────────────────────
function CompletionRing({ pct, size = 108 }) {
  const r      = (size - 10) / 2
  const circum = 2 * Math.PI * r
  const [offset, setOffset] = useState(circum)

  useEffect(() => {
    const t = setTimeout(() => setOffset(circum - (pct / 100) * circum), 300)
    return () => clearTimeout(t)
  }, [pct, circum])

  const color = pct === 100 ? GREEN : pct >= 60 ? BLUE : CORAL

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}1a`} strokeWidth={5} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circum}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: '9px', color: 'var(--text-faint)', marginTop: '1px' }}>complete</span>
      </div>
    </div>
  )
}

// ── Live Preview Card ─────────────────────────────────────────────────────────
function PreviewCard({ form, userName, avatarUrl }) {
  const initials = getInitials(userName)
  const selectedSubjects = form.subjects
    ? form.subjects.split(',').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      backdropFilter: 'blur(12px)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-hover)',
    }}>
      {/* Card header gradient */}
      <div style={{
        height: '80px',
        background: `linear-gradient(135deg, ${CORAL}22, rgba(255,154,60,0.12))`,
        borderBottom: `1px solid ${CORAL}20`,
        position: 'relative',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', background: `${CORAL}10`, borderRadius: '50%', filter: 'blur(20px)' }} />
        {/* Avatar overlapping */}
        <div style={{
          position: 'absolute',
          bottom: '-32px',
          left: '20px',
          width: '64px', height: '64px',
          borderRadius: '50%',
          background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${CORAL}, #ff9a8b)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: '900', color: 'white',
          border: '3px solid var(--bg-card)',
          boxShadow: `0 6px 20px ${CORAL}35`,
          overflow: 'hidden',
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}
        </div>
        {/* "Contact Tutor" preview button */}
        <button style={{
          position: 'absolute', right: '14px', bottom: '14px',
          padding: '6px 14px', borderRadius: '8px', border: 'none',
          background: `linear-gradient(135deg, ${CORAL}, #ff9a3c)`,
          color: 'white', fontWeight: '700', fontSize: '12px',
          cursor: 'default', opacity: 0.9,
        }}>
          Contact
        </button>
      </div>

      <div style={{ padding: '42px 20px 20px' }}>
        {/* Name + uni */}
        <p style={{ color: 'var(--text)', fontWeight: '800', fontSize: '17px', lineHeight: 1.2, marginBottom: '3px' }}>
          {userName || 'Your Name'}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: form.age ? '1px' : '12px' }}>
          {form.university || 'University'}{form.course ? ` · ${form.course}` : ''}
        </p>
        {form.age && (
          <p style={{ color: 'var(--text-faint)', fontSize: '11px', marginBottom: '12px' }}>Age {form.age}</p>
        )}

        {/* Availability chip */}
        {form.availability && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '12px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(229,62,62,0.10)', border: '1px solid rgba(229,62,62,0.22)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: GREEN }}>schedule</span>
            <span style={{ color: GREEN, fontSize: '11px', fontWeight: '600' }}>{form.availability}</span>
          </div>
        )}

        {/* Subject pills */}
        {selectedSubjects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
            {selectedSubjects.slice(0, 6).map(sub => (
              <span key={sub} style={{
                fontSize: '10px', fontWeight: '600', color: CORAL,
                background: `${CORAL}10`, border: `1px solid ${CORAL}28`,
                borderRadius: '20px', padding: '3px 9px',
              }}>
                {sub}
              </span>
            ))}
            {selectedSubjects.length > 6 && (
              <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-faint)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '3px 9px' }}>
                +{selectedSubjects.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* About me */}
        {form.about_me && (
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '5px' }}>About</p>
            <p style={{
              color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.6,
              display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {form.about_me}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, icon, iconColor = CORAL, iconBg, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Section header */}
      <div style={{
        padding: '16px 22px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '10px',
        background: `${iconColor}06`,
      }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px',
          background: iconBg ?? `${iconColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: iconColor }}>{icon}</span>
        </div>
        <h2 style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)', margin: 0 }}>{title}</h2>
      </div>
      {/* Section body */}
      <div style={{ padding: '20px 22px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Styled label + input ──────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{label}</label>
        {hint && <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// ── Status banner ─────────────────────────────────────────────────────────────
function StatusBanner({ status }) {
  if (!status || status === 'approved') return null

  const isPending  = status === 'pending'
  const isRejected = status === 'rejected'
  const color = isPending ? '#fbbf24' : '#f87171'
  const icon  = isPending ? 'pending' : 'cancel'

  return (
    <div style={{
      marginBottom: '20px',
      borderRadius: '16px',
      padding: '18px 22px',
      background: `${color}0d`,
      border: `1px solid ${color}35`,
      display: 'flex', alignItems: 'flex-start', gap: '14px',
    }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color }}>{icon}</span>
      </div>
      <div>
        {isPending ? (
          <>
            <p style={{ fontWeight: '800', fontSize: '14px', color, marginBottom: '4px' }}>Profile under review</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              Our team reviews all tutor applications within <strong style={{ color }}>24–48 hours</strong>.
              We'll email you at <strong>{' '}confirmation once approved. You can continue editing your profile in the meantime.</strong>
            </p>
            <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['ID verified', 'University checked', 'Code of conduct reviewed'].map(t => (
                <span key={t} style={{ fontSize: '10px', fontWeight: '600', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(251,191,36,0.18)' }}>
                  ⏳ {t}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <p style={{ fontWeight: '800', fontSize: '14px', color, marginBottom: '4px' }}>Application not approved</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              Your tutor profile was not approved at this time. Please update your profile with more detail and resubmit. Contact support if you believe this is an error.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tutor pledge (shown to first-time creators) ───────────────────────────────
function TutorPledge({ confirmed, onToggle }) {
  const checks = [
    { icon: 'school',        text: 'I am a current university or college student' },
    { icon: 'verified_user', text: 'I am at least 18 years old' },
    { icon: 'handshake',     text: 'I will tutor honestly and to the best of my ability' },
    { icon: 'policy',        text: 'I agree to the Tutor Code of Conduct' },
  ]
  return (
    <div style={{
      borderRadius: '16px',
      background: `${CORAL}08`,
      border: `1px solid ${CORAL}28`,
      padding: '20px 22px',
      marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL }}>verified</span>
        <div>
          <h3 style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)', margin: 0 }}>Tutor Verification Pledge</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '2px 0 0' }}>Please confirm before your profile is submitted for review</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {checks.map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${CORAL}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: CORAL }}>{icon}</span>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{text}</span>
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', borderRadius: '10px', background: confirmed ? `${GREEN}10` : 'rgba(255,255,255,0.03)', border: `1px solid ${confirmed ? GREEN + '35' : 'var(--border)'}`, transition: 'all 0.15s' }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => onToggle(e.target.checked)}
          style={{ width: '16px', height: '16px', accentColor: GREEN, cursor: 'pointer' }}
        />
        <span style={{ fontSize: '13px', fontWeight: '600', color: confirmed ? GREEN : 'var(--text-muted)' }}>
          I confirm all of the above and agree to have my profile reviewed
        </span>
      </label>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TutorProfile() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [form,          setForm]          = useState({ age: '', university: '', course: '', about_me: '', subjects: '', availability: '', linkedin_url: '' })
  const [profileStatus, setProfileStatus] = useState(null)
  const [isNewProfile,  setIsNewProfile]  = useState(false)
  const [pledgeOk,      setPledgeOk]      = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [mounted,       setMounted]       = useState(false)
  const [avatarUrl,     setAvatarUrl]     = useState(null)

  useEffect(() => {
    getTutorProfile()
      .then(({ data }) => {
        if (data.profile) {
          setForm(data.profile)
          setProfileStatus(data.profile.status ?? null)
          if (data.profile.avatar_url) setAvatarUrl(data.profile.avatar_url)
        } else {
          setIsNewProfile(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
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
      const joined  = current ? (current.endsWith(' ') ? current : current + ' ') + text : text
      return { ...f, about_me: joined.slice(0, MAX_BIO) }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isNewProfile && !pledgeOk) { toast.error('Please confirm the Tutor Pledge first'); return }
    setSaving(true)
    try {
      const { data } = await saveTutorProfile(form)
      setProfileStatus(data.status ?? null)
      if (data.is_new) {
        setIsNewProfile(false)
        updateUser({ is_tutor: true, screening_status: 'none' })
        toast.success('Profile created! Please complete your background check.')
        navigate({ to: '/tutor-screening' })
      } else {
        updateUser({ is_tutor: true })
        toast.success('Profile updated!')
      }
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const selectedSubjects = form.subjects ? form.subjects.split(',').map(s => s.trim()).filter(Boolean) : []
  const bioLen           = (form.about_me || '').length
  const completion       = calcCompletion(form)

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <HubLayout initialMode="tutor">
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[140, 80, 200, 160, 56].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: `${h}px`, borderRadius: '16px' }} />
          ))}
        </div>
      </HubLayout>
    )
  }

  return (
    <HubLayout initialMode="tutor">
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* ── Status banner (shown when pending/rejected) ─────────────── */}
        <StatusBanner status={profileStatus} />

        {/* ── First-time pledge ───────────────────────────────────────── */}
        {isNewProfile && (
          <TutorPledge confirmed={pledgeOk} onToggle={setPledgeOk} />
        )}

        {/* ── Hero banner ────────────────────────────────────────────────── */}
        <div
          className={mounted ? 'animate-slide-up' : ''}
          style={{
            marginBottom: '24px',
            borderRadius: '20px',
            background: `linear-gradient(135deg, ${CORAL}18 0%, rgba(255,114,94,0.05) 60%, rgba(255,154,60,0.08) 100%)`,
            border: `1px solid ${CORAL}25`,
            padding: '28px 32px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient blobs */}
          <div style={{ position: 'absolute', right: '-60px', top: '-60px', width: '250px', height: '250px', background: `${CORAL}08`, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', position: 'relative' }}>
            {/* Large avatar with upload + completion ring */}
            <div style={{ position: 'relative', flexShrink: 0, width: '108px', height: '108px' }}>
              <CompletionRing pct={completion} size={108} />
              <div style={{ position: 'absolute', inset: '8px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AvatarUpload
                  avatarUrl={avatarUrl}
                  initials={getInitials(user?.name)}
                  onUploaded={url => setAvatarUrl(url + '?t=' + Date.now())}
                />
              </div>
            </div>

            {/* Name + info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>
                  {user?.name ?? 'Your Name'}
                </h1>
                {completion === 100 && profileStatus === 'approved' && (
                  <span style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(229,62,62,0.14)', border: '1px solid rgba(229,62,62,0.30)', fontSize: '11px', fontWeight: '700', color: GREEN }}>
                    ✓ Approved Tutor
                  </span>
                )}
                {profileStatus === 'pending' && (
                  <span style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.28)', fontSize: '11px', fontWeight: '700', color: '#fbbf24' }}>
                    ⏳ Under Review
                  </span>
                )}
                {profileStatus === 'rejected' && (
                  <span style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.28)', fontSize: '11px', fontWeight: '700', color: '#f87171' }}>
                    ✗ Not Approved
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                {form.university ? `${form.university}${form.course ? ` · ${form.course}` : ''}` : 'Add your university below'}
              </p>

              {/* Progress chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { label: 'Personal info',  done: !!(form.age && form.university && form.course), icon: 'person' },
                  { label: 'Availability',   done: !!form.availability,                            icon: 'schedule' },
                  { label: 'Subjects',       done: selectedSubjects.length > 0,                    icon: 'school' },
                  { label: 'About me',       done: bioLen >= 50,                                    icon: 'edit_note' },
                ].map(({ label, done, icon }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px', borderRadius: '20px',
                    background: done ? 'rgba(229,62,62,0.10)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${done ? 'rgba(229,62,62,0.25)' : 'var(--border)'}`,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px', color: done ? GREEN : 'var(--text-faint)' }}>{done ? 'check_circle' : icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: done ? GREEN : 'var(--text-faint)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile completion percentage (big) */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                fontSize: '36px', fontWeight: '900', lineHeight: 1,
                color: completion === 100 ? GREEN : completion >= 60 ? BLUE : CORAL,
              }}>
                {completion}%
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>profile</p>
              <p style={{ fontSize: '10px', color: 'var(--text-faint)' }}>complete</p>
            </div>
          </div>
        </div>

        {/* ── Two-column layout: form + preview ──────────────────────────── */}
        <div style={{ display: 'flex', gap: '22px', alignItems: 'flex-start' }}>

          {/* ── Left: Form ─────────────────────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}
          >

            {/* Section 1: Personal Info */}
            <div className={mounted ? 'animate-slide-up delay-100' : ''}>
              <SectionCard title="Personal Info" icon="person" iconColor={CORAL}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <Field label="Age">
                    <input
                      type="number" min="16" max="100"
                      value={form.age} onChange={update('age')}
                      className="input-field"
                      placeholder="21"
                    />
                  </Field>
                  <Field label="University">
                    <input
                      type="text"
                      value={form.university} onChange={update('university')}
                      className="input-field"
                      placeholder="e.g. University of Oxford"
                    />
                  </Field>
                </div>
                <Field label="Course / Degree">
                  <input
                    type="text"
                    value={form.course} onChange={update('course')}
                    className="input-field"
                    placeholder="e.g. Mathematics BSc"
                  />
                </Field>
              </SectionCard>
            </div>

            {/* Section 2: Availability */}
            <div className={mounted ? 'animate-slide-up delay-150' : ''}>
              <SectionCard title="Availability" icon="schedule" iconColor={GREEN} iconBg="rgba(229,62,62,0.14)">
                <Field label="When are you free to tutor?" hint="Be specific — students plan around your hours">
                  <textarea
                    value={form.availability} onChange={update('availability')}
                    rows={3} className="input-field resize-none"
                    placeholder="e.g. Mon–Fri 6pm–9pm, Weekends flexible"
                  />
                </Field>
              </SectionCard>
            </div>

            {/* Section 3: Subjects */}
            <div className={mounted ? 'animate-slide-up delay-200' : ''}>
              <SectionCard title="Subjects You Teach" icon="school" iconColor={BLUE} iconBg="rgba(96,165,250,0.14)">
                {/* Subject toggles */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: selectedSubjects.length > 0 ? '14px' : 0 }}>
                  {SUBJECTS_LIST.map(sub => {
                    const active = selectedSubjects.includes(sub)
                    return (
                      <button
                        key={sub} type="button" onClick={() => toggleSubject(sub)}
                        style={{
                          padding: '6px 14px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          background: active ? `${BLUE}14` : 'rgba(255,255,255,0.04)',
                          color: active ? BLUE : 'var(--text-muted)',
                          border: active ? `1.5px solid ${BLUE}45` : '1.5px solid var(--border)',
                        }}
                      >
                        {sub}
                      </button>
                    )
                  })}
                </div>

                {selectedSubjects.length > 0 && (
                  <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Selected ({selectedSubjects.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedSubjects.map(sub => (
                        <span key={sub} style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                          color: BLUE, background: `${BLUE}10`, border: `1px solid ${BLUE}28`,
                        }}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Section 4: About Me */}
            <div className={mounted ? 'animate-slide-up delay-250' : ''}>
              <SectionCard title="About Me" icon="edit_note" iconColor="#a78bfa" iconBg="rgba(167,139,250,0.14)">
                <Field label="Tell students who you are" hint={`${bioLen} / ${MAX_BIO}`}>
                  <textarea
                    value={form.about_me}
                    onChange={e => { if (e.target.value.length <= MAX_BIO) update('about_me')(e) }}
                    rows={5} className="input-field resize-none"
                    placeholder="Describe your university, what you love teaching, your tutoring style…"
                    maxLength={MAX_BIO}
                  />
                </Field>

                {/* Prompt chips */}
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {BIO_PROMPTS.map(({ emoji, text }) => (
                    <button
                      key={text} type="button" onClick={() => appendPrompt(`${emoji} ${text}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 12px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: '600',
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)', cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `${CORAL}08`
                        e.currentTarget.style.borderColor = `${CORAL}30`
                        e.currentTarget.style.color = CORAL
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

                {/* Bio quality meter */}
                {bioLen > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((bioLen / 200) * 100, 100)}%`,
                        background: bioLen >= 150 ? GREEN : bioLen >= 80 ? BLUE : CORAL,
                        borderRadius: '2px',
                        transition: 'width 0.3s ease, background 0.3s ease',
                      }} />
                    </div>
                    <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px' }}>
                      {bioLen < 80 ? 'Add more detail to attract more students' :
                       bioLen < 150 ? 'Good start — keep going!' : 'Great bio length!'}
                    </p>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Section 5: LinkedIn */}
            <div className={mounted ? 'animate-slide-up delay-300' : ''}>
              <SectionCard title="LinkedIn" icon="link" iconColor="#60a5fa" iconBg="rgba(96,165,250,0.14)">
                <Field label="LinkedIn profile URL (optional)" hint="Visible on your tutor card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0, fontWeight: '600' }}>linkedin.com/in/</span>
                    <input
                      type="text"
                      value={(form.linkedin_url ?? '').replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '')}
                      onChange={e => {
                        const val = e.target.value.trim()
                        update('linkedin_url')({ target: { value: val ? `https://linkedin.com/in/${val.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '')}` : '' } })
                      }}
                      className="input-field"
                      placeholder="yourname"
                      style={{ flex: 1 }}
                    />
                  </div>
                </Field>
              </SectionCard>
            </div>

            {/* Save button */}
            {(() => {
              const blocked = isNewProfile && !pledgeOk
              const label   = saving ? 'Saving…'
                : isNewProfile ? 'Submit for Review'
                : profileStatus === 'pending' ? 'Update Profile'
                : 'Save Profile'
              const icon = saving ? 'hourglass_empty' : isNewProfile ? 'send' : 'save'
              return (
                <button
                  type="submit" disabled={saving || blocked}
                  className={mounted ? 'animate-slide-up delay-300' : ''}
                  style={{
                    width: '100%', padding: '15px', fontSize: '15px', fontWeight: '800',
                    borderRadius: '14px', border: 'none',
                    cursor: saving || blocked ? 'default' : 'pointer',
                    background: saving || blocked
                      ? 'rgba(255,255,255,0.08)'
                      : `linear-gradient(135deg, ${CORAL}, #ff9a3c)`,
                    color: saving || blocked ? 'var(--text-muted)' : 'white',
                    boxShadow: saving || blocked ? 'none' : `0 6px 24px ${CORAL}30`,
                    opacity: blocked ? 0.55 : 1,
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                  onMouseEnter={e => { if (!saving && !blocked) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 10px 32px ${CORAL}40` } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = (saving || blocked) ? 'none' : `0 6px 24px ${CORAL}30` }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
                  {label}
                </button>
              )
            })()}

          </form>

          {/* ── Right: Live Preview ─────────────────────────────────────── */}
          <div style={{ flex: 2, position: 'sticky', top: '20px', minWidth: 0 }}>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${CORAL}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px', color: CORAL }}>visibility</span>
              </div>
              <h2 style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text)', margin: 0 }}>Live Preview</h2>
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-faint)', padding: '2px 7px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                Updates as you type
              </span>
            </div>
            <PreviewCard form={form} userName={user?.name} avatarUrl={avatarUrl} />

            {/* Tips */}
            {completion < 100 && (
              <div style={{
                marginTop: '14px', padding: '14px 16px',
                borderRadius: '14px',
                background: `${CORAL}08`, border: `1px solid ${CORAL}20`,
              }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: CORAL, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>lightbulb</span>
                  Complete your profile to get more students
                </p>
                <ul style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {!form.about_me && <li style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Write an About Me bio</li>}
                  {selectedSubjects.length === 0 && <li style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Add subjects you teach</li>}
                  {!form.availability && <li style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Set your availability</li>}
                  {!form.university && <li style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Add your university</li>}
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>
    </HubLayout>
  )
}
