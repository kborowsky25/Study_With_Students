import { describe, expect, it } from 'vitest'
import { flatNav, matchNav, navFor, STUDENT_NAV, TUTOR_NAV } from './navigation'

describe('navigation', () => {
  it.each(['student', 'tutor'])('%s view: every "g then key" shortcut and path is unique', (mode) => {
    const items = flatNav(mode)
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length)
    expect(new Set(items.map((i) => i.to)).size).toBe(items.length)
    for (const item of items) expect(item.key).toMatch(/^[a-z]$/)
  })

  it('picks the nav for a mode', () => {
    expect(navFor('tutor')).toBe(TUTOR_NAV)
    expect(navFor('student')).toBe(STUDENT_NAV)
    expect(navFor(undefined)).toBe(STUDENT_NAV)
  })

  it('matches nested paths to their section', () => {
    expect(matchNav('student', '/forum').item.to).toBe('/forum')
    expect(matchNav('student', '/forum/thread/12').item.to).toBe('/forum')
    expect(matchNav('student', '/forum/thread/12').group.title).toBe('Community')
    expect(matchNav('tutor', '/calendar/tutor').item.label).toBe('Schedule')
    expect(matchNav('student', '/forumx')).toBeNull()
    expect(matchNav('student', '/nowhere')).toBeNull()
  })
})
