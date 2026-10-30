'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Header from '@/app/components/Header';
import { computeInsights, Group, Insight, InsightGame } from '@/src/lib/insights';

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function GameList({ group, valueLabel }: { group: Group; valueLabel: string }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
        Show the {group.games.length} games ({group.rule})
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1 pr-4 font-medium">Date</th>
              <th className="py-1 pr-4 font-medium">Opponent</th>
              <th className="py-1 pr-4 font-medium">{valueLabel}</th>
              <th className="py-1 font-medium">Points</th>
            </tr>
          </thead>
          <tbody className="text-gray-900">
            {group.games.map((g) => (
              <tr key={g.id} className="border-t border-gray-100">
                <td className="py-1 pr-4 whitespace-nowrap">{formatDate(g.date)}</td>
                <td className="py-1 pr-4">{g.opponent}</td>
                <td className="py-1 pr-4">{g.value}</td>
                <td className="py-1">{g.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Bar({ label, group, max }: { label: string; group: Group; max: number }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm text-gray-700 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{group.avgPoints.toFixed(1)} pts/game</span>
      </div>
      <div className="h-3 rounded-full bg-gray-100">
        <div
          className="h-3 rounded-full bg-blue-600"
          style={{ width: `${max > 0 ? (group.avgPoints / max) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
        {n}
      </span>
      <div className="text-gray-700">{children}</div>
    </li>
  );
}

function Report({ insight, checkInCount }: { insight: Insight; checkInCount: number }) {
  const { high, low } = insight;
  const max = Math.max(high.avgPoints, low.avgPoints);
  const valueLabel = insight.id === 'sleep' ? 'Hours slept' : 'Confidence';
  const direction = insight.diff >= 0 ? 'higher' : 'lower';

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-2">{insight.title}</h2>
      <p className="text-2xl text-gray-900 leading-snug mb-6">{insight.headline}</p>

      <Bar label={high.rule} group={high} max={max} />
      <Bar label={low.rule} group={low} max={max} />

      <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">How we got there</h3>
      <ol className="space-y-3">
        <Step n={1}>
          We started with the <strong>{checkInCount} games</strong> where you logged a check-in. Games without one can&apos;t be
          included, because we don&apos;t know how you felt.
        </Step>
        <Step n={2}>
          We sorted those games into two groups: <strong>{high.rule}</strong> ({high.games.length} games) and{' '}
          <strong>{low.rule}</strong> ({low.games.length} games).
          {insight.middleCount > 0 && (
            <> The other {insight.middleCount} games fell in between, so they&apos;re left out of both groups on purpose.</>
          )}
        </Step>
        <Step n={3}>
          For each group we added up your goals and assists, then divided by the number of games:{' '}
          <strong>
            {high.totalPoints} points over {high.games.length} games = {high.avgPoints.toFixed(1)}
          </strong>{' '}
          and{' '}
          <strong>
            {low.totalPoints} points over {low.games.length} games = {low.avgPoints.toFixed(1)}
          </strong>
          .
        </Step>
        <Step n={4}>
          The gap between them is <strong>{Math.abs(insight.diff).toFixed(1)} points</strong>, {direction} for the
          &ldquo;{high.rule}&rdquo; group.
        </Step>
      </ol>
      <div className="mt-3">
        <GameList group={high} valueLabel={valueLabel} />
        <GameList group={low} valueLabel={valueLabel} />
      </div>

      <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">What went into it, and what didn&apos;t</h3>
      <p className="text-gray-700 mb-3">
        Only two things were used: your <strong>points</strong> (goals plus assists) and your{' '}
        <strong>{insight.id === 'sleep' ? 'hours of sleep' : 'confidence rating'}</strong>. Plenty of other things shape a
        game that this doesn&apos;t see:
      </p>
      <ul className="list-disc space-y-1 pl-5 text-gray-700">
        {insight.notIncluded.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">How much to read into it</h3>
      <p className="text-gray-700">{insight.trustNote}</p>

      <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">What it could mean</h3>
      <p className="text-gray-600 mb-3 italic">
        These are possibilities, not conclusions. Your numbers can&apos;t tell us which one, if any, is true.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-gray-700">
        {insight.couldMean.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const [games, setGames] = useState<InsightGame[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/games');
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch games');
        setGames((await res.json()).games || []);
      } catch {
        setError('Failed to load your insights. Please try again.');
      }
    })();
  }, [router]);

  const result = games ? computeInsights(games) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Your Insights Report" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <p className="text-gray-700 mb-8">
          Here&apos;s how each insight on your dashboard was put together, what it was built from, and what it might
          (and might not) tell you.
        </p>

        {error ? (
          <p role="alert" className="text-red-600">{error}</p>
        ) : !result ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : result.needed > 0 ? (
          <p className="text-gray-700">
            You need {result.needed} more {result.needed === 1 ? 'check-in' : 'check-ins'} before there&apos;s enough to
            report on.
          </p>
        ) : result.insights.length === 0 ? (
          <p className="text-gray-700">
            Not enough variety yet. We need at least a few games at both ends, like nights you felt confident and nights
            you didn&apos;t, to make a comparison.
          </p>
        ) : (
          result.insights.map((insight) => (
            <Report key={insight.id} insight={insight} checkInCount={result.checkInCount} />
          ))
        )}
      </main>
    </div>
  );
}
