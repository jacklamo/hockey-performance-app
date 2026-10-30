import Link from 'next/link';
import { TrendingUp, Brain, Target } from 'lucide-react';
import DemoButton from '@/app/components/DemoButton';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/App Name */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Hockey Performance Tracker</h1>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Understand What Makes You Perform
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Track your stats and mental state to discover what impacts your game
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <DemoButton className="px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50" />
            <Link
              href="/auth/signup"
              className="inline-block px-8 py-4 text-lg font-semibold text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Track Performance
              </h3>
              <p className="text-gray-600">
                Log your game stats and see trends over time
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Brain className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Mental Insights
              </h3>
              <p className="text-gray-600">
                Connect sleep, confidence, and stress to your performance
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Improve Your Game
              </h3>
              <p className="text-gray-600">
                Get personalized insights on what affects your play
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
