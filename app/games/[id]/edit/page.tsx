'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [gameId, setGameId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(p => setGameId(p.id));
  }, [params]);

  const [formData, setFormData] = useState({
    date: '',
    opponent: '',
    homeAway: '',
    result: '',
    goals: '',
    assists: '',
    shots: '',
    plusMinus: '',
    iceTime: '',
  });

  const fetchGame = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await fetch(`/api/games/${gameId}`);
      if (!response.ok) {
        if (response.status === 401) { router.push('/auth/login'); return; }
        if (response.status === 404) { setError('Game not found'); setIsLoading(false); return; }
        throw new Error('Failed to fetch game');
      }
      const data = await response.json();
      const g = data.game;
      setFormData({
        date: new Date(g.date).toISOString().split('T')[0],
        opponent: g.opponent,
        homeAway: g.homeAway,
        result: g.result,
        goals: String(g.goals),
        assists: String(g.assists),
        shots: String(g.shots),
        plusMinus: String(g.plusMinus),
        iceTime: String(g.iceTime),
      });
    } catch (err) {
      setError('Failed to load game');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, router]);

  useEffect(() => { fetchGame(); }, [fetchGame]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const todayDate = new Date(today);
      if (selectedDate > todayDate) {
        newErrors.date = 'Date cannot be in the future';
      }
    }

    // Opponent validation
    if (!formData.opponent.trim()) {
      newErrors.opponent = 'Opponent team name is required';
    }

    // Location validation
    if (!formData.homeAway) {
      newErrors.homeAway = 'Please select Home or Away';
    }

    // Result validation
    if (!formData.result) {
      newErrors.result = 'Please select Win or Loss';
    }

    // Stats validation (ensure non-negative except plusMinus)
    if (Number(formData.goals) < 0) {
      newErrors.goals = 'Goals cannot be negative';
    }
    if (Number(formData.assists) < 0) {
      newErrors.assists = 'Assists cannot be negative';
    }
    if (Number(formData.shots) < 0) {
      newErrors.shots = 'Shots cannot be negative';
    }
    if (Number(formData.iceTime) < 0) {
      newErrors.iceTime = 'Ice time cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          goals: Number(formData.goals) || 0,
          assists: Number(formData.assists) || 0,
          shots: Number(formData.shots) || 0,
          plusMinus: Number(formData.plusMinus) || 0,
          iceTime: Number(formData.iceTime) || 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ submit: data.error || 'An error occurred while saving.' });
        return;
      }
      router.push(`/games/${gameId}`);
    } catch {
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link
          href={`/games/${gameId}`}
          className="inline-flex items-center gap-2 text-black placeholder:text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Game
        </Link>

        {/* Page Heading */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Game</h1>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1 - Game Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Game Details
              </h2>
              <div className="space-y-5">
                {/* Date */}
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-bold text-black placeholder:text-gray-600 mb-1"
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    max={today}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder:text-gray-600 outline-none transition-colors ${
                      errors.date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSaving}
                    required
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                  )}
                </div>

                {/* Opponent */}
                <div>
                  <label
                    htmlFor="opponent"
                    className="block text-sm font-bold text-black placeholder:text-gray-600 mb-1"
                  >
                    Opponent
                  </label>
                  <input
                    type="text"
                    id="opponent"
                    name="opponent"
                    value={formData.opponent}
                    onChange={handleChange}
                    placeholder="Team name"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-black placeholder:text-gray-600 ${
                      errors.opponent ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSaving}
                    required
                  />
                  {errors.opponent && (
                    <p className="mt-1 text-sm text-red-600">{errors.opponent}</p>
                  )}
                </div>

                {/* Location - Radio Buttons */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="homeAway"
                        value="home"
                        checked={formData.homeAway === 'home'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        disabled={isSaving}
                      />
                      <span className="ml-2 text-gray-700">Home</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="homeAway"
                        value="away"
                        checked={formData.homeAway === 'away'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        disabled={isSaving}
                      />
                      <span className="ml-2 text-gray-700">Away</span>
                    </label>
                  </div>
                  {errors.homeAway && (
                    <p className="mt-1 text-sm text-red-600">{errors.homeAway}</p>
                  )}
                </div>

                {/* Result - Radio Buttons */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Result
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="result"
                        value="win"
                        checked={formData.result === 'win'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        disabled={isSaving}
                      />
                      <span className="ml-2 text-gray-700">Win</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="result"
                        value="loss"
                        checked={formData.result === 'loss'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        disabled={isSaving}
                      />
                      <span className="ml-2 text-gray-700">Loss</span>
                    </label>
                  </div>
                  {errors.result && (
                    <p className="mt-1 text-sm text-red-600">{errors.result}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2 - Your Stats */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Your Stats
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Goals */}
                <div>
                  <label
                    htmlFor="goals"
                    className="block text-sm font-bold text-black placeholder:text-gray-600 mb-1"
                  >
                    Goals
                  </label>
                  <input
                    type="number"
                    id="goals"
                    name="goals"
                    value={formData.goals}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className={`w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 text-black placeholder:text-gray-600 focus:border-blue-500 outline-none transition-colors ${
                      errors.goals ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSaving}
                  />
                  {errors.goals && (
                    <p className="mt-1 text-sm text-red-600">{errors.goals}</p>
                  )}
                </div>

                {/* Assists */}
                <div>
                  <label
                    htmlFor="assists"
                    className="block text-sm font-bold text-gray-700 mb-1"
                  >
                    Assists
                  </label>
                  <input
                    type="number"
                    id="assists"
                    name="assists"
                    value={formData.assists}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className={`w-full px-4 py-3 text-lg border rounded-lg text-black placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                      errors.assists ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSaving}
                  />
                  {errors.assists && (
                    <p className="mt-1 text-sm text-red-600">{errors.assists}</p>
                  )}
                </div>

                {/* Shots */}
                <div>
                  <label
                    htmlFor="shots"
                    className="block text-sm font-bold text-black placeholder:text-gray-600 mb-1"
                  >
                    Shots
                  </label>
                  <input
                    type="number"
                    id="shots"
                    name="shots"
                    value={formData.shots}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className={`w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder:text-gray-600 outline-none transition-colors ${
                      errors.shots ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSaving}
                  />
                  {errors.shots && (
                    <p className="mt-1 text-sm text-red-600">{errors.shots}</p>
                  )}
                </div>

                {/* Plus/Minus */}
                <div>
                  <label
                    htmlFor="plusMinus"
                    className="block text-sm font-bold text-black placeholder:text-gray-600 mb-1"
                  >
                    Plus/Minus
                  </label>
                  <input
                    type="number"
                    id="plusMinus"
                    name="plusMinus"
                    value={formData.plusMinus}
                    onChange={handleChange}
                    placeholder="0"
                    className={`w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder:text-gray-600 outline-none transition-colors ${
                      errors.plusMinus ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSaving}
                  />
                  {errors.plusMinus && (
                    <p className="mt-1 text-sm text-red-600">{errors.plusMinus}</p>
                  )}
                </div>

                {/* Ice Time */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="iceTime"
                    className="block text-sm font-bold text-black placeholder:text-gray-600 mb-1"
                  >
                    Ice Time (minutes)
                  </label>
                  <input
                    type="number"
                    id="iceTime"
                    name="iceTime"
                    value={formData.iceTime}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className={`w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder:text-gray-600 outline-none transition-colors ${
                      errors.iceTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSaving}
                  />
                  {errors.iceTime && (
                    <p className="mt-1 text-sm text-red-600">{errors.iceTime}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <Link
                href={`/games/${gameId}`}
                className="sm:flex-1 px-6 py-3 text-center border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="sm:flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
