import { createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet, redirect } from '@tanstack/react-router'
import { onSessionExpired } from './api/client'
import { AuthProvider } from './context/AuthContext'

// Every page is its own chunk, loaded when its route is first visited (or when a
// link to it is hovered — see `defaultPreload`), so the first load stays small.
const lazy = (importer) => lazyRouteComponent(importer)

// Public
const Home           = lazy(() => import('./pages/Home'))
const Login          = lazy(() => import('./pages/Login'))
const Signup         = lazy(() => import('./pages/Signup'))
const AboutUs        = lazy(() => import('./pages/AboutUs'))
const HowItWorks     = lazy(() => import('./pages/HowItWorks'))
const BecomeATutor   = lazy(() => import('./pages/BecomeATutor'))
const FoundingTutors = lazy(() => import('./pages/FoundingTutors'))

// Hub — student
const HubStudent        = lazy(() => import('./pages/HubStudent'))
const FindTutors        = lazy(() => import('./pages/FindTutors'))
const TutorInfo         = lazy(() => import('./pages/TutorInfo'))
const ActiveTutors      = lazy(() => import('./pages/ActiveTutors'))
const LikedTutors       = lazy(() => import('./pages/LikedTutors'))
const CalendarStudent   = lazy(() => import('./pages/CalendarStudent'))
const Payments          = lazy(() => import('./pages/Payments'))
const StudyRoomsStudent = lazy(() => import('./pages/StudyRoomsStudent'))

// Hub — tutor
const HubTutor        = lazy(() => import('./pages/HubTutor'))
const TutorProfile    = lazy(() => import('./pages/TutorProfile'))
const TutorScreening  = lazy(() => import('./pages/TutorScreening'))
const ActiveStudents  = lazy(() => import('./pages/ActiveStudents'))
const CalendarTutor   = lazy(() => import('./pages/CalendarTutor'))
const Earnings        = lazy(() => import('./pages/Earnings'))
const StudyRoomsTutor = lazy(() => import('./pages/StudyRoomsTutor'))
const Availability    = lazy(() => import('./pages/Availability'))
const BackgroundCheck = lazy(() => import('./pages/BackgroundCheck'))

// Hub — shared
const Messages       = lazy(() => import('./pages/Messages'))
const ForumHome      = lazy(() => import('./pages/ForumHome'))
const ForumCategory  = lazy(() => import('./pages/ForumCategory'))
const ForumThread    = lazy(() => import('./pages/ForumThread'))
const NewThread      = lazy(() => import('./pages/NewThread'))
const StudyNotes     = lazy(() => import('./pages/StudyNotes'))
const Classroom      = lazy(() => import('./pages/Classroom'))
const XP             = lazy(() => import('./pages/XP'))
const StudentProfile = lazy(() => import('./pages/StudentProfile'))
const Progress       = lazy(() => import('./pages/Progress'))

// Admin
const AdminScreening = lazy(() => import('./pages/AdminScreening'))
const SuperAdmin     = lazy(() => import('./pages/SuperAdmin'))

const NotFound = lazy(() => import('./pages/NotFound'))

// ── Guards (run before a route loads) ─────────────────────────────────────────

function storedUser() {
  if (!localStorage.getItem('sws_token')) return null
  try { return JSON.parse(localStorage.getItem('sws_user')) } catch { return null }
}

function requireAuth() {
  const user = storedUser()
  if (!user) throw redirect({ to: '/login' })
  return user
}

function requireVerifiedTutor() {
  const user = requireAuth()
  if (!user.is_tutor) throw redirect({ to: '/tutor-profile' })
  if (user.screening_status !== 'approved') throw redirect({ to: '/tutor-screening' })
}

function requireAdmin() {
  const user = requireAuth()
  if (!user.is_admin) throw redirect({ to: '/hub' })
}

/** /hub → the dashboard for the last-used view. */
function redirectToHub() {
  const user = requireAuth()
  const tutorView = user.is_tutor && user.screening_status === 'approved' &&
    localStorage.getItem('sws_hub_mode') === 'tutor'
  throw redirect({ to: tutorView ? '/hub/tutor' : '/hub/student' })
}

// ── Route table ───────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
  notFoundComponent: NotFound,
})

const page = (path, component, beforeLoad) =>
  createRoute({ getParentRoute: () => rootRoute, path, component, beforeLoad })

const routeTree = rootRoute.addChildren([
  // Public
  page('/',                Home),
  page('/login',           Login),
  page('/signup',          Signup),
  page('/about',           AboutUs),
  page('/how-it-works',    HowItWorks),
  page('/become-tutor',    BecomeATutor),
  page('/founding-tutors', FoundingTutors),

  // Hub
  page('/hub',             () => null, redirectToHub),
  page('/hub/student',     HubStudent, requireAuth),
  page('/hub/tutor',       HubTutor,   requireVerifiedTutor),

  // Students
  page('/find-tutors',      FindTutors,      requireAuth),
  page('/tutor/$tutorId',   TutorInfo,       requireAuth),
  page('/active-tutors',    ActiveTutors,    requireAuth),
  page('/liked-tutors',     LikedTutors,     requireAuth),
  page('/calendar/student', CalendarStudent, requireAuth),
  page('/payments',         Payments,        requireAuth),
  page('/student/$userId',  StudentProfile,  requireAuth),

  // Tutors
  page('/tutor-profile',     TutorProfile,    requireAuth),
  page('/tutor-screening',   TutorScreening,  requireAuth),
  page('/active-students',   ActiveStudents,  requireVerifiedTutor),
  page('/calendar/tutor',    CalendarTutor,   requireVerifiedTutor),
  page('/earnings',          Earnings,        requireVerifiedTutor),
  page('/study-rooms/tutor', StudyRoomsTutor, requireVerifiedTutor),
  page('/availability',      Availability,    requireAuth),
  page('/background-check',  BackgroundCheck, requireAuth),

  // Shared
  page('/messages',   Messages,   requireAuth),
  page('/xp',         XP,         requireAuth),
  page('/progress',   Progress,   requireAuth),

  // Community: free for everyone who is logged in
  page('/forum',                            ForumHome,         requireAuth),
  page('/forum/category/$categoryId',       ForumCategory,     requireAuth),
  page('/forum/category/$categoryId/new',   NewThread,         requireAuth),
  page('/forum/thread/$threadId',           ForumThread,       requireAuth),
  page('/study-notes',                      StudyNotes,        requireAuth),
  page('/study-rooms/student',              StudyRoomsStudent, requireAuth),
  page('/classroom',                        Classroom,         requireAuth),

  // Admin
  page('/admin',      AdminScreening),
  page('/superadmin', SuperAdmin, requireAdmin),
])

export const router = createRouter({
  routeTree,
  // Hovering or focusing a link starts loading that page's chunk.
  defaultPreload: 'intent',
})

// When the saved session stops working, check the current page again: one that needs a
// login redirects to /login, a public page (homepage, tutor pages) just carries on.
onSessionExpired(() => router.invalidate())
