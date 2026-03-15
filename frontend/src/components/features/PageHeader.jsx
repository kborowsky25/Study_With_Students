/**
 * PageHeader — standardised icon-box + title + subtitle header.
 *
 * Usage:
 *   <PageHeader
 *     icon="calendar_month"
 *     iconColor="#ff725e"
 *     title="My Calendar"
 *     subtitle="3 upcoming sessions"
 *     right={<button>Today</button>}
 *     compact   // smaller icon + tighter margin for constrained layouts
 *   />
 */
export default function PageHeader({
  icon,
  iconColor = '#ff725e',
  title,
  subtitle,
  badge,
  right,
  compact = false,
  animate = true,
  style: wrapStyle,
}) {
  const boxSize   = compact ? '36px' : '40px'
  const iconSize  = compact ? '20px' : '22px'
  const radius    = compact ? '10px' : '11px'
  const titleSize = compact ? '22px' : '26px'

  return (
    <div
      className={animate ? 'animate-slide-up' : ''}
      style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: '16px',
        marginBottom: compact ? '12px' : '28px',
        ...wrapStyle,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: subtitle != null ? (compact ? '4px' : '6px') : 0 }}>
          {icon && (
            <div style={{
              width: boxSize, height: boxSize, borderRadius: radius, flexShrink: 0,
              background: `linear-gradient(135deg, ${iconColor}30, ${iconColor}0d)`,
              border: `1px solid ${iconColor}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: iconSize }}>{icon}</span>
            </div>
          )}
          <h1 className="page-title" style={{ fontSize: titleSize, fontWeight: '900', letterSpacing: '-0.03em', margin: 0 }}>
            {title}
          </h1>
          {badge}
        </div>
        {subtitle != null && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}
