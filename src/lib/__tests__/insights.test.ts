import { computeInsights, InsightGame, MIN_CHECKINS, MIN_GROUP } from '../insights';

let n = 0;
const game = (confidence: number, sleepHours: number, points: number): InsightGame => ({
  id: `g${n++}`,
  date: '2024-03-15',
  opponent: 'X',
  goals: points,
  assists: 0,
  mentalState: { confidence, sleepHours },
});

describe('computeInsights', () => {
  test('locks at 7 check-ins (MIN_CHECKINS) and reports how many are missing', () => {
    const games = [...Array(7)].map(() => game(9, 8, 2)).concat([{ ...game(5, 7, 1), mentalState: null }]);
    expect(MIN_CHECKINS).toBe(8);
    expect(MIN_GROUP).toBe(3);
    expect(computeInsights(games)).toMatchObject({ checkInCount: 7, needed: 1, insights: [] });
  });

  test('unlocks at 8 check-ins', () => {
    const games = [...Array(4)].map(() => game(9, 8, 2)).concat([...Array(4)].map(() => game(3, 6, 0)));
    const r = computeInsights(games);
    expect(r.needed).toBe(0);
    expect(r.insights.length).toBeGreaterThan(0);
  });

  test('flat beats early for small groups with a tiny gap', () => {
    const games = [...Array(3)].flatMap(() => [game(9, 8, 1), game(3, 6, 1)]).concat([game(6, 7.5, 1), game(6, 7.5, 1)]);
    expect(computeInsights(games).insights[0].trust).toBe('flat');
  });

  test('games without check-in are ignored', () => {
    const base = [...Array(5)].flatMap(() => [game(9, 8, 2), game(3, 6, 0)]);
    const extra = [{ ...game(9, 8, 5), mentalState: null }, { ...game(3, 6, 5), mentalState: undefined }];
    const a = computeInsights(base);
    const b = computeInsights([...base, ...extra]);
    expect(b.checkInCount).toBe(a.checkInCount);
    for (const i of [0, 1]) {
      expect(b.insights[i].high.avgPoints).toBe(a.insights[i].high.avgPoints);
      expect(b.insights[i].low.avgPoints).toBe(a.insights[i].low.avgPoints);
      expect(b.insights[i].middleCount).toBe(a.insights[i].middleCount);
    }
  });

  test('insight wording has a sample size and no causal words', () => {
    const games = [...Array(5)].flatMap(() => [game(9, 8, 2), game(3, 6, 0)]);
    for (const i of computeInsights(games).insights) {
      expect(i.basedOn).toMatch(/\d+ games \(\d+ vs \d+\)/);
      for (const t of [i.headline, i.trustNote, i.basedOn, ...i.couldMean]) {
        expect(t).not.toMatch(/(because|causes?|leads? to|boosts?)/i);
      }
    }
  });

  test('computes group averages, middle count and a positive headline', () => {
    const games = [
      ...[2, 2, 2, 2, 2].map((p) => game(9, 8, p)), // high: avg 2
      ...[0, 0, 0, 0, 0].map((p) => game(3, 6, p)), // low: avg 0
      game(6, 7.5, 1), // in between on both
    ];
    const conf = computeInsights(games).insights.find((i) => i.id === 'confidence')!;
    expect(conf.high.avgPoints).toBe(2);
    expect(conf.low.avgPoints).toBe(0);
    expect(conf.high.totalPoints).toBe(10);
    expect(conf.middleCount).toBe(1);
    expect(conf.diff).toBe(2);
    expect(conf.trust).toBe('noticeable');
    expect(conf.headline).toMatch(/scored more/);
  });

  test('says so when the pattern runs the other way', () => {
    const games = [...Array(5)].flatMap(() => [game(9, 8, 0), game(3, 6, 2)]);
    const conf = computeInsights(games).insights.find((i) => i.id === 'confidence')!;
    expect(conf.headline).toMatch(/surprise/);
  });

  test('flags small groups as early and tiny gaps as flat', () => {
    const early = [...Array(3)].flatMap(() => [game(9, 8, 2), game(3, 6, 0)]);
    expect(computeInsights([...early, game(6, 7.5, 1), game(6, 7.5, 1)]).insights[0].trust).toBe('early');
    const flat = [...Array(5)].flatMap(() => [game(9, 8, 1), game(3, 6, 1)]);
    expect(computeInsights(flat).insights[0].trust).toBe('flat');
  });

  test('skips a comparison when a group has fewer than 3 games', () => {
    const games = [...Array(5)].map(() => game(9, 8, 1)).concat([game(3, 6, 0), game(6, 7.5, 1), game(6, 7.5, 1), game(6, 7.5, 1)]);
    expect(computeInsights(games).insights).toEqual([]);
  });
});

import { gameInsightsFor } from '../insights';

describe('gameInsightsFor', () => {
  const base = [...Array(5)].flatMap(() => [game(9, 8, 2), game(3, 6, 0)]);

  test('places a game in its group and compares points to the group average', () => {
    const target = game(9, 8, 3);
    const [conf, sleep] = gameInsightsFor(target.id, [...base, target]);
    expect(conf.text).toMatch(/confident nights.*rated it 9/);
    expect(conf.text).toMatch(/about 2\.2 points.*had 3, a bit above/);
    expect(sleep.text).toMatch(/8 hours.*well-rested/);
  });

  test('notes when a game sits between the groups', () => {
    const target = game(6, 7.5, 1);
    const [conf] = gameInsightsFor(target.id, [...base, target]);
    expect(conf.text).toMatch(/isn.t part of that comparison/);
  });

  test('is empty until insights unlock', () => {
    const target = game(9, 8, 3);
    expect(gameInsightsFor(target.id, [target])).toEqual([]);
  });
});
