import Link from 'next/link';

export const metadata = { title: 'Busy right now | GameFeel' };

// Served with a 429 status by the middleware when too many auth requests arrive from one address.
export default function BusyPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Busy right now</h1>
        <p className="text-lg text-gray-600 mb-8">
          Too many requests came in at once. Give it a minute, then try again.
        </p>
        <Link
          href="/auth/login"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Back to log in
        </Link>
      </div>
    </main>
  );
}
