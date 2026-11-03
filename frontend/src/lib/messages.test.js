import { describe, expect, it } from 'vitest'
import { HIDDEN, HIDDEN_PART, reasonLabel, splitHidden } from './messages'
import { oldEnough, parentsLine } from './family'

describe('splitHidden', () => {
  it('leaves ordinary messages as one part', () => {
    expect(splitHidden('See you at 17:30')).toEqual(['See you at 17:30'])
    expect(splitHidden('')).toEqual([])
    expect(splitHidden(null)).toEqual([])
  })

  it('marks each hidden contact detail', () => {
    expect(splitHidden(`Text me on ${HIDDEN} or ${HIDDEN}!`)).toEqual(['Text me on ', HIDDEN_PART, ' or ', HIDDEN_PART, '!'])
    expect(splitHidden(HIDDEN)).toEqual([HIDDEN_PART])
  })
})

describe('report reasons', () => {
  it('labels known reasons and passes unknown ones through', () => {
    expect(reasonLabel('bullying')).toBe('Bullying or harassment')
    expect(reasonLabel('new_reason')).toBe('new_reason')
  })
})

describe('parentsLine', () => {
  it('names whose parents can read a thread', () => {
    expect(parentsLine(null, 1)).toBeNull()
    expect(parentsLine({ user_id: 2, name: 'Maya Patel', parents: 1 }, 1)).toBe('Visible to Maya’s parent')
    expect(parentsLine({ user_id: 2, name: 'Maya Patel', parents: 2 }, 1)).toBe('Visible to Maya’s parents')
    expect(parentsLine({ user_id: 1, name: 'Maya Patel', parents: 1 }, 1)).toBe('Visible to your parent')
  })
})

describe('oldEnough', () => {
  const today = new Date(2026, 10, 3) // 3 Nov 2026
  it('lets students join from their 13th birthday', () => {
    expect(oldEnough('2013-11-03', today)).toBe(true)
    expect(oldEnough('2013-11-04', today)).toBe(false)
    expect(oldEnough('2010-01-01', today)).toBe(true)
    expect(oldEnough('2020-05-05', today)).toBe(false)
    expect(oldEnough('', today)).toBe(false)
  })
})
