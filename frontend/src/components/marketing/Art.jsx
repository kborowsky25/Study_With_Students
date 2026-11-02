// Every illustration on the public site goes through <Art name="…" />: each slot names a
// scene from our brand set (components/brand/illustrations.jsx), so a drawing can be
// swapped for another here without touching the pages. Scenes take their colours from
// styles/brand.css, so they follow the theme.
import { ILLUSTRATIONS } from '../brand/illustrations'

const ART = {
  // Homepage
  tutoring:    'TutoringOneToOne',
  group:       'GroupStudy',
  forum:       'StudentForum',
  events:      'Events',
  uniGuidance: 'UniGuidance',
  studyNotes:  'StudyNotes',
  step1:       'Profile',
  step2:       'Students',
  step3:       'FindTutor',
  becomeTutor: 'BecomeTutor',

  // How it works
  findTutor:   'FindTutor',
  uni:         'UniGuidance',
  classes:     'Classes',
  studyRooms:  'GroupStudy',
  forumBoard:  'StudentForum',
  stepJoin:    'Rocket',
  stepMode:    'Students',
  stepExplore: 'Messages',
  studentMode: 'StudyNotes',
  tutorMode:   'Profile',

  // About us, Become a tutor, log in and sign up
  mission:     'Students',
  space:       'BecomeTutor',
  earnings:    'Earnings',
  login:       'Rocket',
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
