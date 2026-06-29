'use client';
// app/page.tsx
import Link from 'next/link';
import { usePolling } from '@/lib/use-polling';
import { Match } from '@/lib/football-api';
import {
  liveMatches,
  nextMatch,
  matchesPlayedCount,
  totalMatchesCount,
} from '@/lib/match-utils';
import LiveScoreCard from '@/components/LiveScoreCard';
import UpNextCard from '@/components/UpNextCard';
import Footer from '@/components/Footer';
import NotificationOptIn from '@/components/NotificationOptIn';
import FirstVisitTip from '@/components/FirstVisitTip';
import JoinLeaderboard from '@/components/JoinLeaderboard';
import PredictionPopup from '@/components/PredictionPopup';
import { useEffect, useState, useCallback } from 'react';

interface MatchesResponse {
  matches: Match[];
  updatedAt: number;
  stale: boolean;
}
interface PredictResponse {
  predictions: Record<string, string>;
}

export default function HomePage() {
  const { data, error, loading } = usePolling<MatchesResponse>('/api/matches', 20_000);
  const [predictions, setPredictions] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/predict')
      .then((r) => r.json())
      .then((d: PredictResponse) => setPredictions(d.predictions || {}));
  }, []);

  const handlePredict = useCallback(
    async (matchId: number, pick: 'HOME' | 'DRAW' | 'AWAY') => {
      setPredictions((prev) => ({ ...prev, [String(matchId)]: pick }));
      await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: String(matchId), pick }),
      });
    },
    []
  );

  const matches = data?.matches ?? [];
  const live = liveMatches(matches);
  const upNext = nextMatch(matches);
  const played = matchesPlayedCount(matches);
  const total = totalMatchesCount(matches);

  const upNextPrediction = upNext ? predictions[String(upNext.id)] : undefined;
  const minutesToUpNext = upNext ? (new Date(upNext.utcDate).getTime() - Date.now()) / 60_000 : Infinity;
  // Mirrors PredictionPopup's own visibility logic, so JoinLeaderboard knows when to
  // step aside rather than overlap it. Doesn't need to be perfectly in sync second-
  // by-second - both popups dismiss to a small inline element either way, so a brief
  // overlap window is harmless even if these drift slightly.
  const predictionPopupLikelyShowing = Boolean(upNext) && !upNextPrediction && minutesToUpNext > 0 && minutesToUpNext <= 30;

  return (
    <main>
      <header className="px-4 pt-6 pb-2">
        <p className="text-[11px] uppercase tracking-widest text-floodlight">FIFA World Cup 2026</p>
        <h1 className="font-display text-4xl uppercase tracking-wide text-chalk">Matchday Hub</h1>
      </header>

      <FirstVisitTip />

      {/* Match counter */}
      <div className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-chalk/10 bg-pitch-dark/40 px-4 py-3">
        <span className="text-xs text-chalk/60">Matches played</span>
        <span className="font-score text-lg font-bold text-chalk">
          {data ? (
            <>
              {played} <span className="text-chalk/40">/ {total || 104}</span>
            </>
          ) : (
            <span className="text-chalk/30">…</span>
          )}
        </span>
      </div>

      <div className="space-y-4 px-4">
        {loading && !data && (
          <div className="rounded-2xl border border-chalk/10 bg-pitch-dark/40 p-6 text-center text-sm text-chalk/50">
            Loading live matches…
          </div>
        )}

        {error && !data && (
          <div className="rounded-2xl border border-goal/30 bg-goal/10 p-4 text-center text-sm text-chalk/70">
            {error}
          </div>
        )}

        {data?.stale && (
          <p className="text-center text-[11px] text-floodlight/70">
            Showing the last update we could fetch — refreshing shortly.
          </p>
        )}

        {live.length > 0 ? (
          <div className="space-y-3">
            {live.map((m) => (
              <LiveScoreCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-chalk/10 bg-pitch-dark/40 p-6 text-center text-sm text-chalk/50">
            No match live right now.
          </div>
        )}

        {upNext && (
          <UpNextCard
            match={upNext}
            prediction={predictions[String(upNext.id)]}
            onPredict={(pick) => handlePredict(upNext.id, pick)}
          />
        )}

        <PredictionPopup
          match={upNext}
          prediction={upNext ? predictions[String(upNext.id)] : undefined}
          onPredict={(pick) => upNext && handlePredict(upNext.id, pick)}
        />

        <JoinLeaderboard suppress={predictionPopupLikelyShowing} />

        <NotificationOptIn />

        {/* More pages not already in the bottom tab bar */}
        <div className="pt-2">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-chalk/40">More</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/squad', label: 'Squads' },
              { href: '/top-scorers', label: 'Top Scorers' },
              { href: '/prediction', label: 'My Prediction' },
              { href: '/leaderboard', label: 'Leaderboard' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-chalk/10 bg-pitch-dark/30 px-3 py-4 text-center text-xs font-medium text-chalk/80 transition-colors hover:border-floodlight/40 hover:text-chalk"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
