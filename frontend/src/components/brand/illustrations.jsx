// Study With Students — original brand illustrations.
//
// Flat, faceless, hand-authored SVG scenes on one 320×240 canvas. Every colour is
// a CSS variable from styles/brand.css (dark/light aware) with a light-mode
// fallback, so a scene still renders before the stylesheet loads.
//
// Scenes are built from a small kit (Person, Bust, props) so proportions stay
// consistent: a standing person is ~143 units tall with a ~19 unit head (1/7),
// limbs are round-capped strokes of fixed width, joints come from simple IK.
import { useId } from 'react'

/* ── Palette ─────────────────────────────────────────────────────────────── */

const v = (name, fallback) => `var(--ill-${name}, ${fallback})`

export const ILL = {
  coral: v('coral', '#ff725e'),
  coralDeep: v('coral-deep', '#e8573f'),
  coralSoft: v('coral-soft', '#ffd6ce'),
  ink: v('ink', '#1b263b'),
  inkDeep: v('ink-deep', '#0f1727'),
  inkSoft: v('ink-soft', '#3d4d6a'),
  skin1: v('skin-1', '#f6cdb1'),
  skin2: v('skin-2', '#d39a72'),
  skin3: v('skin-3', '#8d5a3b'),
  paper: v('paper', '#ffffff'),
  paperShade: v('paper-shade', '#e9eef1'),
  paperLine: v('paper-line', '#d3dce1'),
  slate: v('slate', '#b0bec5'),
  slateLight: v('slate-light', '#cfd8dc'),
  slateDeep: v('slate-deep', '#8e9fa9'),
  cloth: v('cloth', '#a6b6c1'),
  clothDeep: v('cloth-deep', '#8a9dab'),
  line: v('line', '#cfd8dc'),
  plant: v('plant', '#7db699'),
  plantDeep: v('plant-deep', '#5c9a7d'),
  backdrop: v('backdrop', '#f0f3f6'),
  sparkle: v('sparkle', '#b0bec5'),
}

// The flat second tone used for the far limb of a garment.
const SHADE = {
  coral: 'coralDeep', coralSoft: 'coral', ink: 'inkDeep', inkSoft: 'ink', paper: 'paperShade',
  paperShade: 'slateLight', cloth: 'clothDeep', slate: 'slateDeep', slateLight: 'slate', plant: 'plantDeep',
}
const col = (k) => ILL[k] ?? k
const shade = (k) => ILL[SHADE[k]] ?? col(k)

/* ── Geometry helpers ────────────────────────────────────────────────────── */

const r1 = (n) => Math.round(n * 10) / 10

// Two-bone IK: joint between `from` and the target, bending to one side.
function ik([sx, sy], [tx, ty], a, b, bend) {
  const dx = tx - sx
  const dy = ty - sy
  let d = Math.hypot(dx, dy) || 0.001
  const ux = dx / d
  const uy = dy / d
  d = Math.min(d, a + b - 0.05)
  const along = (a * a - b * b + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, a * a - along * along))
  const joint = [r1(sx + ux * along - uy * h * bend), r1(sy + uy * along + ux * h * bend)]
  return [joint, [r1(sx + ux * d), r1(sy + uy * d)]]
}

