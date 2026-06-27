'use client';
// app/road-to-final/error.tsx
//
// Next.js automatically renders this if anything inside this route throws
// (e.g. an unexpected data shape from the API). Without this file, a crash
// here would show Next's generic "Application error" message with no way
// back except a manual reload - exactly what happened before this was added.
import { useEffect } from 'react';
import Link from 'next/link';

export default function RoadToFinalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Road to Final page crashed:', error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-chalk/60">
        Something went wrong loading the bracket — this can happen right when the
        knockout draw updates. It&apos;s not your fault.
      </p>
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
