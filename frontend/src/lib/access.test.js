import { describe, expect, it } from 'vitest'
import { hasExplorerAccess, isVerifiedTutor } from './access'

// Must mirror server/permissions.py: Explorer members and approved tutors get the community.
describe('access', () => {
  it('nobody signed in has no access', () => {
    expect(hasExplorerAccess(null)).toBe(false)
    expect(hasExplorerAccess(undefined)).toBe(false)
    expect(isVerifiedTutor(null)).toBe(false)
  })

  it('free students have no access', () => {
    expect(hasExplorerAccess({ is_premium: false, is_tutor: false })).toBe(false)
  })

  it('Explorer members have access', () => {
    expect(hasExplorerAccess({ is_premium: true, is_tutor: false })).toBe(true)
  })

  it('only approved tutors count as verified', () => {
    for (const screening_status of ['none', 'pending', 'rejected', null]) {
      const tutor = { is_tutor: true, is_premium: false, screening_status }
      expect(isVerifiedTutor(tutor)).toBe(false)
      expect(hasExplorerAccess(tutor)).toBe(false)
    }
    const approved = { is_tutor: true, is_premium: false, screening_status: 'approved' }
    expect(isVerifiedTutor(approved)).toBe(true)
    expect(hasExplorerAccess(approved)).toBe(true)
  })

  it('an approved status without a tutor profile is not a tutor', () => {
    expect(isVerifiedTutor({ is_tutor: false, screening_status: 'approved' })).toBe(false)
  })
})
