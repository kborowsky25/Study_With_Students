import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../ui'

const Z = 9100
const PAD = 6           // space between the target and the highlight ring
const CARD_W = 300
const CARD_H_EST = 170  // only used to keep the card inside the viewport
const GAP = 12
const EDGE = 12

/** Where `selector` is on screen, or null when it isn't visible (missing, hidden, or in the closed mobile sidebar). */
function visibleRect(selector) {
  const el = selector ? document.querySelector(selector) : null
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (!r.width || !r.height || r.right <= 0 || r.left >= window.innerWidth) return null
  return { el, top: r.top, left: r.left, width: r.width, height: r.height }
}

function autoPosition(sp) {
  const vw = window.innerWidth
  if (vw < 640) return sp.top > window.innerHeight / 2 ? 'top' : 'bottom'
  if (sp.left < vw * 0.35) return 'right'
  if (sp.left + sp.width > vw * 0.65) return 'left'
  return 'bottom'
}

function cardPosition(sp, position) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(CARD_W, vw - EDGE * 2)
  if (!sp || position === 'center') {
    return { position: 'fixed', top: '50%', left: '50%', width, transform: 'translate(-50%, -50%)' }
  }
  const pos = position ?? autoPosition(sp)
  const clampX = (x) => Math.max(EDGE, Math.min(x, vw - width - EDGE))
  const clampY = (y) => Math.max(EDGE, Math.min(y, vh - CARD_H_EST - EDGE))
  if (pos === 'right') return { position: 'fixed', width, left: clampX(sp.left + sp.width + GAP), top: clampY(sp.top + sp.height / 2 - CARD_H_EST / 2) }
  if (pos === 'left') return { position: 'fixed', width, left: clampX(sp.left - width - GAP), top: clampY(sp.top + sp.height / 2 - CARD_H_EST / 2) }
  if (pos === 'top') return { position: 'fixed', width, left: clampX(sp.left + sp.width / 2 - width / 2), top: clampY(sp.top - CARD_H_EST - GAP) }
  return { position: 'fixed', width, left: clampX(sp.left + sp.width / 2 - width / 2), top: clampY(sp.top + sp.height + GAP) }
}

/**
 * A short guided tour that highlights one element at a time.
 *
 *   steps:  [{ target: '[data-tour="messages"]' | null, title, body, position?: 'right'|'left'|'top'|'bottom'|'center' }]
 *   onDone: called when the tour is finished or skipped
 *
 * Steps whose target isn't on screen (e.g. sidebar items on a phone) show as a centred card.
 */
export default function SpotlightTour({ steps, onDone }) {
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState(null)
  const nextRef = useRef(null)
  const step = steps[idx]
  const last = idx === steps.length - 1

  const measure = useCallback(() => {
    const r = visibleRect(step?.target)
    if (r && (r.top < 0 || r.top + r.height > window.innerHeight)) r.el.scrollIntoView({ block: 'center' })
    const next = r && { top: r.top, left: r.left, width: r.width, height: r.height }
    // Keep the old object when nothing moved, so the ring's own transitions don't re-render it.
    setRect((prev) => (prev && next && ['top', 'left', 'width', 'height'].every((k) => prev[k] === next[k]) ? prev : next))
  }, [step?.target])

  useLayoutEffect(() => {
    measure()
    const el = step?.target ? document.querySelector(step.target) : null
    const ro = el ? new ResizeObserver(measure) : null
    if (ro) { ro.observe(el); ro.observe(document.body) }
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    // The sidebar slides in and out (mobile drawer, collapse): measure again once it has moved.
    document.addEventListener('transitionend', measure, true)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      document.removeEventListener('transitionend', measure, true)
    }
  }, [measure, step?.target])

  useEffect(() => { nextRef.current?.focus() }, [idx])

  const next = useCallback(() => (last ? onDone?.() : setIdx((i) => i + 1)), [last, onDone])
  const back = useCallback(() => setIdx((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onDone?.() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
      // Enter on a focused button presses that button; elsewhere it moves on
      else if (e.key === 'Enter' && e.target?.tagName !== 'BUTTON') { e.preventDefault(); next() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, back, onDone])

  if (!step) return null
  const sp = rect && { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }

  return (
    <>
      <div onClick={next} style={{ position: 'fixed', inset: 0, zIndex: Z, animation: 'fadeIn 0.12s ease-out both' }}>
        {sp ? (
          <div style={{
            position: 'fixed', top: sp.top, left: sp.left, width: sp.width, height: sp.height,
            borderRadius: 'var(--radius)', boxShadow: '0 0 0 9999px var(--overlay)', outline: '2px solid var(--coral)',
            pointerEvents: 'none', transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
          }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} />
        )}
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...cardPosition(sp, step.position),
          zIndex: Z + 1,
          padding: '14px 16px 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--elevated)',
          color: 'var(--text)',
          boxShadow: 'var(--shadow-pop)',
          animation: 'fadeIn 0.12s ease-out both', // opacity only: a transform animation would undo the centring
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }} aria-label={`Step ${idx + 1} of ${steps.length}`}>
            {steps.map((_, i) => (
              <span key={i} style={{
                width: i === idx ? 16 : 6, height: 4, borderRadius: 2,
                background: i === idx ? 'var(--coral)' : 'rgb(var(--fg) / 0.22)', transition: 'width 0.15s ease',
              }} />
            ))}
          </div>
          <button type="button" className="icon-btn" onClick={() => onDone?.()} aria-label="Skip tour" title="Skip tour" style={{ marginRight: -6 }}>
            <Icon name="close" />
          </button>
        </div>

        <h3 id="tour-title" style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>{step.title}</h3>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)', marginBottom: 14 }}>{step.body}</p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {idx > 0 && <button type="button" className="btn btn-quiet" onClick={back}>Back</button>}
          <button ref={nextRef} type="button" className="btn btn-coral" onClick={next}>{last ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </>
  )
}
