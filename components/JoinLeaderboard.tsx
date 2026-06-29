'use client';
// components/JoinLeaderboard.tsx
//
// Shows a real popup asking for a display name to join the leaderboard, on every
// visit, until the person actually joins. "Maybe later" dismisses it just for the
// current visit (tracked in React state, not persisted) - reopen the app and it'll
// ask again, exactly as requested. Once someone joins, this never shows the popup
// again for them.
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function JoinLeaderboard({ suppress = false }: { suppress?: boolean }) {
  const [name, setName] = useState<string | null | undefined>(undefined); // undefined = loading
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dismissedThisVisit, setDismissedThisVisit] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => setName(d.name))
      .catch(() => setName(null));
  }, []);

  async function handleJoin() {
    if (!input.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: input }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not save your name.');
        return;
      }
      setName(data.name);
    } catch {
      setErrorMsg('Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (name === undefined) return null; // still loading, avoid a flash of the wrong state

  if (name) {
    return (
      <Link
        href="/leaderboard"
        className="block rounded-xl border border-chalk/15 bg-pitch-dark/30 px-4 py-3 text-center text-xs font-medium text-chalk/80 transition-colors hover:border-floodlight/40"
      >
        🏆 You&apos;re on the leaderboard as <strong>{name}</strong> — tap to view rankings
      </Link>
    );
  }

  if (dismissedThisVisit || suppress) {
    return (
      <button
        onClick={() => setDismissedThisVisit(false)}
        className="block w-full rounded-xl border border-chalk/15 bg-pitch-dark/30 px-4 py-3 text-center text-xs font-medium text-chalk/70 transition-colors hover:border-floodlight/40"
      >
        🏆 Join the prediction leaderboard
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-floodlight/30 bg-pitch-dark p-5 shadow-xl animate-slideUp">
        <p className="mb-1 text-center text-2xl">🏆</p>
        <h2 className="mb-1 text-center font-display text-2xl uppercase text-chalk">
          Join the Leaderboard
        </h2>
        <p className="mb-4 text-center text-xs text-chalk/60">
          Compete with friends on prediction accuracy. Your name and score will be
          visible to everyone using this app.
        </p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Your name"
          maxLength={24}
          autoFocus
          className="mb-3 w-full rounded-lg border border-chalk/15 bg-pitch-dark/50 px-3 py-2.5 text-sm text-chalk placeholder:text-chalk/30 focus:border-floodlight/50 focus:outline-none"
        />
        {errorMsg && <p className="mb-2 text-center text-xs text-goal">{errorMsg}</p>}
        <button
          onClick={handleJoin}
          disabled={saving || !input.trim()}
          className="mb-2 w-full rounded-lg border border-floodlight bg-floodlight px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {saving ? 'Joining…' : 'Join the leaderboard'}
        </button>
        <button
          onClick={() => setDismissedThisVisit(true)}
          className="w-full rounded-lg px-4 py-2 text-xs font-medium text-chalk/50 hover:text-chalk/70"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
