import { useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { useTheme } from '../context/ThemeContext'

const CORAL  = '#ff725e'

// ── Mock browser shell ────────────────────────────────────────────────────────
function Browser({ children, animKey }) {
  const { dark } = useTheme()
  const BORDER = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  return (
    <div style={{ background: dark ? 'rgba(255,255,255,0.03)' : '#ffffff', border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: dark ? 'rgba(255,255,255,0.025)' : 'rgba(27,38,59,0.03)', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: '6px', alignItems: 'center' }}>
        {['#ef4444','#fbbf24','#22c55e'].map((c,i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.50 }} />
        ))}
        <div style={{ flex: 1, height: 20, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.04)', borderRadius: 6, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.22)' : 'rgba(27,38,59,0.35)' }}>studywithstudents.com</span>
        </div>
      </div>
      <div style={{ padding: '24px', minHeight: '320px' }} key={animKey}>
        <style>{`@keyframes stepIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ animation: 'stepIn 0.22s ease both' }}>{children}</div>
      </div>
    </div>
  )
}

// ── Step mockups ──────────────────────────────────────────────────────────────

// Account creation — 3-step flow
function MockSignup() {
  const { dark } = useTheme()
  const BORDER = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT    = dark ? 'white' : '#1b263b'
  const TEXT_D  = dark ? 'rgba(255,255,255,0.30)' : 'rgba(27,38,59,0.35)'
  const TEXT_25 = dark ? 'rgba(255,255,255,0.25)' : 'rgba(27,38,59,0.30)'
  const TEXT_38 = dark ? 'rgba(255,255,255,0.38)' : 'rgba(27,38,59,0.42)'
  const TEXT_40 = dark ? 'rgba(255,255,255,0.40)' : 'rgba(27,38,59,0.45)'
  const TEXT_28 = dark ? 'rgba(255,255,255,0.28)' : 'rgba(27,38,59,0.32)'
  const SURF    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,38,59,0.04)'
  const [step, setStep] = useState(0)
  const steps = [
    { label: 'Create Account', icon: 'person_add' },
    { label: 'Verify Email', icon: 'mark_email_read' },
    { label: 'Choose Your Side', icon: 'fork_right' },
  ]
  return (
    <div style={{ maxWidth: 300 }}>
      {/* Progress indicators */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: step === i ? CORAL : step > i ? `${CORAL}22` : SURF,
              fontSize: 9, fontWeight: 800, color: step === i ? 'white' : step > i ? CORAL : TEXT_D,
              letterSpacing: '0.03em', transition: 'all 0.2s',
            }}
          >
            {String(i + 1).padStart(2,'0')}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Create your free account</p>
          <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '11px 14px', fontSize: 13, color: TEXT_D }}>
            your@university.ac.uk
          </div>
          <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '11px 14px', fontSize: 13, color: TEXT_D }}>
            ••••••••••
          </div>
          <div onClick={() => setStep(1)} style={{ background: CORAL, borderRadius: 9, padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', marginTop: 4, boxShadow: `0 4px 14px ${CORAL}38`, cursor: 'pointer' }}>
            Create free account →
          </div>
          <p style={{ fontSize: 11, color: TEXT_25, textAlign: 'center', margin: 0 }}>No card required · Free forever</p>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 2px', letterSpacing: '-0.01em' }}>Check your inbox</p>
          <p style={{ fontSize: 12, color: TEXT_40, margin: 0, lineHeight: 1.5 }}>We sent a verification code to <span style={{ color: TEXT }}>your@uni.ac.uk</span></p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '4px 0' }}>
            {[2,8,5,1,4,7].map((d, i) => (
              <div key={i} style={{ width: 34, height: 40, background: i === 5 ? `${CORAL}20` : SURF, border: `1px solid ${i === 5 ? CORAL+'40' : BORDER}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: i === 5 ? CORAL : TEXT }}>
                {d}
              </div>
            ))}
          </div>
          <div onClick={() => setStep(2)} style={{ background: '#22c55e', borderRadius: 9, padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', boxShadow: '0 4px 14px rgba(34,197,94,0.3)', cursor: 'pointer' }}>
            Confirm email ✓
          </div>
          <p style={{ fontSize: 11, color: TEXT_25, textAlign: 'center', margin: 0 }}>Didn't get it? Resend →</p>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 16px', letterSpacing: '-0.01em' }}>Choose your side</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: "I'm a student", sub: "Find tutors, book sessions, study rooms", icon: 'school', color: CORAL },
              { label: "I'm a tutor", sub: "Earn 100% commission, manage students", icon: 'auto_stories', color: '#60a5fa' },
            ].map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', background: `${opt.color}08`, border: `1px solid ${opt.color}30`, borderRadius: 10, cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: opt.color }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: TEXT_38, marginTop: 1 }}>{opt.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: TEXT_28, margin: '12px 0 0', lineHeight: 1.5, textAlign: 'center' }}>You can switch at any time from your dashboard</p>
        </div>
      )}
    </div>
  )
}

