import { buildDemoGames } from '../demo'

describe('buildDemoGames', () => {
  const games = buildDemoGames(new Date('2026-10-30T12:00:00Z'))

  test('is deterministic', () => {
    expect(buildDemoGames(new Date('2026-10-30T12:00:00Z'))).toEqual(games)
  })

  test('produces valid values for the API schema', () => {
    for (const g of games) {
      expect(['home', 'away']).toContain(g.homeAway)
      expect(['win', 'loss']).toContain(g.result)
      expect(g.date.getTime()).toBeLessThan(new Date('2026-10-30T12:00:00Z').getTime())
      for (const k of ['confidence', 'sleepQuality', 'stressLevel', 'physicalEnergy'] as const) {
        if (g.mentalState) {
          expect(g.mentalState[k]).toBeGreaterThanOrEqual(1)
          expect(g.mentalState[k]).toBeLessThanOrEqual(10)
        }
      }
    }
  })

  test('leaves only the newest game without a check-in', () => {
    const missing = games.filter((g) => !g.mentalState)
    expect(missing).toHaveLength(1)
    expect(missing[0]).toBe(games[games.length - 1])
  })
})
