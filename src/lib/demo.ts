import { randomUUID } from 'crypto'
import { hash } from 'bcryptjs'
import type { PrismaClient } from '@prisma/client'

import { DEMO_EMAIL, DEMO_PASSWORD } from './demo-credentials'

export { DEMO_EMAIL, DEMO_PASSWORD }

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

// Games every ~3 days ending yesterday. Scoring is loosely tied to confidence and sleep
// so the dashboard insights have a visible story. The newest game has no check-in,
// which showcases the "missing check-in" banner.
export function buildDemoGames(now: Date = new Date()) {
  const rand = mulberry32(42)
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
      mentalState:
        i === GAME_COUNT - 1
          ? null
          : {
              confidence,
              sleepHours,
              sleepQuality: clamp(Math.round(sleepHours - 1 + rand() * 3), 1, 10),
              stressLevel: clamp(Math.round(10 - confidence + rand() * 3), 1, 10),
              physicalEnergy: clamp(Math.round(confidence - 1 + rand() * 3), 1, 10),
              notes: null as string | null,
            },
    })
  }
  return games
}

// Ensure the demo user exists and replace its games with fresh seed data.
export async function resetDemoData(prisma: PrismaClient) {
  const user =
    (await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })) ??
    (await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        password: await hash(DEMO_PASSWORD, 10),
        name: 'Demo Player',
        team: 'Demo Hockey Club',
        position: 'Center',
      },
    }))

  // createMany keeps this to a few round trips instead of one per game (login stays fast).
  const seeded = buildDemoGames().map((g) => ({ id: randomUUID(), ...g }))
  await prisma.$transaction([
    prisma.game.deleteMany({ where: { userId: user.id } }),
    prisma.game.createMany({
      data: seeded.map(({ mentalState, ...game }) => ({ ...game, userId: user.id })),
    }),
    prisma.mentalState.createMany({
      data: seeded.flatMap((g) => (g.mentalState ? [{ ...g.mentalState, gameId: g.id }] : [])),
    }),
  ])

  return user
}
