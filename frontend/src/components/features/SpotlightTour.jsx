import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'

const CORAL = '#ff725e'
const OVERLAY_Z = 9100

// ─── SpotlightTour ────────────────────────────────────────────────────────────
// steps: Array<{ target: string|null, title: string, body: string, position?: 'right'|'left'|'top'|'bottom'|'center' }>
// onDone: () => void   — called when tour completes or is skipped
export default function SpotlightTour({ steps, onDone }) {
  const [idx,     setIdx]     = useState(0)
  const [rect,    setRect]    = useState(null)   // DOMRect of current target
  const [visible, setVisible] = useState(false)  // fade-in after first paint
  const roRef = useRef(null)   // ResizeObserver

  const step = steps[idx]

  // ── Find & track target element ───────────────────────────────────────────
  const measureTarget = useCallback(() => {
    if (!step?.target) { setRect(null); return }
    const el = document.querySelector(step.target)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    // Scroll the element into view if it's offscreen
    if (r.top < 0 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [step?.target])

  useLayoutEffect(() => {
    measureTarget()
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 40)

    // Observe layout changes
    const el = step?.target ? document.querySelector(step.target) : null
    if (el) {
      roRef.current = new ResizeObserver(measureTarget)
      roRef.current.observe(el)
      roRef.current.observe(document.body)
    }
    window.addEventListener('resize', measureTarget)
    window.addEventListener('scroll', measureTarget, true)
    return () => {
      clearTimeout(t)
      roRef.current?.disconnect()
      window.removeEventListener('resize', measureTarget)
      window.removeEventListener('scroll', measureTarget, true)
    }
  }, [measureTarget, step?.target])

  function next() {
    if (idx < steps.length - 1) setIdx(i => i + 1)
    else done()
  }
  function back() { if (idx > 0) setIdx(i => i - 1) }
  function done() { onDone?.() }

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); back() }
      if (e.key === 'Escape')     { e.preventDefault(); done() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── Spotlight geometry ────────────────────────────────────────────────────
  const PAD = 8
  const sp = rect ? {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  } : null

  // ── Tooltip positioning ───────────────────────────────────────────────────
  const TOOLTIP_W = 280
  const TOOLTIP_H_EST = 160
  const GAP = 14

  function tooltipStyle() {
    if (!sp || step?.position === 'center') {
      return {
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: TOOLTIP_W,
      }
    }
    const pos = step?.position ?? autoPosition(sp)
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top, left

    if (pos === 'right') {
      left = Math.min(sp.left + sp.width + GAP, vw - TOOLTIP_W - 12)
      top  = Math.max(12, Math.min(sp.top + sp.height / 2 - TOOLTIP_H_EST / 2, vh - TOOLTIP_H_EST - 12))
    } else if (pos === 'left') {
      left = Math.max(12, sp.left - TOOLTIP_W - GAP)
      top  = Math.max(12, Math.min(sp.top + sp.height / 2 - TOOLTIP_H_EST / 2, vh - TOOLTIP_H_EST - 12))
    } else if (pos === 'top') {
      left = Math.max(12, Math.min(sp.left + sp.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 12))
      top  = Math.max(12, sp.top - TOOLTIP_H_EST - GAP)
    } else { // bottom
      left = Math.max(12, Math.min(sp.left + sp.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 12))
      top  = Math.min(sp.top + sp.height + GAP, vh - TOOLTIP_H_EST - 12)
    }
    return { position: 'fixed', top, left, width: TOOLTIP_W }
  }

  function autoPosition(s) {
    const vw = window.innerWidth
    // If element is in left 30% → tooltip to the right; otherwise to the right or left
    if (s.left < vw * 0.35) return 'right'
    if (s.left + s.width > vw * 0.65) return 'left'
    return 'bottom'
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Dark overlay — uses box-shadow trick to create spotlight cutout */}
      <div
        onClick={next}
        style={{
          position: 'fixed', inset: 0, zIndex: OVERLAY_Z,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        {/* If no target: solid dark overlay */}
        {!sp && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)' }} />
        )}

        {/* If target: spotlight box */}
        {sp && (
          <div
            style={{
              position: 'fixed',
              top: sp.top, left: sp.left,
              width: sp.width, height: sp.height,
              borderRadius: '10px',
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.72)`,
              border: `2px solid ${CORAL}`,
              zIndex: OVERLAY_Z + 1,
              pointerEvents: 'none',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        )}
      </div>

      {/* Tooltip card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...tooltipStyle(),
          zIndex: OVERLAY_Z + 2,
          background: 'var(--card-bg, #1e2d45)',
          border: `1px solid rgba(255,114,94,0.25)`,
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          opacity: visible ? 1 : 0,
          transform: visible
            ? (step?.position === 'center' || !sp ? 'translate(-50%, -50%) scale(1)' : 'scale(1)')
            : (step?.position === 'center' || !sp ? 'translate(-50%, -50%) scale(0.95)' : 'scale(0.95)'),
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        {/* Step counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === idx ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: i === idx ? CORAL : 'rgba(255,255,255,0.20)',
                  transition: 'width 0.25s ease, background 0.25s ease',
                }}
              />
            ))}
          </div>
          <button
            onClick={done}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
              color: 'rgba(255,255,255,0.30)', fontSize: '18px', lineHeight: 1,
            }}
            title="Skip tour"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <h3 style={{
          fontSize: '16px', fontWeight: '800', color: 'white',
          marginBottom: '8px', lineHeight: 1.25, letterSpacing: '-0.2px',
        }}>
          {step.title}
        </h3>
        <p style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.60)',
          lineHeight: 1.6, marginBottom: '18px',
        }}>
          {step.body}
        </p>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {idx > 0 && (
            <button
              onClick={back}
              style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.60)', cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={next}
            style={{
              flex: 1, padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
              background: `linear-gradient(135deg, ${CORAL}, #e05a48)`,
              border: 'none', color: 'white', cursor: 'pointer',
              boxShadow: `0 4px 14px rgba(255,114,94,0.35)`,
            }}
          >
            {idx === steps.length - 1 ? 'Done!' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  )
}
