/**
 * UserBadges — small role labels shown next to an author's name.
 *
 *   <UserBadges isTutor />     → "Tutor" (coral dot) for verified tutors
 *   <UserBadges isPremium />   → "Explorer" (amber dot) for £5/month members
 *
 * Regular members get no label, so busy lists stay calm; renders nothing then.
 */
export default function UserBadges({ isTutor = false, isPremium = false, style }) {
  if (!isTutor && !isPremium) return null

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, verticalAlign: 'middle', flexShrink: 0, ...style }}>
      {isTutor && <span className="pill pill-coral" title="Verified tutor">Tutor</span>}
      {isPremium && <span className="pill pill-amber" title="Explorer member">Explorer</span>}
    </span>
  )
}