const circlePath = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`

function Stroke({ d, c, w, ...rest }) {
  return <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...rest} />
}

/* ── People ──────────────────────────────────────────────────────────────── */
// A person is drawn facing right in "hip space": the hip centre is (0, 0) and
// y grows downward. `flip` mirrors the whole figure to face left.

const GROUND = 212
const ARM = [22.5, 21.5]
const LEG = [33, 31]
const SHOULDER = { lead: [10, -39.5], trail: [-10, -39.5] }
const HEAD = [1.2, -58.4]
const HEAD_R = [8.4, 9.6]

// Hand target relative to the shoulder, and which way the elbow bends.
const LEAD_ARM = {
  down: [[3, 44], 1],
  relaxed: [[7, 41], 1],
  hip: [[2, 27], -1],
  hold: [[13, 11], 1],
  type: [[22, 21], 1],
  write: [[21, 27], 1],
  present: [[32, 3], 1],
  reach: [[42, -9], 1],
  point: [[22, -36], 1],
  wave: [[12, -33], 1],
  up: [[5, -43], 1],
}
const TRAIL_ARM = {
  down: [[-3, 44], -1],
  relaxed: [[-6, 41], -1],
  hip: [[-2, 27], 1],
  hold: [[13, 13], 1],
  type: [[25, 22], 1],
  back: [[-13, 41], -1],
  wave: [[-12, -33], -1],
  up: [[-5, -43], -1],
}

// Leg hip joint + ankle target (hip space). `hipY` lifts the figure so its
// soles meet the ground line.
const LEGS = {
  stand: { hipY: -74, trail: [[-5, 3], [-6, 66.5]], lead: [[5, 3], [6.5, 66.5]] },
  walk: { hipY: -74, trail: [[-4, 3], [-16, 65.5]], lead: [[4, 3], [15, 66.5]] },
  step: { hipY: -74, trail: [[-4, 3], [-9, 66.5]], lead: [[5, 3], [21, 50.5]] },
  sit: { hipY: -41.5, trail: [[-3, 2], [25, 34]], lead: [[3, 2], [30, 34]] },
}

const TORSO = 'M-11.6 4.6C-11.2-5-10.8-12-11.6-22C-12.4-32-12.6-44-2.6-44H3.4C13.6-44 13.4-32 12.6-22C11.8-12 11.4-5 11.8 4.6Q11.8 6.4 10 6.4H-9.8Q-11.6 6.4-11.6 4.6Z'
const PELVIS = 'M-11.4-2H11.6L11.9 7Q11.9 10.5 8.4 10.5H-8.2Q-11.7 10.5-11.7 7Z'
const SHOULDERS = 'M-16.5 0C-16.5-9.5-11.5-15.5-3.5-15.5H4.5C12.5-15.5 17.5-9.5 17.5 0Z'

const shoePath = ([x, y]) =>
  `M${x - 5} ${y + 7.5}V${y + 1.5}Q${x - 5} ${y - 1.5} ${x - 1.5} ${y - 1.5}H${x + 2.5}Q${x + 4} ${y + 1.5} ${x + 8.5} ${y + 2.5}Q${x + 12.5} ${y + 3.5} ${x + 12.5} ${y + 6.5}V${y + 7.5}Z`

// Hair, relative to the head centre, facing right (the back of the head is -x).
const HAIR = {
  short: {
    front: 'M-8.3 2.4C-10.5-3.6-9.6-10.6-3.6-12.4C1.6-13.9 7.6-12.2 9.5-7C9.8-6.1 9.5-5.3 8.7-5.6C5.8-6.6 2.6-6.8 0.2-5.6C-2.6-4.2-3.4-1.4-3.8 2.2C-4 3.4-5 4-6 4C-7 4-8 3.4-8.3 2.4Z',
  },
  buzz: {
    front: 'M-8.5 1.2C-9.3-5.8-6.2-10.8 0.4-10.9C5.4-11 8.6-8.2 9.1-4.8C6.2-6 2.8-6.3 0.1-5.3C-2.7-4.2-3.9-1.8-4.4 1.4C-4.6 2.6-5.6 3.2-6.6 3.1C-7.6 3-8.3 2.2-8.5 1.2Z',
  },
  ponytail: {
    back: 'M-6.6-9.2C-12-10.4-16.6-6.4-16.9 0.4C-17.1 5.2-15.8 9.6-12.6 13.4C-13.6 7.8-12.2 3.2-8.2 0.2Z',
    front: 'M-8.4 1.6C-9.8-5.4-8.2-11-2.4-12.3C3-13.4 8-11 9.4-6.3C6.3-7.6 2.6-7.7-0.2-6.5C-2.9-5.3-4.1-2.5-4.6 0.9C-4.8 2.4-5.8 3.1-6.8 3C-7.7 2.9-8.2 2.4-8.4 1.6Z',
    tie: [-8.6, -6.8],
  },
  bun: {
    back: circlePath(-3.6, -13, 5.2),
    front: 'M-8.4 1.6C-9.8-5.4-8.2-11-2.4-12.3C3-13.4 8-11 9.4-6.3C6.3-7.6 2.6-7.7-0.2-6.5C-2.9-5.3-4.1-2.5-4.6 0.9C-4.8 2.4-5.8 3.1-6.8 3C-7.7 2.9-8.2 2.4-8.4 1.6Z',
  },
  long: {
    back: 'M-1.8-12.7C-9.8-12.8-13.3-6.6-12.9 0.9C-12.6 7.8-13.3 13.8-14.6 19.4C-10.4 21.4-5.6 21-2.4 19C-4.3 13-4.2 6.4-3 1.6Z',
    front: 'M-8.6 1.2C-10-6-7.6-11.8-1.6-12.8C4.6-13.8 9.6-10.4 9.7-5C7.4-6.6 4.8-6.9 2.6-6C0.6-5.2-1-3.4-2-0.8C-2.8 1.2-3.6 3-4.6 4C-6.4 4-8.2 3-8.6 1.2Z',
  },
  bob: {
    front: 'M8.8-5.6C7.6-11.4 2.6-13.6-2.4-13.2C-8.6-12.6-12.4-7.4-12.1-0.4C-11.9 3.8-11.2 7.6-9.4 10.4H-2.2C-3.8 6.6-4.2 2.4-2.8-1C-1.2-4.6 2.6-6.6 8.8-5.6Z',
  },
  curly: {
    front: [circlePath(-7.4, -4.2, 4.4), circlePath(-4.6, -9.4, 4.6), circlePath(0.8, -11.6, 4.4), circlePath(5.8, -10, 4), circlePath(8.4, -6.4, 2.8), circlePath(-8.4, 1.2, 3.6)].join(''),
  },
  afro: {
    back: circlePath(-2.4, -4.4, 12.6),
    front: 'M-9-1C-9.8-8-5.6-12.6 0.6-12.6C5.8-12.6 9.6-9.6 9.9-5.2C7-6.6 3.2-6.8 0.4-5.8C-2.4-4.8-3.8-2.4-4.4 0.6Z',
  },
}
const HIJAB = 'M0.8-13.6C9-13.6 12.8-7.2 12.2 0.4C11.8 5.6 10.6 9.6 10.2 12.6C12.8 14.8 14.6 17.8 15 21.2H-13C-14.2 15.2-14 8.2-13.2 1.2C-12.2-7.8-7.2-13.6 0.8-13.6Z'

function HairBack({ hair, color }) {
  const back = HAIR[hair]?.back
  return back ? <path d={back} fill={col(color)} /> : null
}

// Head with its hair. Hijab replaces the hair and frames the face.
function Head({ skin, hair, color, cap }) {
  const style = HAIR[hair]
  return (
    <g>
      {hair === 'hijab' ? (
        <>
          <path d={HIJAB} fill={col(color)} />
          <ellipse cx="3" cy="0.6" rx="6.5" ry="7.9" fill={skin} />
        </>
      ) : (
        <>
          <ellipse cx="0" cy="0" rx={HEAD_R[0]} ry={HEAD_R[1]} fill={skin} />
          {style?.front && <path d={style.front} fill={col(color)} />}
          {style?.tie && <circle cx={style.tie[0]} cy={style.tie[1]} r="1.9" fill={ILL.coral} />}
        </>
      )}
      {cap && <GradCapOnHead />}
    </g>
  )
}

function GradCapOnHead() {
  return (
    <g>
      <path d="M-7.6-10.6V-5.6C-2.8-3.4 3.2-3.4 8.6-5.6V-10.6Z" fill={ILL.inkDeep} />
      <path d="M-13.4-11.8L1.6-16.8L15.8-11.8L0.8-7Z" fill={ILL.ink} />
      <Stroke d="M1.4-12L12.6-9.6V-4" c={ILL.coral} w={1.2} />
      <rect x="11.2" y="-4.8" width="2.8" height="5.2" rx="1.2" fill={ILL.coral} />
    </g>
  )
}

function Arm({ side, pose, cloth, skin, sleeves }) {
  const shoulder = SHOULDER[side]
  const [target, bend] = Array.isArray(pose) ? pose : (side === 'lead' ? LEAD_ARM : TRAIL_ARM)[pose]
  const [elbow, wrist] = ik(shoulder, [shoulder[0] + target[0], shoulder[1] + target[1]], ARM[0], ARM[1], bend)
  const len = Math.hypot(wrist[0] - elbow[0], wrist[1] - elbow[1]) || 1
  const hand = [wrist[0] + ((wrist[0] - elbow[0]) / len) * 1.6, wrist[1] + ((wrist[1] - elbow[1]) / len) * 1.6]
  const d = `M${shoulder[0]} ${shoulder[1]}L${elbow[0]} ${elbow[1]}L${wrist[0]} ${wrist[1]}`
  const long = sleeves === 'long'
  const cuff = [r1(shoulder[0] + (elbow[0] - shoulder[0]) * 0.55), r1(shoulder[1] + (elbow[1] - shoulder[1]) * 0.55)]
  return (
    <g>
      <Stroke d={d} c={long ? cloth : skin} w={long ? 7.6 : 6.6} />
      {!long && <Stroke d={`M${shoulder[0]} ${shoulder[1]}L${cuff[0]} ${cuff[1]}`} c={cloth} w={9.4} />}
      <circle cx={r1(hand[0])} cy={r1(hand[1])} r="3.7" fill={skin} />
    </g>
  )
}

function Leg({ hip, ankle, cloth, shoe }) {
  const [knee, foot] = ik(hip, ankle, LEG[0], LEG[1], -1)
  return (
    <g>
      <Stroke d={`M${hip[0]} ${hip[1]}L${knee[0]} ${knee[1]}L${foot[0]} ${foot[1]}`} c={cloth} w={10.4} />
      <path d={shoePath(foot)} fill={shoe} />
    </g>
  )
}

/**
 * A full figure. `x, y` is the point on the ground under the hips (for seated
 * figures, still the floor under the hips); `s` scales it.
 * - Colours (`top`, `bottom`, `shoes`, `hairColor`) are ILL keys or raw colours.
 * - `hair`: short | buzz | ponytail | bun | long | bob | curly | afro | hijab.
 * - `legs`: stand | walk | step | sit. `lean` tilts the upper body (degrees).
 * - `lead` / `trail`: a pose name from LEAD_ARM / TRAIL_ARM, or
 *   `[[dx, dy], bend]` — a hand target relative to the shoulder.
 * Slots, in hip space: `back` behind everything, `hold` in front of the chest
 * but under the hands, `over` on top of everything.
 */
function Person({
  x = 0, y = GROUND, s = 1, flip = false,
  skin = 1, hair = 'short', hairColor = 'ink', cap = false,
  top = 'coral', sleeves = 'long', bottom = 'ink', shoes = 'inkSoft',
  legs = 'stand', lead = 'down', trail = 'down', trailBehind = false, lean = 0,
  back, hold, over,
}) {
  const sk = ILL[`skin${skin}`]
  const L = LEGS[legs]
  const upper = lean ? `rotate(${lean})` : undefined
  const trailArm = <Arm side="trail" pose={trail} cloth={shade(top)} skin={sk} sleeves={sleeves} />
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) translate(0 ${L.hipY})`}>
      <g transform={upper}>
        {back}
        <g transform={`translate(${HEAD[0]} ${HEAD[1]})`}>
          <HairBack hair={hair} color={hairColor} />
        </g>
        {trailBehind && trailArm}
      </g>
      <Leg hip={L.trail[0]} ankle={L.trail[1]} cloth={shade(bottom)} shoe={shade(shoes)} />
      <Leg hip={L.lead[0]} ankle={L.lead[1]} cloth={col(bottom)} shoe={col(shoes)} />
      <path d={PELVIS} fill={col(bottom)} />
      <g transform={upper}>
        <rect x="-2.4" y="-51" width="6.4" height="10" rx="2" fill={sk} />
        <path d={TORSO} fill={col(top)} />
        <ellipse cx="0.8" cy="-44" rx="4.2" ry="2.4" fill={sk} />
        {hold}
        {!trailBehind && trailArm}
        <g transform={`translate(${HEAD[0]} ${HEAD[1]})`}>
          <Head skin={sk} hair={hair} color={hairColor} cap={cap} />
        </g>
        <Arm side="lead" pose={lead} cloth={col(top)} skin={sk} sleeves={sleeves} />
        {over}
      </g>
    </g>
  )
}

