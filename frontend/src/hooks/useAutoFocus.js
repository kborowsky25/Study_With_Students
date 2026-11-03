import { useEffect, useRef } from 'react'

/**
 * Focus an element once, when it mounts, without scrolling. Dialogs live inside the hub's
 * scrolling area, so the `autoFocus` attribute would scroll the page behind them.
 *
 *   const ref = useAutoFocus()
 *   <input ref={ref} />
 */
export function useAutoFocus() {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus({ preventScroll: true }) }, [])
  return ref
}

/** The same for an element that appears later (e.g. once a dialog's data has loaded): `ref={focusOnMount}`. */
export const focusOnMount = (element) => element?.focus({ preventScroll: true })
