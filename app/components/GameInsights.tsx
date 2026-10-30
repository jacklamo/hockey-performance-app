'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { computeInsights, gameInsightsFor, InsightGame } from '@/src/lib/insights';

// Loads all games itself so the game page renders without waiting on it.
export default function GameInsights({ gameId, hasCheckIn }: { gameId: string; hasCheckIn: boolean }) {
  const [games, setGames] = useState<InsightGame[] | null>(null);

  useEffect(() => {
    if (!hasCheckIn) return;
    fetch('/api/games')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setGames(d.games || []))
      .catch(() => setGames([]));
  }, [hasCheckIn]);

  if (!hasCheckIn) {
    return (
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">How this game fits your patterns</h2>
        <p className="text-gray-600">
          Log a check-in for this game and we&apos;ll show how it compares with your usual patterns.
        </p>
      </section>
    );
  }

  if (!games) return null;

  const items = gameInsightsFor(gameId, games);
  const { needed } = computeInsights(games);
  if (items.length === 0 && needed === 0) return null;

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-600 p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">How this game fits your patterns</h2>
      {needed > 0 ? (
        <p className="text-gray-600">
          {needed} more {needed === 1 ? 'check-in' : 'check-ins'} and we&apos;ll show how this game compares with your usual patterns.
        </p>
      ) : (
        <>
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id}>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-1">{item.title}</p>
                <p className="text-gray-900">{item.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            One game says very little on its own, so treat this as context, not a verdict.{' '}
            <Link href="/insights" className="font-medium text-blue-600 hover:text-blue-800">
              See how these patterns were built →
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
