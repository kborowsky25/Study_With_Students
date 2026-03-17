import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const BG     = '#1b263b'
const CORAL  = '#ff725e'
const BORDER = 'rgba(255,255,255,0.08)'

// ── Grid canvas with dot + traces ─────────────────────────────────────────────
function PageCanvas({ targetRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const GRID = 56
    const SPEED = 1.6
    let traces = []
    let dot = null
    let rafId

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    class Trace {
      constructor() {
        const isH = Math.random() > 0.5
        this.sx = Math.round((Math.random() * canvas.width) / GRID) * GRID
        this.sy = Math.round((Math.random() * canvas.height) / GRID) * GRID
        this.x = this.sx; this.y = this.sy
        this.maxLen = (2 + Math.random() * 4) * GRID
        this.speed = 0.5 + Math.random() * 0.8
        this.dx = isH ? (Math.random() > 0.5 ? 1 : -1) : 0
        this.dy = isH ? 0 : (Math.random() > 0.5 ? 1 : -1)
        this.len = 0; this.opacity = 0; this.fading = false; this.dead = false
      }
      update() {
        if (!this.fading) {
          this.len += this.speed
          this.x = this.sx + this.dx * this.len
          this.y = this.sy + this.dy * this.len
          this.opacity = Math.min(1, this.len / (GRID * 0.5)) * 0.25
          if (this.len >= this.maxLen) this.fading = true
        } else {
          this.opacity -= 0.007
          if (this.opacity <= 0) this.dead = true
        }
      }
      draw() {
        ctx.strokeStyle = `rgba(255,255,255,${this.opacity})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(this.sx, this.sy)
        ctx.lineTo(this.x, this.y)
        ctx.stroke()
      }
    }

    class Dot {
      constructor() { this.trail = []; this.waiting = false; this.spawn() }
      spawn() {
        const side = Math.floor(Math.random() * 4)
        const cols = Math.ceil(canvas.width / GRID)
        const rows = Math.ceil(canvas.height / GRID)
        if (side === 0) { this.x = Math.floor(Math.random() * cols) * GRID; this.y = 0 }
        else if (side === 1) { this.x = canvas.width; this.y = Math.floor(Math.random() * rows) * GRID }
        else if (side === 2) { this.x = Math.floor(Math.random() * cols) * GRID; this.y = canvas.height }
        else { this.x = 0; this.y = Math.floor(Math.random() * rows) * GRID }
        this.trail = []; this.waiting = false
      }
      getTarget() {
        if (targetRef?.current) {
          const cr = canvas.getBoundingClientRect()
          const pr = targetRef.current.getBoundingClientRect()
          return { tx: pr.left - cr.left + pr.width / 2, ty: pr.top - cr.top + pr.height / 2 }
        }
        return { tx: canvas.width / 2, ty: canvas.height * 0.35 }
      }
      update() {
        if (this.waiting) return
        const { tx, ty } = this.getTarget()
        const dx = tx - this.x; const dy = ty - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 8) {
          this.waiting = true
          setTimeout(() => { this.spawn() }, 1600)
          return
        }
        if (Math.abs(dx) >= Math.abs(dy)) {
          this.x += Math.sign(dx) * SPEED
          this.y += (Math.round(this.y / GRID) * GRID - this.y) * 0.14
        } else {
          this.y += Math.sign(dy) * SPEED
          this.x += (Math.round(this.x / GRID) * GRID - this.x) * 0.14
        }
        this.trail.push({ x: this.x, y: this.y })
        if (this.trail.length > 22) this.trail.shift()
      }
      draw() {
        for (let i = 0; i < this.trail.length; i++) {
          const t = this.trail[i]
          ctx.beginPath()
          ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,114,94,${(i / this.trail.length) * 0.45})`
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = CORAL
        ctx.shadowBlur = 10; ctx.shadowColor = CORAL
        ctx.fill(); ctx.shadowBlur = 0
      }
    }

    dot = new Dot()

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (Math.random() < 0.035) traces.push(new Trace())
      traces.forEach(t => { t.update(); t.draw() })
      traces = traces.filter(t => !t.dead)
      dot.update(); dot.draw()
      rafId = requestAnimationFrame(loop)
    }
    loop()

    return () => { cancelAnimationFrame(rafId); ro.disconnect() }
  }, [targetRef])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
    />
  )
}

