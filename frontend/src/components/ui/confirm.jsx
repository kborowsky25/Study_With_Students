// One confirmation dialog for the whole app.
//
//   const confirm = useConfirm()
//   if (await confirm({ title: 'Remove Oliver?', confirmLabel: 'Remove', danger: true })) …
//
// Enter confirms, Escape or a click outside cancels.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

function ConfirmDialog({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onResult }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onResult(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onResult])

  return (
    <div className="overlay center" onMouseDown={() => onResult(false)}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        style={{ maxWidth: 400 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-body" style={{ paddingTop: 18, gap: 6 }}>
          <h2 id="confirm-title" style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</h2>
          {body && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{body}</div>}
        </div>
        <div className="dialog-foot">
          <button className="btn btn-ghost" onClick={() => onResult(false)}>{cancelLabel}</button>
          <button ref={confirmRef} className={`btn ${danger ? 'btn-danger' : 'btn-coral'}`} onClick={() => onResult(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)

  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequest({ ...options, resolve })
  }), [])

  const onResult = useCallback((ok) => {
    setRequest((current) => {
      current?.resolve(ok)
      return null
    })
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmDialog {...request} onResult={onResult} />}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside ConfirmProvider')
  return confirm
}
