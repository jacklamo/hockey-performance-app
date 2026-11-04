import { normalizePosition, isGoalie } from '../positions'

describe('normalizePosition', () => {
  it.each([
    ['LW', 'Left Wing'], ['left wing', 'Left Wing'], ['  Left   Wing ', 'Left Wing'],
    ['RW', 'Right Wing'], ['D', 'Defenseman'], ['defence', 'Defenseman'],
    ['G', 'Goalie'], ['goaltender', 'Goalie'], ['C', 'Center'], ['centre', 'Center'],
  ])('%s -> %s', (input, out) => {
    expect(normalizePosition(input)).toBe(out)
  })

  it.each(['W', 'wing', '', 'Forward', null, 42, undefined])('rejects %p', (v) => {
    expect(normalizePosition(v)).toBeNull()
  })
})

describe('isGoalie', () => {
  it('true for goalie variants', () => {
    expect(isGoalie('Goalie')).toBe(true)
    expect(isGoalie('g')).toBe(true)
  })
  it('false for others and never throws', () => {
    expect(isGoalie('Center')).toBe(false)
    expect(isGoalie('garbage')).toBe(false)
    expect(isGoalie(null)).toBe(false)
    expect(isGoalie({})).toBe(false)
  })
})
