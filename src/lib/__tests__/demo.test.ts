import { computeInsights } from '../insights'
import { buildDemoGames, buildDemoGoalieGames } from '../demo'
import { isDemoUser, isDemoEntryEmail, DEMO_EMAIL, DEMO_GOALIE_EMAIL, DEMO_DOMAIN } from '../demo-credentials'

const NOW = new Date('2026-10-30T12:00:00Z')

describe('buildDemoGames', () => {
  const games = buildDemoGames(NOW)

  test('is deterministic', () => {
    expect(buildDemoGames(NOW)).toEqual(games)
  })

  test('produces valid values for the API schema', () => {
    for (const g of games) {
      expect(['home', 'away']).toContain(g.homeAway)
      expect(['win', 'loss']).toContain(g.result)
      expect(g.date.getTime()).toBeLessThan(NOW.getTime())
      for (const k of ['confidence', 'sleepQuality', 'stressLevel', 'physicalEnergy'] as const) {
        if (g.mentalState) {
          expect(g.mentalState[k]).toBeGreaterThanOrEqual(1)
          expect(g.mentalState[k]).toBeLessThanOrEqual(10)
        }
      }
    }
  })

  test('has 3 games without a check-in, including the newest', () => {
    const missing = games.filter((g) => !g.mentalState)
    expect(missing).toHaveLength(3)
    expect(missing).toContain(games[games.length - 1])
  })

  test('mixes check-in timing with matching checkedInAt', () => {
    const states = games.flatMap((g) => (g.mentalState ? [{ date: g.date, ...g.mentalState }] : []))
    expect(new Set(states.map((s) => s.timing))).toEqual(new Set(['before', 'after', null]))
    for (const s of states) {
      if (!s.timing) expect(s.checkedInAt).toBeNull()
      else if (s.timing === 'before') expect(s.checkedInAt!.getTime()).toBeLessThan(s.date.getTime())
      else expect(s.checkedInAt!.getTime()).toBeGreaterThan(s.date.getTime())
    }
  })
})

describe('buildDemoGoalieGames', () => {
  const games = buildDemoGoalieGames(NOW)

  test('is deterministic with 24 games', () => {
    expect(games).toHaveLength(24)
    expect(buildDemoGoalieGames(NOW)).toEqual(games)
  })

  test('saves + goalsAgainst = shotsAgainst and SV% is realistic', () => {
    for (const g of games) {
      expect(g.saves + g.goalsAgainst).toBe(g.shotsAgainst)
      const sv = g.saves / g.shotsAgainst
      // Low-shot games (5-9) can't hit the band with whole saves, so only larger samples are checked.
      if (g.shotsAgainst >= 10) {
        expect(sv).toBeGreaterThanOrEqual(0.88)
        expect(sv).toBeLessThanOrEqual(0.935)
      }
      expect([g.goals, g.assists, g.shots, g.plusMinus]).toEqual([0, 0, 0, 0])
    }
  })

  test('has at least 2 low-shot games', () => {
    expect(games.filter((g) => g.shotsAgainst >= 5 && g.shotsAgainst <= 9).length).toBeGreaterThanOrEqual(2)
  })

  test('newest game has no check-in', () => {
    expect(games[games.length - 1].mentalState).toBeNull()
  })

  test('higher confidence gives higher average SV%', () => {
    const avg = (xs: typeof games) => xs.reduce((a, g) => a + g.saves / g.shotsAgainst, 0) / xs.length
    const withState = games.filter((g) => g.mentalState)
    const high = withState.filter((g) => g.mentalState!.confidence >= 7)
    const low = withState.filter((g) => g.mentalState!.confidence <= 5)
    expect(avg(high)).toBeGreaterThan(avg(low))
  })
})

describe('isDemoUser / isDemoEntryEmail', () => {
  test('recognises the entry emails and per-session demo users only', () => {
    expect(isDemoUser(DEMO_EMAIL)).toBe(true)
    expect(isDemoUser(DEMO_GOALIE_EMAIL)).toBe(true)
    expect(isDemoUser(`demo-abc${DEMO_DOMAIN}`)).toBe(true)
    expect(isDemoUser('player@gmail.com')).toBe(false)
    expect(isDemoUser(undefined)).toBe(false)
  })

  test('entry email check excludes per-session and normal emails', () => {
    expect(isDemoEntryEmail(DEMO_EMAIL)).toBe(true)
    expect(isDemoEntryEmail(DEMO_GOALIE_EMAIL)).toBe(true)
    expect(isDemoEntryEmail(`demo-abc${DEMO_DOMAIN}`)).toBe(false)
    expect(isDemoEntryEmail('player@gmail.com')).toBe(false)
  })
})

describe('demo goalie insights', () => {
  test('unlock with at least one insight in goalie mode', () => {
    const games = buildDemoGoalieGames(NOW).map((g, i) => ({
      id: `d${i}`,
      date: g.date.toISOString(),
      opponent: g.opponent,
      goals: 0,
      assists: 0,
      shotsAgainst: g.shotsAgainst,
      saves: g.saves,
      mentalState: g.mentalState,
    }))
    const r = computeInsights(games, { goalie: true })
    expect(r.needed).toBe(0)
    expect(r.insights.length).toBeGreaterThan(0)
  })
})
