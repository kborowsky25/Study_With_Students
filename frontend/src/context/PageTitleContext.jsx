import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const Ctx = createContext({ title: '', icon: null, setPageTitle: () => {} })

export function PageTitleProvider({ children }) {
  const [info, setInfo] = useState({ title: '', icon: null })
  // Stable, so pages can list it as an effect dependency without re-running every render
  const setPageTitle = useCallback((title, icon = null) => setInfo({ title, icon }), [])
  const value = useMemo(() => ({ ...info, setPageTitle }), [info, setPageTitle])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const usePageTitleCtx = () => useContext(Ctx)

/** Drop this inside any page to register its title with the navbar. */
export function PageTitle({ title, icon }) {
  const { setPageTitle } = usePageTitleCtx()
  useEffect(() => {
    setPageTitle(title, icon)
    return () => setPageTitle('', null)
  }, [title, icon, setPageTitle])
  return null
}
