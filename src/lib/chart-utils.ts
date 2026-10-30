// Pure chart data transformation functions — no React, no side effects.

interface MentalState {
  confidence: number;
  sleepHours: number;
  sleepQuality: number;
  stressLevel: number;
  physicalEnergy: number;
  notes?: string;
}

interface Game {
  id: string;
  date: string; // ISO date string, API returns newest-first
  opponent: string;
  homeAway: string;
  result: string;
  goals: number;
  assists: number;
  shots: number;
  plusMinus: number;
  iceTime: number;
  mentalState?: MentalState;
}

// Output shapes for Recharts
export interface LineChartPoint {
  game: number;   // 1-based chronological game number across all games
  date: string;   // e.g. "Mar 15"
  points: number; // goals + assists
}

export interface BarChartPoint {
  game: number;       // 1-based chronological game number across all games
  date: string;       // e.g. "Mar 15"
  confidence: number; // 0–10 (passed through as-is)
  sleep: number;      // normalized: (sleepHours / 12) * 10, 1 decimal
}

// Format an ISO date string as "Mon D" (e.g. "Mar 15") in en-US locale.
function formatDate(isoDate: string): string {
  // Parse date parts directly to avoid timezone offset issues
  const [year, month, day] = isoDate.split('T')[0].split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Sort games chronologically (oldest first) by date string comparison.
function sortChronologically(games: Game[]): Game[] {
  return [...games].sort((a, b) => {
    const da = a.date.split('T')[0];
    const db = b.date.split('T')[0];
    if (da < db) return -1;
    if (da > db) return 1;
    return 0;
  });
}

/**
 * Transform a games array into LineChart data points.
 * Returns the last 10 games in chronological order (oldest to newest).
 */
export function buildLineChartData(games: Game[]): LineChartPoint[] {
  if (games.length === 0) return [];

  const sorted = sortChronologically(games);
  const last10 = sorted.slice(-10);

  return last10.map((game) => ({
    game: sorted.indexOf(game) + 1,
    date: formatDate(game.date),
    points: game.goals + game.assists,
  }));
}

/**
 * Transform a games array into BarChart data points.
 * Only includes games that have a mentalState record.
 * Returns the last 10 qualifying games in chronological order.
 */
export function buildBarChartData(games: Game[]): BarChartPoint[] {
  if (games.length === 0) return [];

  const sorted = sortChronologically(games);
  const withMentalState = sorted.filter((g) => g.mentalState != null);
  const last10 = withMentalState.slice(-10);

  return last10.map((game) => {
    const ms = game.mentalState!;
    const sleep = parseFloat(((ms.sleepHours / 12) * 10).toFixed(1));
    return {
      game: sorted.indexOf(game) + 1,
      date: formatDate(game.date),
      confidence: ms.confidence,
      sleep,
    };
  });
}

export interface GroupBar {
  name: string;
  avgPoints: number;
  games: number;
}

function groupBar(name: string, games: Game[]): GroupBar {
  const total = games.reduce((sum, g) => sum + g.goals + g.assists, 0);
  return { name, avgPoints: games.length ? total / games.length : 0, games: games.length };
}

/** Average points by confidence zone, using only games with a check-in. Same cut-offs as the insights. */
export function buildConfidenceGroups(games: Game[]): GroupBar[] {
  const withMs = games.filter((g) => g.mentalState != null);
  const c = (g: Game) => g.mentalState!.confidence;
  return [
    groupBar('Not feeling it', withMs.filter((g) => c(g) <= 5)),
    groupBar('Steady', withMs.filter((g) => c(g) >= 6 && c(g) <= 7)),
    groupBar('Locked in', withMs.filter((g) => c(g) >= 8)),
  ];
}

/** Average points by hours slept, using only games with a check-in. Same cut-offs as the insights. */
export function buildSleepGroups(games: Game[]): GroupBar[] {
  const withMs = games.filter((g) => g.mentalState != null);
  const h = (g: Game) => g.mentalState!.sleepHours;
  return [
    groupBar('Under 7 h', withMs.filter((g) => h(g) < 7)),
    groupBar('7 to 8 h', withMs.filter((g) => h(g) >= 7 && h(g) < 8)),
    groupBar('8+ h', withMs.filter((g) => h(g) >= 8)),
  ];
}
