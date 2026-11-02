// Who can use the community features (forum, study notes, study rooms, classes)?
// Explorer members (£5/month) and verified tutors. The API enforces the same rule.

export const isVerifiedTutor = (user) => Boolean(user?.is_tutor && user?.screening_status === 'approved')

export const hasExplorerAccess = (user) => Boolean(user?.is_premium) || isVerifiedTutor(user)
