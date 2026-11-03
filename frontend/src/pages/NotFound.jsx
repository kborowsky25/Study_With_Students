import { Link } from '@tanstack/react-router'
import Art from '../components/marketing/Art'
import { MarketingPage } from '../components/marketing'

// Shown for any URL the router doesn't know (see `notFoundComponent` in router.jsx).
export default function NotFound() {
  const signedIn = Boolean(localStorage.getItem('sws_token'))
  return (
    <MarketingPage title="Page not found" noindex>
      <section className="mk-page-hero">
        <div className="mk-container mk-center">
          <div className="mk-not-found-art"><Art name="notFound" /></div>
          <h1 className="mk-h1">This page is <em>lost.</em></h1>
          <div className="mk-actions mk-center mk-not-found-actions">
            <Link to={signedIn ? '/hub' : '/'} className="mk-btn mk-btn-coral">{signedIn ? 'Back to your hub' : 'Go home'}</Link>
            <Link to="/find-tutors" className="mk-btn mk-btn-slate">Find a tutor</Link>
          </div>
        </div>
      </section>
    </MarketingPage>
  )
}
