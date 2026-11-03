// Motion for the homepage's stage (HeroStage in Previews.jsx), kept out of Motion.jsx so it
// loads with the homepage only:
// - useScrollLanding: the product shot, tilted back in 3D, flattens, rises and grows as it
//   scrolls into view, then its panels come in one after another.
// - useSheen: a soft light that follows a mouse pointer over it.
// Both do nothing for people who ask for reduced motion: the stage then simply shows, landed.
import { useEffect, useLayoutEffect } from 'react'

const prefersStill = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const clamp01 = (n) => Math.min(1, Math.max(0, n))
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'   // --mk-ease

/**
 * A scroll-linked landing for `[data-stage]` inside `ref`'s element (which sets the perspective
 * in CSS). The stage starts tilted back by `tilt` degrees (`phoneTilt` on phones), `rise` px
 * lower and at `scale`, and flattens, rises and grows to its natural size, eased, as the
 * element's top edge scrolls up to 15% of the window. The motion starts once that edge passes
 * 75% of the window, or at the top of the page for something already above that line (the
 * hero), so it always runs its whole course. `[data-glow]` brightens as the stage lands.
 *
 * Once it has landed (or as soon as someone clicks or tabs into it), the elements matching
 * `panels`, a list of selector groups, come in one after another: each group starts as the one
 * before it gets going, and its elements follow each other. Phones get the first two groups.
 * They wait, faint and a little low, in paused animations made at the start, so nothing is
 * hidden without this script, and it plays once.
 *
 * Only transform and opacity change, so nothing around the stage moves (no layout shift); the
 * element itself is measured and only the stage moves, so the motion never feeds back into the
 * measurement. One passive scroll listener, throttled to one update per frame.
 */
export function useScrollLanding(ref, { tilt = 22, phoneTilt = 9, scale = 0.88, rise = 72, panels = [] } = {}) {
  useLayoutEffect(() => {
    const wrap = ref.current
    const stage = wrap?.querySelector('[data-stage]')
    if (!stage || prefersStill()) return undefined
    const glow = wrap.querySelector('[data-glow]')
    const phone = window.matchMedia('(max-width: 719px)')

    let frame = 0
    let shown = ''
    const measure = () => {
      // The layout viewport, which doesn't change as a phone's address bar slides away
      const height = document.documentElement.clientHeight || window.innerHeight
      const top = wrap.getBoundingClientRect().top
      const y = window.scrollY
      const start = Math.max(0, top + y - 0.75 * height)                         // where it starts…
      const span = Math.max(0.25 * height, top + y - 0.15 * height - start)      // …and how long it runs
      const progress = clamp01((y - start) / span)
      const eased = 1 - (1 - progress) ** 3
      // From `settled` on it looks flat, and the panels come in
      return { progress, eased, settled: eased > 0.97, entered: clamp01((height - top) / (0.25 * height)) }
    }

    // The panels, held faint and low until the landing
    const waiting = []
    if (!measure().settled && typeof stage.animate === 'function') {
      let delay = 0
      for (const selector of panels.slice(0, phone.matches ? 2 : undefined)) {
        const items = [...stage.querySelectorAll(selector)].filter((el) => el.getClientRects().length)
        items.forEach((el, i) => {
          const motion = el.animate(
            [{ opacity: 0.35, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
            { duration: 560, delay: delay + Math.min(i, 10) * 55, easing: EASE_OUT, fill: 'backwards' },
          )
          motion.pause()
          waiting.push(motion)
        })
        delay += 140 + Math.min(items.length, 4) * 55
      }
    }
    const land = () => {
      waiting.forEach((motion) => motion.play())
      waiting.length = 0
    }

    const update = () => {
      frame = 0
      const { progress, eased, settled, entered } = measure()
      const rest = 1 - eased
      // At rest there is no transform, so the text is drawn sharp and nothing keeps its own layer
      const transform = progress < 1
        ? `translateY(${(rest * rise).toFixed(1)}px) rotateX(${(rest * (phone.matches ? phoneTilt : tilt)).toFixed(2)}deg) scale(${(1 - rest * (1 - scale)).toFixed(4)})`
        : ''
      const opacity = entered < 1 ? (0.35 + 0.65 * entered).toFixed(3) : ''
      const light = progress < 1 ? (0.15 + 0.85 * eased).toFixed(3) : ''
      if (settled) land()
      if (transform + opacity + light === shown) return
      shown = transform + opacity + light
      stage.style.transform = transform
      stage.style.opacity = opacity
      stage.style.willChange = transform ? 'transform' : ''
      if (glow) glow.style.opacity = light
    }
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    // A tap or a click, not the touch that starts a scroll
    stage.addEventListener('click', land)
    stage.addEventListener('focusin', land)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      stage.removeEventListener('click', land)
      stage.removeEventListener('focusin', land)
      waiting.forEach((motion) => motion.cancel())
      stage.style.transform = stage.style.opacity = stage.style.willChange = ''
      if (glow) glow.style.opacity = ''
    }
  }, [ref, tilt, phoneTilt, scale, rise, panels])
}

/** A soft light, `[data-sheen]` inside `ref`'s element, that follows a mouse pointer over it. */
export function useSheen(ref) {
  useEffect(() => {
    const surface = ref.current
    const sheen = surface?.querySelector('[data-sheen]')
    if (!sheen || prefersStill() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined

    let frame = 0
    let point = null
    const paint = () => {
      frame = 0
      const box = surface.getBoundingClientRect()
      sheen.style.transform = `translate3d(${(point.x - box.left).toFixed(0)}px, ${(point.y - box.top).toFixed(0)}px, 0)`
    }
    const move = (e) => {
      if (e.pointerType !== 'mouse') return
      point = { x: e.clientX, y: e.clientY }
      sheen.classList.add('is-on')
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const leave = () => sheen.classList.remove('is-on')

    surface.addEventListener('pointermove', move, { passive: true })
    surface.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      surface.removeEventListener('pointermove', move)
      surface.removeEventListener('pointerleave', leave)
    }
  }, [ref])
}
