import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { loadStripe } from '@stripe/stripe-js/pure'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Card, EmptyState, Icon, Pill, SkeletonRows } from '../components/ui'
import {
  activateDemoMembership, cancelMembership, confirmCheckoutSession, createCheckoutSession, getMembershipStatus,
} from '../api/membership'
import { errorMessage } from '../api/client'
import { formatDate, formatMoney } from '../lib/format'

// Stripe.js is fetched only when checkout is opened (the /pure entry has no import side
// effects), and checkout is only offered when the API has Stripe on and a publishable key is set.
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
let stripePromise = null
function getStripe() {
  stripePromise ??= loadStripe(STRIPE_KEY).catch((err) => { stripePromise = null; throw err })
  return stripePromise
}

const FREE_FEATURES = ['Find tutors', 'Request and book sessions', 'Messaging', 'Calendar', 'Pay tutors directly, 0% commission']
const EXPLORER_FEATURES = ['Everything in Free', 'Community forum', 'Study notes and materials', 'Study rooms', 'Live classes', 'Explorer badge']

const unlockedLinks = (tutor) => [
  { to: '/forum', icon: 'forum', label: 'Forum' },
  { to: '/study-notes', icon: 'menu_book', label: 'Study notes' },
  { to: tutor ? '/study-rooms/tutor' : '/study-rooms/student', icon: 'groups', label: 'Study rooms' },
  { to: '/classroom', icon: 'school', label: 'Live classes' },
  { to: '/xp', icon: 'military_tech', label: 'Graduation' },
]

const faq = (price) => [
  [`Why ${price} a month?`, 'It keeps the platform running, and half goes to UNICEF’s education programmes.'],
  ['Do you take a cut of tutoring?', 'No. You pay tutors directly and they keep 100%.'],
  ['Can I cancel anytime?', 'Yes, on this page. A paid plan stays active until the end of the month.'],
]

