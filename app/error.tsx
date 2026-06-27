'use client';
// app/error.tsx
// App-wide safety net: if any page crashes unexpectedly, show a friendly
// recoverable screen with a way back to Home, instead of a frozen blank page.
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pitch-dark px-6 text-center">
      <p className="text-sm text-chalk/60">Something went wrong on this page.</p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-lg border border-floodlight bg-floodlight px-4 py-2 text-sm font-medium text-ink"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-chalk/20 px-4 py-2 text-sm font-medium text-chalk/80"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
