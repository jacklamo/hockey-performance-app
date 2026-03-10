'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

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

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [gameId, setGameId] = useState<string>('');

  useEffect(() => {
    params.then(p => setGameId(p.id));
  }, [params]);

  const fetchGame = useCallback(async () => {
    if (!gameId) return;

    try {
      const response = await fetch(`/api/games/${gameId}`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        if (response.status === 404) {
          setError('Game not found');
          return;
        }
        throw new Error('Failed to fetch game');
      }

      const data = await response.json();
      setGame(data.game);
    } catch (err) {
      setError('Failed to load game');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, router]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete game');
      }
      router.push('/dashboard');
    } catch (err) {
      alert('Failed to delete game. Please try again.');
      console.error(err);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Game not found'}</p>
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const points = game.goals + game.assists;
  const hasMentalState = game.mentalState !== null && game.mentalState !== undefined;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Page Heading */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            vs {game.opponent} - {formatDate(game.date)}
          </h1>
          <p className="text-xl text-gray-600">
            <span
              className={`font-semibold ${
                game.result === 'win' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {game.result === 'win' ? 'Win' : 'Loss'}
            </span>
            {' - '}
            <span className="capitalize">{game.homeAway}</span>
          </p>
        </div>

        {/* Section 1 - Game Stats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Your Performance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Goals */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Goals</p>
              <p className="text-3xl font-bold text-gray-900">{game.goals}</p>
            </div>

            {/* Assists */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Assists</p>
              <p className="text-3xl font-bold text-gray-900">{game.assists}</p>
            </div>

            {/* Points */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Points</p>
              <p className="text-3xl font-bold text-gray-900">{points}</p>
            </div>

            {/* Shots */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Shots</p>
              <p className="text-3xl font-bold text-gray-900">{game.shots}</p>
            </div>

            {/* Plus/Minus */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Plus/Minus</p>
              <p
                className={`text-3xl font-bold ${
                  game.plusMinus > 0
                    ? 'text-green-600'
                    : game.plusMinus < 0
                    ? 'text-red-600'
                    : 'text-gray-900'
                }`}
              >
                {game.plusMinus > 0 ? '+' : ''}
                {game.plusMinus}
              </p>
            </div>

            {/* Ice Time */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Ice Time</p>
              <p className="text-3xl font-bold text-gray-900">
                {game.iceTime}
                <span className="text-lg text-gray-500 ml-1">min</span>
              </p>
            </div>
          </div>
        </div>

        {/* Section 2 - Mental State */}
        <div
          className={`rounded-lg shadow-md p-6 mb-6 ${
            hasMentalState ? 'bg-blue-50' : 'bg-white'
          }`}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Mental State
          </h2>

          {hasMentalState ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                {/* Confidence */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Confidence</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {game.mentalState!.confidence}
                    <span className="text-lg text-gray-500 ml-1">/10</span>
                  </p>
                </div>

                {/* Sleep */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sleep</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {game.mentalState!.sleepHours}
                    <span className="text-lg text-gray-500 ml-1">hours</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    ({game.mentalState!.sleepQuality}/10 quality)
                  </p>
                </div>

                {/* Stress */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Stress</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {game.mentalState!.stressLevel}
                    <span className="text-lg text-gray-500 ml-1">/10</span>
                  </p>
                </div>

                {/* Physical Energy */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Physical Energy</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {game.mentalState!.physicalEnergy}
                    <span className="text-lg text-gray-500 ml-1">/10</span>
                  </p>
                </div>
              </div>

              {/* Notes */}
              {game.mentalState!.notes && (
                <div className="pt-4 border-t border-blue-200">
                  <p className="text-sm text-gray-600 mb-2">Notes:</p>
                  <p className="text-gray-900">{game.mentalState!.notes}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                No mental state logged for this game
              </p>
              <Link
                href={`/games/${gameId}/mental`}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Add Mental State
              </Link>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/games/${gameId}/edit`}
            className="flex-1 text-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Edit Game
          </Link>
          {isConfirming ? (
            <div className="flex-1 flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => setIsConfirming(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirming(true)}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Delete Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
