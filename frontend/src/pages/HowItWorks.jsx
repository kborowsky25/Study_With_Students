import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const BG     = '#1b263b'
const CORAL  = '#ff725e'
const BORDER = 'rgba(255,255,255,0.08)'

// ── Mock browser shell ────────────────────────────────────────────────────────
function Browser({ children, animKey }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${BORDER}`,
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* Chrome bar */}
      <div style={{
        padding: '10px 16px', background: 'rgba(255,255,255,0.025)',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', gap: '6px', alignItems: 'center',
      }}>
        {['#ef4444','#fbbf24','#22c55e'].map((c,i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.50 }} />
        ))}
        <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>studywithstudents.com</span>
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: '24px', minHeight: '320px' }} key={animKey}>
        <style>{`@keyframes stepIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ animation: 'stepIn 0.22s ease both' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Step mockups ──────────────────────────────────────────────────────────────
function MockSignup() {
  return (
    <div style={{ maxWidth: 300 }}>
      <p style={{ fontWeight: 800, fontSize: 16, margin: '0 0 20px', letterSpacing: '-0.01em' }}>Create your free account</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '11px 14px', fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>
          your@university.ac.uk
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '11px 14px', fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>
          ••••••••••
        </div>
        <div style={{ background: CORAL, borderRadius: 9, padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', marginTop: 4, boxShadow: `0 4px 14px ${CORAL}38` }}>
          Create free account →
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>No card required · Free forever</p>
      </div>
    </div>
  )
}

function MockFindTutor() {
  const tutors = [
    { init: 'AV', name: 'Alex V.', uni: 'Oxford', sub: 'Maths', rate: '£18/hr', color: CORAL },
    { init: 'SK', name: 'Sara K.', uni: 'Imperial', sub: 'Physics', rate: '£22/hr', color: '#60a5fa' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '9px 12px', alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)' }}>search</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.26)' }}>A-Level Maths, Physics, Chemistry...</span>
      </div>
      {tutors.map(t => (
        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: t.color, flexShrink: 0 }}>{t.init}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 2 }}>{t.uni} · {t.sub} · {t.rate}</div>
          </div>
          <div style={{ background: CORAL, color: 'white', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7 }}>Book</div>
        </div>
      ))}
    </div>
  )
}

function MockMessage() {
  const msgs = [
    { from: 'them', text: 'Hi! I need help with calculus 📚' },
    { from: 'me',   text: 'Of course! What topics?' },
    { from: 'them', text: 'Integration by parts mainly' },
    { from: 'me',   text: 'Saturday 3pm, £18/hr?' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: m.from === 'me' ? CORAL : 'rgba(255,255,255,0.07)',
              color: m.from === 'me' ? 'white' : 'rgba(255,255,255,0.78)',
              padding: '8px 12px', borderRadius: 10, fontSize: 12, maxWidth: '82%', lineHeight: 1.4,
            }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '8px 12px', alignItems: 'center' }}>
        <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>Type a message...</span>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: CORAL }}>send</span>
      </div>
    </div>
  )
}

function MockBook() {
  const today = new Date().getDate()
  return (
    <div>
      <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 14px' }}>Book with Alex V.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 14 }}>
        {['M','T','W','T','F','S','S'].map((d,i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.28)', paddingBottom: 4 }}>{d}</div>)}
        {Array.from({length: 14}, (_,i) => i + today - 2).map((d, i) => {
          const sel = d === today + 2
          const now = d === today
          return <div key={i} style={{ textAlign: 'center', fontSize: 11, padding: '5px 2px', borderRadius: 6, background: sel ? CORAL : now ? `${CORAL}20` : 'transparent', color: sel ? 'white' : now ? CORAL : 'rgba(255,255,255,0.42)', fontWeight: sel || now ? 700 : 400, cursor: 'pointer' }}>{d > 0 && d <= 31 ? d : ''}</div>
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['3:00 PM', '4:00 PM', '5:00 PM'].map((t, i) => (
          <div key={t} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '7px', borderRadius: 7, background: i === 0 ? `${CORAL}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? CORAL+'40' : BORDER}`, color: i === 0 ? CORAL : 'rgba(255,255,255,0.38)', cursor: 'pointer' }}>{t}</div>
        ))}
      </div>
      <div style={{ background: CORAL, borderRadius: 9, padding: '10px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', boxShadow: `0 4px 14px ${CORAL}30` }}>
        Send booking request →
      </div>
    </div>
  )
}

function MockPay() {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#22c55e18', border: '1px solid #22c55e35', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#22c55e' }}>check_circle</span>
        </div>
        <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>Session confirmed</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', margin: 0 }}>Maths with Alex V. · Saturday 3 PM</p>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'Session rate',   val: '£18.00', color: 'white' },
          { label: 'Platform fee',   val: '£0.00 ✓', color: '#22c55e' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'rgba(255,255,255,0.46)' }}>{r.label}</span>
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

// ── Tutor mockups ─────────────────────────────────────────────────────────────
function MockVerify() {
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 18px' }}>Verify your university</p>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: CORAL }}>school</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>University College London</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 2 }}>k.boro@ucl.ac.uk</div>
          </div>
        </div>
      </div>
      <div style={{ background: `${CORAL}10`, border: `1px solid ${CORAL}25`, borderRadius: 9, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: CORAL }}>verified</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: CORAL }}>University confirmed</span>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', margin: 0, lineHeight: 1.6 }}>
        We only accept .ac.uk university emails. Every tutor you see on the platform is verified.
      </p>
    </div>
  )
}

