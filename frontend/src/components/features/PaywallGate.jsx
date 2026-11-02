import { Link } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { hasExplorerAccess } from '../../lib/access'
import { Icon } from '../ui'

const FEATURES = ['Community forum', 'Study notes and materials', 'Study rooms', 'Live classes']

/**
 * PaywallGate — shows its children only to people with Explorer access
 * (Explorer members and verified tutors, the same rule the API enforces).
 * Everyone else sees the £5/month upgrade prompt instead.
 *
 *   <PaywallGate feature="Community Forum">
 *     <ForumPage />
 *   </PaywallGate>
 */
export default function PaywallGate({ feature = 'This feature', children, bypass = false }) {
  const { user } = useAuth()
  if (bypass || hasExplorerAccess(user)) return children

  return (
    <section className="card" style={{ maxWidth: 420, margin: '48px auto 0', padding: '22px 24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>{feature} is part of Explorer</h2>
      <ul style={{ display: 'grid', gap: 9 }}>
        {FEATURES.map((label) => (
          <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
            <Icon name="check" size={16} style={{ color: 'var(--text-muted)' }} />{label}
          </li>
        ))}
      </ul>
      <Link to="/membership" className="btn btn-coral">Upgrade for £5/month</Link>
    </section>
  )
}
