'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Header from '@/app/components/Header';
import ScaleInput from '@/app/components/ScaleInput';

type ScaleKey = 'confidence' | 'sleepQuality' | 'stressLevel' | 'physicalEnergy';

export default function MentalStatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [gameId, setGameId] = useState<string>('');

  useEffect(() => {
    params.then(p => setGameId(p.id));
  }, [params]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<{
    confidence: number | null;
    sleepHours: number;
    sleepQuality: number | null;
    stressLevel: number | null;
    physicalEnergy: number | null;
    notes: string;
  }>({
    confidence: null,
    sleepHours: 7,
    sleepQuality: null,
    stressLevel: null,
    physicalEnergy: null,
    notes: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!gameId) return;

    if (
      formData.confidence === null ||
      formData.sleepQuality === null ||
      formData.stressLevel === null ||
      formData.physicalEnergy === null
    ) {
      setError('Please answer all four 1–10 questions.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/games/${gameId}/mental`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save check-in');
        setIsLoading(false);
        return;
      }

      // Stay in the loading state until navigation completes
      router.push(`/games/${gameId}`);
    } catch (err) {
      console.error('Error saving mental state:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const setScale = (key: ScaleKey) => (value: number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  return (
    <>
    <Header title="Game Check-In" />
    <div className="bg-gradient-to-b from-blue-50 to-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link
          href={`/games/${gameId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Game
        </Link>

        {/* Page Heading */}
        <div className="mb-6">
          <p className="text-gray-600 italic">
            Think back to how you felt going into the game. This takes 90 seconds. Answer honestly - this is for you, not your coach.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <ScaleInput
              label="How confident did you feel before the game?"
              value={formData.confidence}
              onChange={setScale('confidence')}
              lowLabel="Not confident"
              highLabel="Very confident"
              disabled={isLoading}
            />

            {/* Sleep Hours */}
            <div>
              <label
                htmlFor="sleepHours"
                className="block text-lg font-semibold text-gray-900 mb-3"
              >
                How many hours did you sleep last night?
              </label>
              <input
                type="number"
                id="sleepHours"
                name="sleepHours"
                min="0"
                max="14"
                step="0.5"
                inputMode="decimal"
                value={formData.sleepHours}
                onChange={handleChange}
                className="w-full px-6 py-4 text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-black"
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 text-center mt-2">
                You can use decimals (e.g., 7.5)
              </p>
            </div>

            <ScaleInput
              label="How would you rate your sleep quality?"
              value={formData.sleepQuality}
              onChange={setScale('sleepQuality')}
              lowLabel="Poor"
              highLabel="Excellent"
              disabled={isLoading}
            />

            <ScaleInput
              label="What was your stress level today?"
              value={formData.stressLevel}
              onChange={setScale('stressLevel')}
              lowLabel="Relaxed"
              highLabel="Very Stressed"
              disabled={isLoading}
            />

            <ScaleInput
              label="How did you feel physically?"
              value={formData.physicalEnergy}
              onChange={setScale('physicalEnergy')}
              lowLabel="Exhausted"
              highLabel="Energized"
              disabled={isLoading}
            />

            {/* Notes (Optional) */}
            <div>
              <label
                htmlFor="notes"
                className="block text-lg font-semibold text-gray-900 mb-3"
              >
                Any notes about this game? <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                maxLength={500}
                rows={4}
                placeholder="What went well? What would you change?"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none text-black placeholder:text-gray-400"
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 text-right mt-1">
                {formData.notes.length}/500
              </p>
            </div>

            {error && (
              <p role="alert" className="text-red-600 text-sm font-medium">
                {error}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Link
                href={`/games/${gameId}`}
                className="sm:flex-1 text-center px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-lg"
              >
                Skip
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="sm:flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Check-In'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