/** Head and shoulders; `x, y` is the bottom centre of the shoulders. */
function Bust({ x = 0, y = 0, s = 1, flip = false, skin = 1, hair = 'short', hairColor = 'ink', top = 'coral' }) {
  const sk = ILL[`skin${skin}`]
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <g transform="translate(0.8 -29.6)">
        <HairBack hair={hair} color={hairColor} />
      </g>
      <rect x="-2.4" y="-22" width="6.4" height="9" rx="2" fill={sk} />
      <path d={SHOULDERS} fill={col(top)} />
      <ellipse cx="0.6" cy="-15.4" rx="4.2" ry="2.3" fill={sk} />
      <g transform="translate(0.8 -29.6)">
        <Head skin={sk} hair={hair} color={hairColor} />
      </g>
    </g>
  )
}

/* ── Scene frame ─────────────────────────────────────────────────────────── */

const BLOBS = [
  'M160 34C214 30 262 62 268 116C274 170 236 206 178 210C120 214 66 196 56 146C46 96 100 38 160 34Z',
  'M150 40C206 26 270 58 272 118C274 172 230 204 168 206C104 208 50 182 50 126C50 82 98 52 150 40Z',
  'M168 30C228 36 268 84 262 136C256 184 210 210 156 208C98 206 56 172 58 120C60 66 112 26 168 30Z',
]

/**
 * The 320×240 canvas every scene shares. `title` becomes the accessible name
 * (pass `title=""` for a decorative image); `backdrop={false}` drops the soft
 * blob behind the scene. Other props go to the <svg>.
 */
function Scene({ title, className, style, backdrop = true, blob = 0, children, ...svgProps }) {
  return (
    <svg
      viewBox="0 0 320 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className ? `sws-ill ${className}` : 'sws-ill'}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...svgProps}
    >
      {backdrop && <path d={BLOBS[blob]} fill={ILL.backdrop} />}
      {children}
    </svg>
  )
}

/* ── Props ───────────────────────────────────────────────────────────────── */

function Ground({ y = GROUND, x1 = 24, x2 = 296 }) {
  return <Stroke d={`M${x1} ${y}H${x2 - 40}M${x2 - 31} ${y}H${x2 - 16}M${x2 - 8} ${y}H${x2}`} c={ILL.line} w={1.6} />
}

function Sparkle({ x, y, r = 5, c = ILL.coral }) {
  const k = r * 0.2
  return (
    <path
      d={`M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`}
      fill={c}
    />
  )
}

function Dots({ pts, c = ILL.sparkle }) {
  return <g fill={c}>{pts.map(([x, y, r = 2], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>
}

function Heart({ x, y, s = 1, c = ILL.coral }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 5C-5.5 1.6-7.5-1.4-7.5-4C-7.5-6.6-5.6-8.4-3.4-8.4C-1.9-8.4-0.7-7.6 0-6.4C0.7-7.6 1.9-8.4 3.4-8.4C5.6-8.4 7.5-6.6 7.5-4C7.5-1.4 5.5 1.6 0 5Z"
      fill={c}
    />
  )
}

const leafPath = (L, w) => `M0 0C${w} ${-L * 0.28} ${w * 0.85} ${-L * 0.72} 0 ${-L}C${-w * 0.85} ${-L * 0.72} ${-w} ${-L * 0.28} 0 0Z`
const PLANTS = {
  leafy: [[-58, 24, 7], [58, 24, 7], [-28, 36, 8], [28, 34, 8], [2, 44, 8.5]],
  tall: [[-17, 42, 5], [17, 38, 5], [-6, 58, 5.5], [6, 50, 5.5]],
  sprout: [[-42, 15, 5.5], [42, 15, 5.5], [0, 21, 6]],
}

function Plant({ x, y = 212, s = 1, pot = 'coral', kind = 'leafy', flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      {PLANTS[kind].map(([a, L, w], i) => (
        <path key={i} d={leafPath(L, w)} transform={`translate(0 -20) rotate(${a})`} fill={i % 2 ? ILL.plantDeep : ILL.plant} />
      ))}
      <path d="M-10-20H10L7.6-2Q7.3 0 5.3 0H-5.3Q-7.3 0-7.6-2Z" fill={col(pot)} />
      <rect x="-11.5" y="-23" width="23" height="5.5" rx="2.2" fill={shade(pot)} />
    </g>
  )
}

function Desk({ x, y, w, ground = 212, inset = 20 }) {
  const h = ground - y - 4
  return (
    <g>
      <rect x={x + inset} y={y + 4} width="4.5" height={h} rx="1.5" fill={ILL.slateDeep} />
      <rect x={x + w - inset - 4.5} y={y + 4} width="4.5" height={h} rx="1.5" fill={ILL.slateDeep} />
      <rect x={x} y={y} width={w} height="6.5" rx="3" fill={ILL.slate} />
    </g>
  )
}

/** Side-on chair; `x` is the seat centre, the backrest is behind (left when facing right). */
function Chair({ x, ground = 212, flip = false }) {
  return (
    <g transform={`translate(${x} ${ground}) scale(${flip ? -1 : 1} 1)`}>
      <rect x="-13.6" y="-46" width="3.2" height="16" fill={ILL.slateDeep} />
      <rect x="-16" y="-66" width="7.5" height="25" rx="3.75" fill={ILL.slate} />
      <rect x="-1.8" y="-28" width="3.6" height="25" fill={ILL.slateDeep} />
      <Stroke d="M-12.5-2.4H12.5" c={ILL.slateDeep} w={3.4} />
      <rect x="-16" y="-31" width="31" height="5.5" rx="2.75" fill={ILL.slate} />
    </g>
  )
}

/** Laptop seen from the front; `x` is the centre, `y` the surface it stands on. */
function Laptop({ x, y, w = 48, children }) {
  const h = Math.round(w * 0.64)
  const left = x - w / 2
  return (
    <g>
      <rect x={left} y={y - h - 3.5} width={w} height={h} rx="3.5" fill={ILL.inkSoft} />
      <rect x={left + 3} y={y - h - 0.5} width={w - 6} height={h - 6} rx="1.5" fill={ILL.paper} />
      {children}
      <path d={`M${left - 6} ${y - 3.5}H${x + w / 2 + 6}L${x + w / 2 + 3} ${y}H${left - 3}Z`} fill={ILL.slateDeep} />
    </g>
  )
}

/** Speech bubble with a tail at the bottom-left or bottom-right. */
function Bubble({ x, y, w, h, fill = ILL.coral, tail = 'left', children }) {
  const b = y + h - 1
  const t = tail === 'left'
    ? `M${x + 9} ${b}L${x + 3} ${b + 9}L${x + 21} ${b}Z`
    : `M${x + w - 9} ${b}L${x + w - 3} ${b + 9}L${x + w - 21} ${b}Z`
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={Math.min(11, h / 2)} fill={fill} />
      {tail !== 'none' && <path d={t} fill={fill} strokeLinejoin="round" />}
      {children}
    </g>
  )
}

/** A raised card: a flat offset edge under a rounded panel. */
function Card({ x, y, w, h, r = 8, fill = ILL.paper, edge = ILL.slateLight, children }) {
  return (
    <g>
      <rect x={x} y={y + 3.5} width={w} height={h} rx={r} fill={edge} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />
      {children}
    </g>
  )
}

/** Text placeholder line. */
function Line({ x1, x2, y, c = ILL.paperLine, w = 3 }) {
  return <Stroke d={`M${x1} ${y}H${x2}`} c={c} w={w} />
}

/** Round avatar: a bust clipped to a circle (needs a document-unique `id`). */
function Avatar({ id, cx, cy, r, bg = ILL.paperShade, ...bust }) {
  return (
    <g>
      <clipPath id={id}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <circle cx={cx} cy={cy} r={r} fill={bg} />
      <g clipPath={`url(#${id})`}>
        <Bust x={cx} y={cy + r + 1} s={r / 24} {...bust} />
      </g>
    </g>
  )
}

const POUND = 'M3.4-4.4C3-5.9 1.8-6.8 0.3-6.8C-1.7-6.8-2.9-5.3-2.9-3.3V1.8C-2.9 3.6-3.6 4.8-4.6 5.6H4.4M-5-0.6H1.4'

function Coin({ x, y, r = 12 }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={ILL.coral} />
      <circle cx={x} cy={y} r={r * 0.74} fill="none" stroke={ILL.coralDeep} strokeWidth={r * 0.1} />
      <Stroke d={POUND} c={ILL.paper} w={2} transform={`translate(${x} ${y}) scale(${r / 13})`} />
    </g>
  )
}

