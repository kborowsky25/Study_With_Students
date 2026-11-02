import { describe, expect, it } from 'vitest'
import { flatNav, matchNav, modesFor, navFor, PARENT_NAV, STUDENT_NAV, switchableModes, TUTOR_NAV } from './navigation'

describe('navigation', () => {
  it.each(['student', 'tutor', 'parent'])('%s view: every "g then key" shortcut and path is unique', (mode) => {
    const items = flatNav(mode)
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length)
    expect(new Set(items.map((i) => i.to)).size).toBe(items.length)
    for (const item of items) expect(item.key).toMatch(/^[a-z]$/)
  })

  it('picks the nav for a mode', () => {
    expect(navFor('tutor')).toBe(TUTOR_NAV)
    expect(navFor('parent')).toBe(PARENT_NAV)
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

  const tutor = { is_student: true, is_tutor: true, screening_status: 'approved' }
  it.each([
    ['nobody', null, ['student'], ['student']],
    ['a student', { is_student: true }, ['student'], ['student']],
    ['an account from before roles were sent', {}, ['student'], ['student']],
    ['a tutor waiting for screening', { ...tutor, screening_status: 'pending' }, ['student', 'tutor'], ['student']],
    ['a verified tutor', tutor, ['student', 'tutor'], ['student', 'tutor']],
    ['a parent', { is_student: false, is_parent: true }, ['parent'], ['parent']],
    ['a student who is also a parent', { is_student: true, is_parent: true }, ['student', 'parent'], ['student', 'parent']],
    ['a verified tutor who is also a parent', { ...tutor, is_parent: true },
      ['student', 'tutor', 'parent'], ['student', 'tutor', 'parent']],
  ])('modes for %s', (_, user, modes, switchable) => {
    expect(modesFor(user)).toEqual(modes)
    expect(switchableModes(user)).toEqual(switchable)
  })
})
