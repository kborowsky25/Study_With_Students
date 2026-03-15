import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { upgradeToExplorer } from '../api/membership'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

// ── Palette ──────────────────────────────────────────────────────────────────
const CORAL  = '#ff725e'
const AMBER  = '#fbbf24'
const GREEN  = '#34d399'

// ── Feature lists ─────────────────────────────────────────────────────────────
const FREE_FEATURES = [
  { icon: 'search',          label: 'Find & contact tutors',          ok: true  },
  { icon: 'cast_for_education', label: 'Book 1-to-1 sessions',        ok: true  },
  { icon: 'calendar_month',  label: 'Personal calendar',              ok: true  },
  { icon: 'message',         label: 'Direct messaging',               ok: true  },
  { icon: 'forum',           label: 'Community Forum',                ok: false },
  { icon: 'groups',          label: 'Study Rooms',                    ok: false },
  { icon: 'school',          label: 'Classroom sessions',             ok: false },
  { icon: 'military_tech',   label: 'Explorer Battle Pass',           ok: false },
]

const EXPLORER_FEATURES = [
  { icon: 'search',          label: 'Find & contact tutors',          ok: true  },
  { icon: 'cast_for_education', label: 'Book 1-to-1 sessions',        ok: true  },
  { icon: 'calendar_month',  label: 'Personal calendar',              ok: true  },
  { icon: 'message',         label: 'Direct messaging',               ok: true  },
  { icon: 'forum',           label: 'Community Forum',                ok: true  },
  { icon: 'groups',          label: 'Study Rooms',                    ok: true  },
  { icon: 'school',          label: 'Classroom sessions',             ok: true  },
  { icon: 'military_tech',   label: 'Explorer Battle Pass',           ok: true  },
]

// ── Check row ─────────────────────────────────────────────────────────────────
function FeatureRow({ icon, label, ok }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '15px', color: ok ? GREEN : 'var(--text-faint)', flexShrink: 0 }}
      >
        {ok ? 'check_circle' : 'cancel'}
      </span>
      <span style={{
        fontSize: '13px',
        color: ok ? 'var(--text)' : 'var(--text-faint)',
        fontWeight: ok ? '500' : '400',
      }}>
        {label}
      </span>
    </div>
  )
}

// ── Confetti burst (CSS only) ─────────────────────────────────────────────────
const CONFETTI_COLORS = [CORAL, AMBER, GREEN, '#60a5fa', '#a78bfa', '#f472b6']

