'use client';
// components/JoinLeaderboard.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function JoinLeaderboard() {
  const [name, setName] = useState<string | null | undefined>(undefined); // undefined = loading
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  return (
    <div className="rounded-xl border border-chalk/15 bg-pitch-dark/30 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-chalk/80">
        🏆 Join the prediction leaderboard
      </p>
      <p className="mb-2 text-[11px] text-chalk/50">
        Your name and score will be visible to everyone using this app.
      </p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Your name"
          maxLength={24}
          className="flex-1 rounded-lg border border-chalk/15 bg-pitch-dark/50 px-3 py-2 text-xs text-chalk placeholder:text-chalk/30 focus:border-floodlight/50 focus:outline-none"
        />
        <button
          onClick={handleJoin}
          disabled={saving || !input.trim()}
          className="rounded-lg border border-floodlight bg-floodlight px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50"
        >
          {saving ? '…' : 'Join'}
        </button>
      </div>
      {errorMsg && <p className="mt-1.5 text-[10px] text-goal">{errorMsg}</p>}
    </div>
  );
}