function CoinStack({ x, y = 212, n, w = 30 }) {
  const jitter = [0, 1.6, -1, 1.2, -1.4, 0.6, -0.4, 1.4, -1.2, 0.8]
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const cy = y - (i + 1) * 6.2
        const cx = x + jitter[i % jitter.length]
        return (
          <g key={i}>
            <rect x={cx} y={cy} width={w} height="6.2" rx="3.1" fill={ILL.coralDeep} />
            <rect x={cx} y={cy} width={w} height="4.2" rx="2.1" fill={ILL.coral} />
          </g>
        )
      })}
    </g>
  )
}

function Phone({ x, y, a = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <rect x="-4.6" y="-8" width="9.2" height="16" rx="2.2" fill={ILL.inkSoft} />
      <rect x="-3.2" y="-6.3" width="6.4" height="11.4" rx="1" fill={ILL.paper} />
    </g>
  )
}

/** Pencil from its eraser end (x1, y1) to its tip (x2, y2). */
function Pencil({ x1, y1, x2, y2, w = 7 }) {
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  const L = Math.hypot(x2 - x1, y2 - y1)
  const h = w / 2
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${r1(a)})`}>
      <rect x="0" y={-h} width="7" height={w} rx={h} fill={ILL.coralSoft} />
      <rect x="5" y={-h} width="4.5" height={w} fill={ILL.cloth} />
      <rect x="9.5" y={-h} width={L - 21.5} height={w} fill={ILL.coral} />
      <path d={`M${L - 12.5} ${-h}L${L} 0L${L - 12.5} ${h}Z`} fill={ILL.paperShade} />
      <path d={`M${L - 4.6} ${-h * 0.37}L${L} 0L${L - 4.6} ${h * 0.37}Z`} fill={ILL.ink} />
    </g>
  )
}

function PendantLamp({ x, drop = 30 }) {
  return (
    <g>
      <Stroke d={`M${x} 0V${drop}`} c={ILL.slateDeep} w={1.5} />
      <path
        d={`M${x - 14} ${drop + 13}C${x - 14} ${drop + 3} ${x - 8} ${drop - 1} ${x} ${drop - 1}C${x + 8} ${drop - 1} ${x + 14} ${drop + 3} ${x + 14} ${drop + 13}Z`}
        fill={ILL.coral}
      />
      <ellipse cx={x} cy={drop + 13.5} rx="5.5" ry="2.8" fill={ILL.paper} />
    </g>
  )
}

function WallFrame({ x, y, w = 30, h = 36 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={ILL.slateLight} />
      <rect x={x + 3.5} y={y + 3.5} width={w - 7} height={h - 7} rx="1.5" fill={ILL.paper} />
      <circle cx={x + w * 0.64} cy={y + h * 0.34} r={w * 0.11} fill={ILL.coral} />
      <path
        d={`M${x + 3.5} ${y + h - 3.5}L${x + w * 0.36} ${y + h * 0.5}L${x + w * 0.56} ${y + h * 0.72}L${x + w * 0.7} ${y + h * 0.6}L${x + w - 3.5} ${y + h - 3.5}Z`}
        fill={ILL.cloth}
      />
    </g>
  )
}

/** A closed book lying flat, seen from the side: spine left, page edges right. */
function BookSide({ x, y, w, h, cover = 'coral' }) {
  const p = Math.max(2, h * 0.16)
  const px = x + h * 0.5
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h * 0.3} fill={col(cover)} />
      <rect x={px} y={y + p} width={w - h * 0.5 - 1} height={h - 2 * p} rx="1" fill={ILL.paper} />
      <Stroke d={`M${px + 4} ${y + h / 2 - h * 0.12}H${x + w - 5}M${px + 4} ${y + h / 2 + h * 0.12}H${x + w - 5}`} c={ILL.paperLine} w={1} />
      <rect x={x + 3.5} y={y + h * 0.28} width={Math.max(2, h * 0.16)} height={h * 0.44} rx="1" fill={shade(cover)} />
    </g>
  )
}

/** A small upright book held in a hand (front cover facing out). */
function BookUpright({ x, y, w = 15, h = 20, cover = 'inkSoft', a = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <rect x={-w / 2 + 1.6} y={-h / 2 + 1} width={w} height={h} rx="2" fill={ILL.paper} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="2" fill={col(cover)} />
      <rect x={-w / 2 + 3} y={-h / 2 + 4} width={w - 6} height="3" rx="1.5" fill={ILL.paper} />
    </g>
  )
}

function Tick({ x, y, s = 1, c = ILL.paper, w = 2 }) {
  return <Stroke d="M-3.6 0.2L-1 2.8L3.8-2.6" c={c} w={w} transform={`translate(${x} ${y}) scale(${s})`} />
}

function Star({ x, y, r = 5, c = ILL.coral }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.46 : r
    return `${r1(x + Math.cos(a) * rr)} ${r1(y + Math.sin(a) * rr)}`
  })
  return <path d={`M${pts.join('L')}Z`} fill={c} strokeLinejoin="round" stroke={c} strokeWidth={r * 0.18} />
}

/* ── Scenes ──────────────────────────────────────────────────────────────── */

const useUid = () => useId().replace(/[^a-zA-Z0-9_-]/g, '')

export function TutoringOneToOne({ title = 'Two students working through a problem together at a laptop', ...rest }) {
  return (
    <Scene title={title} blob={0} {...rest}>
      <Ground />
      <PendantLamp x={160} drop={30} />
      <WallFrame x={40} y={54} />
      <Chair x={70} />
      <Chair x={250} flip />
      <Desk x={94} y={150} w={132} inset={22} />
      <Person x={72} legs="sit" skin={2} hair="curly" top="coral" bottom="ink" shoes="cloth" lead={[[36, -1], 1]} trail="down" />
      <Person
        x={248} flip legs="sit" skin={1} hair="ponytail" top="cloth" bottom="inkSoft" shoes="coral"
        lead={[[30, 15], 1]} trail={[[30, 18], 1]}
        hold={<Pencil x1={34} y1={-37} x2={44} y2={-21.5} w={3.4} />}
      />
      <Laptop x={160} y={150} w={50}>
        <rect x={140} y={121} width={18} height={4} rx={2} fill={ILL.coral} />
        <Line x1={141} x2={168} y={131} />
        <Line x1={141} x2={160} y={138} />
        <path d="M168 141V125L180 141Z" fill={ILL.cloth} />
        <circle cx={172} cy={137} r={2.2} fill={ILL.coral} />
      </Laptop>
      <path d="M188 150L194 146H218L222 150Z" fill={ILL.paper} />
      <rect x={203} y={145.4} width={1.6} height={4.6} fill={ILL.paperLine} />
      <Bubble x={86} y={68} w={34} h={20} tail="left">
        <Dots pts={[[96, 78, 2.1], [103, 78, 2.1], [110, 78, 2.1]]} c={ILL.paper} />
      </Bubble>
      <Sparkle x={200} y={104} r={5.5} />
      <Sparkle x={124} y={108} r={3.4} c={ILL.sparkle} />
      <Plant x={288} kind="tall" pot="inkSoft" s={0.9} />
    </Scene>
  )
}

export function GroupStudy({ title = 'A group video study session with four classmates on screen', ...rest }) {
  const uid = useUid()
  const tiles = [
    { x: 46, y: 46, skin: 2, hair: 'bun', top: 'coral', active: true },
    { x: 132, y: 46, skin: 1, hair: 'short', top: 'inkSoft' },
    { x: 46, y: 94, skin: 2, hair: 'hijab', hairColor: 'coralDeep', top: 'cloth' },
    { x: 132, y: 94, skin: 3, hair: 'curly', top: 'plant' },
  ]
  return (
    <Scene title={title} blob={1} {...rest}>
      <Ground />
      <rect x={126} y={156} width={8} height={52} fill={ILL.slateDeep} />
      <rect x={104} y={205} width={52} height={7} rx={3.5} fill={ILL.slate} />
      <Plant x={66} kind="leafy" pot="coral" s={0.8} />
      <rect x={36} y={36} width={188} height={124} rx={9} fill={ILL.inkSoft} />
      <rect x={42} y={42} width={176} height={100} rx={4} fill={ILL.paper} />
      {tiles.map((t, i) => (
        <g key={i}>
          <clipPath id={`${uid}-t${i}`}>
            <rect x={t.x} y={t.y} width={82} height={44} rx={3} />
          </clipPath>
          <rect x={t.x} y={t.y} width={82} height={44} rx={3} fill={ILL.paperShade} />
          <g clipPath={`url(#${uid}-t${i})`}>
            <Bust x={t.x + 41} y={t.y + 46} s={0.86} skin={t.skin} hair={t.hair} hairColor={t.hairColor} top={t.top} flip={i % 2 === 1} />
          </g>
          <rect x={t.x + 4} y={t.y + 37} width={14} height={3.5} rx={1.75} fill={ILL.paper} />
          {t.active && <rect x={t.x} y={t.y} width={82} height={44} rx={3} fill="none" stroke={ILL.coral} strokeWidth={2.2} />}
        </g>
      ))}
      <circle cx={116} cy={151} r={3.2} fill={ILL.cloth} />
      <circle cx={130} cy={151} r={3.2} fill={ILL.cloth} />
      <circle cx={144} cy={151} r={3.2} fill={ILL.coral} />
      <Heart x={200} y={24} s={0.8} />
      <Heart x={216} y={12} s={0.55} c={ILL.coralDeep} />
      <Person
        x={262} flip skin={3} hair="ponytail" top="coral" bottom="ink" shoes="cloth"
        lead="wave" trail="hold"
        hold={<BookUpright x={4} y={-28} cover="inkSoft" a={-8} />}
      />
      <Sparkle x={292} y={60} r={4} c={ILL.sparkle} />
    </Scene>
  )
}

