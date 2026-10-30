'use client';

import { signOut, useSession } from 'next-auth/react';
import { DEMO_EMAIL } from '@/src/lib/demo-credentials';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { data: session } = useSession();
  const isDemo = session?.user?.email === DEMO_EMAIL;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      {isDemo && (
        <p className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs text-amber-800">
          You&apos;re in the demo account. Explore freely: the data resets on the next demo login.
        </p>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
