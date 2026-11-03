// Building blocks for the public site: the page shell (navbar, content, footer), the top
// of an inner page, a section with its heading, numbered steps, ticked lists, short facts,
// questions and answers, and the call to action that closes a page.
// Styles live in styles/marketing.css; the tutor pages (components/public) share the shell.
import { useId, useRef } from 'react'
import Navbar from '../layout/Navbar'
import Footer from '../layout/Footer'
import Spot from '../brand/Spot'
import { Icon } from '../ui'
import { LogoMark } from '../brand/Logo'
import Art from './Art'
import { CountUp, useReveal } from './Motion'
import { useTheme } from '../../context/ThemeContext'
import { PAGES } from '../../lib/site'
import useMeta from '../../lib/useMeta'
import '../../styles/marketing.css'

/** Navbar, content and footer, themed through useTheme(); `.mk-reveal` children fade up into view. */
export function SiteShell({ className = '', footer = true, children }) {
  const { dark } = useTheme()
  const root = useRef(null)
  useReveal(root)
  return (
    <div ref={root} className={`mk ${dark ? 'mk-dark' : 'mk-light'} ${className}`}>
      <a href="#main" className="mk-skip">Skip to content</a>
      <Navbar />
      <main id="main">{children}</main>
      {footer && <Footer />}
    </div>
  )
}

/**
 * A public page and its <head>. `path`: a page listed in lib/site.js, whose title and
 * description are used; other pages (log in, sign up, not found) pass a `title`, and
 * `noindex` if search engines should skip them.
 */
export function MarketingPage({ path, title, noindex = false, className, footer, children }) {
  const page = PAGES[path]
  useMeta({
    title: page?.title ?? title,
    description: page?.description ?? PAGES['/'].description,
    path,
    noindex,
  })
  return <SiteShell className={className} footer={footer}>{children}</SiteShell>
}

/** The top of an inner page: title, lead and actions, with one illustration beside them. */
export function PageHero({ title, lead, art, children }) {
  return (
    <section className={`mk-page-hero${art ? ' has-art' : ''}`}>
      <div className="mk-container mk-page-hero-grid">
        <div className="mk-reveal">
          <h1 className="mk-title">{title}</h1>
          {lead && <p className="mk-lead">{lead}</p>}
          {children}
        </div>
        {art && <div className="mk-panel mk-page-art mk-reveal" style={{ '--i': 2 }}><Art name={art} backdrop={false} /></div>}
      </div>
    </section>
  )
}

/** A section with its heading and lead above the content, or beside it with `side`. */
export function Section({ id, title, lead, side = false, className = '', children }) {
  const autoId = useId()
  const headingId = `${id ?? autoId}-title`
  return (
    <section id={id} className={`mk-section ${className}`} aria-labelledby={headingId}>
      <div className={`mk-container${side ? ' mk-side' : ''}`}>
        <div className="mk-head mk-reveal">
          <h2 id={headingId} className="mk-h2">{title}</h2>
          {lead && <p className="mk-lead">{lead}</p>}
        </div>
        {side ? <div>{children}</div> : children}
      </div>
    </section>
  )
}

/** Numbered steps between hairlines, from [title, text] pairs. */
export function Steps({ items, className = '' }) {
  return (
    <ol className={`mk-numbered ${className}`}>
      {items.map(([title, text], i) => (
        <li key={title} className="mk-reveal" style={{ '--i': i }}>
          <span className="mk-num" aria-hidden="true">{i + 1}</span>
          <div><b>{title}</b>{text && <p>{text}</p>}</div>
        </li>
      ))}
    </ol>
  )
}

/** Ticked list. */
export function Checks({ items, className = '' }) {
  return (
    <ul className={`mk-checks ${className}`}>
      {items.map((item) => (
        <li key={item}><Icon name="check_circle" className="mk-check" />{item}</li>
      ))}
    </ul>
  )
}

/** Short facts in a grid of `cols` columns, from [icon, title, text?]. */
export function Facts({ items, cols = 3 }) {
  return (
    <ul className="mk-facts" style={{ '--cols': cols }}>
      {items.map(([icon, title, text], i) => (
        <li key={title} className="mk-reveal" style={{ '--i': i }}>
          <Spot icon={icon} index={i} />
          <h3 className="mk-h3">{title}</h3>
          {text && <p>{text}</p>}
        </li>
      ))}
    </ul>
  )
}

/** Big numbers with a line each, from [value, unit, text]; numeric values count up.
 *  Stacked between hairlines, or side by side with `row`. */
export function Numbers({ items, row = false }) {
  return (
    <ul className={`mk-numbers${row ? ' is-row' : ''}`}>
      {items.map(([value, unit, text], i) => (
        <li key={text} className="mk-reveal" style={{ '--i': i }}>
          <b>{typeof value === 'number' ? <CountUp to={value} /> : value}{unit && <i>{unit}</i>}</b>
          <p>{text}</p>
        </li>
      ))}
    </ul>
  )
}

/** Questions that open in place, from [question, answer] pairs. */
export function Faq({ items }) {
  return (
    <div className="mk-faq mk-reveal">
      {items.map(([question, answer]) => (
        <details key={question}>
          <summary>{question}<Icon name="expand_more" /></summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  )
}

/** The one call to action that closes a page; the buttons are its children. `art`: an
 *  illustration above the heading instead of the rocket mark. */
export function ClosingCta({ title, text, art, children }) {
  const headingId = useId()
  return (
    <section className="mk-cta" aria-labelledby={headingId}>
      <div className="mk-container mk-reveal">
        {art
          ? <div className="mk-cta-art"><Art name={art} backdrop={false} /></div>
          : <LogoMark size={30} className="mk-cta-mark" />}
        <h2 id={headingId} className="mk-h2">{title}</h2>
        {text && <p className="mk-lead">{text}</p>}
        <div className="mk-actions">{children}</div>
      </div>
    </section>
  )
}
