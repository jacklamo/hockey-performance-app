import { buildLineChartData, buildBarChartData } from '@/src/lib/chart-utils';
import type { LineChartPoint, BarChartPoint } from '@/src/lib/chart-utils';

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
  date: string;
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

// Helper to build a game with minimal required fields
function makeGame(overrides: Partial<Game> & { date: string }): Game {
  return {
    id: overrides.id ?? 'g1',
    date: overrides.date,
    opponent: overrides.opponent ?? 'Opponent',
    homeAway: overrides.homeAway ?? 'home',
    result: overrides.result ?? 'W',
    goals: overrides.goals ?? 0,
    assists: overrides.assists ?? 0,
    shots: overrides.shots ?? 0,
    plusMinus: overrides.plusMinus ?? 0,
    iceTime: overrides.iceTime ?? 0,
    mentalState: overrides.mentalState,
  };
}

// ─── buildLineChartData ───────────────────────────────────────────────────────

describe('buildLineChartData', () => {
  test('empty array returns []', () => {
    expect(buildLineChartData([])).toEqual([]);
  });

  test('points equals goals + assists', () => {
    const games: Game[] = [makeGame({ date: '2024-03-15', goals: 2, assists: 3 })];
    const result = buildLineChartData(games);
    expect(result[0].points).toBe(5);
  });

  test('games are sorted chronologically (oldest first)', () => {
    const games: Game[] = [
      makeGame({ id: 'g1', date: '2024-03-20', goals: 1 }),
      makeGame({ id: 'g2', date: '2024-03-10', goals: 2 }),
      makeGame({ id: 'g3', date: '2024-03-15', goals: 3 }),
    ];
    const result = buildLineChartData(games);
    const dates = result.map((p) => p.date);
    // Mar 10 → Mar 15 → Mar 20
    expect(dates[0]).toMatch(/Mar\s+10/);
    expect(dates[1]).toMatch(/Mar\s+15/);
    expect(dates[2]).toMatch(/Mar\s+20/);
  });

  test('returns last 10 games when more than 10 provided', () => {
    const games: Game[] = Array.from({ length: 15 }, (_, i) =>
      makeGame({ id: `g${i}`, date: `2024-03-${String(i + 1).padStart(2, '0')}`, goals: i })
    );
    const result = buildLineChartData(games);
    expect(result).toHaveLength(10);
    // Should be the 10 most recent: Mar 06 through Mar 15
    expect(result[0].date).toMatch(/Mar\s+6/);
    expect(result[9].date).toMatch(/Mar\s+15/);
  });

  test('date is formatted as short month + day (e.g. "Mar 15")', () => {
    const games: Game[] = [makeGame({ date: '2024-03-15' })];
    const result = buildLineChartData(games);
    expect(result[0].date).toMatch(/^[A-Z][a-z]{2}\s+\d{1,2}$/);
  });
});

// ─── buildBarChartData ────────────────────────────────────────────────────────

describe('buildBarChartData', () => {
  test('empty array returns []', () => {
    expect(buildBarChartData([])).toEqual([]);
  });

  test('games without mentalState are excluded', () => {
    const games: Game[] = [
      makeGame({ date: '2024-03-10' }), // no mentalState
      makeGame({
        date: '2024-03-15',
        mentalState: { confidence: 8, sleepHours: 8, sleepQuality: 7, stressLevel: 3, physicalEnergy: 8 },
      }),
    ];
    const result = buildBarChartData(games);
    expect(result).toHaveLength(1);
  });

  test('games are sorted chronologically before slicing', () => {
    const games: Game[] = [
      makeGame({
        id: 'g1',
        date: '2024-03-20',
        mentalState: { confidence: 7, sleepHours: 7, sleepQuality: 7, stressLevel: 3, physicalEnergy: 7 },
      }),
      makeGame({
        id: 'g2',
        date: '2024-03-10',
        mentalState: { confidence: 6, sleepHours: 6, sleepQuality: 6, stressLevel: 4, physicalEnergy: 6 },
      }),
      makeGame({
        id: 'g3',
        date: '2024-03-15',
        mentalState: { confidence: 5, sleepHours: 5, sleepQuality: 5, stressLevel: 5, physicalEnergy: 5 },
      }),
    ];
    const result = buildBarChartData(games);
    expect(result[0].date).toMatch(/Mar\s+10/);
    expect(result[1].date).toMatch(/Mar\s+15/);
    expect(result[2].date).toMatch(/Mar\s+20/);
  });

  test('returns last 10 mental-state games when more than 10 provided', () => {
    const games: Game[] = Array.from({ length: 15 }, (_, i) =>
      makeGame({
        id: `g${i}`,
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        mentalState: { confidence: 7, sleepHours: 8, sleepQuality: 7, stressLevel: 3, physicalEnergy: 8 },
      })
    );
    const result = buildBarChartData(games);
    expect(result).toHaveLength(10);
    expect(result[0].date).toMatch(/Mar\s+6/);
    expect(result[9].date).toMatch(/Mar\s+15/);
  });

  test('confidence is passed through as-is', () => {
    const games: Game[] = [
      makeGame({
        date: '2024-03-15',
        mentalState: { confidence: 9, sleepHours: 8, sleepQuality: 7, stressLevel: 3, physicalEnergy: 8 },
      }),
    ];
    const result = buildBarChartData(games);
    expect(result[0].confidence).toBe(9);
  });

  test('sleep normalized: sleepHours=8 → sleep=6.7', () => {
    const games: Game[] = [
      makeGame({
        date: '2024-03-15',
        mentalState: { confidence: 7, sleepHours: 8, sleepQuality: 7, stressLevel: 3, physicalEnergy: 8 },
      }),
    ];
    const result = buildBarChartData(games);
    expect(result[0].sleep).toBe(6.7);
  });

  test('sleep normalized: sleepHours=12 → sleep=10.0', () => {
    const games: Game[] = [
      makeGame({
        date: '2024-03-15',
        mentalState: { confidence: 7, sleepHours: 12, sleepQuality: 7, stressLevel: 3, physicalEnergy: 8 },
      }),
    ];
    const result = buildBarChartData(games);
    expect(result[0].sleep).toBe(10.0);
  });

  test('sleep normalized: sleepHours=6 → sleep=5.0', () => {
    const games: Game[] = [
      makeGame({
        date: '2024-03-15',
        mentalState: { confidence: 7, sleepHours: 6, sleepQuality: 7, stressLevel: 3, physicalEnergy: 8 },
      }),
    ];
    const result = buildBarChartData(games);
    expect(result[0].sleep).toBe(5.0);
  });

  test('sleep value is a number (not a string)', () => {
    const games: Game[] = [
      makeGame({
        date: '2024-03-15',
        mentalState: { confidence: 7, sleepHours: 8, sleepQuality: 7, stressLevel: 3, physicalEnergy: 8 },
      }),
    ];
    const result = buildBarChartData(games);
    expect(typeof result[0].sleep).toBe('number');
  });
});
