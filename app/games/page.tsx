'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ClipboardList } from 'lucide-react';
import Header from '@/app/components/Header';

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
}

export default function GamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGames = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch('/api/games');
      if (!response.ok) {
        if (response.status === 401) { router.push('/auth/login'); return; }
        throw new Error('Failed to fetch games');
      }
      const data = await response.json();
      setGames(data.games || []);
    } catch (err) {
      setError('Failed to load your games. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Inline skeleton for the isLoading branch (matches loading.tsx — prevents flash)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="My Games" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-12 bg-gray-50 border-b border-gray-200" />
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-6 px-6 py-4 border-b border-gray-100">
                <div className="h-4 w-20 bg-gray-200 rounded skeleton-shimmer" />
                <div className="h-4 w-32 bg-gray-200 rounded skeleton-shimmer" />
                <div className="h-4 w-12 bg-gray-200 rounded skeleton-shimmer" />
                <div className="h-4 w-10 bg-gray-200 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="My Games" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Error state — inline, below Header so Logout remains accessible */}
        {error && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center mb-8">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={fetchGames}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!error && games.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Games Yet</h2>
            <p className="text-gray-600 mb-6">Start tracking your performance by adding your first game!</p>
            <Link
              href="/games/add"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add Your First Game
            </Link>
          </div>
        )}

        {/* Games table */}
        {!error && games.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Games</h2>
              <Link
                href="/games/add"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Add Game
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opponent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">G</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">A</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">+/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {games.map((game) => (
                    <tr
                      key={game.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/games/${game.id}`)}
                    >
                      <td className="px-6 py-4 text-gray-900">{formatDate(game.date)}</td>
                      <td className="px-6 py-4 text-gray-900">{game.opponent}</td>
                      <td className="px-6 py-4">
                        <span className={`font-medium capitalize ${game.result === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                          {game.result === 'win' ? 'Win' : 'Loss'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{game.goals}</td>
                      <td className="px-6 py-4 text-gray-900">{game.assists}</td>
                      <td className="px-6 py-4 text-gray-900">
                        <span className={game.plusMinus > 0 ? 'text-green-600' : game.plusMinus < 0 ? 'text-red-600' : ''}>
                          {game.plusMinus > 0 ? '+' : ''}{game.plusMinus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
