// Study With Students — logo.
// The mark is the brand rocket from the Rocket illustration, reduced to one
// solid colour with the porthole cut out, tilted for take-off.

// Rocket drawn upright around (0, 0), nose up; transformed into the 24×24 box.
const BODY = 'M0-42C13-31 17-13 15.5 6L13.5 23H-13.5L-15.5 6C-17-13-13-31 0-42Z'
const PORTHOLE = 'M-7.25-13a7.25 7.25 0 1 0 14.5 0a7.25 7.25 0 1 0-14.5 0Z'
const FINS = 'M-14.5 1.5C-22.5 5.5-27.5 13-27.8 23.4c-.1 2.9 2 4.4 4.6 3.2L-13 21.4ZM14.5 1.5c8 4 13 11.5 13.3 21.9.1 2.9-2 4.4-4.6 3.2L13 21.4Z'
const FLAME = 'M-6.5 29.5C-6.5 38-3 45 0 51c3-6 6.5-13 6.5-21.5Z'
const FIT = 'translate(12 12) scale(0.334) translate(3.2 -3.2) rotate(45)'

/** The rocket on its own (24×24 artwork). */
export function LogoMark({ size = 24, color = 'var(--coral, #ff725e)', title, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ color, flexShrink: 0, ...style }}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g transform={FIT} fill="currentColor">
        <path d={FINS} />
        <path d={`${BODY}${PORTHOLE}`} fillRule="evenodd" />
        <path d={FLAME} />
      </g>
    </svg>
  )
}

/**
 * Mark + "Study with Students" wordmark (Noto Sans JP 800, "Students" in coral).
 * `size` is the mark's height in px; the wordmark scales with it. Pass
 * `wordmark={false}` for the mark alone. The wordmark text uses the current
 * text colour, so it works on navy and on white.
 */
export function Logo({ wordmark = true, size = 24, className, style, title = 'Study with Students' }) {
  if (!wordmark) return <LogoMark size={size} title={title} className={className} style={style} />
  return (
    <span className={className ? `sws-logo ${className}` : 'sws-logo'} style={{ gap: Math.round(size * 0.32), ...style }}>
      <LogoMark size={size} />
      <span
        style={{
          fontFamily: "'Noto Sans JP', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: Math.round(size * 0.72),
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        Study with <span style={{ color: 'var(--coral, #ff725e)' }}>Students</span>
      </span>
    </span>
  )
}

export default Logo
