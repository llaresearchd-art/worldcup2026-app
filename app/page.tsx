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
import FirstVisitTip from '@/components/FirstVisitTip';
import JoinLeaderboard from '@/components/JoinLeaderboard';
import PredictionPopup from '@/components/PredictionPopup';
import NotificationOptIn from '@/components/NotificationOptIn';
import { useEffect, useState, useCallback } from 'react';

interface MatchesResponse {
  matches: Match[];
  updatedAt: number;
  stale: boolean;
}
interface PredictResponse {
  predictions: Record<string, string>;
}

const MORE_LINKS = [
  { href: '/squad',       label: 'Squads',        icon: '🌍' },
  { href: '/top-scorers', label: 'Top Scorers',   icon: '👟' },
  { href: '/prediction',  label: 'My Prediction', icon: '🎯' },
  { href: '/result',      label: 'Results',       icon: '🏁' },
];

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
  const predictionPopupLikelyShowing = Boolean(upNext) && !upNextPrediction && minutesToUpNext > 0 && minutesToUpNext <= 30;

  return (
    <main className="page-enter">
      {/* ── Hero header ───────────────────────────────────────────── */}
      <header className="relative px-4 pt-8 pb-4 overflow-hidden">
        {/* Ambient floodlight behind the title */}
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full opacity-30"
          style={{ background: 'radial-gradient(ellipse, #F4A300 0%, transparent 70%)' }} />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.25em] text-floodlight mb-1">
          FIFA World Cup 2026
        </p>
        <h1 className="relative font-display text-5xl uppercase leading-none text-gradient">
          Matchday Hub
        </h1>
      </header>

      <FirstVisitTip />

      {/* ── Match counter ─────────────────────────────────────────── */}
      <div className="mx-4 mb-5">
        <div className="card-floodlit rounded-2xl px-5 py-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-chalk/40 mb-0.5">
                Matches Played
              </p>
              {data ? (
                <p className="font-score text-3xl font-bold text-chalk animate-countUp">
                  {played}
                  <span className="text-chalk/30 text-lg ml-1">/ {total || 104}</span>
                </p>
              ) : (
                <div className="h-8 w-24 rounded-lg shimmer" />
              )}
            </div>
            {/* Progress arc */}
            <div className="relative h-14 w-14">
              <svg viewBox="0 0 48 48" className="rotate-[-90deg]">
                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="#F4A300" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - (played / (total || 104)))}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-score text-[11px] text-chalk/60">
                {data ? `${Math.round((played / (total || 104)) * 100)}%` : '…'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4">
        {/* ── Loading / error states ─────────────────────────────── */}
        {loading && !data && (
          <div className="rounded-2xl border border-chalk/8 p-6 text-center shimmer">
            <p className="text-sm text-chalk/40">Loading live matches…</p>
          </div>
        )}

        {error && !data && (
          <div className="rounded-2xl border border-goal/30 bg-goal/10 p-4 text-center text-sm text-chalk/70 animate-slideUp">
            {error}
          </div>
        )}

        {data?.stale && (
          <p className="text-center text-[11px] text-floodlight/60">
            Refreshing shortly…
          </p>
        )}

        {/* ── Live matches ──────────────────────────────────────── */}
        {live.length > 0 ? (
          <div className="space-y-3">
            {live.map((m) => (
              <LiveScoreCard key={m.id} match={m} />
            ))}
          </div>
        ) : data && (() => {
          // Check if any "upcoming" match has actually already kicked off based on
          // time, but our data source hasn't updated its status yet (free tier lag).
          // Show a "match in progress" placeholder rather than "no match live".
          const now = Date.now();
          const likelyLive = (data.matches ?? []).filter(m => {
            if (!m.utcDate) return false;
            const kickoff = new Date(m.utcDate).getTime();
            const elapsed = (now - kickoff) / 60_000; // minutes since kickoff
            return elapsed > 0 && elapsed < 115 && (m.status === 'TIMED' || m.status === 'SCHEDULED');
          });

          if (likelyLive.length > 0) {
            return (
              <div className="space-y-3">
                {likelyLive.map(m => (
                  <div key={m.id} className="relative overflow-hidden rounded-2xl border border-floodlight/20 bg-gradient-to-b from-pitch-mid to-pitch-dark p-4 shadow-card animate-slideUp">
                    <div className="mb-3 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-floodlight animate-pulseLive" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-floodlight">
                        Match in Progress
                      </span>
                      <span className="ml-1 text-[11px] text-chalk/40">· Live data updating…</span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        {m.homeTeam?.crest && <img src={m.homeTeam.crest} alt={m.homeTeam.name} className="h-9 w-9 object-contain" />}
                        <span className="text-xs font-semibold text-chalk">{m.homeTeam?.shortName || m.homeTeam?.name || 'TBD'}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 font-score text-3xl font-bold text-chalk/40 tabular-nums">
                        <span>?</span>
                        <span className="text-floodlight/40">–</span>
                        <span>?</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        {m.awayTeam?.crest && <img src={m.awayTeam.crest} alt={m.awayTeam.name} className="h-9 w-9 object-contain" />}
                        <span className="text-xs font-semibold text-chalk">{m.awayTeam?.shortName || m.awayTeam?.name || 'TBD'}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-[11px] text-chalk/30">
                      Score will appear once our data source updates · refreshing every 25s
                    </p>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div className="rounded-2xl border border-chalk/8 bg-pitch-mid/10 p-5 text-center animate-slideUp">
              <p className="text-2xl mb-1">🌙</p>
              <p className="text-sm font-medium text-chalk/60">No match live right now</p>
              <p className="text-xs text-chalk/30 mt-0.5">Check back when the next match kicks off</p>
            </div>
          );
        })()}

        {/* ── Up Next ───────────────────────────────────────────── */}
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

        {/* ── More section ──────────────────────────────────────── */}
        <div className="pt-1 pb-2">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-chalk/30">
            More
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {MORE_LINKS.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="group card-interactive flex items-center gap-3 rounded-2xl border border-chalk/8 bg-pitch-mid/15 px-4 py-3.5 transition-colors hover:border-floodlight/30"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-semibold text-chalk/70 group-hover:text-chalk transition-colors">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