function MockBuildProfile() {
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 14px' }}>Your tutor profile</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 6 }}>Subjects</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['A-Level Maths','Further Maths','Statistics'].map(s => (
              <span key={s} style={{ fontSize: 11, fontWeight: 700, background: `${CORAL}18`, color: CORAL, padding: '3px 10px', borderRadius: 6 }}>{s} ×</span>
            ))}
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.38)', padding: '3px 10px', borderRadius: 6 }}>+ Add</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 6 }}>Rate</div>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, fontWeight: 700 }}>£18 /hr</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 6 }}>Level</div>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, fontWeight: 700 }}>A-level +</div>
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
  return (
    <div>
      <div style={{ background: `${CORAL}08`, border: `1px solid ${CORAL}20`, borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: CORAL }}>notifications</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Your profile is live!</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>Students can find and book you now</div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${CORAL}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: CORAL, flexShrink: 0 }}>KB</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Kiki B.</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 1 }}>UCL · Maths · £18/hr</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            {['A-Level Maths','Further Maths'].map(s => (
              <span key={s} style={{ fontSize: 9, fontWeight: 700, background: `${CORAL}14`, color: CORAL, padding: '2px 7px', borderRadius: 5 }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[{ n: '12', l: 'views today' }, { n: '3', l: 'messages' }].map(s => (
          <div key={s.l} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: CORAL }}>{s.n}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockAcceptBooking() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: CORAL }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: CORAL }}>New booking request</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(96,165,250,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#60a5fa' }}>JT</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>James T.</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 1 }}>New student</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { icon: 'calendar_month', text: 'Saturday 15th · 3:00 PM' },
            { icon: 'subject', text: 'A-Level Maths' },
            { icon: 'payments', text: '£18.00 → you', coral: true },
          ].map(r => (
            <div key={r.text} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,0.32)' }}>{r.icon}</span>
              <span style={{ color: r.coral ? CORAL : 'rgba(255,255,255,0.52)', fontWeight: r.coral ? 700 : 400 }}>{r.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2, background: '#22c55e', borderRadius: 8, padding: '10px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>Accept ✓</div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.38)', cursor: 'pointer' }}>Decline</div>
      </div>
    </div>
  )
}