export function StudentForum({ title = 'A student sharing questions and replies on the forum', ...rest }) {
  const uid = useUid()
  return (
    <Scene title={title} blob={2} {...rest}>
      <Ground />
      <Stroke d="M164 78V106Q164 112 170 112H178" c={ILL.line} w={2} />
      <Card x={146} y={40} w={116} h={38}>
        <Avatar id={`${uid}-a`} cx={164} cy={59} r={10} skin={3} hair="afro" top="coral" bg={ILL.coralSoft} />
        <Line x1={181} x2={244} y={53} c={ILL.inkSoft} w={3.4} />
        <Line x1={181} x2={228} y={63} />
        <Line x1={181} x2={210} y={71} />
      </Card>
      <Card x={172} y={94} w={110} h={34}>
        <Avatar id={`${uid}-b`} cx={189} cy={111} r={9} skin={1} hair="bob" top="cloth" />
        <Line x1={204} x2={262} y={106} c={ILL.inkSoft} w={3.2} />
        <Line x1={204} x2={246} y={116} />
      </Card>
      <Card x={172} y={142} w={70} h={24}>
        <Heart x={186} y={155} s={0.62} />
        <Line x1={196} x2={228} y={154} />
      </Card>
      <Bubble x={36} y={46} w={34} h={26} tail="right">
        <Stroke d="M49 54.6C49 51.8 51 50.4 53.2 50.4C55.6 50.4 57.4 52 57.4 54.2C57.4 57.6 53.2 57.6 53.2 61" c={ILL.paper} w={2.4} />
        <circle cx={53.2} cy={65.4} r={1.5} fill={ILL.paper} />
      </Bubble>
      <Person
        x={96} skin={2} hair="hijab" hairColor="inkSoft" top="coral" bottom="ink" shoes="cloth"
        lead="point" trail="hold"
        hold={<Phone x={4} y={-27} a={-10} />}
      />
      <Sparkle x={270} y={34} r={5} />
      <Dots pts={[[128, 40, 2.4], [278, 140, 2], [140, 128, 1.8]]} />
      <Plant x={282} kind="sprout" pot="cloth" s={1.1} />
    </Scene>
  )
}

export function Events({ title = 'A student pointing at upcoming sessions on a wall calendar', ...rest }) {
  const cells = []
  const ticks = { '0-1': 1, '1-3': 1, '2-0': 1, '3-2': 1 }
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      const x = 138 + c * 28
      const y = 76 + r * 25
      const k = `${r}-${c}`
      cells.push(
        <g key={k}>
          <rect x={x} y={y} width={22} height={19} rx={4} fill={ticks[k] ? ILL.coral : ILL.paperShade} />
          {ticks[k] && <Tick x={x + 11} y={y + 9.5} s={1.1} />}
          {k === '2-2' && <rect x={x - 2} y={y - 2} width={26} height={23} rx={6} fill="none" stroke={ILL.coral} strokeWidth={2} />}
        </g>,
      )
    }
  }
  return (
    <Scene title={title} blob={0} {...rest}>
      <Ground />
      <Stroke d="M205 22L170 40M205 22L240 40" c={ILL.slateDeep} w={1.4} />
      <circle cx={205} cy={22} r={2.4} fill={ILL.slateDeep} />
      <Card x={128} y={40} w={154} h={142} r={10}>
        <path d="M128 64V50Q128 40 138 40H272Q282 40 282 50V64Z" fill={ILL.coral} />
        <rect x={142} y={49} width={42} height={6} rx={3} fill={ILL.paper} />
        <circle cx={258} cy={52} r={3} fill={ILL.paper} />
        <circle cx={268} cy={52} r={3} fill={ILL.coralDeep} />
        {cells}
      </Card>
      <rect x={158} y={34} width={6} height={14} rx={3} fill={ILL.inkSoft} />
      <rect x={246} y={34} width={6} height={14} rx={3} fill={ILL.inkSoft} />
      <Person
        x={84} skin={1} hair="bob" top="inkSoft" bottom="cloth" shoes="coral"
        lead="point" trail="hip"
      />
      <Sparkle x={112} y={50} r={4.5} />
      <Sparkle x={296} y={84} r={3.6} c={ILL.sparkle} />
      <Plant x={302} kind="leafy" pot="coral" s={0.64} />
    </Scene>
  )
}

