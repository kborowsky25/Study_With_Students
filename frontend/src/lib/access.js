// Community features are free for every member. Kept only until the router
// stops importing it (quality branch); delete afterwards.
export const isVerifiedTutor = (user) => Boolean(user?.is_tutor && user?.screening_status === 'approved')

export const hasExplorerAccess = () => true
