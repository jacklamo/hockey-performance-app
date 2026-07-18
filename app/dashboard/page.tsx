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
  Legend,
} from 'recharts';
import { buildLineChartData, buildBarChartData } from '@/src/lib/chart-utils';
import Header from '@/app/components/Header';
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

export default function DashboardPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
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

  const avgConfidence = gamesWithMentalState.length > 0
    ? gamesWithMentalState.reduce((sum, game) => sum + (game.mentalState?.confidence || 0), 0) / gamesWithMentalState.length
    : 0;

  const avgSleep = gamesWithMentalState.length > 0
    ? gamesWithMentalState.reduce((sum, game) => sum + (game.mentalState?.sleepHours || 0), 0) / gamesWithMentalState.length
    : 0;

  // Calculate insights
  const highConfidenceGames = gamesWithMentalState.filter(g => (g.mentalState?.confidence || 0) >= 8);
  const lowConfidenceGames = gamesWithMentalState.filter(g => (g.mentalState?.confidence || 0) <= 5);

  const avgPointsHighConfidence = highConfidenceGames.length > 0
    ? highConfidenceGames.reduce((sum, game) => sum + game.goals + game.assists, 0) / highConfidenceGames.length
    : 0;

  const avgPointsLowConfidence = lowConfidenceGames.length > 0
    ? lowConfidenceGames.reduce((sum, game) => sum + game.goals + game.assists, 0) / lowConfidenceGames.length
    : 0;

  const highSleepGames = gamesWithMentalState.filter(g => (g.mentalState?.sleepHours || 0) >= 8);
  const lowSleepGames = gamesWithMentalState.filter(g => (g.mentalState?.sleepHours || 0) < 7);

  const avgPointsHighSleep = highSleepGames.length > 0
    ? highSleepGames.reduce((sum, game) => sum + game.goals + game.assists, 0) / highSleepGames.length
    : 0;

  const avgPointsLowSleep = lowSleepGames.length > 0
    ? lowSleepGames.reduce((sum, game) => sum + game.goals + game.assists, 0) / lowSleepGames.length
    : 0;

  const recentGames = games.slice(0, 5);
  const lineChartData = buildLineChartData(games);
  const barChartData = buildBarChartData(games);

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
            {/* Top Section - Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Card 1: Games Played */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Games Played</h3>
                <p className="text-4xl font-bold text-blue-600">{totalGames}</p>
              </div>

              {/* Card 2: Avg Points */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Points</h3>
                <p className="text-4xl font-bold text-blue-600">{avgPoints.toFixed(1)}</p>
              </div>

              {/* Card 3: Avg Confidence */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Confidence</h3>
                <p className="text-4xl font-bold text-blue-600">
                  {gamesWithMentalState.length > 0 ? avgConfidence.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-gray-400 mt-1">out of 10</p>
              </div>

              {/* Card 4: Avg Sleep */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Sleep</h3>
                <p className="text-4xl font-bold text-blue-600">
                  {gamesWithMentalState.length > 0 ? avgSleep.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-gray-400 mt-1">hours</p>
              </div>
            </div>

            {/* Middle Section - Performance Insights */}
            {gamesWithMentalState.length >= 5 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Insights</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {highConfidenceGames.length > 0 && lowConfidenceGames.length > 0 && (
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                      <h3 className="text-base font-semibold text-blue-900 mb-2">
                        High Confidence Impact
                      </h3>
                      <p className="text-sm text-blue-800">
                        You average {avgPointsHighConfidence.toFixed(1)} points per game when confidence is 8+
                        vs {avgPointsLowConfidence.toFixed(1)} points when confidence is 5 or below
                      </p>
                    </div>
                  )}
                  {highSleepGames.length > 0 && lowSleepGames.length > 0 && (
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                      <h3 className="text-base font-semibold text-blue-900 mb-2">
                        Sleep Impact
                      </h3>
                      <p className="text-sm text-blue-800">
                        You average {avgPointsHighSleep.toFixed(1)} points per game with 8+ hours sleep
                        vs {avgPointsLowSleep.toFixed(1)} points with less than 7 hours
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Performance Trends Section */}
            {lineChartData.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Trends</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Line Chart - Points Over Time */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-4">Points Per Game</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="points"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={{ r: 4, fill: '#2563eb' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Bar Chart - Confidence + Sleep, or Placeholder */}
                  {gamesWithMentalState.length >= 5 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-sm font-medium text-gray-500 mb-4">Mental State Per Game</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="confidence" name="Confidence" fill="#2563eb" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="sleep" name="Sleep (normalized)" fill="#4f46e5" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-center h-64">
                      <p className="text-sm text-gray-500 text-center">
                        Log check-ins for 5 games to unlock this chart
                      </p>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* Bottom Section - Recent Games Table */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Games</h2>
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
                        onClick={() => (window.location.href = `/games/${game.id}`)}
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
