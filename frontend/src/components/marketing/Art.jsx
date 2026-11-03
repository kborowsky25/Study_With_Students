// Every illustration on the public site goes through <Art name="…" />: each slot names a
// scene from our brand set (components/brand/illustrations.jsx), so a drawing can be
// swapped for another here without touching the pages. Scenes take their colours from
// styles/brand.css, so they follow the theme.
import { ILLUSTRATIONS } from '../brand/illustrations'

const ART = {
  // Homepage: the five scenes from the original hero, one per part of the platform
  tutoring:    'TutoringOneToOne',
  studyRooms:  'GroupStudy',
  forum:       'StudentForum',
  liveClasses: 'Events',
  graduation:  'UniGuidance',

  // Inner pages
  howItWorks:  'FindTutor',
  mission:     'Students',
  becomeTutor: 'Earnings',
  founding:    'Profile',

  // Log in and sign up; the rocket also closes the homepage
  login:       'Rocket',
  rocket:      'Rocket',
  signup:      'BecomeTutor',

  // 404
  notFound:    'EmptyPeek',
}

/** Decorative by default; pass `alt` to give the scene an accessible name. */
export default function Art({ name, alt = '', className, backdrop = true }) {
  const Scene = ILLUSTRATIONS[ART[name]]
  if (!Scene) return null
  return <Scene title={alt} className={className} backdrop={backdrop} />
}