function MockFindTutor() {
  const { dark } = useTheme()
  const BORDER = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT_28 = dark ? 'rgba(255,255,255,0.28)' : 'rgba(27,38,59,0.32)'
  const TEXT_26 = dark ? 'rgba(255,255,255,0.26)' : 'rgba(27,38,59,0.30)'
  const TEXT_36 = dark ? 'rgba(255,255,255,0.36)' : 'rgba(27,38,59,0.40)'
  const SURF    = dark ? 'rgba(255,255,255,0.05)' : 'rgba(27,38,59,0.04)'
  const SURF2   = dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.03)'
  const tutors = [
    { init: 'AV', name: 'Alex V.', uni: 'Oxford', sub: 'Maths', rate: '£18/hr', color: CORAL },
    { init: 'SK', name: 'Sara K.', uni: 'Imperial', sub: 'Physics', rate: '£22/hr', color: '#60a5fa' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: SURF, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '9px 12px', alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: TEXT_28 }}>search</span>
        <span style={{ fontSize: 12, color: TEXT_26 }}>A-Level Maths, Physics, Chemistry...</span>
      </div>
      {tutors.map(t => (
        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: t.color, flexShrink: 0 }}>{t.init}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: TEXT_36, marginTop: 2 }}>{t.uni} · {t.sub} · {t.rate}</div>
          </div>
          <div style={{ background: CORAL, color: 'white', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7 }}>Book</div>
        </div>
      ))}
    </div>
  )
}

function MockMessage() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const THEM_BG = dark ? 'rgba(255,255,255,0.07)' : 'rgba(27,38,59,0.06)'
  const THEM_C  = dark ? 'rgba(255,255,255,0.78)' : 'rgba(27,38,59,0.75)'
  const TEXT_22 = dark ? 'rgba(255,255,255,0.22)' : 'rgba(27,38,59,0.30)'
  const SURF    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.03)'
  const msgs = [
    { from: 'them', text: 'Hi! I need help with calculus 📚' },
    { from: 'me', text: 'Of course! What topics?' },
    { from: 'them', text: 'Integration by parts mainly' },
    { from: 'me', text: 'Saturday 3pm, £18/hr?' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{ background: m.from === 'me' ? CORAL : THEM_BG, color: m.from === 'me' ? 'white' : THEM_C, padding: '8px 12px', borderRadius: 10, fontSize: 12, maxWidth: '82%', lineHeight: 1.4 }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, background: SURF, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '8px 12px', alignItems: 'center' }}>
        <span style={{ flex: 1, fontSize: 12, color: TEXT_22 }}>Type a message...</span>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: CORAL }}>send</span>
      </div>
    </div>
  )
}

function MockBook() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT_28 = dark ? 'rgba(255,255,255,0.28)' : 'rgba(27,38,59,0.32)'
  const TEXT_42 = dark ? 'rgba(255,255,255,0.42)' : 'rgba(27,38,59,0.45)'
  const TEXT_38 = dark ? 'rgba(255,255,255,0.38)' : 'rgba(27,38,59,0.42)'
  const SURF    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.03)'
  const today = new Date().getDate()
  return (
    <div>
      <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 14px' }}>Book with Alex V.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 14 }}>
        {['M','T','W','T','F','S','S'].map((d,i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, color: TEXT_28, paddingBottom: 4 }}>{d}</div>)}
        {Array.from({length: 14}, (_,i) => i + today - 2).map((d, i) => {
          const sel = d === today + 2; const now = d === today
          return <div key={i} style={{ textAlign: 'center', fontSize: 11, padding: '5px 2px', borderRadius: 6, background: sel ? CORAL : now ? `${CORAL}20` : 'transparent', color: sel ? 'white' : now ? CORAL : TEXT_42, fontWeight: sel || now ? 700 : 400 }}>{d > 0 && d <= 31 ? d : ''}</div>
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['3:00 PM', '4:00 PM', '5:00 PM'].map((t, i) => (
          <div key={t} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '7px', borderRadius: 7, background: i === 0 ? `${CORAL}20` : SURF, border: `1px solid ${i === 0 ? CORAL+'40' : BORDER}`, color: i === 0 ? CORAL : TEXT_38 }}>{t}</div>
        ))}
      </div>
      <div style={{ background: CORAL, borderRadius: 9, padding: '10px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', boxShadow: `0 4px 14px ${CORAL}30` }}>
        Send booking request →
      </div>
    </div>
  )
}

function MockPay() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT    = dark ? 'white' : '#1b263b'
  const TEXT_36 = dark ? 'rgba(255,255,255,0.36)' : 'rgba(27,38,59,0.40)'
  const TEXT_46 = dark ? 'rgba(255,255,255,0.46)' : 'rgba(27,38,59,0.50)'
  const SURF    = dark ? 'rgba(255,255,255,0.03)' : 'rgba(27,38,59,0.03)'
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#22c55e18', border: '1px solid #22c55e35', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#22c55e' }}>check_circle</span>
        </div>
        <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>Session confirmed</p>
        <p style={{ fontSize: 12, color: TEXT_36, margin: 0 }}>Maths with Alex V. · Saturday 3 PM</p>
      </div>
      <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'Session rate', val: '£18.00', color: TEXT },
          { label: 'Platform fee', val: '£0.00 ✓', color: '#22c55e' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: TEXT_46 }}>{r.label}</span>
            <span style={{ fontWeight: 700, color: r.color }}>{r.val}</span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800 }}>
          <span>Total to tutor</span><span style={{ color: CORAL }}>£18.00</span>
        </div>
      </div>
    </div>
  )
}

