'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { isGoalie } from '@/src/lib/positions';
import { formatSavePct } from '@/src/lib/goalie';
import Header from '@/app/components/Header';
import { computeInsights, MIN_CHECKINS, MIN_GROUP, Group, Insight, InsightGame } from '@/src/lib/insights';

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function GameList({ group, valueLabel, goalie }: { group: Group; valueLabel: string; goalie: boolean }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer font-semibold text-gray-900">
        Show the {group.games.length} games ({group.rule})
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-[15px] tabular-nums">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1 pr-4 font-semibold">Date</th>
              <th className="py-1 pr-4 font-semibold">Opponent</th>
              <th className="py-1 pr-4 font-semibold">{valueLabel}</th>
              {!goalie && <th className="py-1 font-semibold">Points</th>}
            </tr>
          </thead>
          <tbody className="text-gray-900">
            {group.games.map((g) => (
              <tr key={g.id} className="border-t border-gray-200">
                <td className="py-1.5 pr-4 whitespace-nowrap">{formatDate(g.date)}</td>
                <td className="py-1.5 pr-4">{g.opponent}</td>
                <td className="py-1.5 pr-4">{g.value}</td>
                {!goalie && <td className="py-1.5">{g.points}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Bar({ label, group, max, goalie }: { label: string; group: Group; max: number; goalie: boolean }) {
  const value = goalie ? (group.savePct ?? 0) : group.avgPoints;
  return (
    <div className="mb-2.5 grid grid-cols-[1fr_5.5rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[11rem_1fr_5.5rem]">
      <span className="text-gray-700">{label}</span>
      <div className="order-3 col-span-2 h-3.5 overflow-hidden rounded-full bg-gray-100 sm:order-none sm:col-span-1">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="text-right font-bold tabular-nums text-gray-900">{goalie ? `${formatSavePct(group.saves, group.shotsAgainst)} SV%` : `${value.toFixed(1)} pts`}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7 grid grid-cols-1 gap-x-10 gap-y-2 border-t border-gray-200 py-6 md:grid-cols-[13rem_minmax(0,1fr)]">
      <h3 className="text-[22px] font-bold text-gray-900">{title}</h3>
      <div className="max-w-[64ch] min-w-0 space-y-3 text-gray-900">{children}</div>
    </div>
  );
}

function Report({ insight, checkInCount, goalie }: { insight: Insight; checkInCount: number; goalie: boolean }) {
  const { high, low } = insight;
  const max = goalie ? Math.max(high.savePct ?? 0, low.savePct ?? 0) : Math.max(high.avgPoints, low.avgPoints);
  const valueLabel = insight.id === 'sleep' ? 'Hours slept' : 'Confidence';
  const direction = insight.diff >= 0 ? 'higher' : 'lower';

  return (
    <article className="border-t-[3px] border-gray-900 pt-5">
      <h2 className="mb-2 text-xl font-bold text-blue-600">{insight.title}</h2>
      <p className="max-w-[30ch] font-serif text-[clamp(26px,3.6vw,36px)] font-semibold leading-tight text-gray-900">{insight.headline}</p>
      <p className="mt-2 text-sm text-gray-500">{insight.basedOn}</p>

      <div className="mt-7 mb-2 max-w-[640px]">
        <Bar label={high.rule} group={high} max={max} goalie={goalie} />
        <Bar label={low.rule} group={low} max={max} goalie={goalie} />
      </div>

      <Section title="How we got there">
        <ol className="list-decimal space-y-2.5 pl-6 marker:text-gray-500">
          <li className="pl-1">
            We started with the <strong>{checkInCount} games</strong> where you logged a check-in{goalie ? ' and faced 15 or more shots' : ''}. Games without
            one can&apos;t be included, because we don&apos;t know how you felt.
          </li>
          <li className="pl-1">
            We sorted those games into two groups: <strong>{high.rule}</strong> ({high.games.length} games) and{' '}
            <strong>{low.rule}</strong> ({low.games.length} games).
            {insight.middleCount > 0 && (
              <> The other {insight.middleCount} games fell in between, so they&apos;re left out of both groups on purpose.</>
            )}
          </li>
          <li className="pl-1">
            {goalie ? (
              <>
                For each group we added up your saves and your shots against, then divided saves by shots. That gives your save % across games where you faced 15+ shots:{' '}
                <strong>{high.saves} saves on {high.shotsAgainst} shots = {formatSavePct(high.saves, high.shotsAgainst)}</strong> and{' '}
                <strong>{low.saves} saves on {low.shotsAgainst} shots = {formatSavePct(low.saves, low.shotsAgainst)}</strong>.
              </>
            ) : (
              <>
                For each group we added up your goals and assists, then divided by the number of games:{' '}
                <strong>{high.totalPoints} points over {high.games.length} games = {high.avgPoints.toFixed(1)}</strong> and{' '}
                <strong>{low.totalPoints} points over {low.games.length} games = {low.avgPoints.toFixed(1)}</strong>.
              </>
            )}
          </li>
          <li className="pl-1">
            The gap between them is <strong>{goalie ? `${(Math.abs(insight.diff) * 100).toFixed(1)} SV%` : `${Math.abs(insight.diff).toFixed(1)} points`}</strong>, {direction} for the
            &ldquo;{high.rule}&rdquo; group.
          </li>
        </ol>
        <GameList group={high} valueLabel={valueLabel} goalie={goalie} />
        <GameList group={low} valueLabel={valueLabel} goalie={goalie} />
      </Section>

      <Section title="What went into it, and what didn't">
        <p>
          Only two things were used: your <strong>{goalie ? 'save %' : 'points'}</strong>{goalie ? '' : ' (goals plus assists)'} and your{' '}
          <strong>{insight.id === 'sleep' ? 'hours of sleep' : 'confidence rating'}</strong>. Plenty of other things shape a
          game that this doesn&apos;t see:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          {insight.notIncluded.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title="How much to read into it">
        <p>{insight.trustNote}</p>
      </Section>

      <Section title="What it could mean">
        <p className="text-gray-600">
          These are possibilities, not conclusions. Your numbers can&apos;t tell us which one, if any, is true.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          {insight.couldMean.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
    </article>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const goalie = isGoalie(session?.user?.position);
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

  const result = games && status !== 'loading' ? computeInsights(games, { goalie }) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Your insights report" width="medium" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <Link href="/dashboard" className="font-semibold text-gray-900 underline underline-offset-4">
          Back to dashboard
        </Link>

        <p className="mt-4 mb-10 max-w-[60ch] text-gray-600">
          Here is how each insight on your dashboard was put together, what it was built from, and what it might and might
          not tell you.{goalie && ' For goalies, everything is measured in save % across games where you faced 15 or more shots.'}
        </p>

        {error ? (
          <p role="alert" className="text-red-600">{error}</p>
        ) : !result ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : result.needed > 0 ? (
          <p className="text-gray-700">
            {result.checkInCount} of {MIN_CHECKINS} {goalie ? 'qualifying games (min 15 shots)' : 'check-ins so far'}. Log a few more and there will be enough to report on.
          </p>
        ) : result.insights.length === 0 ? (
          <p className="text-gray-700">
            Not enough variety yet. We need at least {MIN_GROUP} games at both ends, like nights you felt confident and nights
            you didn&apos;t, to make a comparison.
          </p>
        ) : (
          <div className="flex flex-col gap-16">
            {result.insights.map((insight) => (
              <Report key={insight.id} insight={insight} checkInCount={result.checkInCount} goalie={goalie} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
