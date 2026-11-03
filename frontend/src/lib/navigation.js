// Single source of truth for hub navigation: the sidebar, the ⌘K palette and
// the "g then key" shortcuts all read from here.

export const STUDENT_NAV = [
  {
    items: [
      { to: '/hub/student',      label: 'Home',         icon: 'space_dashboard', key: 'h' },
      { to: '/messages',         label: 'Messages',     icon: 'chat',            key: 'm', tour: 'messages', badge: 'unread' },
      { to: '/calendar/student', label: 'Calendar',     icon: 'calendar_month',  key: 'c' },
      { to: '/progress',         label: 'Progress',     icon: 'insights',        key: 'i' },
    ],
  },
  {
    title: 'Tutoring',
    items: [
      { to: '/find-tutors',   label: 'Find tutors',  icon: 'person_search',      key: 'f', tour: 'find-tutors' },
      { to: '/active-tutors', label: 'My tutors',    icon: 'cast_for_education', key: 't' },
      { to: '/liked-tutors',  label: 'Saved tutors', icon: 'favorite',           key: 'l' },
      { to: '/payments',      label: 'Payments',     icon: 'payments',           key: 'p', tour: 'payments' },
    ],
  },
  {
    title: 'Community',
    items: [
      { to: '/forum',               label: 'Forum',       icon: 'forum',     key: 'e', tour: 'forum' },
      { to: '/study-notes',         label: 'Study notes', icon: 'menu_book', key: 'n' },
      { to: '/study-rooms/student', label: 'Study rooms', icon: 'groups',    key: 's', tour: 'study-rooms-student' },
      { to: '/classroom',           label: 'Classes',     icon: 'school',    key: 'r' },
    ],
  },
  {
    title: 'You',
    items: [
      { to: '/xp',        label: 'Graduation',     icon: 'military_tech', key: 'x' },
      { to: '/referrals', label: 'Invite friends', icon: 'redeem',        key: 'v' },
    ],
  },
]

export const TUTOR_NAV = [
  {
    items: [
      { to: '/hub/tutor',      label: 'Home',     icon: 'space_dashboard', key: 'h' },
      { to: '/messages',       label: 'Messages', icon: 'chat',            key: 'm', tour: 'messages-tutor', badge: 'unread' },
      { to: '/calendar/tutor', label: 'Schedule', icon: 'calendar_month',  key: 'c', tour: 'calendar-tutor' },
    ],
  },
  {
    title: 'Teaching',
    items: [
      { to: '/active-students', label: 'My students', icon: 'groups_2',       key: 'u', tour: 'my-students' },
      { to: '/earnings',        label: 'Earnings',    icon: 'account_balance', key: 'p', tour: 'earnings' },
      { to: '/tutor-profile',   label: 'Profile',     icon: 'badge',           key: 'o' },
      { to: '/availability',    label: 'Availability',     icon: 'schedule',      key: 'a' },
      { to: '/background-check', label: 'Background check', icon: 'verified_user', key: 'd' },
    ],
  },
  {
    title: 'Community',
    items: [
      { to: '/forum',             label: 'Forum',       icon: 'forum',     key: 'e' },
      { to: '/study-notes',       label: 'Study notes', icon: 'menu_book', key: 'n' },
      { to: '/study-rooms/tutor', label: 'Study rooms', icon: 'groups',    key: 's', tour: 'study-rooms-tutor' },
      { to: '/classroom',         label: 'Classes',     icon: 'school',    key: 'r' },
    ],
  },
  {
    title: 'You',
    items: [
      { to: '/xp',        label: 'Graduation',     icon: 'military_tech', key: 'x' },
      { to: '/referrals', label: 'Invite friends', icon: 'redeem',        key: 'v' },
    ],
  },
]

// Parents: their children's sessions, progress and payments live on the parent home page.
export const PARENT_NAV = [
  {
    items: [
      { to: '/hub/parent', label: 'Home',     icon: 'space_dashboard', key: 'h' },
      { to: '/messages',   label: 'Messages', icon: 'chat',            key: 'm', badge: 'unread' },
    ],
  },
  {
    title: 'You',
    items: [
      { to: '/referrals', label: 'Invite friends', icon: 'redeem', key: 'v' },
    ],
  },
]

export const navFor = (mode) => ({ tutor: TUTOR_NAV, parent: PARENT_NAV })[mode] ?? STUDENT_NAV

/**
 * The hub views a user can be in: student (everyone except accounts that signed up as a
 * parent), tutor (anyone with a tutor profile: the screening and DBS pages use it) and parent.
 */
export function modesFor(user) {
  if (!user) return ['student']
  return [
    (user.is_student !== false || !user.is_parent) && 'student',
    user.is_tutor && 'tutor',
    user.is_parent && 'parent',
  ].filter(Boolean)
}

/** The views offered as "Switch to … mode": tutor mode only once the tutor is verified. */
export const switchableModes = (user) =>
  modesFor(user).filter((m) => m !== 'tutor' || user?.screening_status === 'approved')

export const MODE_LABELS = { student: 'Student', tutor: 'Tutor', parent: 'Parent' }

export const flatNav = (mode) => navFor(mode).flatMap((group) => group.items)

/** Find the nav item (and its group title) that owns a pathname. */
export function matchNav(mode, pathname) {
  for (const group of navFor(mode)) {
    for (const item of group.items) {
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return { item, group }
    }
  }
  return null
}