function MockDashboard() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT    = dark ? 'white' : '#1b263b'
  const TEXT_85 = dark ? 'rgba(255,255,255,0.85)' : 'rgba(27,38,59,0.88)'
  const TEXT_38 = dark ? 'rgba(255,255,255,0.38)' : 'rgba(27,38,59,0.42)'
  const TEXT_40 = dark ? 'rgba(255,255,255,0.40)' : 'rgba(27,38,59,0.45)'
  const TEXT_30 = dark ? 'rgba(255,255,255,0.30)' : 'rgba(27,38,59,0.35)'
  const TEXT_35 = dark ? 'rgba(255,255,255,0.35)' : 'rgba(27,38,59,0.40)'
  const TEXT_45 = dark ? 'rgba(255,255,255,0.45)' : 'rgba(27,38,59,0.50)'
  const SURF    = dark ? 'rgba(255,255,255,0.03)' : 'rgba(27,38,59,0.03)'
  const today = new Date().getDate()
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: 14, margin: '0 0 14px', color: TEXT_85 }}>Your Dashboard</p>
      {/* Upcoming session */}
      <div style={{ background: `${CORAL}10`, border: `1px solid ${CORAL}25`, borderRadius: 10, padding: '11px 13px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: CORAL }}>event</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Maths with Alex V.</div>
          <div style={{ fontSize: 10, color: TEXT_38, marginTop: 1 }}>Today · 3:00 PM · £18</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, background: '#22c55e20', color: '#22c55e', padding: '2px 6px', borderRadius: 5 }}>TODAY</span>
      </div>
      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
        {[
          { n: '4', l: 'sessions', icon: 'school' },
          { n: '2', l: 'active tutors', icon: 'groups' },
          { n: '120', l: 'XP earned', icon: 'emoji_events', coral: true },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', background: SURF, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: s.coral ? CORAL : TEXT_40, display: 'block', marginBottom: 3 }}>{s.icon}</span>
            <div style={{ fontWeight: 900, fontSize: 16, color: s.coral ? CORAL : TEXT }}>{s.n}</div>
            <div style={{ fontSize: 9, color: TEXT_30, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* Unread message */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px', background: SURF, border: `1px solid ${BORDER}`, borderRadius: 9 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: TEXT_35 }}>chat</span>
        <span style={{ fontSize: 12, color: TEXT_45 }}>Alex V.: "See you Saturday!"</span>
        <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: CORAL }} />
      </div>
    </div>
  )
}

// ── Tutor mockups ─────────────────────────────────────────────────────────────
function MockVerify() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT_36 = dark ? 'rgba(255,255,255,0.36)' : 'rgba(27,38,59,0.40)'
  const TEXT_28 = dark ? 'rgba(255,255,255,0.28)' : 'rgba(27,38,59,0.32)'
  const SURF    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.03)'
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 18px' }}>Verify your university</p>
      <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: CORAL }}>school</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>University College London</div>
            <div style={{ fontSize: 11, color: TEXT_36, marginTop: 2 }}>k.boro@ucl.ac.uk</div>
          </div>
        </div>
      </div>
      <div style={{ background: `${CORAL}10`, border: `1px solid ${CORAL}25`, borderRadius: 9, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: CORAL }}>verified</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: CORAL }}>University confirmed</span>
      </div>
      <p style={{ fontSize: 12, color: TEXT_28, margin: 0, lineHeight: 1.6 }}>
        We only accept .ac.uk university emails. Every tutor you see on the platform is verified.
      </p>
    </div>
  )
}

function MockBuildProfile() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT_36 = dark ? 'rgba(255,255,255,0.36)' : 'rgba(27,38,59,0.40)'
  const TEXT_38 = dark ? 'rgba(255,255,255,0.38)' : 'rgba(27,38,59,0.42)'
  const SURF    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,38,59,0.04)'
  const SURF2   = dark ? 'rgba(255,255,255,0.05)' : 'rgba(27,38,59,0.04)'
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 14px' }}>Your tutor profile</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: TEXT_36, marginBottom: 6 }}>Subjects</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['A-Level Maths','Further Maths','Statistics'].map(s => (
              <span key={s} style={{ fontSize: 11, fontWeight: 700, background: `${CORAL}18`, color: CORAL, padding: '3px 10px', borderRadius: 6 }}>{s} ×</span>
            ))}
            <span style={{ fontSize: 11, fontWeight: 700, background: SURF2, color: TEXT_38, padding: '3px 10px', borderRadius: 6 }}>+ Add</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: TEXT_36, marginBottom: 6 }}>Rate</div>
            <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, fontWeight: 700 }}>£18 /hr</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: TEXT_36, marginBottom: 6 }}>Level</div>
            <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, fontWeight: 700 }}>A-level +</div>
          </div>
        </div>
        <div style={{ background: CORAL, borderRadius: 9, padding: '10px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', boxShadow: `0 4px 14px ${CORAL}30` }}>
          Save & go live →
        </div>
      </div>
    </div>
  )
}

