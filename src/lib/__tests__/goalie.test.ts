import { savePct, formatSavePct, totalSavePct, validateGoalieStats } from '../goalie'

describe('formatSavePct', () => {
  it.each([
    [28, 30, '.933'], [30, 30, '1.000'], [0, 0, '—'], [null, null, '—'], [5, 0, '—'],
  ])('%s/%s -> %s', (s, sa, out) => {
    expect(formatSavePct(s, sa)).toBe(out)
  })
})

describe('savePct', () => {
  it('is null with zero shots', () => expect(savePct(3, 0)).toBeNull())
})

describe('totalSavePct', () => {
  it('uses sums, not a mean of per-game percentages', () => {
    expect(totalSavePct([{ saves: 20, shotsAgainst: 25 }, { saves: 5, shotsAgainst: 5 }])).toBeCloseTo(25 / 30)
  })
  it('is null for empty or zero-SA input', () => {
    expect(totalSavePct([])).toBeNull()
    expect(totalSavePct([{ saves: 0, shotsAgainst: 0 }])).toBeNull()
  })
  it('counts null fields as 0', () => {
    expect(totalSavePct([{ saves: null, shotsAgainst: null }, { saves: 9, shotsAgainst: 10 }])).toBeCloseTo(0.9)
  })
})

describe('validateGoalieStats', () => {
  it('derives saves', () => {
    expect(validateGoalieStats(30, 2)).toEqual({ saves: 28 })
    expect(validateGoalieStats(0, 0)).toEqual({ saves: 0 })
  })
  it.each([[5, 6], [-1, 0], [3.5, 1], ['a', 1], [undefined, 1], [null, 0]])('rejects %s,%s', (sa, ga) => {
    expect(validateGoalieStats(sa, ga)).toEqual({ error: expect.any(String) })
  })
})