export function UniGuidance({ title = 'A graduate in a cap on a stack of books beside a signpost', ...rest }) {
  return (
    <Scene title={title} blob={2} {...rest}>
      <Ground />
      <rect x={48} y={100} width={5} height={112} rx={2} fill={ILL.slateDeep} />
      <circle cx={50.5} cy={99} r={4} fill={ILL.slateDeep} />
      <path d="M31 106H73L81 113.5L73 121H31Q28 121 28 118V109Q28 106 31 106Z" fill={ILL.coral} />
      <Line x1={37} x2={63} y={113.5} c={ILL.paper} w={2.6} />
      <path d="M70 128H29L21 135.5L29 143H70Q73 143 73 140V131Q73 128 70 128Z" fill={ILL.cloth} />
      <Line x1={36} x2={58} y={135.5} c={ILL.paper} w={2.6} />
      <BookSide x={100} y={190} w={150} h={22} cover="inkSoft" />
      <BookSide x={114} y={172} w={124} h={18} cover="coral" />
      <BookSide x={106} y={156} w={126} h={16} cover="cloth" />
      <Person
        x={168} y={156} s={0.84} skin={2} hair="long" cap top="coral" bottom="ink" shoes="cloth"
        lead={[[14, -36], 1]} trail="hip"
        hold={
          <g transform="translate(26 -79) rotate(-52)">
            <rect x={-18} y={-4.6} width={36} height={9.2} rx={4.6} fill={ILL.paperLine} />
            <circle cx={-18} cy={0} r={4.6} fill={ILL.slate} />
            <rect x={-3} y={-5.2} width={6} height={10.4} rx={1.4} fill={ILL.coral} />
          </g>
        }
      />
      <Sparkle x={122} y={58} r={5} />
      <Sparkle x={236} y={50} r={6} c={ILL.sparkle} />
      <Sparkle x={258} y={92} r={3.6} />
      <Dots pts={[[100, 96, 2.2], [282, 132, 2], [140, 28, 1.8]]} />
    </Scene>
  )
}

export function FindTutor({ title = 'A student searching tutor profiles with a magnifying glass', ...rest }) {
  const uid = useUid()
  const rows = [58, 102, 146]
  const people = [
    { skin: 1, hair: 'bun', top: 'coral' },
    { skin: 3, hair: 'short', top: 'inkSoft' },
    { skin: 2, hair: 'long', top: 'cloth' },
  ]
  return (
    <Scene title={title} blob={1} {...rest}>
      <Ground />
      {rows.map((y, i) => (
        <Card key={y} x={150} y={y} w={136} h={34} r={9}>
          <Avatar id={`${uid}-r${i}`} cx={168} cy={y + 17} r={10} {...people[i]} bg={i === 0 ? ILL.coralSoft : ILL.paperShade} />
          <Line x1={185} x2={242} y={y + 12} c={ILL.inkSoft} w={3.2} />
          <Line x1={185} x2={226} y={y + 22} />
          <Star x={268} y={y + 17} r={5} c={i === 0 ? ILL.coral : ILL.paperLine} />
        </Card>
      ))}
      <rect x={150} y={58} width={136} height={34} rx={9} fill="none" stroke={ILL.coral} strokeWidth={2} />
      <Stroke d="M124 106L141 89" c={ILL.inkSoft} w={9} />
      <Stroke d="M120 110L138 92" c={ILL.coral} w={7.5} />
      <clipPath id={`${uid}-lens`}>
        <circle cx={160} cy={72} r={21} />
      </clipPath>
      <g clipPath={`url(#${uid}-lens)`}>
        <rect x={130} y={40} width={64} height={64} fill={ILL.paper} />
        <Avatar id={`${uid}-zoom`} cx={170} cy={76} r={17} bg={ILL.coralSoft} {...people[0]} />
      </g>
      <circle cx={160} cy={72} r={21} fill="none" stroke={ILL.inkSoft} strokeWidth={5.5} />
      <Stroke d="M147 62A16 16 0 0 1 158 56" c={ILL.paper} w={2.4} />
      <Person x={84} skin={3} hair="short" top="coral" bottom="ink" shoes="cloth" lead={[[26, 10], 1]} trail="relaxed" />
      <Sparkle x={196} y={36} r={4.5} />
      <Dots pts={[[120, 46, 2.2], [300, 120, 1.8]]} />
      <Plant x={296} kind="leafy" pot="inkSoft" s={0.62} />
    </Scene>
  )
}

export function Messages({ title = 'Two students chatting with message bubbles between them', ...rest }) {
  return (
    <Scene title={title} blob={0} {...rest}>
      <Ground />
      <Bubble x={106} y={50} w={68} h={26} tail="left">
        <Line x1={116} x2={160} y={59} c={ILL.paper} w={3} />
        <Line x1={116} x2={146} y={67} c={ILL.paper} w={3} />
      </Bubble>
      <Card x={146} y={88} w={70} h={26} r={11} edge={ILL.slateLight} />
      <path d="M201 113L213 122L205 113Z" fill={ILL.paper} />
      <Line x1={156} x2={202} y={97} c={ILL.inkSoft} w={3} />
      <Line x1={156} x2={188} y={105} />
      <Bubble x={110} y={128} w={38} h={18} tail="left" fill={ILL.coralSoft}>
        <Dots pts={[[121, 137, 2.1], [129, 137, 2.1], [137, 137, 2.1]]} c={ILL.coral} />
      </Bubble>
      <Heart x={222} y={80} s={0.75} />
      <Person
        x={70} skin={1} hair="ponytail" top="coral" bottom="ink" shoes="cloth"
        lead="hold" trail="down"
        hold={<Phone x={23} y={-29} a={8} />}
      />
      <Person
        x={250} flip skin={3} hair="buzz" top="cloth" bottom="ink" shoes="coral"
        lead="hold" trail="relaxed"
        hold={<Phone x={23} y={-29} a={8} />}
      />
      <Sparkle x={182} y={40} r={4.2} c={ILL.sparkle} />
      <Dots pts={[[96, 36, 2], [232, 140, 2.2]]} />
      <Plant x={160} kind="sprout" pot="inkSoft" s={0.9} />
    </Scene>
  )
}

