import { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext({ title: '', icon: null, setPageTitle: () => {} })

export function PageTitleProvider({ children }) {
  const [info, setInfo] = useState({ title: '', icon: null })
  return (
    <Ctx.Provider value={{ ...info, setPageTitle: (title, icon = null) => setInfo({ title, icon }) }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePageTitleCtx = () => useContext(Ctx)

/** Drop this inside any page to register its title with the navbar. */
export function PageTitle({ title, icon }) {
  const { setPageTitle } = usePageTitleCtx()
  useEffect(() => {
    setPageTitle(title, icon)
    return () => setPageTitle('', null)
  }, [title, icon])
  return null
}
