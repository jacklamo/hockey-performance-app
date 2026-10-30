// Pure insight computation + plain-language copy — no React, no side effects.

export interface InsightGame {
  id: string;
  date: string;
  opponent: string;
  goals: number;
  assists: number;
  mentalState?: { confidence: number; sleepHours: number } | null;
}

export interface GroupGame {
  id: string;
  date: string;
  opponent: string;
  points: number;
  value: number; // the rating/hours that put this game in the group
}

export interface Group {
  rule: string; // e.g. "confidence of 8 or higher"
  games: GroupGame[];
  totalPoints: number;
  avgPoints: number;
}

export type Trust = 'early' | 'flat' | 'noticeable';

export interface Insight {
  id: 'confidence' | 'sleep';
  title: string;
  headline: string;
  high: Group;
  low: Group;
  diff: number; // high avg minus low avg
  middleCount: number; // check-in games in neither group
  trust: Trust;
  trustNote: string;
  couldMean: string[];
  notIncluded: string[];
}

export const MIN_CHECKINS = 5;
const MIN_GROUP = 3; // below this we say "not enough yet" instead of comparing
const EARLY_GROUP = 5; // below this, flag the result as an early signal
const MEANINGFUL_DIFF = 0.3;

const NOT_INCLUDED = [
  'How strong the opponent was',
  'Your ice time, line, or linemates',
  'Home versus away',
  'Injuries, illness, or travel',
  'Anything you did that night that doesn’t show up in goals and assists, like defence or hits',
];

const pts = (n: number) => n.toFixed(1);

function makeGroup(
  rule: string,
  games: InsightGame[],
  value: (g: InsightGame) => number
): Group {
  const rows = games.map((g) => ({
    id: g.id,
    date: g.date,
    opponent: g.opponent,
    points: g.goals + g.assists,
    value: value(g),
  }));
  const totalPoints = rows.reduce((sum, r) => sum + r.points, 0);
  return { rule, games: rows, totalPoints, avgPoints: rows.length ? totalPoints / rows.length : 0 };
}

function trustFor(high: Group, low: Group, diff: number): { trust: Trust; trustNote: string } {
  const smallest = Math.min(high.games.length, low.games.length);
  if (smallest < EARLY_GROUP) {
    return {
      trust: 'early',
      trustNote: `One of the two groups only has ${smallest} games in it, so a single big night could swing this a lot. Treat it as an early hint and watch whether it holds as you log more games.`,
    };
  }
  if (Math.abs(diff) < MEANINGFUL_DIFF) {
    return {
      trust: 'flat',
      trustNote: `The two groups are within ${MEANINGFUL_DIFF} points of each other, which is about the size of normal game-to-game ups and downs. There’s no real pattern here yet.`,
    };
  }
  return {
    trust: 'noticeable',
    trustNote: `Both groups have ${smallest}+ games and the gap is bigger than the usual ups and downs. That makes it worth paying attention to, but it’s still a small sample from one player, so it’s a pattern to watch, not a proven rule.`,
  };
}

function headline(subject: string, goodState: string, badState: string, high: Group, low: Group, diff: number): string {
  const h = pts(high.avgPoints);
  const l = pts(low.avgPoints);
  if (diff >= MEANINGFUL_DIFF) {
    return `You’ve scored more on the nights ${goodState}: about ${h} points a game, compared with ${l} when ${badState}.`;
  }
  if (diff <= -MEANINGFUL_DIFF) {
    return `This one’s a surprise. You’ve actually scored a bit less on the nights ${goodState} (${h} points a game) than when ${badState} (${l}).`;
  }
  return `${subject} hasn’t made much difference to your scoring so far: roughly ${h} points a game when ${goodState}, and ${l} when ${badState}.`;
}

