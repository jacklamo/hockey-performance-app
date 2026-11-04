import { randomUUID } from 'crypto'
import type { PrismaClient } from '@prisma/client'

import { DEMO_DOMAIN, DEMO_TTL_MS } from './demo-credentials'
import { isGoalie, type Position } from './positions'

const OPPONENTS = ['Northview', 'Lakeside', 'Riverton', 'Summit', 'Harbor City', 'Fairmont', 'Ironwood', 'Eastgate']
const GAME_COUNT = 24

// Deterministic PRNG so the demo looks the same every time.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const TIMINGS = ['before', 'after', null] as const
const HOUR_MS = 60 * 60 * 1000
const SKATER_MISSING = new Set([5, 14, GAME_COUNT - 1])

// Check-in timing comes from its own PRNG so it never shifts the main story.
function timingFor(trng: () => number, k: number, date: Date) {
  const timing = TIMINGS[k % TIMINGS.length]
  const hours = 2 + Math.floor(trng() * 3)
  const checkedInAt = timing ? new Date(date.getTime() + (timing === 'before' ? -hours : hours) * HOUR_MS) : null
  return { timing: timing as string | null, checkedInAt }
}

// Games every ~3 days ending yesterday. Scoring is loosely tied to confidence and sleep
// so the dashboard insights have a visible story. A few games (incl. the newest) have no
// check-in, which showcases the "missing check-in" banner; the rest mix before/after/unknown timing.
export function buildDemoGames(now: Date = new Date()) {
  const rand = mulberry32(42)
  const trng = mulberry32(1001)
  let k = 0
  const games = []
  for (let i = 0; i < GAME_COUNT; i++) {
    const daysAgo = 1 + (GAME_COUNT - 1 - i) * 3
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo))

    const confidence = clamp(Math.round(4 + rand() * 5), 1, 10)
    const sleepHours = clamp(Math.round((5.5 + rand() * 4) * 2) / 2, 0, 14)
    const form = (confidence - 5) * 0.18 + (sleepHours - 7) * 0.12
    const goals = rand() < 0.28 + form * 0.5 ? (rand() < 0.2 ? 2 : 1) : 0
    const assists = rand() < 0.4 + form * 0.6 ? (rand() < 0.2 ? 2 : 1) : 0
    const win = rand() < 0.5 + form * 0.3

    games.push({
      date,
      opponent: OPPONENTS[i % OPPONENTS.length],
      homeAway: i % 2 === 0 ? 'home' : 'away',
      result: win ? 'win' : 'loss',
      goals,
      assists,
      shots: clamp(Math.round(2 + rand() * 4 + form * 2), 0, 12),
      plusMinus: clamp(Math.round((win ? 1 : -1) * rand() * 2), -3, 3),
      iceTime: 16 + Math.floor(rand() * 7),
      mentalState: checkIn(rand, trng, SKATER_MISSING.has(i) ? -1 : k++, date, confidence, sleepHours),
    })
  }
  return games
}

// Always draws from rand (even when skipped, k < 0) so the sequence stays stable.
function checkIn(rand: () => number, trng: () => number, k: number, date: Date, confidence: number, sleepHours: number) {
  const base = {
    confidence,
    sleepHours,
    sleepQuality: clamp(Math.round(sleepHours - 1 + rand() * 3), 1, 10),
    stressLevel: clamp(Math.round(10 - confidence + rand() * 3), 1, 10),
    physicalEnergy: clamp(Math.round(confidence - 1 + rand() * 3), 1, 10),
    notes: null as string | null,
  }
  return k < 0 ? null : { ...base, ...timingFor(trng, k, date) }
}

// Goalie season: same cadence and check-in story, but outcomes are saves vs shots against.
export function buildDemoGoalieGames(now: Date = new Date()) {
  const rand = mulberry32(7)
  const trng = mulberry32(2002)
  const LOW_SHOT = new Set([4, 11, 17])
  let k = 0
  const games = []
  for (let i = 0; i < GAME_COUNT; i++) {
    const daysAgo = 1 + (GAME_COUNT - 1 - i) * 3
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo))

    const confidence = clamp(Math.round(4 + rand() * 5), 1, 10)
    const sleepHours = clamp(Math.round((5.5 + rand() * 4) * 2) / 2, 0, 14)
    const form = (confidence - 5) * 0.18 + (sleepHours - 7) * 0.12
    const drawnShots = clamp(Math.round(22 + rand() * 14), 18, 40)
    const shotsAgainst = LOW_SHOT.has(i) ? 5 + (i % 5) : drawnShots
    const sv = clamp(0.905 + form * 0.06 + (rand() - 0.5) * 0.02, 0.88, 0.935)
    // Rounding can push small samples outside the band; clamp to whole saves inside it (low-shot games may sit outside).
    const rounded = Math.round(shotsAgainst * sv)
    const saves = shotsAgainst >= 10 ? clamp(rounded, Math.ceil(shotsAgainst * 0.88), Math.floor(shotsAgainst * 0.935)) : rounded
    const win = rand() < 0.5 + form * 0.3

    games.push({
      date,
      opponent: OPPONENTS[i % OPPONENTS.length],
      homeAway: i % 2 === 0 ? 'home' : 'away',
      result: win ? 'win' : 'loss',
      goals: 0,
      assists: 0,
      shots: 0,
      plusMinus: 0,
      iceTime: 60,
      shotsAgainst,
      goalsAgainst: shotsAgainst - saves,
      saves,
      mentalState: checkIn(rand, trng, i === GAME_COUNT - 1 ? -1 : k++, date, confidence, sleepHours),
    })
  }
  return games
}

// Every demo click gets its own user and sample season, so visitors never touch each other's data.
// Demo users older than DEMO_TTL_MS are deleted here (games and check-ins cascade), so no cron is needed.
export async function createDemoUser(prisma: PrismaClient, position: Position = 'Center') {
  const userId = randomUUID()
  const goalie = isGoalie(position)
  // createMany keeps this to a few round trips instead of one per game (login stays fast).
  const seeded = (goalie ? buildDemoGoalieGames() : buildDemoGames()).map((g) => ({ id: randomUUID(), ...g }))
  const [, user] = await prisma.$transaction([
    prisma.user.deleteMany({
      where: { email: { endsWith: DEMO_DOMAIN }, createdAt: { lt: new Date(Date.now() - DEMO_TTL_MS) } },
    }),
    prisma.user.create({
      data: {
        id: userId,
        email: `demo-${userId}${DEMO_DOMAIN}`,
        password: '!', // not a valid bcrypt hash, so this user can never sign in with a password
        name: goalie ? 'Demo Goalie' : 'Demo Player',
        team: 'Demo Hockey Club',
        position,
      },
    }),
    prisma.game.createMany({
      data: seeded.map(({ mentalState, ...game }) => ({ ...game, userId })),
    }),
    prisma.mentalState.createMany({
      data: seeded.flatMap((g) => (g.mentalState ? [{ ...g.mentalState, gameId: g.id }] : [])),
    }),
  ])
  return user
}