function MockEarnings() {
  return (
    <div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', margin: '0 0 4px' }}>This month</p>
      <div style={{ fontSize: 44, fontWeight: 900, color: CORAL, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6 }}>£240</div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', margin: '0 0 18px' }}>8 sessions · <span style={{ color: '#22c55e', fontWeight: 700 }}>0% platform fee</span></p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { date: 'Sat 8th',  student: 'James T.',  amt: '£18' },
          { date: 'Mon 10th', student: 'Priya R.',  amt: '£18' },
          { date: 'Wed 12th', student: 'Tom H.',    amt: '£18' },
        ].map(s => (
          <div key={s.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 8 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{s.student}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginLeft: 8 }}>{s.date}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: CORAL }}>{s.amt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Step data ─────────────────────────────────────────────────────────────────
const STUDENT_STEPS = [
  { n:'01', icon:'person_add',     title:'Create an account',  desc:'Email only. Free forever.',           mock: <MockSignup />    },
  { n:'02', icon:'search',         title:'Find your tutor',    desc:'Filter by subject, uni, and rate.',   mock: <MockFindTutor /> },
  { n:'03', icon:'chat',           title:'Message first',      desc:'Agree rate and timing before booking.',mock: <MockMessage />  },
  { n:'04', icon:'calendar_month', title:'Book a session',     desc:'Pick a time. Tutor confirms.',        mock: <MockBook />      },
  { n:'05', icon:'payments',       title:'Pay directly',       desc:'0% fee. Full amount to your tutor.',  mock: <MockPay />       },
]

const TUTOR_STEPS = [
  { n:'01', icon:'school',                 title:'Sign up & verify',  desc:'Confirm your .ac.uk email. 1 minute.',      mock: <MockVerify />        },
  { n:'02', icon:'edit_note',              title:'Build your profile', desc:'Subjects, rate, availability. 5 minutes.',  mock: <MockBuildProfile /> },
  { n:'03', icon:'explore',               title:'Go live',            desc:'Instantly visible to all students.',         mock: <MockGoLive />        },
  { n:'04', icon:'event',                 title:'Accept bookings',    desc:'Manage requests from your hub.',             mock: <MockAcceptBooking /> },
  { n:'05', icon:'account_balance_wallet', title:'Get paid 100%',     desc:'Every pound goes to you. Always.',           mock: <MockEarnings />      },
]

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ = [
  { q: 'Is it really free?',                  a: 'Yes. Finding tutors, messaging, and booking sessions are completely free. You only pay for sessions you book (directly to your tutor) and optionally £2/month for community features.' },
  { q: 'How are tutors verified?',            a: 'Every tutor confirms a .ac.uk university email. UK universities only. You always see which university a tutor attends.' },
  { q: 'How do payments work?',              a: 'Payments go through Stripe — secure, instant, and direct. Students pay tutors directly. We take 0%. Tutors connect a Stripe payout account once to receive funds automatically.' },
  { q: 'Can I be both student and tutor?',   a: 'Yes. Switch between your student view and tutor hub from the sidebar at any time.' },
  { q: 'What is XP?',                         a: 'XP is earned by tutors for delivering sessions and students for engaging with the platform. Higher XP means better search visibility for tutors and a stronger community standing for students.' },
]

function FAQItem({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '18px 0', textAlign: 'left', gap: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{item.q}</span>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: CORAL, flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>
      </button>
      {open && (
        <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 13, lineHeight: 1.75, margin: '0 0 18px', maxWidth: 560 }}>
          {item.a}
        </p>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HowItWorks() {
  const [role, setRole] = useState('student')
  const [active, setActive] = useState(0)

  const steps = role === 'student' ? STUDENT_STEPS : TUTOR_STEPS

  const switchRole = (r) => { setRole(r); setActive(0) }

  return (
    <div style={{ background: BG, minHeight: '100vh', color: 'white', fontFamily: 'inherit' }}>
      <Navbar />

      {/* ── HEADER + TOGGLE ─────────────────────────────────────────────── */}
      <div style={{ padding: '80px 24px 72px', textAlign: 'center', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: '900', margin: '0 0 32px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          How it works
        </h1>

        {/* Role pill toggle */}
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 4, gap: 4 }}>
          {[
            { key: 'student', label: "I'm a student" },
            { key: 'tutor',   label: "I'm a tutor"   },
          ].map(r => (
            <button key={r.key} onClick={() => switchRole(r.key)} style={{
              padding: '11px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 15, transition: 'all 0.2s',
              background: role === r.key ? CORAL : 'transparent',
              color: role === r.key ? 'white' : 'rgba(255,255,255,0.42)',
              boxShadow: role === r.key ? `0 4px 16px ${CORAL}38` : 'none',
            }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── INTERACTIVE DEMO ────────────────────────────────────────────── */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '72px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '48px', alignItems: 'start' }}>

          {/* Step list */}
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
                  background: active === i ? CORAL : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: active === i ? 'white' : 'rgba(255,255,255,0.32)',
                  transition: 'all 0.18s',
                }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: active === i ? 'white' : 'rgba(255,255,255,0.60)', marginBottom: 3, transition: 'color 0.18s' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 1.4 }}>
                    {step.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Mock browser — sticky */}
          <div style={{ position: 'sticky', top: '24px' }}>
            <Browser animKey={`${role}-${active}`}>
              {steps[active].mock}
            </Browser>
          </div>
        </div>
      </div>

      {/* ── KEY FACTS ───────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '0 24px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { icon: 'percent',        stat: '0%',    label: 'Platform fee',       sub: 'You pay your tutor directly' },
            { icon: 'lock',           stat: 'Stripe', label: 'Secure payments',    sub: 'Encrypted, trusted worldwide' },
            { icon: 'emoji_events',   stat: 'XP',     label: 'Reputation system',  sub: 'Earn recognition as you grow' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '28px 20px', textAlign: 'center', borderRight: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: CORAL, display: 'block', marginBottom: 8 }}>{item.icon}</span>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: 'white', marginBottom: 4 }}>{item.stat}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '80px 24px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: 14 }}>Questions</p>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, margin: '0 0 40px', letterSpacing: '-0.02em' }}>Common questions</h2>
        {FAQ.map((item, i) => <FAQItem key={i} item={item} />)}

        {/* CTA */}
        <div style={{ marginTop: 64, padding: '40px', background: `${CORAL}07`, border: `1px solid ${CORAL}18`, borderRadius: 16, textAlign: 'center' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.01em' }}>Ready to get started?</h3>
          <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 14, margin: '0 0 24px' }}>Free account. No card required.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ background: CORAL, color: 'white', padding: '11px 24px', borderRadius: 9, fontWeight: 700, fontSize: 13, textDecoration: 'none', boxShadow: `0 4px 14px ${CORAL}30` }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Create your account</Link>
            <Link to="/find-tutors" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.70)', padding: '11px 24px', borderRadius: 9, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >Browse tutors</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
