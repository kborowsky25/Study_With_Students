import { useEffect, useState } from 'react'

/** The current time, refreshed every `every` ms so "Live now" / "Starts in" labels stay true. */
export function useNow(every = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(id)
  }, [every])
  return now
}