function MockGoLive() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT_38 = dark ? 'rgba(255,255,255,0.38)' : 'rgba(27,38,59,0.42)'
  const TEXT_36 = dark ? 'rgba(255,255,255,0.36)' : 'rgba(27,38,59,0.40)'
  const TEXT_32 = dark ? 'rgba(255,255,255,0.32)' : 'rgba(27,38,59,0.36)'
  const SURF    = dark ? 'rgba(255,255,255,0.03)' : 'rgba(27,38,59,0.03)'
  return (
    <div>
      <div style={{ background: `${CORAL}08`, border: `1px solid ${CORAL}20`, borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: CORAL }}>notifications</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Your profile is live!</div>
          <div style={{ fontSize: 11, color: TEXT_38, marginTop: 1 }}>Students can find and book you now</div>
        </div>
      </div>
      <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${CORAL}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: CORAL, flexShrink: 0 }}>KB</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Kiki B.</div>
          <div style={{ fontSize: 11, color: TEXT_36, marginTop: 1 }}>UCL · Maths · £18/hr</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            {['A-Level Maths','Further Maths'].map(s => (
              <span key={s} style={{ fontSize: 9, fontWeight: 700, background: `${CORAL}14`, color: CORAL, padding: '2px 7px', borderRadius: 5 }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[{ n: '12', l: 'views today' }, { n: '3', l: 'messages' }].map(s => (
          <div key={s.l} style={{ flex: 1, textAlign: 'center', background: SURF, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: CORAL }}>{s.n}</div>
            <div style={{ fontSize: 10, color: TEXT_32, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockAcceptBooking() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT_36 = dark ? 'rgba(255,255,255,0.36)' : 'rgba(27,38,59,0.40)'
  const TEXT_32 = dark ? 'rgba(255,255,255,0.32)' : 'rgba(27,38,59,0.36)'
  const TEXT_52 = dark ? 'rgba(255,255,255,0.52)' : 'rgba(27,38,59,0.55)'
  const TEXT_38 = dark ? 'rgba(255,255,255,0.38)' : 'rgba(27,38,59,0.42)'
  const SURF    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.03)'
  const SURF2   = dark ? 'rgba(255,255,255,0.05)' : 'rgba(27,38,59,0.04)'
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: CORAL }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: CORAL }}>New booking request</span>
      </div>
      <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(96,165,250,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#60a5fa' }}>JT</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>James T.</div>
            <div style={{ fontSize: 11, color: TEXT_36, marginTop: 1 }}>New student</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { icon: 'calendar_month', text: 'Saturday 15th · 3:00 PM' },
            { icon: 'subject', text: 'A-Level Maths' },
            { icon: 'payments', text: '£18.00 → you', coral: true },
          ].map(r => (
            <div key={r.text} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: TEXT_32 }}>{r.icon}</span>
              <span style={{ color: r.coral ? CORAL : TEXT_52, fontWeight: r.coral ? 700 : 400 }}>{r.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2, background: '#22c55e', borderRadius: 8, padding: '10px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>Accept ✓</div>
        <div style={{ flex: 1, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px', textAlign: 'center', fontSize: 13, color: TEXT_38, cursor: 'pointer' }}>Decline</div>
      </div>
    </div>
  )
}

function MockEarnings() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT_36 = dark ? 'rgba(255,255,255,0.36)' : 'rgba(27,38,59,0.40)'
  const TEXT_32 = dark ? 'rgba(255,255,255,0.32)' : 'rgba(27,38,59,0.36)'
  const SURF    = dark ? 'rgba(255,255,255,0.03)' : 'rgba(27,38,59,0.03)'
  return (
    <div>
      <p style={{ fontSize: 12, color: TEXT_36, margin: '0 0 4px' }}>This month</p>
      <div style={{ fontSize: 44, fontWeight: 900, color: CORAL, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6 }}>£240</div>
      <p style={{ fontSize: 12, color: TEXT_36, margin: '0 0 18px' }}>8 sessions · <span style={{ color: '#22c55e', fontWeight: 700 }}>0% platform fee</span></p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { date: 'Sat 8th', student: 'James T.', amt: '£18' },
          { date: 'Mon 10th', student: 'Priya R.', amt: '£18' },
          { date: 'Wed 12th', student: 'Tom H.', amt: '£18' },
        ].map(s => (
          <div key={s.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: SURF, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{s.student}</span>
              <span style={{ fontSize: 11, color: TEXT_32, marginLeft: 8 }}>{s.date}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: CORAL }}>{s.amt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockTutorDashboard() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT    = dark ? 'white' : '#1b263b'
  const TEXT_85 = dark ? 'rgba(255,255,255,0.85)' : 'rgba(27,38,59,0.88)'
  const TEXT_40 = dark ? 'rgba(255,255,255,0.40)' : 'rgba(27,38,59,0.45)'
  const TEXT_30 = dark ? 'rgba(255,255,255,0.30)' : 'rgba(27,38,59,0.35)'
  const TEXT_38 = dark ? 'rgba(255,255,255,0.38)' : 'rgba(27,38,59,0.42)'
  const SURF    = dark ? 'rgba(255,255,255,0.03)' : 'rgba(27,38,59,0.03)'
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: 14, margin: '0 0 14px', color: TEXT_85 }}>Tutor Dashboard</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12 }}>
        {[
          { n: '£240', l: 'this month', icon: 'account_balance_wallet', coral: true },
          { n: '8', l: 'sessions done', icon: 'school' },
          { n: '340', l: 'XP earned', icon: 'emoji_events', coral: true },
          { n: '5', l: 'active students', icon: 'groups' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', background: SURF, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: s.coral ? CORAL : TEXT_40, display: 'block', marginBottom: 4 }}>{s.icon}</span>
            <div style={{ fontWeight: 900, fontSize: 16, color: s.coral ? CORAL : TEXT }}>{s.n}</div>
            <div style={{ fontSize: 9, color: TEXT_30, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: `${CORAL}08`, border: `1px solid ${CORAL}22`, borderRadius: 9, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: CORAL }}>workspace_premium</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Explorer Badge unlocked!</div>
          <div style={{ fontSize: 10, color: TEXT_38, marginTop: 1 }}>XP Level 3 — visible on your profile</div>
        </div>
      </div>
    </div>
  )
}

// ── Step data ─────────────────────────────────────────────────────────────────
const STUDENT_STEPS = [
  { n:'01', icon:'person_add',     title:'Create an account',  desc:'Email only — 3 steps: sign up, verify email, choose your side.', mock: <MockSignup />    },
  { n:'02', icon:'search',         title:'Find your tutor',    desc:'Filter by subject, university, and rate.',                          mock: <MockFindTutor /> },
  { n:'03', icon:'chat',           title:'Message first',      desc:'Agree rate and timing before booking.',                            mock: <MockMessage />   },
  { n:'04', icon:'calendar_month', title:'Book a session',     desc:'Pick a time. Tutor confirms.',                                     mock: <MockBook />      },
  { n:'05', icon:'payments',       title:'Pay directly',       desc:'0% fee. Full amount goes to your tutor.',                          mock: <MockPay />       },
  { n:'06', icon:'dashboard',      title:'Your dashboard',     desc:'Track sessions, messages, upcoming bookings and your XP.',         mock: <MockDashboard /> },
]

const TUTOR_STEPS = [
  { n:'01', icon:'school',                  title:'Sign up & verify',   desc:'Confirm your .ac.uk email. 1 minute.',                    mock: <MockVerify />        },
  { n:'02', icon:'edit_note',               title:'Build your profile',  desc:'Subjects, rate, availability. 5 minutes.',               mock: <MockBuildProfile /> },
  { n:'03', icon:'explore',                 title:'Go live',             desc:'Instantly visible to all students.',                     mock: <MockGoLive />        },
  { n:'04', icon:'event',                   title:'Accept bookings',     desc:'Manage requests from your tutor hub.',                   mock: <MockAcceptBooking /> },
  { n:'05', icon:'account_balance_wallet',  title:'Get paid 100%',       desc:'Every pound goes to you. Always.',                      mock: <MockEarnings />      },
  { n:'06', icon:'dashboard',               title:'Your dashboard',      desc:'Track earnings, students, XP and promotional badges.',   mock: <MockTutorDashboard /> },
]

// ── XP Levelling section ──────────────────────────────────────────────────────
const STUDENT_XP = [
  { level: 1, xp: '0–99 XP',   reward: 'Platform access',             icon: 'lock_open',         color: 'rgba(255,255,255,0.5)' },
  { level: 2, xp: '100–299 XP', reward: 'Free classroom session',      icon: 'cast_for_education', color: CORAL                   },
  { level: 3, xp: '300–599 XP', reward: 'Free Explorer month',         icon: 'star',               color: '#fbbf24'               },
  { level: 4, xp: '600+ XP',    reward: 'Pioneer badge + early access', icon: 'workspace_premium',  color: '#60a5fa'               },
]

const TUTOR_XP = [
  { level: 1, xp: '0–149 XP',   reward: 'Active tutor',               icon: 'school',             color: 'rgba(255,255,255,0.5)' },
  { level: 2, xp: '150–399 XP', reward: '"Rising Star" badge',         icon: 'trending_up',        color: CORAL                   },
  { level: 3, xp: '400–799 XP', reward: 'Promoted in search results',  icon: 'campaign',           color: '#fbbf24'               },
  { level: 4, xp: '800+ XP',    reward: '"Expert Tutor" featured badge', icon: 'workspace_premium', color: '#60a5fa'               },
]

// ── XP Bar ───────────────────────────────────────────────────────────────────
const XP_DATA = {
  student: {
    icon: 'school', label: 'Student XP', max: 600,
    milestones: [
      { xp: 0,   pct: 0,    reward: 'Platform access',        icon: 'lock_open',          color: 'rgba(255,255,255,0.55)' },
      { xp: 100, pct: 0.22, reward: 'Free classroom session', icon: 'cast_for_education', color: CORAL },
      { xp: 300, pct: 0.58, reward: 'Free Explorer month',    icon: 'star',               color: '#fbbf24' },
      { xp: 600, pct: 1.0,  reward: 'Pioneer badge',          icon: 'workspace_premium',  color: '#60a5fa' },
    ],
  },
  tutor: {
    icon: 'auto_stories', label: 'Tutor XP', max: 800,
    milestones: [
      { xp: 0,   pct: 0,    reward: 'Active tutor',              icon: 'school',             color: 'rgba(255,255,255,0.55)' },
      { xp: 150, pct: 0.22, reward: '"Rising Star" badge',       icon: 'trending_up',        color: CORAL },
      { xp: 400, pct: 0.56, reward: 'Promoted in search',        icon: 'campaign',           color: '#fbbf24' },
      { xp: 800, pct: 1.0,  reward: '"Expert Tutor" badge',      icon: 'workspace_premium',  color: '#60a5fa' },
    ],
  },
}

function XPBar() {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT_35 = dark ? 'rgba(255,255,255,0.35)' : 'rgba(27,38,59,0.40)'
  const TEXT_45 = dark ? 'rgba(255,255,255,0.45)' : 'rgba(27,38,59,0.50)'
  const BTN_OFF = dark ? 'rgba(255,255,255,0.45)' : 'rgba(27,38,59,0.48)'
  const SURF    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.05)'
  const DIM_DOT = dark ? 'rgba(255,255,255,0.15)' : 'rgba(27,38,59,0.18)'
  const DIM_DOT_B = dark ? 'rgba(255,255,255,0.12)' : 'rgba(27,38,59,0.15)'
  const LOCK_BG = dark ? 'rgba(255,255,255,0.025)' : 'rgba(27,38,59,0.03)'
  const LOCK_C  = dark ? 'rgba(255,255,255,0.35)' : 'rgba(27,38,59,0.40)'

  const [roleXP, setRoleXP] = useState('student')
  const [progress, setProgress] = useState(0.38)
  const [dragging, setDragging] = useState(false)
  const barRef = useRef(null)

  const data = XP_DATA[roleXP]

  const updateProgress = (clientX) => {
    if (!barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    setProgress(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
  }

  const onMouseMove = (e) => { if (dragging) updateProgress(e.clientX) }
  const onMouseUp   = () => setDragging(false)

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging])

  const currentXP = Math.round(progress * data.max)
  const activeMs  = data.milestones.filter(m => progress >= m.pct)
  const active    = activeMs[activeMs.length - 1] || data.milestones[0]

  return (
    <div>
      {/* Role toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
        <div style={{ display: 'inline-flex', background: SURF, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 3, gap: 3 }}>
          {Object.entries(XP_DATA).map(([key, d]) => (
            <button key={key} onClick={() => { setRoleXP(key); setProgress(0.38) }} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13, transition: 'all 0.18s',
              background: roleXP === key ? CORAL : 'transparent',
              color: roleXP === key ? 'white' : BTN_OFF,
              boxShadow: roleXP === key ? `0 3px 12px ${CORAL}35` : 'none',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{d.icon}</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bar track */}
      <div
        ref={barRef}
        onMouseDown={(e) => { setDragging(true); updateProgress(e.clientX) }}
        onMouseMove={(e) => { if (!dragging) updateProgress(e.clientX) }}
        style={{ position: 'relative', height: 12, borderRadius: 999, background: BORDER, cursor: 'grab', userSelect: 'none', marginBottom: 8 }}
      >
        {/* Fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${progress * 100}%`,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${CORAL}80, ${active.color})`,
          transition: dragging ? 'none' : 'width 0.1s',
          boxShadow: `0 0 12px ${active.color}55`,
        }} />

        {/* Milestone markers */}
        {data.milestones.map((m) => {
          const unlocked = progress >= m.pct
          return (
            <div key={m.xp} style={{
              position: 'absolute', top: '50%',
              left: `${m.pct * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: unlocked ? 16 : 12,
              height: unlocked ? 16 : 12,
              borderRadius: '50%',
              background: unlocked ? m.color : DIM_DOT,
              border: `2px solid ${unlocked ? m.color : DIM_DOT_B}`,
              boxShadow: unlocked ? `0 0 10px ${m.color}70` : 'none',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              zIndex: 2,
            }} />
          )
        })}

        {/* Scrubber handle */}
        <div style={{
          position: 'absolute', top: '50%',
          left: `${progress * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: 22, height: 22, borderRadius: '50%',
          background: dark ? 'white' : '#1b263b',
          boxShadow: `0 2px 10px rgba(0,0,0,0.35), 0 0 0 3px ${active.color}60`,
          transition: dragging ? 'none' : 'left 0.1s',
          zIndex: 3, cursor: 'grab',
        }} />
      </div>

      {/* XP label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 36 }}>
        <span style={{ fontSize: 11, color: TEXT_35, fontWeight: 600 }}>0 XP</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: active.color }}>
          {currentXP} XP — {active.reward}
        </span>
        <span style={{ fontSize: 11, color: TEXT_35, fontWeight: 600 }}>{data.max} XP</span>
      </div>

      {/* Milestone cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {data.milestones.map((m) => {
          const unlocked = progress >= m.pct
          return (
            <div key={m.xp} style={{
              padding: '16px 14px', borderRadius: 12,
              background: unlocked ? `${m.color}0c` : LOCK_BG,
              border: `1px solid ${unlocked ? m.color + '30' : BORDER}`,
              opacity: unlocked ? 1 : 0.4,
              transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              transform: unlocked ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.97)',
              textAlign: 'center',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `${m.color}18`, border: `1px solid ${m.color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px',
                boxShadow: unlocked ? `0 0 12px ${m.color}40` : 'none',
                transition: 'box-shadow 0.3s',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: m.color }}>{m.icon}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, lineHeight: 1.3 }}>{m.reward}</div>
              <div style={{ fontSize: 10, color: LOCK_C }}>{m.xp} XP</div>
              {unlocked && (
                <div style={{ marginTop: 8, fontSize: 9, fontWeight: 800, color: m.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Unlocked ✓
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ = [
  { q: 'Is it really free?',                a: 'Yes. Finding tutors, messaging, and booking sessions are completely free. You only pay for sessions you book (directly to your tutor) and optionally £2/month for community features.' },
  { q: 'How are tutors verified?',          a: 'Every tutor confirms a .ac.uk university email. UK universities only. You always see which university a tutor attends.' },
  { q: 'How do payments work?',             a: 'Payments go through Stripe — secure, instant, and direct. Students pay tutors directly. We take 0%. Tutors connect a Stripe payout account once to receive funds automatically.' },
  { q: 'Can I be both student and tutor?',  a: 'Yes. Switch between your student view and tutor hub from the sidebar at any time.' },
  { q: 'What is XP?',                       a: 'XP is earned by tutors for delivering sessions and students for engaging with the platform. Higher XP means better search visibility for tutors, free rewards for students, and special badges for standout contributors.' },
]

function FAQItem({ item }) {
  const { dark } = useTheme()
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT    = dark ? 'white' : '#1b263b'
  const TEXT_MUT = dark ? 'rgba(255,255,255,0.50)' : 'rgba(27,38,59,0.52)'
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', color: TEXT, cursor: 'pointer', padding: '18px 0', textAlign: 'left', gap: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{item.q}</span>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: CORAL, flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>
      </button>
      {open && (
        <p style={{ color: TEXT_MUT, fontSize: 13, lineHeight: 1.75, margin: '0 0 18px', maxWidth: 560 }}>
          {item.a}
        </p>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HowItWorks() {
  const { dark } = useTheme()
  const BG      = dark ? '#1b263b' : '#f4f6fb'
  const BORDER  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,38,59,0.10)'
  const TEXT    = dark ? 'white' : '#1b263b'
  const TEXT_MUT  = dark ? 'rgba(255,255,255,0.52)' : 'rgba(27,38,59,0.55)'
  const TEXT_DIM  = dark ? 'rgba(255,255,255,0.42)' : 'rgba(27,38,59,0.45)'
  const TEXT_FAINT = dark ? 'rgba(255,255,255,0.40)' : 'rgba(27,38,59,0.44)'
  const TEXT_38 = dark ? 'rgba(255,255,255,0.38)' : 'rgba(27,38,59,0.42)'
  const TEXT_35 = dark ? 'rgba(255,255,255,0.35)' : 'rgba(27,38,59,0.40)'
  const TEXT_32 = dark ? 'rgba(255,255,255,0.32)' : 'rgba(27,38,59,0.36)'
  const TEXT_60 = dark ? 'rgba(255,255,255,0.60)' : 'rgba(27,38,59,0.65)'
  const TEXT_72 = dark ? 'rgba(255,255,255,0.72)' : 'rgba(27,38,59,0.75)'
  const SURF    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,38,59,0.04)'
  const SURF2   = dark ? 'rgba(255,255,255,0.02)' : 'rgba(27,38,59,0.02)'
  const SURF_HOVER = dark ? 'rgba(255,255,255,0.09)' : 'rgba(27,38,59,0.07)'
  const rgb     = dark ? '255,255,255' : '27,38,59'

  const [role, setRole] = useState('student')
  const [active, setActive] = useState(0)

  const steps = role === 'student' ? STUDENT_STEPS : TUTOR_STEPS

  const switchRole = (r) => { setRole(r); setActive(0) }

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT, fontFamily: 'inherit' }}>
      <Navbar />

      {/* ── HEADER + TOGGLE ─────────────────────────────────────────────── */}
      <div style={{ padding: '80px 24px 72px', textAlign: 'center', borderBottom: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
        {/* Grid */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(rgba(${rgb},0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(${rgb},0.025) 1px, transparent 1px)`, backgroundSize: '56px 56px', WebkitMaskImage: 'radial-gradient(ellipse 80% 100% at 50% 50%, black 30%, transparent 100%)', maskImage: 'radial-gradient(ellipse 80% 100% at 50% 50%, black 30%, transparent 100%)' }} />

        <div style={{ position: 'relative', zIndex: 3 }}>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: '900', margin: '0 0 32px', letterSpacing: '-0.03em', lineHeight: 1.05, color: TEXT }}>
            How it works
          </h1>

          <div style={{ display: 'inline-flex', background: SURF, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 4, gap: 4 }}>
            {[
              { key: 'student', label: "I'm a student" },
              { key: 'tutor',   label: "I'm a tutor"   },
            ].map(r => (
              <button key={r.key} onClick={() => switchRole(r.key)} style={{
                padding: '11px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 15, transition: 'all 0.2s',
                background: role === r.key ? CORAL : 'transparent',
                color: role === r.key ? 'white' : TEXT_DIM,
                boxShadow: role === r.key ? `0 4px 16px ${CORAL}38` : 'none',
              }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE DEMO ────────────────────────────────────────────── */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '100px 24px 100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '48px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {steps.map((step, i) => (
              <button
                key={`${role}-${step.n}`}
                onClick={() => setActive(i)}
                style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '14px 16px', borderRadius: 12,
                  background: active === i ? `${CORAL}10` : 'transparent',
                  border: `1px solid ${active === i ? CORAL + '28' : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: active === i ? CORAL : step.n === '06' ? `${CORAL}18` : SURF,
                  border: step.n === '06' && active !== i ? `1px solid ${CORAL}30` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: active === i ? 'white' : step.n === '06' ? CORAL : TEXT_32,
                  transition: 'all 0.18s',
                }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: active === i ? TEXT : step.n === '06' ? TEXT_72 : TEXT_60, marginBottom: 3, transition: 'color 0.18s' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_32, lineHeight: 1.4 }}>
                    {step.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ position: 'sticky', top: '24px' }}>
            <Browser animKey={`${role}-${active}`}>
              {steps[active].mock}
            </Browser>
          </div>
        </div>
      </div>

      {/* ── HOW PAYMENTS WORK — Stripe ──────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '0 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', padding: '52px 0', alignItems: 'center' }}>
          {/* Left — Stripe branding */}
          <div data-reveal>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99,91,255,0.12)', border: '1px solid rgba(99,91,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
                  <path d="M14.3 12.5c0-.8.7-1.1 1.8-1.1 1.6 0 3.6.5 5.2 1.4V8.4C19.6 7.5 17.8 7 16 7c-4 0-6.6 2-6.6 5.3 0 5.2 7.2 4.4 7.2 6.6 0 .9-.8 1.2-2 1.2-1.7 0-3.9-.7-5.7-1.7v4.5c1.9.8 3.9 1.2 5.7 1.2 4.1 0 6.9-2 6.9-5.4-.1-5.6-7.2-4.6-7.2-6.2z" fill="white" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '2px', color: TEXT }}>Stripe</div>
                <div style={{ fontSize: '12px', color: TEXT_38 }}>Payment infrastructure</div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: TEXT_MUT, lineHeight: 1.75, margin: '0 0 16px' }}>
              All payments are powered by Stripe — the same infrastructure trusted by Amazon, Shopify, and millions of businesses worldwide.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99,91,255,0.08)', border: '1px solid rgba(99,91,255,0.20)', borderRadius: '8px', padding: '5px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#a5b4fc' }}>verified</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#a5b4fc' }}>PCI-DSS Level 1 Certified</span>
            </div>
          </div>
          {/* Right — key points */}
          <div data-reveal data-d="1" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: 'send_money', label: '100% direct to tutor',      sub: 'Platform takes zero — every pound you pay goes to your tutor' },
              { icon: 'lock',       label: 'Bank-level encryption',      sub: "End-to-end encrypted via Stripe's secure checkout" },
              { icon: 'bolt',       label: 'Instant, automatic payouts', sub: 'Tutors receive funds directly to their Stripe account' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', background: SURF2, border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: CORAL, marginTop: '1px', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '3px', color: TEXT }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: TEXT_FAINT, lineHeight: 1.5 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── EXPLORER PLAN UPGRADE ───────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '0 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', padding: '52px 0', alignItems: 'center' }}>
          {/* Left — explain */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: 12 }}>
              Explorer Plan · £2/month
            </p>
            <h2 style={{ fontSize: 'clamp(20px, 2.8vw, 28px)', fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.15, color: TEXT }}>
              Upgrade at any time.<br />Cancel whenever you want.
            </h2>
            <p style={{ fontSize: 14, color: TEXT_MUT, lineHeight: 1.75, margin: '0 0 20px' }}>
              The core tutoring experience — finding tutors, booking sessions, messaging — is always free. The Explorer Plan unlocks community features like Study Rooms, the Forum, Live Classrooms, and Study Notes.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['No lock-in', 'Cancel anytime', '£2 flat · no surprises'].map(tag => (
                <span key={tag} style={{ fontSize: 11, fontWeight: 700, background: `${CORAL}10`, color: CORAL, border: `1px solid ${CORAL}28`, padding: '4px 12px', borderRadius: 20 }}>{tag}</span>
              ))}
            </div>
          </div>
          {/* Right — what you unlock */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_35, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Unlocked with Explorer</p>
            {[
              { icon: 'groups',            label: 'Live Study Rooms',  sub: 'Drop into open peer sessions' },
              { icon: 'forum',             label: 'Community Forum',   sub: 'Ask, help, learn with peers' },
              { icon: 'cast_for_education',label: 'Live Classrooms',   sub: 'Group lessons, fraction of the cost' },
              { icon: 'auto_stories',      label: 'Study Notes',       sub: 'Share & discover revision notes' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: `${CORAL}06`, border: `1px solid ${CORAL}18`, borderRadius: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: CORAL, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: TEXT_38, marginTop: 2 }}>{item.sub}</div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: `${CORAL}60` }}>lock_open</span>
              </div>
            ))}
            <Link to="/signup" style={{ display: 'block', textAlign: 'center', marginTop: 4, padding: '12px', borderRadius: 10, background: CORAL, color: 'white', fontWeight: 700, fontSize: 13, textDecoration: 'none', boxShadow: `0 4px 16px ${CORAL}35`, transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Upgrade to Explorer · £2/month</Link>
          </div>
        </div>
      </div>

      {/* ── XP LEVELLING ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '120px 24px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: 14, textAlign: 'center' }}>XP System</p>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', textAlign: 'center', color: TEXT }}>
          The more you do, the more you unlock
        </h2>
        <p style={{ textAlign: 'center', color: TEXT_DIM, fontSize: 14, margin: '0 0 8px' }}>
          Every session, note shared, and review earns XP. Tutors climb the rankings. Students unlock perks.
        </p>
        <p style={{ textAlign: 'center', color: TEXT_35, fontSize: 12, margin: '0 0 40px' }}>
          Drag the bar to explore milestones.
        </p>
        <XPBar />
      </div>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '120px 24px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: 14 }}>Questions</p>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, margin: '0 0 40px', letterSpacing: '-0.02em', color: TEXT }}>Frequently asked questions (FAQ)</h2>
        {FAQ.map((item, i) => <FAQItem key={i} item={item} />)}

        <div style={{ marginTop: 64, padding: '40px', background: `${CORAL}07`, border: `1px solid ${CORAL}18`, borderRadius: 16, textAlign: 'center' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.01em', color: TEXT }}>Ready to get started?</h3>
          <p style={{ color: TEXT_DIM, fontSize: 14, margin: '0 0 24px' }}>Free account. No card required.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ background: CORAL, color: 'white', padding: '11px 24px', borderRadius: 9, fontWeight: 700, fontSize: 13, textDecoration: 'none', boxShadow: `0 4px 14px ${CORAL}30` }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Create your account</Link>
            <Link to="/find-tutors" style={{ background: SURF, border: `1px solid ${BORDER}`, color: TEXT_MUT, padding: '11px 24px', borderRadius: 9, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = SURF_HOVER}
              onMouseLeave={e => e.currentTarget.style.background = SURF}
            >Browse tutors</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
