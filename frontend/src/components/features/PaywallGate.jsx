import { Link } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'

/**
 * PaywallGate — wraps premium-only content.
 *
 * Usage:
 *   <PaywallGate feature="Forum">
 *     <ForumPage />
 *   </PaywallGate>
 *
 * If the user is on the free plan, they see an upgrade prompt instead.
 */
export default function PaywallGate({ feature = 'This feature', children, bypass = false }) {
  const { isPremium } = useAuth()

  if (isPremium || bypass) return children

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '420px',
      textAlign: 'center',
      padding: '40px 24px',
    }}>
      {/* Lock icon in a coloured circle */}
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        background: 'rgba(255,114,94,0.12)',
        border: '1px solid rgba(255,114,94,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#ff725e' }}>lock</span>
      </div>

      <h2 style={{ color: 'var(--text)', fontWeight: '900', fontSize: '20px', marginBottom: '8px' }}>
        Explorer Plan Required
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '360px', lineHeight: 1.6, marginBottom: '8px' }}>
        <strong style={{ color: 'var(--text)' }}>{feature}</strong> is part of the{' '}
        <span style={{ color: '#fbbf24', fontWeight: '700' }}>Explorer Plan</span>.
        Unlock the Forum, Study Rooms, and more for just £2/month.
      </p>

      {/* Feature list */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '14px 20px',
        margin: '16px 0 24px',
        width: '100%',
        maxWidth: '340px',
        textAlign: 'left',
      }}>
        {[
          { icon: 'forum',   label: 'Community Forum — ask questions, share knowledge' },
          { icon: 'groups',  label: 'Study Rooms — join live group sessions' },
          { icon: 'school',  label: 'Classroom — join live group tutoring sessions' },
          { icon: 'star',    label: 'Explorer badge on your profile' },
        ].map(({ icon, label }) => (
          <div key={icon} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fbbf24', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{label}</span>
          </div>
        ))}
      </div>

      <Link to="/membership" className="btn-primary" style={{ padding: '11px 28px', fontSize: '14px' }}>
        Upgrade to Explorer — £2/mo
      </Link>
      <p style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '10px' }}>
        Cancel anytime · No commitment
      </p>
    </div>
  )
}