// The API sends naive UTC timestamps, e.g. "2026-12-03T11:02:15.123456".
function parseUtc(value) {
  const iso = String(value).replace(/(\.\d{3})\d+/, '$1')
  return new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`)
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

// ── Pieces ────────────────────────────────────────────────────────────────────

const Muted = ({ children }) => <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{children}</span>

function Detail({ label, children }) {
  return (
    <div className="row">
      <span style={{ width: 120, flexShrink: 0, fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500 }}>{children}</span>
    </div>
  )
}

function PlanColumn({ name, price, interval, features, children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 22px',
      // Hairlines between the columns. The card clips the outer ones, so this is a vertical
      // divider side by side and a horizontal one once the columns stack.
      borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)', margin: '-1px 0 0 -1px',
    }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>{name}</h2>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)' }}>{price}</span> / {interval}
        </div>
      </div>
      <ul style={{ display: 'grid', gap: 9 }}>
        {features.map((label) => (
          <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
            <Icon name="check" size={16} style={{ color: 'var(--text-muted)' }} />{label}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'auto', minHeight: 34, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function UpgradeAction({ status, price, interval, busy, onCheckout, onDemo }) {
  const label = `Upgrade for ${price}/${interval}`
  if (status.stripe_enabled && STRIPE_KEY) {
    return <button className="btn btn-coral" onClick={onCheckout}>{label}</button>
  }
  if (status.stripe_enabled) {
    return (
      <>
        <button className="btn btn-coral" disabled>{label}</button>
        <Muted>Checkout needs the Stripe publishable key</Muted>
      </>
    )
  }
  return (
    <>
      <button className="btn btn-coral" onClick={onDemo} disabled={busy}>{busy ? 'Activating…' : 'Activate Explorer'}</button>
      <Muted>Demo mode — no card needed</Muted>
    </>
  )
}

function UnlockedCard({ tutor }) {
  return (
    <Card title="Unlocked">
      <div className="row-list">
        {unlockedLinks(tutor).map((l) => (
          <Link key={l.to} to={l.to} className="row">
            <Icon name={l.icon} size={18} style={{ color: 'var(--text-faint)' }} />
            <div className="main"><div className="title">{l.label}</div></div>
            <Icon name="chevron_right" size={18} style={{ color: 'var(--text-faint)' }} />
          </Link>
        ))}
      </div>
    </Card>
  )
}

function Faq({ price }) {
  return (
    <section style={{ marginTop: 28 }}>
      <div className="section-head"><h2>Questions</h2></div>
      {faq(price).map(([q, a]) => (
        <div key={q} style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{q}</div>
          <p style={{ marginTop: 3, fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)' }}>{a}</p>
        </div>
      ))}
    </section>
  )
}

// ── Dialogs ───────────────────────────────────────────────────────────────────

function CheckoutDialog({ price, interval, onClose }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEscape(onClose)

  // Both must stay stable for the lifetime of the embedded checkout.
  const stripe = useMemo(() => getStripe().catch(() => {
    toast.error('Couldn’t load Stripe. Check your connection and try again.')
    closeRef.current()
    return null
  }), [])
  const options = useMemo(() => ({
    fetchClientSecret: () => createCheckoutSession()
      .then(({ data }) => data.client_secret)
      .catch((err) => {
        toast.error(errorMessage(err, 'Could not start checkout'))
        closeRef.current()
        throw err
      }),
  }), [])

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title" style={{ maxWidth: 560 }}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2 id="checkout-title">Explorer · {price}/{interval}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="dialog-body">
          <div style={{ minHeight: 360 }}>
            <EmbeddedCheckoutProvider stripe={stripe} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </div>
    </div>
  )
}

function CancelDialog({ status, until, busy, onConfirm, onClose }) {
  useEscape(onClose)
  const viaStripe = status.managed_by === 'stripe'
  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title" style={{ maxWidth: 420 }}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2 id="cancel-title">Cancel Explorer?</h2>
        </div>
        <div className="dialog-body" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {viaStripe && until ? `You keep Explorer until ${until}.` : 'Explorer ends straight away.'}
        </div>
        <div className="dialog-foot">
          <button className="btn btn-ghost" onClick={onClose}>Keep plan</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel plan'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Views ─────────────────────────────────────────────────────────────────────

function UpgradeView({ status, price, interval, busy, onCheckout, onDemo }) {
  return (
    <>
      <section className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', overflow: 'hidden' }}>
        <PlanColumn name="Free" price="£0" interval={interval} features={FREE_FEATURES}>
          <Muted>Current plan</Muted>
        </PlanColumn>
        <PlanColumn name="Explorer" price={price} interval={interval} features={EXPLORER_FEATURES}>
          <UpgradeAction status={status} price={price} interval={interval} busy={busy} onCheckout={onCheckout} onDemo={onDemo} />
        </PlanColumn>
      </section>
      <Faq price={price} />
    </>
  )
}

function ActiveView({ status, price, interval, until, cancelled, onCancel }) {
  const demo = status.managed_by !== 'stripe'
  return (
    <>
      <Card title="Explorer" style={{ marginBottom: 18 }}
        action={!cancelled && <button className="btn btn-danger btn-sm" onClick={onCancel}>Cancel plan</button>}>
        <div className="row-list">
          <Detail label="Price">{price} / {interval}</Detail>
          <Detail label="Status">
            <Pill tone={cancelled ? 'amber' : 'green'} plain={false}>{cancelled ? 'Cancelled' : 'Active'}</Pill>
          </Detail>
          {until && <Detail label={demo ? 'Active until' : cancelled ? 'Ends' : 'Paid until'}>{until}</Detail>}
          <Detail label="Billing">{demo ? 'Demo, no card' : 'Stripe, monthly'}</Detail>
        </div>
      </Card>
      <UnlockedCard tutor={status.verified_tutor} />
      <Faq price={price} />
    </>
  )
}

function TutorView() {
  return (
    <>
      <Card title="Explorer" style={{ marginBottom: 18 }}>
        <div className="row-list">
          <Detail label="Price">Free</Detail>
          <Detail label="Status"><Pill tone="green" plain={false}>Included</Pill></Detail>
          <Detail label="Access">Verified tutor</Detail>
        </div>
      </Card>
      <UnlockedCard tutor />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Membership() {
  const { refreshSession } = useAuth()
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | confirming | ready | error
  const [busy, setBusy] = useState(null)        // 'activate' | 'cancel'
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const started = useRef(false)

  // The JWT carries is_premium: refresh it so the sidebar and route guards follow.
  const syncSession = () => refreshSession().catch(() => {})

  async function load() {
    setPhase('loading')
    try {
      const { data } = await getMembershipStatus()
      setStatus(data)
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }

  // Back from Stripe's embedded checkout: /membership?session_id=cs_…
  useEffect(() => {
    if (started.current) return
    started.current = true
    const sessionId = search?.session_id
    if (!sessionId) { load(); return }

    navigate({ to: '/membership', search: {}, replace: true })
    setPhase('confirming')
    confirmCheckoutSession(String(sessionId))
      .then(async ({ data }) => {
        setStatus(data)
        setPhase('ready')
        await syncSession()
        toast.success('Welcome to Explorer')
      })
      .catch((err) => {
        toast.error(errorMessage(err, 'We couldn’t confirm your payment. If you were charged, contact us.'))
        load()
      })
  }, [])

  async function activateDemo() {
    setBusy('activate')
    try {
      const { data } = await activateDemoMembership()
      setStatus(data)
      await syncSession()
      toast.success('Explorer activated')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not activate Explorer'))
    } finally {
      setBusy(null)
    }
  }

  async function cancel() {
    setBusy('cancel')
    try {
      const { data } = await cancelMembership()
      setStatus(data)
      setCancelled(Boolean(data.is_premium)) // Stripe plans run to the end of the paid period
      setCancelOpen(false)
      await syncSession()
      toast.success(data.message || 'Membership cancelled')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not cancel your plan'))
    } finally {
      setBusy(null)
    }
  }

  const price = formatMoney((status?.plan?.price_pence ?? 500) / 100)
  const interval = status?.plan?.interval ?? 'month'
  const until = status?.expires_at ? formatDate(parseUtc(status.expires_at), { year: 'numeric' }) : null

  let body
  if (phase === 'confirming') {
    body = (
      <Card>
        <div className="row">
          <Icon name="progress_activity" size={18} style={{ color: 'var(--text-faint)', animation: 'spin 1s linear infinite' }} />
          <div className="main"><div className="title">Confirming your payment…</div></div>
        </div>
      </Card>
    )
  } else if (phase === 'loading') {
    body = <div className="card"><SkeletonRows rows={4} /></div>
  } else if (phase === 'error') {
    body = (
      <Card>
        <EmptyState title="Couldn’t load your membership." action={<button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>} />
      </Card>
    )
  } else if (status.is_premium) {
    body = <ActiveView status={status} price={price} interval={interval} until={until} cancelled={cancelled} onCancel={() => setCancelOpen(true)} />
  } else if (status.verified_tutor) {
    body = <TutorView />
  } else {
    body = (
      <UpgradeView status={status} price={price} interval={interval} busy={busy === 'activate'}
        onCheckout={() => setCheckoutOpen(true)} onDemo={activateDemo} />
    )
  }

  return (
    <HubLayout>
      <PageTitle title="Membership" icon="workspace_premium" />
      <div style={{ maxWidth: 760 }}>
        <div className="dash-head"><h1>Membership</h1></div>
        {body}
      </div>
      {checkoutOpen && <CheckoutDialog price={price} interval={interval} onClose={() => setCheckoutOpen(false)} />}
      {cancelOpen && status && (
        <CancelDialog status={status} until={until} busy={busy === 'cancel'} onConfirm={cancel} onClose={() => setCancelOpen(false)} />
      )}
    </HubLayout>
  )
}
