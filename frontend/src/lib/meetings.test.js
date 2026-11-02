import { describe, expect, it } from 'vitest'
import { formatLength, hostOf, isOpen, livePhase, meetingUrl, minutesUntil, normaliseLink } from './meetings'

describe('meeting links', () => {
  it('meetingUrl renders http(s) links and bare domains, nothing else', () => {
    expect(meetingUrl('https://zoom.us/j/123')).toBe('https://zoom.us/j/123')
    expect(meetingUrl('  http://meet.google.com/abc  ')).toBe('http://meet.google.com/abc')
    expect(meetingUrl('zoom.us/j/123')).toBe('https://zoom.us/j/123')
    expect(meetingUrl('javascript:alert(1)')).toBeNull()
    expect(meetingUrl('ask me for the link')).toBeNull()
    expect(meetingUrl('')).toBeNull()
    expect(meetingUrl(null)).toBeNull()
  })

  it('normaliseLink turns form input into a full URL', () => {
    expect(normaliseLink('zoom.us/j/123')).toBe('https://zoom.us/j/123')
    expect(normaliseLink('https://teams.microsoft.com/l/meetup')).toBe('https://teams.microsoft.com/l/meetup')
    expect(normaliseLink('ftp://files.example.com')).toBeNull()
    expect(normaliseLink('localhost')).toBeNull()
    expect(normaliseLink('not a link')).toBeNull()
    expect(normaliseLink('   ')).toBeNull()
  })

  it('hostOf drops www', () => {
    expect(hostOf('https://www.zoom.us/j/1')).toBe('zoom.us')
    expect(hostOf('nonsense')).toBeNull()
  })
})

describe('livePhase', () => {
  const start = new Date(2026, 10, 4, 18, 0).getTime()
  const room = { start_time: new Date(start).toISOString(), end_time: new Date(start + 90 * 60_000).toISOString() }

  it('walks upcoming → soon → live → past', () => {
    expect(livePhase(room, start - 16 * 60_000)).toBe('upcoming')
    expect(livePhase(room, start - 15 * 60_000)).toBe('soon')
    expect(livePhase(room, start)).toBe('live')
    expect(livePhase(room, start + 89 * 60_000)).toBe('live')
    expect(livePhase(room, start + 90 * 60_000)).toBe('past')
  })

  it('treats a missing start as upcoming and a missing end as one hour', () => {
    expect(livePhase({ start_time: null }, start)).toBe('upcoming')
    const open = { start_time: room.start_time, end_time: null }
    expect(livePhase(open, start + 59 * 60_000)).toBe('live')
    expect(livePhase(open, start + 60 * 60_000)).toBe('past')
  })

  it('isOpen while the link should show', () => {
    expect(['upcoming', 'soon', 'live', 'past'].map(isOpen)).toEqual([false, true, true, false])
  })
})

describe('timing labels', () => {
  it('minutesUntil rounds up and never says 0', () => {
    const now = new Date(2026, 10, 4, 17, 50).getTime()
    expect(minutesUntil(new Date(now + 9.2 * 60_000), now)).toBe(10)
    expect(minutesUntil(new Date(now + 1000), now)).toBe(1)
    expect(minutesUntil(new Date(now - 60_000), now)).toBe(1)
  })

  it('formatLength', () => {
    const at = (min) => new Date(Date.UTC(2026, 10, 4, 18, min))
    expect(formatLength(at(0), at(45))).toBe('45 min')
    expect(formatLength(at(0), at(60))).toBe('1 h')
    expect(formatLength(at(0), at(90))).toBe('1 h 30')
    expect(formatLength(at(0), at(120))).toBe('2 h')
  })
})
