// Brand review page: every illustration and icon, on navy and on white.
// Not linked from the app; add a route to open it.
import { useMemo, useState } from 'react'
import '../styles/brand.css'
import { ILLUSTRATIONS } from '../components/brand/illustrations'
import { ICONS, BrandIcon } from '../components/brand/icons'
import { Logo, LogoMark } from '../components/brand/Logo'

const THEMES = [
  {
    key: 'dark', label: 'On navy', className: 'brand-dark',
    bg: '#1b263b', fg: '#ffffff', muted: '#b0bec5', faint: '#8392a8', card: 'rgba(176, 190, 197, 0.07)', border: 'rgba(176, 190, 197, 0.16)',
  },
  {
    key: 'light', label: 'On white', className: 'brand-light',
    bg: '#ffffff', fg: '#1b263b', muted: '#4f5f74', faint: '#7a8899', card: '#f2f5f7', border: 'rgba(27, 38, 59, 0.12)',
  },
]

const ILLUSTRATION_NAMES = Object.keys(ILLUSTRATIONS)
const ICON_NAMES = Object.keys(ICONS)

// Aliases share a drawing with an earlier name; label them so the set is easy to audit.
const ALIAS_OF = (() => {
  const first = new Map()
  const out = {}
  for (const name of ICON_NAMES) {
    const glyph = ICONS[name]
    if (first.has(glyph)) out[name] = first.get(glyph)
    else first.set(glyph, name)
  }
  return out
})()

const sectionTitle = (t) => ({ margin: '0 0 16px', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted })
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 }

function ThemeSection({ theme: t, backdrop, iconNames }) {
  return (
    <section className={t.className} style={{ background: t.bg, color: t.fg, padding: '40px clamp(16px, 4vw, 48px)' }}>
      <h2 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 800 }}>{t.label}</h2>

      <h3 style={sectionTitle(t)}>Logo</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28, marginBottom: 44 }}>
        <Logo size={36} />
        <Logo size={24} />
        {[16, 24, 32, 48, 64].map((s) => <LogoMark key={s} size={s} title={`Logo mark ${s}px`} />)}
      </div>

      <h3 style={sectionTitle(t)}>Illustrations · {ILLUSTRATION_NAMES.length}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, marginBottom: 44 }}>
        {ILLUSTRATION_NAMES.map((name) => {
          const Scene = ILLUSTRATIONS[name]
          return (
            <figure key={name} style={{ margin: 0, border: `1px solid ${t.border}`, borderRadius: 14, padding: 12 }}>
              <Scene backdrop={backdrop} />
              <figcaption style={{ ...mono, fontSize: 12, marginTop: 8, color: t.muted }}>{name}</figcaption>
            </figure>
          )
        })}
      </div>

      <h3 style={sectionTitle(t)}>Icons · {iconNames.length}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 8 }}>
        {iconNames.map((name) => (
          <div
            key={name}
            title={name}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 6px 10px',
              borderRadius: 10, background: t.card, border: `1px solid ${t.border}`, minWidth: 0,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BrandIcon name={name} size={24} />
              <BrandIcon name={name} size={18} style={{ color: t.muted }} />
              <BrandIcon name={name} size={16} style={{ color: 'var(--coral, #ff725e)' }} />
            </span>
            <span style={{ ...mono, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            {ALIAS_OF[name] && <span style={{ ...mono, fontSize: 10, color: t.faint }}>= {ALIAS_OF[name]}</span>}
          </div>
        ))}
      </div>
    </section>
  )
}

export default function BrandGallery() {
  const [backdrop, setBackdrop] = useState(true)
  const [query, setQuery] = useState('')
  const iconNames = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? ICON_NAMES.filter((n) => n.includes(q)) : ICON_NAMES
  }, [query])

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Noto Sans JP', system-ui, sans-serif" }}>
      <header
        className="brand-dark"
        style={{
          position: 'sticky', top: 0, zIndex: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16,
          padding: '12px clamp(16px, 4vw, 48px)', background: '#18223a', color: '#ffffff',
          borderBottom: '1px solid rgba(176, 190, 197, 0.16)',
        }}
      >
        <Logo size={22} />
        <span style={{ fontSize: 13, color: '#b0bec5' }}>
          Brand gallery · {ILLUSTRATION_NAMES.length} illustrations · {ICON_NAMES.length} icons
        </span>
        <span style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={backdrop} onChange={(e) => setBackdrop(e.target.checked)} />
          Backdrops
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <BrandIcon name="search" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter icons"
            aria-label="Filter icons"
            style={{
              width: 160, padding: '6px 10px', borderRadius: 8, font: 'inherit', fontSize: 13,
              color: '#ffffff', background: 'rgba(176, 190, 197, 0.08)', border: '1px solid rgba(176, 190, 197, 0.16)',
            }}
          />
        </label>
      </header>
      {THEMES.map((t) => <ThemeSection key={t.key} theme={t} backdrop={backdrop} iconNames={iconNames} />)}
    </div>
  )
}
