/**
 * UserBadges — a small role label shown next to an author's name.
 *
 *   <UserBadges isTutor />     → "Tutor" (coral label) for verified tutors
 *
 * Everyone else gets no label, so busy lists stay calm; renders nothing then.
 */
export default function UserBadges({ isTutor = false, style }) {
  if (!isTutor) return null

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, verticalAlign: 'middle', flexShrink: 0, ...style }}>
      <span className="pill pill-coral" title="Verified tutor">Tutor</span>
    </span>
  )
}
