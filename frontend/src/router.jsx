import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages — public
import Home          from './pages/Home'
import Login         from './pages/Login'
import Signup        from './pages/Signup'
import AboutUs       from './pages/AboutUs'
import HowItWorks    from './pages/HowItWorks'
import BecomeATutor  from './pages/BecomeATutor'

// Pages — hub
import Hub           from './pages/Hub'
import HubStudent    from './pages/HubStudent'
import HubTutor      from './pages/HubTutor'

// Pages — tutors
import FindTutors    from './pages/FindTutors'
import TutorInfo     from './pages/TutorInfo'
import TutorProfile  from './pages/TutorProfile'
import ActiveTutors  from './pages/ActiveTutors'
import LikedTutors   from './pages/LikedTutors'

// Pages — students
import ActiveStudents from './pages/ActiveStudents'
import Dashboard      from './pages/Dashboard'

// Pages — comms & content
import Messages        from './pages/Messages'
import ForumHome       from './pages/ForumHome'
import ForumCategory   from './pages/ForumCategory'
import ForumThread     from './pages/ForumThread'
import NewThread       from './pages/NewThread'

// Pages — study & calendar
import StudyRoomsStudent from './pages/StudyRoomsStudent'
import StudyRoomsTutor   from './pages/StudyRoomsTutor'
import CalendarStudent   from './pages/CalendarStudent'
import CalendarTutor     from './pages/CalendarTutor'

// Pages — payments & events
import Payments    from './pages/Payments'
import Earnings    from './pages/Earnings'
import Events      from './pages/Events'
import Classroom   from './pages/Classroom'
import XP          from './pages/XP'
import Membership  from './pages/Membership'

// ─── Root ─────────────────────────────────────────────────────────────────────
const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
})

// ─── Auth guard helper ────────────────────────────────────────────────────────
function requireAuth() {
  const token = localStorage.getItem('sws_token')
  if (!token) {
    throw redirect({ to: '/login' })
  }
}

function requireTutor() {
  const raw = localStorage.getItem('sws_user')
  if (!raw) throw redirect({ to: '/login' })
  const user = JSON.parse(raw)
  if (!user.is_tutor) throw redirect({ to: '/hub' })
}

// ─── Public routes ────────────────────────────────────────────────────────────
const indexRoute      = createRoute({ getParentRoute: () => rootRoute, path: '/',            component: Home })
const loginRoute      = createRoute({ getParentRoute: () => rootRoute, path: '/login',       component: Login })
const signupRoute     = createRoute({ getParentRoute: () => rootRoute, path: '/signup',      component: Signup })
const aboutRoute      = createRoute({ getParentRoute: () => rootRoute, path: '/about',       component: AboutUs })
const howItWorksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/how-it-works',component: HowItWorks })
const becomeRoute     = createRoute({ getParentRoute: () => rootRoute, path: '/become-tutor',component: BecomeATutor })

// ─── Protected routes ─────────────────────────────────────────────────────────
const hubRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/hub',
  beforeLoad: requireAuth, component: Hub,
})
const hubStudentRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/hub/student',
  beforeLoad: requireAuth, component: HubStudent,
})
const hubTutorRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/hub/tutor',
  beforeLoad: requireAuth, component: HubTutor,
})
const findTutorsRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/find-tutors',
  beforeLoad: requireAuth, component: FindTutors,
})
const tutorInfoRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/tutor/$tutorId',
  beforeLoad: requireAuth, component: TutorInfo,
})
const tutorProfileRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/tutor-profile',
  beforeLoad: requireAuth, component: TutorProfile,
})
const activeTutorsRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/active-tutors',
  beforeLoad: requireAuth, component: ActiveTutors,
})
const likedTutorsRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/liked-tutors',
  beforeLoad: requireAuth, component: LikedTutors,
})
const activeStudentsRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/active-students',
  beforeLoad: requireAuth, component: ActiveStudents,
})
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/dashboard',
  beforeLoad: requireAuth, component: Dashboard,
})
const messagesRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/messages',
  beforeLoad: requireAuth, component: Messages,
})
const forumHomeRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/forum',
  beforeLoad: requireAuth, component: ForumHome,
})
const forumCategoryRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/forum/category/$categoryId',
  beforeLoad: requireAuth, component: ForumCategory,
})
const forumThreadRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/forum/thread/$threadId',
  beforeLoad: requireAuth, component: ForumThread,
})
const newThreadRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/forum/category/$categoryId/new',
  beforeLoad: requireAuth, component: NewThread,
})
const studyRoomsStudentRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/study-rooms/student',
  beforeLoad: requireAuth, component: StudyRoomsStudent,
})
const studyRoomsTutorRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/study-rooms/tutor',
  beforeLoad: requireAuth, component: StudyRoomsTutor,
})
const calendarStudentRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/calendar/student',
  beforeLoad: requireAuth, component: CalendarStudent,
})
const calendarTutorRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/calendar/tutor',
  beforeLoad: requireAuth, component: CalendarTutor,
})
const paymentsRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/payments',
  beforeLoad: requireAuth, component: Payments,
})
const earningsRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/earnings',
  beforeLoad: requireAuth, component: Earnings,
})
const eventsRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/events',
  beforeLoad: requireAuth, component: Events,
})
const classroomRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/classroom',
  beforeLoad: requireAuth, component: Classroom,
})
const xpRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/xp',
  beforeLoad: requireAuth, component: XP,
})
const membershipRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/membership',
  beforeLoad: requireAuth, component: Membership,
})

// ─── Build router ─────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  indexRoute, loginRoute, signupRoute, aboutRoute, howItWorksRoute, becomeRoute,
  hubRoute, hubStudentRoute, hubTutorRoute,
  findTutorsRoute, tutorInfoRoute, tutorProfileRoute, activeTutorsRoute, likedTutorsRoute,
  activeStudentsRoute, dashboardRoute,
  messagesRoute,
  forumHomeRoute, forumCategoryRoute, forumThreadRoute, newThreadRoute,
  studyRoomsStudentRoute, studyRoomsTutorRoute,
  calendarStudentRoute, calendarTutorRoute,
  paymentsRoute, earningsRoute, eventsRoute, classroomRoute, xpRoute, membershipRoute,
])

export const router = createRouter({ routeTree })