export function StudyNotes({ title = 'A student writing in a giant open notebook', ...rest }) {
  const ringYs = [90, 104, 118, 132, 146, 160, 174, 188]
  return (
    <Scene title={title} blob={1} {...rest}>
      <Ground />
      <g transform="translate(36 40) rotate(-12)">
        <rect x={0} y={3} width={30} height={38} rx={3} fill={ILL.slateLight} />
        <rect x={0} y={0} width={30} height={38} rx={3} fill={ILL.paper} />
        <Line x1={6} x2={24} y={10} c={ILL.coral} w={2.6} />
        <Line x1={6} x2={22} y={18} w={2.2} />
        <Line x1={6} x2={18} y={25} w={2.2} />
      </g>
      <rect x={116} y={70} width={172} height={140} rx={7} fill={ILL.inkSoft} />
      <rect x={122} y={76} width={78} height={128} rx={3} fill={ILL.paper} />
      <rect x={204} y={76} width={78} height={128} rx={3} fill={ILL.paper} />
      <Line x1={132} x2={170} y={90} c={ILL.coral} w={3.6} />
      {[104, 116, 128].map((y) => <Line key={y} x1={132} x2={190} y={y} />)}
      <Stroke d="M132 142C136 137 139 146 143 141C147 136 150 146 154 141C157 137 160 145 164 141" c={ILL.inkSoft} w={1.8} />
      {[158, 172, 186].map((y, i) => (
        <g key={y}>
          <rect x={132} y={y - 5} width={10} height={10} rx={2.5} fill={i < 2 ? ILL.coral : ILL.paperShade} />
          {i < 2 && <Tick x={137} y={y} s={0.8} w={1.8} />}
          <Line x1={148} x2={i === 1 ? 172 : 184} y={y} />
        </g>
      ))}
      <circle cx={243} cy={112} r={20} fill={ILL.coralSoft} />
      <path d="M223 148L243 112L263 148Z" fill="none" stroke={ILL.inkSoft} strokeWidth={2.2} strokeLinejoin="round" />
      {[164, 176, 188].map((y) => <Line key={y} x1={214} x2={272} y={y} />)}
      {ringYs.map((y) => <rect key={y} x={196} y={y - 2} width={12} height={4} rx={2} fill={ILL.cloth} />)}
      <Pencil x1={102} y1={72} x2={150} y2={136} w={7.5} />
      <Person x={78} skin={2} hair="curly" top="cloth" bottom="ink" shoes="coral" lead={[[33, 6], 1]} trail="down" />
      <Sparkle x={104} y={50} r={4.6} />
      <Dots pts={[[300, 60, 2], [90, 30, 1.8]]} />
    </Scene>
  )
}

export function Classes({ title = 'A tutor teaching a lesson at a whiteboard', ...rest }) {
  return (
    <Scene title={title} blob={2} {...rest}>
      <Ground />
      <rect x={62} y={150} width={4} height={60} fill={ILL.slateDeep} />
      <rect x={186} y={150} width={4} height={60} fill={ILL.slateDeep} />
      <Stroke d="M54 211H74M178 211H198" c={ILL.slateDeep} w={3} />
      <rect x={38} y={40} width={176} height={112} rx={6} fill={ILL.slateLight} />
      <rect x={43} y={45} width={166} height={102} rx={3} fill={ILL.paper} />
      <rect x={70} y={150} width={112} height={5} rx={2.5} fill={ILL.slate} />
      <rect x={140} y={146.6} width={14} height={4} rx={2} fill={ILL.coral} />
      <path d="M62 132H118L62 72Z" fill="none" stroke={ILL.inkSoft} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M62 122H72V132" fill="none" stroke={ILL.coral} strokeWidth={2.2} />
      <Stroke d="M103 132A15 15 0 0 0 107 120.5" c={ILL.coral} w={2.2} />
      <Line x1={134} x2={188} y={70} c={ILL.inkSoft} w={3.4} />
      <Line x1={134} x2={176} y={82} />
      <Line x1={134} x2={182} y={93} />
      <Line x1={134} x2={160} y={104} />
      <rect x={134} y={115} width={52} height={18} rx={5} fill={ILL.coralSoft} />
      <Line x1={142} x2={168} y={124} c={ILL.coral} w={3} />
      <Tick x={177} y={124} s={0.85} c={ILL.coral} w={2} />
      <Person
        x={248} flip skin={2} hair="hijab" hairColor="inkSoft" top="coral" bottom="ink" shoes="cloth"
        lead={[[24, -30], 1]} trail="hold"
        hold={<BookUpright x={3} y={-27} cover="cloth" a={-6} />}
      />
      <Sparkle x={226} y={46} r={5} />
      <Dots pts={[[292, 96, 2], [24, 120, 1.8]]} />
    </Scene>
  )
}

export function Earnings({ title = 'A tutor carrying a coin past rising earnings bars', ...rest }) {
  const bars = [[184, 36], [208, 58], [232, 82], [256, 108]]
  return (
    <Scene title={title} blob={0} {...rest}>
      <Ground />
      {bars.map(([x, h], i) => (
        <rect key={x} x={x} y={212 - h} width={18} height={h + 4} rx={4} fill={i === 3 ? ILL.coral : ILL.slateLight} />
      ))}
      <Stroke d="M176 164C196 158 212 146 228 128C240 114 252 96 270 84" c={ILL.coral} w={3} />
      <path d="M262.6 78.6L276 80.4L268.8 91.6Z" fill={ILL.coral} strokeLinejoin="round" stroke={ILL.coral} strokeWidth={1.6} />
      <CoinStack x={34} n={7} />
      <CoinStack x={58} n={4} />
      <Person
        x={122} legs="walk" skin={1} hair="bun" top="cloth" bottom="inkSoft" shoes="coral"
        lead={[[16, 11.5], 1]} trail={[[10.5, 12.5], 1]}
        over={<Coin x={13} y={-28} r={12.5} />}
      />
      <Coin x={76} y={70} r={8} />
      <Sparkle x={94} y={56} r={4} />
      <Sparkle x={292} y={60} r={4.6} c={ILL.sparkle} />
      <Dots pts={[[160, 52, 2.2], [52, 120, 1.8]]} />
    </Scene>
  )
}

export function Students({ title = 'Three students standing together', ...rest }) {
  return (
    <Scene title={title} blob={1} {...rest}>
      <Ground />
      <Plant x={42} kind="tall" pot="coral" s={0.95} />
      <Person
        x={100} skin={1} hair="ponytail" top="coral" bottom="ink" shoes="cloth"
        lead="hold" trail="hold"
        hold={
          <g>
            <BookUpright x={14} y={-28} cover="inkSoft" a={-6} />
            <BookUpright x={18} y={-25} w={13} h={17} cover="cloth" a={4} />
          </g>
        }
      />
      <Person
        x={220} flip skin={2} hair="hijab" hairColor="coralDeep" top="inkSoft" bottom="ink" shoes="cloth"
        lead="down" trail="down"
        back={
          <g>
            <rect x={-24} y={-42} width={16} height={34} rx={6} fill={ILL.coral} />
            <rect x={-25} y={-24} width={10} height={13} rx={3.5} fill={ILL.coralDeep} />
          </g>
        }
        over={<Stroke d="M-7-43L-6-24" c={ILL.coralDeep} w={2.6} />}
      />
      <Person x={160} skin={3} hair="afro" top="cloth" bottom="inkSoft" shoes="coral" lead="wave" trail="relaxed" />
      <Sparkle x={196} y={50} r={5} />
      <Sparkle x={122} y={46} r={3.6} c={ILL.sparkle} />
      <Dots pts={[[270, 70, 2.2], [280, 150, 1.8]]} />
    </Scene>
  )
}

