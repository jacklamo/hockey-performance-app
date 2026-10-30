'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { buildLineChartData, buildConfidenceGroups, buildSleepGroups, GroupBar } from '@/src/lib/chart-utils';
import { computeInsights } from '@/src/lib/insights';
import Header from '@/app/components/Header';
import CheckInPrompt from '@/app/components/CheckInPrompt';
import RinkChart from '@/app/components/RinkChart';
import { AlertCircle } from 'lucide-react';

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

const gameTooltipLabel = (game: unknown, payload: readonly { payload?: { date?: string } }[]) =>
  `Game #${game} · ${payload?.[0]?.payload?.date ?? ''}`;

function GroupTick({ x = 0, y = 0, payload, groups }: { x?: number; y?: number; payload?: { value: string }; groups: GroupBar[] }) {
  const group = groups.find((g) => g.name === payload?.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text y={20} textAnchor="middle" fontSize={15} fontWeight={600} fill="var(--color-gray-900)">{payload?.value}</text>
      <text y={38} textAnchor="middle" fontSize={13} fill="var(--color-gray-500)">{group?.games ?? 0} games</text>
    </g>
  );
}

const CHART_VIEW_KEY = 'dashboard-chart-view';

export default function DashboardPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartView, setChartView] = useState<'charts' | 'rink'>('charts');
  useEffect(() => {
    try {
      if (localStorage.getItem(CHART_VIEW_KEY) === 'rink') setChartView('rink');
    } catch {}
  }, []);
  const changeChartView = (v: 'charts' | 'rink') => {
    setChartView(v);
    try {
      localStorage.setItem(CHART_VIEW_KEY, v);
    } catch {}
  };
  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/games');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch games');
      }

      const data = await response.json();
      setGames(data.games || []);
    } catch (err) {
      setError('Failed to load games');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Calculate statistics
  const totalGames = games.length;

  const avgPoints = totalGames > 0
    ? games.reduce((sum, game) => sum + game.goals + game.assists, 0) / totalGames
    : 0;

  const gamesWithMentalState = games.filter(g => g.mentalState);
  const gamesMissingCheckIn = games.filter(g => !g.mentalState);

  const avgConfidence = gamesWithMentalState.length > 0
    ? gamesWithMentalState.reduce((sum, game) => sum + (game.mentalState?.confidence || 0), 0) / gamesWithMentalState.length
    : 0;

  const avgSleep = gamesWithMentalState.length > 0
    ? gamesWithMentalState.reduce((sum, game) => sum + (game.mentalState?.sleepHours || 0), 0) / gamesWithMentalState.length
    : 0;

  const { needed: checkInsNeeded, insights } = computeInsights(games);

  const recentGames = games.slice(0, 5);
  const lineChartData = buildLineChartData(games);
  const confGroups = buildConfidenceGroups(games);
  const sleepGroups = buildSleepGroups(games);
  const rinkPoints = gamesWithMentalState.map((g) => ({
    confidence: g.mentalState!.confidence,
    points: g.goals + g.assists,
    label: `${new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} vs ${g.opponent}: confidence ${g.mentalState!.confidence}, ${g.goals + g.assists} points`,
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Performance Dashboard" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-4 w-24 bg-gray-200 rounded skeleton-shimmer mb-3" />
                <div className="h-10 w-16 bg-gray-200 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-12 bg-gray-50 border-b border-gray-200" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-6 px-6 py-4 border-b border-gray-100">
                <div className="h-4 w-20 bg-gray-200 rounded skeleton-shimmer" />
                <div className="h-4 w-28 bg-gray-200 rounded skeleton-shimmer" />
                <div className="h-4 w-12 bg-gray-200 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Performance Dashboard" />
      {gamesMissingCheckIn.length > 0 && (
        <CheckInPrompt missingCount={gamesMissingCheckIn.length} latestGameId={gamesMissingCheckIn[0].id} />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={fetchGames}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : totalGames === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Games Yet</h2>
            <p className="text-gray-600 mb-6">Start tracking your performance by adding your first game!</p>
            <Link
              href="/games/add"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add Your First Game
            </Link>
          </div>
        ) : (
          <>
            {gamesMissingCheckIn.length > 0 && (
              <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl bg-amber-400 px-5 py-4 text-[#1b1406]">
                <p>
                  <strong className="font-semibold">
                    {gamesMissingCheckIn.length === 1
                      ? 'One game is waiting on a check-in.'
                      : `${gamesMissingCheckIn.length} games are waiting on check-ins.`}
                  </strong>{' '}
                  Log how you felt going into {gamesMissingCheckIn[0].opponent} while you still remember.
                </p>
                <Link
                  href={`/games/${gamesMissingCheckIn[0].id}/mental`}
                  className="rounded-lg bg-[#1b1406] px-4 py-2 font-semibold text-amber-400"
                >
                  Log check-in
                </Link>
              </div>
            )}

            {/* Scoreboard */}
            <div className="mb-12 grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-xl bg-(--dasher) text-(--dasher-fg)">
              {[
                [String(totalGames), 'Games played'],
                [avgPoints.toFixed(1), 'Points a game'],
                [gamesWithMentalState.length > 0 ? avgConfidence.toFixed(1) : '-', 'Average confidence'],
                [gamesWithMentalState.length > 0 ? `${avgSleep.toFixed(1)} h` : '-', 'Average sleep'],
              ].map(([value, label], i) => (
                <div
                  key={label}
                  className={`border-white/15 px-5 py-4 ${i % 2 === 1 ? 'border-l' : ''} ${i > 1 ? 'border-t' : ''} lg:border-t-0 ${i > 0 ? 'lg:border-l' : ''}`}
                >
                  <b className="block font-serif text-4xl font-bold leading-tight text-[#f4b63a] tabular-nums">{value}</b>
                  <span className="text-[15px] opacity-85">{label}</span>
                </div>
              ))}
            </div>

            {/* Insights — front and centre */}
            <div className="mb-12">
              <h2 className="mb-5 text-3xl font-bold text-gray-900">What your data is saying</h2>
              {checkInsNeeded > 0 ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                  <p className="mb-1 text-lg font-semibold text-blue-900">
                    {checkInsNeeded} more {checkInsNeeded === 1 ? 'check-in' : 'check-ins'} and your insights unlock
                  </p>
                  <p className="text-blue-800">
                    Once you&apos;ve logged a few games with check-ins, we&apos;ll show you how sleep and confidence line up with your scoring.
                  </p>
                </div>
              ) : insights.length === 0 ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                  <p className="text-blue-800">
                    Keep logging. To compare, we need at least a few games at both ends, like nights you felt confident and nights you didn&apos;t, or well-rested and short on sleep.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-2">
                    {insights.map((insight) => (
                      <div key={insight.id}>
                        <span className="inline-block rounded-full border border-gray-200 px-3 py-0.5 text-[13px] font-medium text-gray-600">
                          {insight.trust === 'early' ? 'Early signal' : insight.trust === 'flat' ? 'No clear pattern' : 'Worth watching'}
                        </span>
                        <p className="mt-2.5 max-w-[34ch] font-serif text-[23px] leading-[1.38] text-gray-900">{insight.headline}</p>
                      </div>
                    ))}
                  </div>
                  <Link href="/insights" className="font-semibold text-gray-900 underline underline-offset-4">
                    See how we worked this out and what it could mean
                  </Link>
                </>
              )}
            </div>

            {/* The numbers */}
            <div className="mb-12">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
                <h2 className="text-3xl font-bold text-gray-900">The numbers</h2>
                <div role="group" aria-label="Chart style" className="inline-flex overflow-hidden rounded-full border-[1.5px] border-gray-900">
                  {(['charts', 'rink'] as const).map((v, i) => (
                    <button
                      key={v}
                      onClick={() => changeChartView(v)}
                      aria-pressed={chartView === v}
                      className={`px-[18px] py-1.5 text-[15px] font-semibold ${i > 0 ? 'border-l-[1.5px] border-gray-900' : ''} ${
                        chartView === v ? 'bg-gray-900 text-white' : ''
                      }`}
                    >
                      {v === 'charts' ? 'Charts' : 'Rink'}
                    </button>
                  ))}
                </div>
              </div>

              {chartView === 'rink' ? (
                <figure className="m-0">
                  <RinkChart points={rinkPoints} zones={confGroups} />
                  <figcaption className="mt-3 max-w-[70ch] text-gray-500">
                    Each puck is one game with a check-in. The further right, the more confident you felt going in. The higher up, the more points you scored.
                  </figcaption>
                </figure>
              ) : (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <figure className="m-0 rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
                    <h3 className="text-2xl font-bold text-gray-900">Points in each game</h3>
                    <p className="mb-4 mt-1 max-w-[64ch] text-[15px] text-gray-500">
                      Goals plus assists for your last {lineChartData.length} games. The dashed line is your season average.
                    </p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="var(--color-gray-200)" vertical={false} />
                          <XAxis dataKey="game" tickFormatter={(g) => `#${g}`} tick={{ fontSize: 13, fill: 'var(--color-gray-500)' }} stroke="var(--color-gray-900)" interval="preserveStartEnd" />
                          <YAxis allowDecimals={false} domain={[0, (max: number) => Math.max(4, Math.ceil(max))]} tick={{ fontSize: 13, fill: 'var(--color-gray-500)' }} stroke="var(--color-gray-900)" />
                          <Tooltip labelFormatter={gameTooltipLabel} />
                          <ReferenceLine
                            y={avgPoints}
                            stroke="var(--color-gray-500)"
                            strokeDasharray="5 5"
                            label={{ value: `Season average ${avgPoints.toFixed(1)}`, position: 'insideTopRight', fill: 'var(--color-gray-500)', fontSize: 13 }}
                          />
                          <Line type="monotone" dataKey="points" stroke="var(--color-blue-600)" strokeWidth={2.5} dot={{ r: 4.5, fill: 'var(--color-blue-600)' }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </figure>

                  {[
                    { title: 'Points by how confident you felt', groups: confGroups },
                    { title: 'Points by how much you slept', groups: sleepGroups },
                  ].map(({ title, groups }) => (
                    <figure key={title} className="m-0 rounded-xl border border-gray-200 bg-white p-5">
                      <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
                      <p className="mb-4 mt-1 max-w-[64ch] text-[15px] text-gray-500">
                        Average points per game. The number under each label is how many games it covers.
                      </p>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={groups} margin={{ top: 22, right: 6, left: -20, bottom: 0 }}>
                            <CartesianGrid stroke="var(--color-gray-200)" vertical={false} />
                            <XAxis dataKey="name" tick={<GroupTick groups={groups} />} height={50} stroke="var(--color-gray-900)" interval={0} />
                            <YAxis allowDecimals={false} domain={[0, (max: number) => Math.max(4, Math.ceil(max))]} tick={{ fontSize: 13, fill: 'var(--color-gray-500)' }} stroke="var(--color-gray-900)" />
                            <Bar dataKey="avgPoints" fill="var(--color-blue-600)" radius={[8, 8, 0, 0]} maxBarSize={88}>
                              <LabelList dataKey="avgPoints" position="top" formatter={(v: unknown) => Number(v).toFixed(1)} style={{ fill: 'var(--color-gray-900)', fontWeight: 700, fontSize: 16 }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </figure>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Section - Recent Games Table */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-gray-900">Recent games</h2>
                <Link
                  href="/games/add"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Add Game
                </Link>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opponent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        +/-
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-In
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentGames.map((game) => (
                      <tr
                        key={game.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/games/${game.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(game.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {game.opponent}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              game.result === 'win'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {game.result === 'win' ? 'Win' : 'Loss'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {game.goals + game.assists}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-medium ${
                              game.plusMinus > 0
                                ? 'text-green-600'
                                : game.plusMinus < 0
                                ? 'text-red-600'
                                : 'text-gray-900'
                            }`}
                          >
                            {game.plusMinus > 0 ? '+' : ''}
                            {game.plusMinus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!game.mentalState && (
                            <Link
                              href={`/games/${game.id}/mental`}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Log check-in
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {recentGames.map((game) => (
                  <Link
                    key={game.id}
                    href={`/games/${game.id}`}
                    className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{game.opponent}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(game.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          game.result === 'win'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {game.result === 'win' ? 'Win' : 'Loss'}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Points: </span>
                        <span className="font-medium text-gray-900">{game.goals + game.assists}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">+/-: </span>
                        <span
                          className={`font-medium ${
                            game.plusMinus > 0
                              ? 'text-green-600'
                              : game.plusMinus < 0
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {game.plusMinus > 0 ? '+' : ''}
                          {game.plusMinus}
                        </span>
                      </div>
                    </div>
                    {!game.mentalState && (
                      <div
                        className="mt-2 pt-2 border-t border-gray-100"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/games/${game.id}/mental`); }}
                      >
                        <span className="text-xs text-blue-600 font-medium">Log mental check-in →</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