// ── Mock browser shell ────────────────────────────────────────────────────────
function Browser({ children, animKey }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.025)', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: '6px', alignItems: 'center' }}>
        {['#ef4444','#fbbf24','#22c55e'].map((c,i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.50 }} />
        ))}
        <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>studywithstudents.com</span>
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
              background: step === i ? CORAL : step > i ? `${CORAL}22` : 'rgba(255,255,255,0.05)',
              fontSize: 9, fontWeight: 800, color: step === i ? 'white' : step > i ? CORAL : 'rgba(255,255,255,0.30)',
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
          <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '11px 14px', fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>
            your@university.ac.uk
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '11px 14px', fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>
            ••••••••••
          </div>
          <div onClick={() => setStep(1)} style={{ background: CORAL, borderRadius: 9, padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', marginTop: 4, boxShadow: `0 4px 14px ${CORAL}38`, cursor: 'pointer' }}>
            Create free account →
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>No card required · Free forever</p>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 2px', letterSpacing: '-0.01em' }}>Check your inbox</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: 0, lineHeight: 1.5 }}>We sent a verification code to <span style={{ color: 'white' }}>your@uni.ac.uk</span></p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '4px 0' }}>
            {[2,8,5,1,4,7].map((d, i) => (
              <div key={i} style={{ width: 34, height: 40, background: i === 5 ? `${CORAL}20` : 'rgba(255,255,255,0.06)', border: `1px solid ${i === 5 ? CORAL+'40' : BORDER}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: i === 5 ? CORAL : 'white' }}>
                {d}
              </div>
            ))}
          </div>
          <div onClick={() => setStep(2)} style={{ background: '#22c55e', borderRadius: 9, padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'white', boxShadow: '0 4px 14px rgba(34,197,94,0.3)', cursor: 'pointer' }}>
            Confirm email ✓
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>Didn't get it? Resend →</p>
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
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'white' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{opt.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: '12px 0 0', lineHeight: 1.5, textAlign: 'center' }}>You can switch at any time from your dashboard</p>
        </div>
      )}
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
    { from: 'me', text: 'Of course! What topics?' },
    { from: 'them', text: 'Integration by parts mainly' },
    { from: 'me', text: 'Saturday 3pm, £18/hr?' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{ background: m.from === 'me' ? CORAL : 'rgba(255,255,255,0.07)', color: m.from === 'me' ? 'white' : 'rgba(255,255,255,0.78)', padding: '8px 12px', borderRadius: 10, fontSize: 12, maxWidth: '82%', lineHeight: 1.4 }}>{m.text}</div>
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
          const sel = d === today + 2; const now = d === today
          return <div key={i} style={{ textAlign: 'center', fontSize: 11, padding: '5px 2px', borderRadius: 6, background: sel ? CORAL : now ? `${CORAL}20` : 'transparent', color: sel ? 'white' : now ? CORAL : 'rgba(255,255,255,0.42)', fontWeight: sel || now ? 700 : 400 }}>{d > 0 && d <= 31 ? d : ''}</div>
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['3:00 PM', '4:00 PM', '5:00 PM'].map((t, i) => (
          <div key={t} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '7px', borderRadius: 7, background: i === 0 ? `${CORAL}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? CORAL+'40' : BORDER}`, color: i === 0 ? CORAL : 'rgba(255,255,255,0.38)' }}>{t}</div>
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
          { label: 'Session rate', val: '£18.00', color: 'white' },
          { label: 'Platform fee', val: '£0.00 ✓', color: '#22c55e' },
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

function MockDashboard() {
  const today = new Date().getDate()
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: 14, margin: '0 0 14px', color: 'rgba(255,255,255,0.85)' }}>Your Dashboard</p>
      {/* Upcoming session */}
      <div style={{ background: `${CORAL}10`, border: `1px solid ${CORAL}25`, borderRadius: 10, padding: '11px 13px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: CORAL }}>event</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Maths with Alex V.</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>Today · 3:00 PM · £18</div>
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
          <div key={i} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: s.coral ? CORAL : 'rgba(255,255,255,0.40)', display: 'block', marginBottom: 3 }}>{s.icon}</span>
            <div style={{ fontWeight: 900, fontSize: 16, color: s.coral ? CORAL : 'white' }}>{s.n}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* Unread message */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 9 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>chat</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Alex V.: "See you Saturday!"</span>
        <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: CORAL }} />
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
          { date: 'Sat 8th', student: 'James T.', amt: '£18' },
          { date: 'Mon 10th', student: 'Priya R.', amt: '£18' },
          { date: 'Wed 12th', student: 'Tom H.', amt: '£18' },
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

function MockTutorDashboard() {
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: 14, margin: '0 0 14px', color: 'rgba(255,255,255,0.85)' }}>Tutor Dashboard</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12 }}>
        {[
          { n: '£240', l: 'this month', icon: 'account_balance_wallet', coral: true },
          { n: '8', l: 'sessions done', icon: 'school' },
          { n: '340', l: 'XP earned', icon: 'emoji_events', coral: true },
          { n: '5', l: 'active students', icon: 'groups' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: s.coral ? CORAL : 'rgba(255,255,255,0.40)', display: 'block', marginBottom: 4 }}>{s.icon}</span>
            <div style={{ fontWeight: 900, fontSize: 16, color: s.coral ? CORAL : 'white' }}>{s.n}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: `${CORAL}08`, border: `1px solid ${CORAL}22`, borderRadius: 9, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: CORAL }}>workspace_premium</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Explorer Badge unlocked!</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>XP Level 3 — visible on your profile</div>
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

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ = [
  { q: 'Is it really free?',                a: 'Yes. Finding tutors, messaging, and booking sessions are completely free. You only pay for sessions you book (directly to your tutor) and optionally £2/month for community features.' },
  { q: 'How are tutors verified?',          a: 'Every tutor confirms a .ac.uk university email. UK universities only. You always see which university a tutor attends.' },
  { q: 'How do payments work?',             a: 'Payments go through Stripe — secure, instant, and direct. Students pay tutors directly. We take 0%. Tutors connect a Stripe payout account once to receive funds automatically.' },
  { q: 'Can I be both student and tutor?',  a: 'Yes. Switch between your student view and tutor hub from the sidebar at any time.' },
  { q: 'What is XP?',                       a: 'XP is earned by tutors for delivering sessions and students for engaging with the platform. Higher XP means better search visibility for tutors, free rewards for students, and special badges for standout contributors.' },
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
  const headingRef = useRef(null)

  const steps = role === 'student' ? STUDENT_STEPS : TUTOR_STEPS

  const switchRole = (r) => { setRole(r); setActive(0) }

  return (
    <div style={{ background: BG, minHeight: '100vh', color: 'white', fontFamily: 'inherit' }}>
      <Navbar />

      {/* ── HEADER + TOGGLE ─────────────────────────────────────────────── */}
      <div style={{ padding: '80px 24px 72px', textAlign: 'center', borderBottom: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
        {/* Canvas behind header */}
        <PageCanvas targetRef={headingRef} />
        {/* Grid */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`, backgroundSize: '56px 56px', WebkitMaskImage: 'radial-gradient(ellipse 80% 100% at 50% 50%, black 30%, transparent 100%)', maskImage: 'radial-gradient(ellipse 80% 100% at 50% 50%, black 30%, transparent 100%)' }} />

        <div style={{ position: 'relative', zIndex: 3 }}>
          <h1 ref={headingRef} style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: '900', margin: '0 0 32px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            How it works
          </h1>

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
      </div>

      {/* ── INTERACTIVE DEMO ────────────────────────────────────────────── */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '72px 24px 80px' }}>
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
                  background: active === i ? CORAL : step.n === '06' ? `${CORAL}18` : 'rgba(255,255,255,0.06)',
                  border: step.n === '06' && active !== i ? `1px solid ${CORAL}30` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: active === i ? 'white' : step.n === '06' ? CORAL : 'rgba(255,255,255,0.32)',
                  transition: 'all 0.18s',
                }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: active === i ? 'white' : step.n === '06' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.60)', marginBottom: 3, transition: 'color 0.18s' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 1.4 }}>
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

      {/* ── KEY FACTS ───────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '0 24px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { icon: 'percent',      stat: '0%',     label: 'Platform fee',      sub: 'You pay your tutor directly' },
            { icon: 'lock',         stat: 'Stripe',  label: 'Secure payments',   sub: 'Encrypted, trusted worldwide' },
            { icon: 'emoji_events', stat: 'XP',      label: 'Reputation system', sub: 'Earn recognition as you grow' },
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

      {/* ── XP LEVELLING ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '80px 24px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: 14, textAlign: 'center' }}>XP System</p>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', textAlign: 'center' }}>
          The more you do, the more you unlock
        </h2>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.42)', fontSize: 14, margin: '0 0 48px' }}>
          Earn XP by participating — real rewards, not vanity points.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Student XP */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: CORAL }}>school</span>
              <span style={{ fontWeight: 800, fontSize: 14 }}>Student XP</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STUDENT_XP.map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${i >= 1 ? row.color + '25' : BORDER}`, borderRadius: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${row.color}18`, border: `1px solid ${row.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: row.color }}>{row.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{row.reward}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Level {row.level} · {row.xp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tutor XP */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: CORAL }}>auto_stories</span>
              <span style={{ fontWeight: 800, fontSize: 14 }}>Tutor XP</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TUTOR_XP.map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${i >= 1 ? row.color + '25' : BORDER}`, borderRadius: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${row.color}18`, border: `1px solid ${row.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: row.color }}>{row.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{row.reward}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Level {row.level} · {row.xp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '80px 24px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: CORAL, marginBottom: 14 }}>Questions</p>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, margin: '0 0 40px', letterSpacing: '-0.02em' }}>Common questions</h2>
        {FAQ.map((item, i) => <FAQItem key={i} item={item} />)}

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
