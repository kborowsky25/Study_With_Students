import { Link } from '@tanstack/react-router'
import Art from '../components/marketing/Art'
import { MarketingPage } from '../components/marketing'

// Shown for any URL the router doesn't know (see `notFoundComponent` in router.jsx).
export default function NotFound() {
  const signedIn = Boolean(localStorage.getItem('sws_token'))
  return (
    <MarketingPage title="Page not found" noindex>
      <section className="mk-not-found">
        <div className="mk-container mk-reveal">
          <div className="mk-not-found-art"><Art name="notFound" /></div>
          <h1 className="mk-title">This page is lost</h1>
          <p className="mk-lead">The link may be old, or the page has moved.</p>
          <div className="mk-actions">
            <Link to={signedIn ? '/hub' : '/'} className="mk-btn mk-btn-primary">{signedIn ? 'Back to your dashboard' : 'Go home'}</Link>
            <Link to="/tutors" className="mk-btn mk-btn-ghost">Find a tutor</Link>
          </div>
        </div>
      </section>
    </MarketingPage>
  )
}
