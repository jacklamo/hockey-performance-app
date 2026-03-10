'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function MentalStatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [gameId, setGameId] = useState<string>('');

  useEffect(() => {
    params.then(p => setGameId(p.id));
  }, [params]);

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    confidence: 5,
    sleepHours: 7,
    sleepQuality: 5,
    stressLevel: 5,
    physicalEnergy: 5,
    notes: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!gameId) return;
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
        alert(data.error || 'Failed to save mental state');
        setIsLoading(false);
        return;
      }

      // Show success message
      setShowSuccess(true);

      // Redirect after 1 second
      setTimeout(() => {
        router.push(`/games/${gameId}`);
      }, 1000);
    } catch (error) {
      console.error('Error saving mental state:', error);
      alert('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'number' || type === 'range') {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4 sm:px-6 lg:px-8">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Post-Game Check-In
          </h1>
          <p className="text-gray-600 italic">
            This takes 90 seconds. Answer honestly - this is for you, not your coach.
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium text-center">
              Check-in saved! ✓
            </p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Question 1 - Confidence */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                How confident did you feel before the game?
              </label>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">😟</span>
                <input
                  type="range"
                  name="confidence"
                  min="1"
                  max="10"
                  value={formData.confidence}
                  onChange={handleChange}
                  className="flex-1 h-12 appearance-none bg-gray-200 rounded-lg outline-none slider-thumb"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                      ((formData.confidence - 1) / 9) * 100
                    }%, #E5E7EB ${((formData.confidence - 1) / 9) * 100}%, #E5E7EB 100%)`,
                  }}
                  disabled={isLoading}
                />
                <span className="text-2xl">😊</span>
              </div>
              <div className="text-center">
                <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold text-lg">
                  {formData.confidence}
                </span>
              </div>
            </div>

            {/* Question 2 - Sleep Hours */}
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
                value={formData.sleepHours}
                onChange={handleChange}
                className="w-full px-6 py-4 text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-black"
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 text-center mt-2">
                You can use decimals (e.g., 7.5)
              </p>
            </div>

            {/* Question 3 - Sleep Quality */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                How would you rate your sleep quality?
              </label>
              <div className="mb-3">
                <input
                  type="range"
                  name="sleepQuality"
                  min="1"
                  max="10"
                  value={formData.sleepQuality}
                  onChange={handleChange}
                  className="w-full h-12 appearance-none bg-gray-200 rounded-lg outline-none slider-thumb"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                      ((formData.sleepQuality - 1) / 9) * 100
                    }%, #E5E7EB ${((formData.sleepQuality - 1) / 9) * 100}%, #E5E7EB 100%)`,
                  }}
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
              <div className="text-center">
                <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold text-lg">
                  {formData.sleepQuality}
                </span>
              </div>
            </div>

            {/* Question 4 - Stress Level */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                What was your stress level today?
              </label>
              <div className="mb-3">
                <input
                  type="range"
                  name="stressLevel"
                  min="1"
                  max="10"
                  value={formData.stressLevel}
                  onChange={handleChange}
                  className="w-full h-12 appearance-none bg-gray-200 rounded-lg outline-none slider-thumb"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                      ((formData.stressLevel - 1) / 9) * 100
                    }%, #E5E7EB ${((formData.stressLevel - 1) / 9) * 100}%, #E5E7EB 100%)`,
                  }}
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Relaxed</span>
                <span>Very Stressed</span>
              </div>
              <div className="text-center">
                <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold text-lg">
                  {formData.stressLevel}
                </span>
              </div>
            </div>

            {/* Question 5 - Physical Energy */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                How did you feel physically?
              </label>
              <div className="mb-3">
                <input
                  type="range"
                  name="physicalEnergy"
                  min="1"
                  max="10"
                  value={formData.physicalEnergy}
                  onChange={handleChange}
                  className="w-full h-12 appearance-none bg-gray-200 rounded-lg outline-none slider-thumb"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                      ((formData.physicalEnergy - 1) / 9) * 100
                    }%, #E5E7EB ${((formData.physicalEnergy - 1) / 9) * 100}%, #E5E7EB 100%)`,
                  }}
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Exhausted</span>
                <span>Energized</span>
              </div>
              <div className="text-center">
                <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold text-lg">
                  {formData.physicalEnergy}
                </span>
              </div>
            </div>

            {/* Question 6 - Notes (Optional) */}
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
                disabled={isLoading || showSuccess}
                className="sm:flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? 'Saving...' : 'Save Check-In'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 28px;
          height: 28px;
          background: #3B82F6;
          border: 4px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-thumb::-moz-range-thumb {
          width: 28px;
          height: 28px;
          background: #3B82F6;
          border: 4px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-thumb:active::-webkit-slider-thumb {
          box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.2);
        }

        .slider-thumb:active::-moz-range-thumb {
          box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
}
