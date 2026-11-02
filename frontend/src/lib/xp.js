// Graduation levels: XP from real activity, shown as a level on the dashboard and XP page.

export const TIERS = {
  student: ['Newcomer', 'Explorer', 'Scholar', 'Achiever', 'Prodigy', 'Elite', 'Legend'],
  tutor:   ['Guide', 'Mentor', 'Educator', 'Expert', 'Professor', 'Master', 'Grandmaster'],
}
export const THRESHOLDS = [0, 150, 400, 900, 1800, 3500, 6000]

/** XP from sessions (excluding cancelled) and connections, for one side ('student' | 'tutor'). */
export function xpFor(mode, events, connections = 0) {
  const live = events.filter((e) => e.role === mode && e.status !== 'canceled')
  const done = live.filter((e) => ['confirmed', 'paid'].includes(e.status))
  const paid = live.filter((e) => e.status === 'paid')
  return mode === 'tutor'
    ? done.length * 50 + paid.length * 100 + connections * 30
    : live.length * 50 + done.length * 100 + connections * 30
}

export function levelFor(mode, xp) {
  const index = THRESHOLDS.reduce((acc, t, i) => (xp >= t ? i : acc), 0)
  const next = THRESHOLDS[index + 1]
  return {
    index,
    name: TIERS[mode][index],
    next: next ?? null,
    progress: next ? (xp - THRESHOLDS[index]) / (next - THRESHOLDS[index]) : 1,
  }
}
