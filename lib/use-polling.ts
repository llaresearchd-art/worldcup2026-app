'use client';
// lib/use-polling.ts
import { useEffect, useRef, useState } from 'react';

export function usePolling<T>(url: string, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function load() {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        if (!mounted.current) return;
        if (!res.ok) {
          setError(json.error || 'Something went wrong loading live data.');
        } else {
          setData(json);
          setError(null);
        }
      } catch {
        if (mounted.current) setError('Connection issue — showing the last data we had.');
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, intervalMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [url, intervalMs]);

  return { data, error, loading };
}
