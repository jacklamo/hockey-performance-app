export const POSITIONS = ['Center', 'Left Wing', 'Right Wing', 'Defenseman', 'Goalie'] as const
export type Position = (typeof POSITIONS)[number]

const ALIASES: Record<string, Position> = {
  c: 'Center', center: 'Center', centre: 'Center',
  lw: 'Left Wing', 'left wing': 'Left Wing', lwing: 'Left Wing',
  rw: 'Right Wing', 'right wing': 'Right Wing',
  d: 'Defenseman', defense: 'Defenseman', defence: 'Defenseman', defenseman: 'Defenseman', defenceman: 'Defenseman',
  g: 'Goalie', goalie: 'Goalie', goaltender: 'Goalie', 'g/k': 'Goalie',
}

// Write path: returns canonical position or null (caller responds 400).
export const normalizePosition = (v: unknown): Position | null =>
  typeof v === 'string' ? ALIASES[v.trim().toLowerCase().replace(/\s+/g, ' ')] ?? null : null

// Read path: unknown legacy value -> skater, never throws.
export const isGoalie = (v: unknown): boolean => normalizePosition(v) === 'Goalie'