export function computeInsights(games: InsightGame[]): {
  checkInCount: number;
  needed: number; // check-ins still needed before insights unlock (0 when unlocked)
  insights: Insight[];
} {
  const withCheckIn = games.filter((g) => g.mentalState);
  const needed = Math.max(0, MIN_CHECKINS - withCheckIn.length);
  if (needed > 0) return { checkInCount: withCheckIn.length, needed, insights: [] };

  const insights: Insight[] = [];

  const build = (
    id: Insight['id'],
    title: string,
    subject: string,
    goodState: string,
    badState: string,
    highRule: string,
    lowRule: string,
    isHigh: (g: InsightGame) => boolean,
    isLow: (g: InsightGame) => boolean,
    value: (g: InsightGame) => number,
    couldMean: string[]
  ) => {
    const high = makeGroup(highRule, withCheckIn.filter(isHigh), value);
    const low = makeGroup(lowRule, withCheckIn.filter(isLow), value);
    if (high.games.length < MIN_GROUP || low.games.length < MIN_GROUP) return;
    const diff = high.avgPoints - low.avgPoints;
    insights.push({
      id,
      title,
      headline: headline(subject, goodState, badState, high, low, diff),
      high,
      low,
      diff,
      middleCount: withCheckIn.length - high.games.length - low.games.length,
      ...trustFor(high, low, diff),
      couldMean,
      notIncluded: NOT_INCLUDED,
    });
  };

  build(
    'confidence',
    'Confidence',
    'Confidence',
    'you walked in feeling confident (8 or higher)',
    'you didn’t (5 or lower)',
    'confidence of 8 or higher',
    'confidence of 5 or lower',
    (g) => g.mentalState!.confidence >= 8,
    (g) => g.mentalState!.confidence <= 5,
    (g) => g.mentalState!.confidence,
    [
      'Feeling confident might help you play more assertively, shoot more, or make quicker decisions.',
      'It could also run the other way: a few good games can build confidence, so scoring might be causing the feeling rather than the feeling causing the scoring.',
      'A third thing might be behind both, like a good week of practice, a comfortable lineup, or an easier opponent.',
      'It might be mostly chance. With a small number of games, a couple of unusual nights can create a pattern that fades later.',
    ]
  );

  build(
    'sleep',
    'Sleep',
    'Sleep',
    'you got 8+ hours the night before',
    'you got under 7',
    '8 or more hours of sleep',
    'under 7 hours of sleep',
    (g) => g.mentalState!.sleepHours >= 8,
    (g) => g.mentalState!.sleepHours < 7,
    (g) => g.mentalState!.sleepHours,
    [
      'More sleep might leave you sharper and quicker, especially late in games.',
      'Sleep might be a stand-in for other habits, like how you eat, how stressed you are, or how hard you trained the day before.',
      'Game schedules can matter too: short nights often come before early games or after travel, which could affect play on their own.',
      'It might be mostly chance. A handful of games either way isn’t much to go on.',
    ]
  );

  return { checkInCount: withCheckIn.length, needed: 0, insights };
}

export interface GameInsight {
  id: Insight['id'];
  title: string;
  text: string;
}

// How one game sits against the global insights. Empty until insights unlock.
export function gameInsightsFor(gameId: string, games: InsightGame[]): GameInsight[] {
  return computeInsights(games).insights.flatMap((insight) => {
    const inHigh = insight.high.games.find((g) => g.id === gameId);
    const inLow = insight.low.games.find((g) => g.id === gameId);
    const ms = games.find((g) => g.id === gameId)?.mentalState;
    if (!ms) return [];
    const sleep = insight.id === 'sleep';
    const value = sleep ? ms.sleepHours : ms.confidence;

    if (!inHigh && !inLow) {
      return [{
        id: insight.id,
        title: insight.title,
        text: sleep
          ? `You got ${value} hours, which falls between your well-rested and short-sleep nights, so this game isn’t part of that comparison.`
          : `You rated your confidence ${value}, which falls between your confident and not-so-confident nights, so this game isn’t part of that comparison.`,
      }];
    }

    const group = inHigh ? insight.high : insight.low;
    const points = (inHigh ?? inLow)!.points;
    const gap = points - group.avgPoints;
    const rel = Math.abs(gap) < 0.5 ? 'right in line with that' : gap > 0 ? 'a bit above that' : 'a bit below that';
    const usual = `On those nights you usually score about ${pts(group.avgPoints)} points; this time you had ${points}, ${rel}.`;
    const lead = sleep
      ? inHigh
        ? `You got ${value} hours, so this was one of your well-rested nights.`
        : `You got ${value} hours, a shorter night for you.`
      : inHigh
        ? `This was one of your confident nights (you rated it ${value}).`
        : `You went in feeling less sure (you rated it ${value}).`;
    return [{ id: insight.id, title: insight.title, text: `${lead} ${usual}` }];
  });
}