function ConfettiBurst() {
  return (
    <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
      {/* Gold star icon */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '22px',
        background: `linear-gradient(135deg, ${AMBER}33, ${CORAL}22)`,
        border: `1.5px solid ${AMBER}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 32px ${AMBER}44`,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '42px', color: AMBER }}>
          workspace_premium
        </span>
      </div>
      {/* Orbiting dots */}
      {CONFETTI_COLORS.map((c, i) => {
        const angle  = (i / CONFETTI_COLORS.length) * 360
        const rad    = (angle * Math.PI) / 180
        const r      = 48
        const x      = 40 + r * Math.cos(rad)
        const y      = 40 + r * Math.sin(rad)
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 4, top: y - 4,
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: c,
              opacity: 0.85,
            }}
          />
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Membership() {
  const { isPremium, user, updateUser, isTutor } = useAuth()
  const [loading,   setLoading]   = useState(false)
  const [purchased, setPurchased] = useState(false)   // local success state for this session

  const isUnlocked = isPremium || purchased

  async function handleSimulate() {
    setLoading(true)
    try {
      const res = await upgradeToExplorer()
      // Merge whatever the server returns (name, email, is_premium) into auth context
      const serverUser = res.data?.user ?? {}
      updateUser({ is_premium: true, ...serverUser })
      setPurchased(true)
      toast.success('🎉 Welcome to Explorer Plan!')
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Something went wrong — try again'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const mode = isTutor ? 'tutor' : 'student'

  return (
    <HubLayout mode={mode}>
      <div style={{
        maxWidth: '900px', margin: '0 auto', padding: '32px 20px',
      }}>
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '26px', fontWeight: '900', color: 'var(--text)',
            marginBottom: '6px',
          }}>
            Explorer Plan
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Unlock the full Study With Students experience for just £2/month.
          </p>
        </div>

        {/* ── UNLOCKED state ───────────────────────────────────────────────── */}
        {isUnlocked ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <ConfettiBurst />

            <div style={{ textAlign: 'center', maxWidth: '460px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: AMBER, marginBottom: '8px' }}>
                You're an Explorer! ✦
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                All premium features are now unlocked. Dive in and make the most of your plan.
              </p>
            </div>

            {/* Unlocked feature grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '14px', width: '100%', maxWidth: '700px',
            }}>
              {[
                { to: '/forum',               icon: 'forum',         label: 'Community Forum',   color: '#60a5fa' },
                { to: '/study-rooms/student', icon: 'groups',        label: 'Study Rooms',        color: '#a78bfa' },
                { to: '/classroom',           icon: 'school',        label: 'Classroom',          color: GREEN      },
                { to: '/xp',                  icon: 'military_tech', label: 'Battle Pass',        color: AMBER      },
              ].map(({ to, icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    padding: '20px 16px', borderRadius: '16px',
                    background: 'var(--bg-card)',
                    border: `1px solid ${color}33`,
                    textDecoration: 'none', transition: 'all 0.18s ease',
                    boxShadow: `0 0 0 0 ${color}00`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.border = `1px solid ${color}66`
                    e.currentTarget.style.boxShadow = `0 0 18px ${color}22`
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.border = `1px solid ${color}33`
                    e.currentTarget.style.boxShadow = `0 0 0 0 ${color}00`
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: `${color}1a`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color }}>{icon}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{label}</span>
                  <span style={{ fontSize: '11px', color }}>Open →</span>
                </Link>
              ))}
            </div>

            {/* What's included card */}
            <div style={{
              width: '100%', maxWidth: '420px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '20px 24px',
            }}>
              <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                Your Plan
              </p>
              {EXPLORER_FEATURES.map(f => <FeatureRow key={f.icon} {...f} />)}
              <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '12px' }}>
                £2 / month · Cancel anytime
              </p>
            </div>
          </div>
        ) : (
          /* ── NOT premium state ─────────────────────────────────────────── */
          <div>
            {/* Plan comparison grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
              marginBottom: '32px',
            }}>

              {/* Free card */}
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '18px', padding: '24px',
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                    Free Plan
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text)' }}>£0</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/month</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Get started for free
                  </p>
                </div>
                {FREE_FEATURES.map(f => <FeatureRow key={f.icon} {...f} />)}
                <div style={{
                  marginTop: '20px', padding: '10px 16px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)',
                  textAlign: 'center',
                }}>
                  Current plan
                </div>
              </div>

              {/* Explorer card */}
              <div style={{
                background: `linear-gradient(160deg, ${AMBER}0d, ${CORAL}0d)`,
                border: `1.5px solid ${AMBER}44`,
                borderRadius: '18px', padding: '24px',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Popular badge */}
                <div style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: `linear-gradient(135deg, ${AMBER}, ${CORAL})`,
                  borderRadius: '8px', padding: '3px 10px',
                  fontSize: '10px', fontWeight: '800', color: 'white',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  Best value
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: AMBER, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                    Explorer Plan ✦
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text)' }}>£2</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/month</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Everything, unlocked
                  </p>
                </div>
                {EXPLORER_FEATURES.map(f => <FeatureRow key={f.icon} {...f} />)}

                <button
                  onClick={handleSimulate}
                  disabled={loading}
                  style={{
                    marginTop: '20px', width: '100%',
                    padding: '12px 20px', borderRadius: '11px',
                    background: loading
                      ? 'rgba(255,255,255,0.10)'
                      : `linear-gradient(135deg, ${AMBER}, ${CORAL})`,
                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px', fontWeight: '800', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: loading ? 'none' : `0 4px 20px ${CORAL}55`,
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>
                        progress_activity
                      </span>
                      Processing…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>rocket_launch</span>
                      Simulate Purchase — £2/mo
                    </>
                  )}
                </button>
                <p style={{ fontSize: '10px', color: 'var(--text-faint)', textAlign: 'center', marginTop: '8px' }}>
                  Demo simulation · No real charge · Cancel anytime
                </p>
              </div>
            </div>

            {/* FAQ strip */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '20px 24px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px',
            }}>
              {[
                { q: 'Is this a real charge?',    a: "Not yet — this is a simulation. We'll integrate Stripe soon." },
                { q: 'How do I cancel?',          a: 'You can cancel anytime from this page once billing is live.' },
                { q: "What's the commission?",    a: '0% commission on all 1-to-1 sessions. Always.' },
                { q: 'Can tutors upgrade too?',   a: 'Yes! Tutors get the Battle Pass and forum access.' },
              ].map(({ q, a }) => (
                <div key={q}>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>{q}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </HubLayout>
  )
}
