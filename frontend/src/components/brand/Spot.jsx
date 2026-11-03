// Spot icons for the public pages: one of our brand glyphs, drawn large over a hand-cut
// paper shape in one of the illustration colours, offset like a print that slipped. The
// shape, colour and tilt follow the item's place in its list, so neighbours never repeat
// the same tile. Colours come from styles/brand.css, so spots follow the theme.
import { BrandIcon } from './icons'
import '../../styles/spots.css'

// Irregular, hand-cut shapes in a 56 × 56 box, sitting low and right of the glyph
const SHAPES = {
  pebble: 'M15 23C17 13 29 8 39 11C48 14 52 25 49 35C46 45 36 50 26 48C17 46 13 33 15 23Z',
  leaf:   'M13 41C11 27 21 14 35 12C45 11 51 17 50 27C49 41 37 50 25 50C18 50 14 46 13 41Z',
  ticket: 'M16 15C25 12 37 12 46 15C49 24 50 35 47 45C37 48 25 48 15 46C12 36 12 25 16 15Z',
  round:  'M31 10C41 10 50 18 50 29C50 41 42 50 31 50C19 50 11 42 12 30C13 19 21 10 31 10Z',
}

const LOOKS = [
  { shape: 'pebble', tone: 'coral', turn: -8,  spark: true },
  { shape: 'leaf',   tone: 'leaf',  turn: 10 },
  { shape: 'ticket', tone: 'blush', turn: -4 },
  { shape: 'round',  tone: 'stone', turn: 14,  spark: true },
  { shape: 'leaf',   tone: 'coral', turn: -16 },
  { shape: 'pebble', tone: 'blush', turn: 6 },
]

/** `icon`: a BrandIcon name; `index`: the item's place in its list, which picks the look. */
export default function Spot({ icon, index = 0, size = 56 }) {
  const look = LOOKS[index % LOOKS.length]
  return (
    <span className={`spot spot-${look.tone}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg className="spot-shape" viewBox="0 0 56 56" focusable="false">
        <path d={SHAPES[look.shape]} transform={`rotate(${look.turn} 31 30)`} />
        {look.spark && <path className="spot-spark" d="M48 5l1.3 3.2 3.2 1.3-3.2 1.3L48 14l-1.3-3.2-3.2-1.3 3.2-1.3z" />}
      </svg>
      <BrandIcon name={icon} size={Math.round(size * 0.58)} strokeWidth={1.8} />
    </span>
  )
}
