// Single source of truth for hub navigation: the sidebar, the ⌘K palette and
// the "g then key" shortcuts all read from here.
//
// `explorer: true` marks community features included in the £5/month plan.

export const STUDENT_NAV = [
  {
    items: [
      { to: '/hub/student',      label: 'Home',         icon: 'space_dashboard', key: 'h' },
      { to: '/messages',         label: 'Messages',     icon: 'chat',            key: 'm', tour: 'messages', badge: 'unread' },
      { to: '/calendar/student', label: 'Calendar',     icon: 'calendar_month',  key: 'c' },
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
    explorer: true,
    items: [
      { to: '/forum',               label: 'Forum',       icon: 'forum',     key: 'e', tour: 'forum',               explorer: true },
      { to: '/study-notes',         label: 'Study notes', icon: 'menu_book', key: 'n',                              explorer: true },
      { to: '/study-rooms/student', label: 'Study rooms', icon: 'groups',    key: 's', tour: 'study-rooms-student', explorer: true },
      { to: '/classroom',           label: 'Classes',     icon: 'school',    key: 'r',                              explorer: true },
    ],
  },
  {
    title: 'You',
    items: [
      { to: '/xp',         label: 'Graduation', icon: 'military_tech',     key: 'x' },
      { to: '/membership', label: 'Membership', icon: 'workspace_premium', key: 'b' },
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
      { to: '/xp', label: 'Graduation', icon: 'military_tech', key: 'x' },
    ],
  },
]

export const navFor = (mode) => (mode === 'tutor' ? TUTOR_NAV : STUDENT_NAV)

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