export function Profile({ title = 'A tutor presenting their profile card', ...rest }) {
  const uid = useUid()
  return (
    <Scene title={title} blob={2} {...rest}>
      <Ground />
      <Card x={132} y={38} w={150} h={160} r={12}>
        <path d="M132 76V50Q132 38 144 38H270Q282 38 282 50V76Z" fill={ILL.coral} />
        <circle cx={207} cy={80} r={26} fill={ILL.paper} />
        <Avatar id={`${uid}-me`} cx={207} cy={80} r={22} skin={1} hair="bun" top="coral" />
        <circle cx={226} cy={97} r={7.5} fill={ILL.coral} stroke={ILL.paper} strokeWidth={2.4} />
        <Tick x={226} y={97} s={0.8} w={1.8} />
        <Line x1={180} x2={234} y={120} c={ILL.inkSoft} w={4.6} />
        <Line x1={188} x2={226} y={131} />
        {[183, 195, 207, 219, 231].map((x, i) => <Star key={x} x={x} y={145} r={4.6} c={i < 4 ? ILL.coral : ILL.paperLine} />)}
        <rect x={150} y={157} width={34} height={10} rx={5} fill={ILL.coralSoft} />
        <rect x={189} y={157} width={36} height={10} rx={5} fill={ILL.paperShade} />
        <rect x={230} y={157} width={34} height={10} rx={5} fill={ILL.paperShade} />
        <rect x={176} y={176} width={62} height={12} rx={6} fill={ILL.inkSoft} />
        <Line x1={192} x2={222} y={182} c={ILL.paper} w={2.6} />
      </Card>
      <Person x={88} skin={1} hair="bun" top="coral" bottom="ink" shoes="cloth" lead={[[34, 6], 1]} trail="down" />
      <Sparkle x={292} y={34} r={5} />
      <Sparkle x={112} y={56} r={3.6} c={ILL.sparkle} />
      <Dots pts={[[300, 120, 2], [40, 100, 1.8]]} />
    </Scene>
  )
}

export function BecomeTutor({ title = 'A student stepping up towards a coral flag', ...rest }) {
  const blocks = [[110, 18], [168, 36], [226, 54]]
  return (
    <Scene title={title} blob={0} {...rest}>
      <Ground />
      {blocks.map(([x, h]) => (
        <g key={x}>
          <rect x={x} y={212 - h} width={58} height={h + 1.5} fill={ILL.slateLight} />
          <rect x={x} y={212 - h} width={58} height={4} fill={ILL.slate} />
        </g>
      ))}
      <Stroke d="M262 158V70" c={ILL.inkSoft} w={3} />
      <circle cx={262} cy={68} r={3.4} fill={ILL.inkSoft} />
      <path d="M263.5 73C275 68 286 80 300 74V98C286 104 275 92 263.5 97Z" fill={ILL.coral} />
      <Star x={281} y={86} r={5} c={ILL.paper} />
      <Person
        x={156} y={194} legs="step" lean={5} skin={2} hair="short" top="coral" bottom="ink" shoes="cloth"
        lead={[[39, -18], 1]} trail="back"
      />
      <Sparkle x={240} y={52} r={5} c={ILL.sparkle} />
      <Sparkle x={300} y={50} r={3.6} />
      <Dots pts={[[96, 70, 2.2], [210, 120, 1.8], [60, 150, 2]]} />
    </Scene>
  )
}

export function EmptyPeek({ title = 'Someone peeking out of an empty box', ...rest }) {
  return (
    <Scene title={title} blob={2} {...rest}>
      <Ground />
      <Bust x={160} y={186} s={1.5} skin={2} hair="bun" top="coral" />
      <rect x={94} y={156} width={132} height={57} rx={3} fill={ILL.slateLight} />
      <rect x={86} y={148} width={148} height={11} rx={4} fill={ILL.slate} />
      <rect x={150} y={159} width={20} height={54} fill={ILL.coral} />
      <circle cx={140} cy={149.5} r={5.4} fill={ILL.skin2} />
      <circle cx={181} cy={149.5} r={5.4} fill={ILL.skin2} />
      <Stroke d="M201 90C201 84 205 81 209.5 81C214 81 217.5 84 217.5 88C217.5 93.5 210 93.5 210 99" c={ILL.sparkle} w={3} />
      <circle cx={210} cy={106} r={2} fill={ILL.sparkle} />
      <Sparkle x={112} y={100} r={4.6} />
      <Dots pts={[[134, 72, 2], [246, 128, 1.8]]} />
    </Scene>
  )
}

export function Rocket({ title = 'A coral rocket taking off', ...rest }) {
  const puffs = [[160, 136, 12], [140, 151, 10.5], [120, 163, 9.5], [99, 172, 8.5], [79, 179, 7.4], [60, 184, 6.2], [43, 188, 5]]
  return (
    <Scene title={title} blob={1} {...rest}>
      {puffs.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? ILL.paperLine : ILL.cloth} />)}
      <g transform="translate(254 176) rotate(-16)">
        <path d="M-25 0A25 6.5 0 0 1 25 0" fill="none" stroke={ILL.coralDeep} strokeWidth={3} strokeLinecap="round" />
        <circle cx={0} cy={0} r={15} fill={ILL.cloth} />
        <circle cx={-5} cy={-5} r={3} fill={ILL.clothDeep} />
        <circle cx={6} cy={4} r={2} fill={ILL.clothDeep} />
        <path d="M-25 0A25 6.5 0 0 0 25 0" fill="none" stroke={ILL.coral} strokeWidth={3} strokeLinecap="round" />
      </g>
      <g transform="translate(200 96) rotate(45)">
        <path d="M-6.5 29C-6.5 38-3 45 0 51C3 45 6.5 38 6.5 29Z" fill={ILL.coral} />
        <path d="M-3.2 29C-3.2 34.5-1.6 38.5 0 42C1.6 38.5 3.2 34.5 3.2 29Z" fill={ILL.paper} />
        <path d="M-14 1C-22 5-27 13-27.5 23C-27.6 26-25.4 27.6-22.8 26.4L-13.4 21.5Z" fill={ILL.coralDeep} />
        <path d="M14 1C22 5 27 13 27.5 23C27.6 26 25.4 27.6 22.8 26.4L13.4 21.5Z" fill={ILL.coralDeep} />
        <path d="M-8.5 24H8.5L7 30H-7Z" fill={ILL.inkSoft} />
        <path d="M0-42C13-31 17-13 15.5 6L13.5 25H-13.5L-15.5 6C-17-13-13-31 0-42Z" fill={ILL.coral} />
        <path d="M-15.2 9H15.2L14.7 14H-14.7Z" fill={ILL.coralDeep} />
        <circle cx={0} cy={-13} r={9} fill={ILL.inkSoft} />
        <circle cx={0} cy={-13} r={6} fill={ILL.paper} />
        <path d="M-3.4-16.4A4.4 4.4 0 0 1 1.2-17.6" fill="none" stroke={ILL.paperLine} strokeWidth={1.6} strokeLinecap="round" />
      </g>
      <Sparkle x={262} y={40} r={6} c={ILL.sparkle} />
      <Sparkle x={108} y={62} r={4.6} />
      <Sparkle x={292} y={112} r={3.4} />
      <Dots pts={[[140, 40, 2.2], [220, 28, 1.6], [70, 112, 1.8], [300, 150, 2], [196, 196, 1.8]]} />
    </Scene>
  )
}

/** Every scene by name — handy for galleries and pickers. */
export const ILLUSTRATIONS = {
  TutoringOneToOne, GroupStudy, StudentForum, Events, UniGuidance, FindTutor, Messages, StudyNotes,
  Classes, Earnings, Students, Profile, BecomeTutor, EmptyPeek, Rocket,
}

/** The building blocks, for composing new scenes in the same style. */
export const IllustrationKit = {
  Scene, Person, Bust, Avatar, Ground, Sparkle, Dots, Heart, Plant, Desk, Chair, Laptop, Bubble, Card, Line,
  Coin, CoinStack, Phone, Pencil, PendantLamp, WallFrame, BookSide, BookUpright, Tick, Star,
}
