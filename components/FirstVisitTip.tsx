'use client';
// components/FirstVisitTip.tsx
//
// A small one-time hint shown to first-time visitors, explaining the two things
// that aren't obvious from the homepage alone: predictions and favorite teams.
// Dismissing it is remembered per-visitor (server-side, same pattern as predictions
// and favorites) so it never nags a returning user.
import { useEffect, useState } from 'react';

export default function FirstVisitTip() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/api/tip-seen')
      .then((r) => r.json())
      .then((d) => {
        if (!d.seen) setVisible(true);
      })
      .finally(() => setChecked(true));
  }, []);

  async function dismiss() {
    setVisible(false);
    await fetch('/api/tip-seen', { method: 'POST' });
  }

  if (!checked || !visible) return null;

  return (
    <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-floodlight/30 bg-floodlight/10 px-4 py-3 animate-slideUp">
      <span className="text-base">👋</span>
      <p className="flex-1 text-xs leading-relaxed text-chalk/80">
        New here? Tap a team under <strong>Up Next</strong> to predict the winner, turn on
        notifications below for match alerts, and pick your favorite teams on the{' '}
        <strong>My Teams</strong> tab.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="text-chalk/40 hover:text-chalk/70"
      >
        ✕
      </button>
    </div>
  );
}
