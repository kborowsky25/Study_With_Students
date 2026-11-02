import { useEffect, useRef } from 'react'

/** Call `handler` when Escape is pressed (dialogs). The latest handler is always used. */
export function useEscape(handler) {
  const ref = useRef(handler)
  useEffect(() => { ref.current = handler })
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') ref.current?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
