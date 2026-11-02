// Building blocks for the public pages (Home, How it works, About us, Become a tutor,
// Founding tutors, Log in, Sign up). Styles live in styles/marketing.css.
import { useEffect } from 'react'
import Navbar from '../layout/Navbar'
import Footer from '../layout/Footer'
import { Icon } from '../ui'
import { useTheme } from '../../context/ThemeContext'
import '../../styles/marketing.css'

/** Page shell: navbar, content and footer, themed through useTheme(). */
export function MarketingPage({ title, className = '', footer = true, children }) {
  const { dark } = useTheme()

  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · Study with Students` : 'Study with Students'
    return () => { document.title = previous }
  }, [title])

  return (
    <div className={`mk ${dark ? 'mk-dark' : 'mk-light'} ${className}`}>
      <a href="#main" className="mk-skip">Skip to content</a>
      <Navbar />
      <main id="main">{children}</main>
      {footer && <Footer />}
    </div>
  )
}

// The wave edges from the original pages, redrawn so they follow the theme:
// the shape is filled with currentColor, which CSS sets to the next section's colour.
const WAVES = {
  a: { viewBox: '0 0 900 80', d: 'M0 45L37.5 51C75 57 150 69 225 72.3C300 75.7 375 70.3 450 56.7C525 43 600 21 675 11.3C750 1.7 825 4.3 862.5 5.7L900 7V80H0Z' },
  b: { viewBox: '0 0 900 60', d: 'M0 40L21.5 33.3C43 26.7 86 13.3 128.8 8.8C171.7 4.3 214.3 8.7 257.2 9.2C300 9.7 343 6.3 385.8 5.2C428.7 4 471.3 5 514.2 15.7C557 26.3 600 46.7 642.8 48.7C685.7 50.7 728.3 34.3 771.2 28.7C814 23 857 28 878.5 30.5L900 33V60H0Z' },
}

export function Wave({ shape = 'a', top = false }) {
  const { viewBox, d } = WAVES[shape]
  return (
    <svg className={`mk-wave ${top ? 'mk-wave-top' : 'mk-wave-bottom'}`} viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  )
}

/** Ticked list, as in the original "Say less." block. */
export function Checks({ items, className = '' }) {
  return (
    <ul className={`mk-checks ${className}`}>
      {items.map((item) => (
        <li key={item}><Icon name="check_box" className="mk-check" />{item}</li>
      ))}
    </ul>
  )
}
