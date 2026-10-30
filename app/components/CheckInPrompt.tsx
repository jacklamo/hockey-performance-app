'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';

const DISMISSED_KEY = 'checkin-prompt-dismissed';

interface CheckInPromptProps {
  missingCount: number;
  latestGameId: string;
}

// Modal shown once per browser session while check-ins are missing.
// The dashboard also keeps a persistent banner, so dismissing is never the end of the nudge.
export default function CheckInPrompt({ missingCount, latestGameId }: CheckInPromptProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (missingCount > 0 && !sessionStorage.getItem(DISMISSED_KEY)) setOpen(true);
    } catch {
      setOpen(missingCount > 0);
    }
  }, [missingCount]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {}
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-prompt-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <ClipboardCheck className="h-6 w-6 text-amber-600" />
        </div>
        <h2 id="checkin-prompt-title" className="mb-2 text-xl font-bold text-gray-900">
          {missingCount === 1 ? 'You have a game without a check-in' : `${missingCount} games are missing check-ins`}
        </h2>
        <p className="mb-6 text-gray-600">
          Your insights only get sharper when every game has a check-in. It takes about 90 seconds,
          and the sooner you log it, the more accurately you&apos;ll remember how you felt.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            onClick={dismiss}
            className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Remind me later
          </button>
          <Link
            href={`/games/${latestGameId}/mental`}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center font-bold text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            Log check-in now
          </Link>
        </div>
      </div>
    </div>
  );
}
