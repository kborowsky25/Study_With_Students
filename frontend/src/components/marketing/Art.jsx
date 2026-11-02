// Every illustration on the public site goes through <Art name="…" />, so the
// drawings can be swapped in one place.
//
// Today each name points at one of the original image files in public/static/images.
// `native` is the export from components/brand that should replace it. When that set
// lands, the swap is this file only:
//
//   import * as Brand from '../brand'
//   ...
//   const Native = Brand[art.native]
//   if (Native) return <Native className={className} aria-hidden={alt ? undefined : true} />
//
// Entries without `native` (the login/signup scenes, the About page globe) keep their file.
import { Icon } from '../ui'

const IMG = '/static/images'

const ART = {
  // Homepage hero, around the headline
  tutoring:    { native: 'TutoringOneToOne', file: `${IMG}/homepage/tutoring.svg` },
  group:       { native: 'GroupStudy',       file: `${IMG}/homepage/group.svg` },
  forum:       { native: 'StudentForum',     file: `${IMG}/homepage/forum1.svg` },
  events:      { native: 'Events',           file: `${IMG}/homepage/events.svg` },
  uniGuidance: { native: 'UniGuidance',      file: `${IMG}/homepage/uniguide.svg` },

  // Features
  findTutor:   { native: 'FindTutor',    file: `${IMG}/howitworks/tutors.svg` },
  uni:         { native: 'UniGuidance',  file: `${IMG}/howitworks/uni.svg` },
  classes:     { native: 'Classes',      file: `${IMG}/howitworks/events.svg` },
  studyRooms:  { native: 'GroupStudy',   file: `${IMG}/howitworks/group.svg` },
  forumBoard:  { native: 'StudentForum', file: `${IMG}/howitworks/forum.svg` },
  studyNotes:  { native: 'StudyNotes',   file: `${IMG}/homepage/subjects.svg` },

  // People and modes
  students:    { native: 'Students',    file: `${IMG}/hub/students.svg` },
  tutorMode:   { native: 'Profile',     file: `${IMG}/hub/tutor.svg` },
  becomeTutor: { native: 'BecomeTutor', file: `${IMG}/homepage/becoming_tutor.svg` },
  space:       { native: 'BecomeTutor', file: `${IMG}/becometutor/space.svg` },
  earnings:    { native: 'Earnings',    file: `${IMG}/becometutor/list.svg` },
  mission:     { file: `${IMG}/aboutus/earth.svg` },

  // The three steps (homepage and the How it works cards)
  step1:       { native: 'Profile',      file: `${IMG}/homepage/step1.svg` },
  step2:       { native: 'Students',     file: `${IMG}/homepage/step2.svg` },
  step3:       { native: 'FindTutor',    file: `${IMG}/homepage/step3.svg` },
  stepJoin:    { native: 'Profile',      file: `${IMG}/howitworks/step1.svg` },
  stepMode:    { native: 'Students',     file: `${IMG}/howitworks/step2.svg` },
  stepExplore: { native: 'Messages',     file: `${IMG}/howitworks/step3.svg` },

  // Log in / sign up scenes
  login:       { file: `${IMG}/login/login.svg` },
  signup:      { file: `${IMG}/signup/signup.svg` },

  // The logo mark is the Material rocket until the native one exists
  rocket:      { native: 'Rocket', icon: 'rocket_launch' },
}

export default function Art({ name, alt = '', className = '', eager = false }) {
  const art = ART[name]
  if (!art) return null
  if (art.icon) return <Icon name={art.icon} className={className} />
  return (
    <img
      src={art.file}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable="false"
    />
  )
}
