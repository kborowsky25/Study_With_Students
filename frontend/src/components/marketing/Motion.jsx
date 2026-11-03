// Motion for the public site, kept small and optional:
// - useReveal: anything with the class `mk-reveal` fades up the first time it scrolls into
//   view; `style={{ '--i': n }}` staggers siblings. Elements rendered later (tutor cards
//   after a fetch), or that gain the class when React reuses a node, are picked up too.
// - CountUp: a number that counts up once it is on screen.
// Both do nothing for people who ask for reduced motion, and the CSS (styles/marketing.css)
// only hides content once this script has started, so nothing stays hidden without it.
import { useLayoutEffect, useRef, useState } from 'react'

const prefersStill = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Reveals `.mk-reveal` elements inside `rootRef` as they scroll into view. */
export function useReveal(rootRef) {
  // Layout effect: the class goes on before the first paint, so content fades in once
  // instead of showing, hiding and fading in
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || prefersStill() || !('IntersectionObserver' in window)) return undefined

    const seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        seen.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 })

    const watch = (node) => {
      if (node.matches?.('.mk-reveal:not(.is-in)')) seen.observe(node)
      node.querySelectorAll?.('.mk-reveal:not(.is-in)').forEach((el) => seen.observe(el))
    }
    watch(root)
    const added = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === 'attributes') watch(change.target)
        else change.addedNodes.forEach((node) => node.nodeType === 1 && watch(node))
      }
    })
    added.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    root.classList.add('mk-motion')

    return () => {
      seen.disconnect()
      added.disconnect()
      root.classList.remove('mk-motion')
    }
  }, [rootRef])
}

/** `to` counted up from 0 when it first comes into view; `format` turns the number into text. */
export function CountUp({ to, format = String, duration = 1100 }) {
  const ref = useRef(null)
  const [value, setValue] = useState(to)

  // Layout effect: back to 0 before the first paint, so the final number never flashes
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prefersStill() || !('IntersectionObserver' in window)) return undefined
    let frame
    setValue(0)
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      seen.disconnect()
      const start = performance.now()
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration)
        setValue(Math.round(to * (1 - (1 - t) ** 3)))   // ease out
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.6 })
    seen.observe(el)
    return () => {
      seen.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [to, duration])

  return <span ref={ref}>{format(value)}</span>
}
