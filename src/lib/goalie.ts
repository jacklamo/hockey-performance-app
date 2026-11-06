// Minimum shots against before a goalie save % is treated as meaningful.
export const MIN_SHOTS_AGAINST = 15

export const savePct = (saves: number, shotsAgainst: number): number | null =>
  shotsAgainst > 0 ? saves / shotsAgainst : null

export const formatSavePct = (saves: number | null | undefined, shotsAgainst: number | null | undefined): string => {
  const p = savePct(saves ?? 0, shotsAgainst ?? 0)
  return p === null ? '—' : p.toFixed(3).replace(/^0/, '')
}

type SavesGame = { saves: number | null; shotsAgainst: number | null }

// Sums across games, never a mean of per-game percentages.
export const totalSavePct = (games: SavesGame[]): number | null =>
  savePct(
    games.reduce((a, g) => a + (g.saves ?? 0), 0),
    games.reduce((a, g) => a + (g.shotsAgainst ?? 0), 0),
  )

export const validateGoalieStats = (sa: unknown, ga: unknown): { saves: number } | { error: string } => {
  if (!Number.isInteger(sa) || (sa as number) < 0) return { error: 'Shots against must be a non-negative whole number' }
  if (!Number.isInteger(ga) || (ga as number) < 0) return { error: 'Goals against must be a non-negative whole number' }
  if ((ga as number) > (sa as number)) return { error: 'Goals against cannot exceed shots against' }
  return { saves: (sa as number) - (ga as number) }
}
