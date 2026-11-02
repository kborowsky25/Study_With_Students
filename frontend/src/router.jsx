import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import { AuthProvider } from './context/AuthContext'
import { hasExplorerAccess } from './lib/access'

// Public
import Home           from './pages/Home'
import Login          from './pages/Login'
import Signup         from './pages/Signup'
import AboutUs        from './pages/AboutUs'
import HowItWorks     from './pages/HowItWorks'
import BecomeATutor   from './pages/BecomeATutor'
import FoundingTutors from './pages/FoundingTutors'

// Hub — student
import HubStudent        from './pages/HubStudent'
import FindTutors        from './pages/FindTutors'
import TutorInfo         from './pages/TutorInfo'
import ActiveTutors      from './pages/ActiveTutors'
import LikedTutors       from './pages/LikedTutors'
import CalendarStudent   from './pages/CalendarStudent'
import Payments          from './pages/Payments'
import StudyRoomsStudent from './pages/StudyRoomsStudent'

// Hub — tutor
import HubTutor        from './pages/HubTutor'
import TutorProfile    from './pages/TutorProfile'
import TutorScreening  from './pages/TutorScreening'
import ActiveStudents  from './pages/ActiveStudents'
import CalendarTutor   from './pages/CalendarTutor'
import Earnings        from './pages/Earnings'
import StudyRoomsTutor from './pages/StudyRoomsTutor'

// Hub — shared
import Messages       from './pages/Messages'
import ForumHome      from './pages/ForumHome'
import ForumCategory  from './pages/ForumCategory'
import ForumThread    from './pages/ForumThread'
import NewThread      from './pages/NewThread'
import StudyNotes     from './pages/StudyNotes'
import Classroom      from './pages/Classroom'
import XP             from './pages/XP'
import Membership     from './pages/Membership'
import StudentProfile from './pages/StudentProfile'

// Admin
import AdminScreening from './pages/AdminScreening'
import SuperAdmin     from './pages/SuperAdmin'

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

/** Community features: Explorer members (£5/month) and verified tutors. */
function requireExplorer() {
  const user = requireAuth()
  if (!hasExplorerAccess(user)) throw redirect({ to: '/membership' })
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

  // Shared
  page('/messages',   Messages,   requireAuth),
  page('/xp',         XP,         requireAuth),
  page('/membership', Membership, requireAuth),

  // Community (Explorer plan)
  page('/forum',                            ForumHome,         requireExplorer),
  page('/forum/category/$categoryId',       ForumCategory,     requireExplorer),
  page('/forum/category/$categoryId/new',   NewThread,         requireExplorer),
  page('/forum/thread/$threadId',           ForumThread,       requireExplorer),
  page('/study-notes',                      StudyNotes,        requireExplorer),
  page('/study-rooms/student',              StudyRoomsStudent, requireExplorer),
  page('/classroom',                        Classroom,         requireExplorer),

  // Admin
  page('/admin',      AdminScreening),
  page('/superadmin', SuperAdmin, requireAdmin),
])

export const router = createRouter({ routeTree })
