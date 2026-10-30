'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/src/lib/demo-credentials';

export default function DemoButton({ className }: { className: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setIsLoading(true);
    setError('');
    const result = await signIn('credentials', { email: DEMO_EMAIL, password: DEMO_PASSWORD, redirect: false });
    if (result?.error) {
      setError(result.status === 429 ? 'The demo is busy. Please try again in a minute.' : 'Could not start the demo. Please try again.');
      setIsLoading(false);
      return;
    }
    router.push('/dashboard');
  };

  return (
    <span className="inline-flex flex-col items-center">
      <button type="button" onClick={handleClick} disabled={isLoading} className={className}>
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading demo...
          </span>
        ) : (
          'Try the demo'
        )}
      </button>
      {error && <span role="alert" className="text-sm text-red-600 mt-2">{error}</span>}
    </span>
  );
}
