// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { currentInvite, forgetInvite, INVITE_DAYS, inviteLink, normalizeInvite, storedInvite } from './invite'

const NOW = new Date(2026, 10, 2, 12).getTime()
const DAY = 86_400_000

describe('invite codes', () => {
  beforeEach(() => localStorage.clear())

  it('normalizes what people type or paste', () => {
    expect(normalizeInvite(' k7m2qx9p ')).toBe('K7M2QX9P')
    expect(normalizeInvite('K7M2QX9')).toBeNull()
    expect(normalizeInvite('K7M2-QX9P')).toBeNull()
    expect(normalizeInvite(null)).toBeNull()
  })

  it('keeps the code from the link while the visitor looks around', () => {
    expect(currentInvite('?ref=k7m2qx9p', NOW)).toBe('K7M2QX9P')
    expect(currentInvite('', NOW + DAY)).toBe('K7M2QX9P')  // back on /signup without ?ref
  })

  it('a newer link replaces an older one, a broken one doesn’t', () => {
    currentInvite('?ref=K7M2QX9P', NOW)
    expect(currentInvite('?ref=AAAABBBB', NOW)).toBe('AAAABBBB')
    expect(currentInvite('?ref=nope', NOW)).toBe('AAAABBBB')
  })

  it(`forgets the code after ${INVITE_DAYS} days, or once the account exists`, () => {
    currentInvite('?ref=K7M2QX9P', NOW)
    expect(storedInvite(NOW + INVITE_DAYS * DAY)).toBeNull()
    expect(localStorage.length).toBe(0)

    currentInvite('?ref=K7M2QX9P', NOW)
    forgetInvite()
    expect(currentInvite('', NOW)).toBeNull()
  })

  it('ignores unreadable storage', () => {
    localStorage.setItem('sws_invite', '{oops')
    expect(storedInvite(NOW)).toBeNull()
  })

  it('builds the sign-up link', () => {
    expect(inviteLink('K7M2QX9P', 'https://www.studywithstudents.co.uk'))
      .toBe('https://www.studywithstudents.co.uk/signup?ref=K7M2QX9P')
  })
})
