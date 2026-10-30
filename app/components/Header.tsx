'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { DEMO_EMAIL } from '@/src/lib/demo-credentials';

interface HeaderProps {
  title: string;
  // Match the title's column to the page content below it.
  width?: 'wide' | 'medium' | 'narrow';
}

const TITLE_BOX = {
  wide: { outer: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8', inner: '', size: 'text-4xl sm:text-5xl' },
  medium: { outer: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8', inner: '', size: 'text-4xl sm:text-5xl' },
  narrow: { outer: 'px-4 sm:px-6 lg:px-8 pt-8', inner: 'max-w-2xl mx-auto', size: 'text-3xl sm:text-4xl' },
};

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/games', label: 'Games' },
  { href: '/insights', label: 'Insights' },
];

export default function Header({ title, width = 'wide' }: HeaderProps) {
  const box = TITLE_BOX[width];
  const { data: session } = useSession();
  const pathname = usePathname();
  const isDemo = session?.user?.email === DEMO_EMAIL;

  return (
    <>
      <header className="bg-(--dasher) text-(--dasher-fg) rounded-b-xl">
        {isDemo && (
          <p className="bg-amber-100 text-amber-600 px-4 py-1.5 text-center text-xs font-medium">
            You&apos;re in the demo account. Explore freely: the data resets on the next demo login.
          </p>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/dashboard" className="font-serif font-bold text-xl sm:text-2xl mr-auto">
            <span className="hidden sm:inline">Hockey Performance Tracker</span>
            <span className="sm:hidden">Hockey Tracker</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6 text-[15px]" aria-label="Main">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'underline underline-offset-[6px] decoration-2' : 'opacity-80 hover:opacity-100'}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="opacity-80 hover:opacity-100 transition-opacity"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <div className={box.outer}>
        <div className={box.inner}>
          <h1 className={`${box.size} font-bold text-gray-900`}>{title}</h1>
        </div>
      </div>
    </>
  );
}
