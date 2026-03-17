/**
 * UserBadges — inline role/plan chips shown next to author names.
 *
 * Usage:
 *   <UserBadges isTutor={true} isPremium={false} />
 *
 * Renders a "Tutor" chip (coral) or "Student" chip (muted), plus an
 * optional gold "Explorer ✦" chip when isPremium is true.
 */
export default function UserBadges({ isTutor = false, isPremium = false }) {
  return (
    <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', verticalAlign: 'middle' }}>
      {isTutor ? (
        <span style={{
          background: 'rgba(255,114,94,0.14)',
          border: '1px solid rgba(255,114,94,0.30)',
          color: '#ff725e',
          fontSize: '9px', fontWeight: '800',
          padding: '1px 6px', borderRadius: '20px',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>Tutor ✦</span>
      ) : (
        <span style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.45)',
          fontSize: '9px', fontWeight: '800',
          padding: '1px 6px', borderRadius: '20px',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>Student</span>
      )}
      {isPremium && (
        <span style={{
          background: 'rgba(251,191,36,0.16)',
          border: '1px solid rgba(251,191,36,0.30)',
          color: '#fbbf24',
          fontSize: '9px', fontWeight: '800',
          padding: '1px 6px', borderRadius: '20px',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>Explorer ✦</span>
      )}
    </span>
  )
}
