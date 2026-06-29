'use client';
// components/PredictionPopup.tsx
//
// Shows a full popup asking for a prediction once a match is within its final
// pre-kickoff window (same ~30 minute mark as the matching push notification),
// if the person hasn't already predicted that match. Dismissing it just hides it
// for the current visit - reopening the app (or the window reopening again later)
// will show it again, same "ask until they answer" philosophy as the leaderboard
// join popup.
import { useEffect, useState } from 'react';
import { Match } from '@/lib/football-api';
import { countdownParts, teamDisplayName } from '@/lib/match-utils';

const POPUP_WINDOW_MINUTES = 30;

function Crest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team) {
    return <div className="h-12 w-12 rounded-full border border-dashed border-chalk/20" />;
  }
  if (team.crest) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.crest} alt={team.name} className="h-12 w-12 object-contain" />;
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chalk/10 text-sm font-bold text-chalk/60">
      {team.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function PredictionPopup({
  match,
  prediction,
  onPredict,
}: {
  match: Match | null;
  prediction: string | undefined;
  onPredict: (pick: 'HOME' | 'DRAW' | 'AWAY') => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [dismissedThisVisit, setDismissedThisVisit] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!match) return null;
  if (prediction) return null; // already predicted - nothing to ask
  if (dismissedThisVisit) return null;

  const { minutesToKickoff } = (() => {
    const target = new Date(match.utcDate).getTime();
    return { minutesToKickoff: (target - now) / 60_000 };
  })();

  const inWindow = minutesToKickoff <= POPUP_WINDOW_MINUTES && minutesToKickoff > 0;
  if (!inWindow) return null;

  const { m: mins, s: secs } = countdownParts(match.utcDate, now);

  const options: { key: 'HOME' | 'DRAW' | 'AWAY'; label: string }[] = [
    { key: 'HOME', label: teamDisplayName(match.homeTeam) },
    { key: 'DRAW', label: 'Draw' },
    { key: 'AWAY', label: teamDisplayName(match.awayTeam) },
  ];

  function pick(choice: 'HOME' | 'DRAW' | 'AWAY') {
    onPredict(choice);
    setDismissedThisVisit(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-floodlight/30 bg-pitch-dark p-5 shadow-xl animate-slideUp">
        <p className="mb-1 text-center text-[11px] uppercase tracking-widest text-floodlight">
          Kicking off in {mins}m {secs}s
        </p>
        <h2 className="mb-4 text-center font-display text-xl uppercase text-chalk">
          Who&apos;s going to win?
        </h2>

        <div className="mb-5 grid grid-cols-3 items-center gap-2">
          <div className="flex flex-col items-center gap-1 text-center">
            <Crest team={match.homeTeam} />
            <span className="text-xs font-semibold text-chalk">{teamDisplayName(match.homeTeam)}</span>
          </div>
          <span className="text-center text-sm font-bold text-chalk/40">vs</span>
          <div className="flex flex-col items-center gap-1 text-center">
            <Crest team={match.awayTeam} />
            <span className="text-xs font-semibold text-chalk">{teamDisplayName(match.awayTeam)}</span>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-3 gap-2">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => pick(opt.key)}
              className="rounded-lg border border-chalk/15 px-2 py-2.5 text-xs font-medium text-chalk/80 transition-colors hover:border-floodlight hover:bg-floodlight/10"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setDismissedThisVisit(true)}
          className="mt-2 w-full rounded-lg px-4 py-2 text-xs font-medium text-chalk/50 hover:text-chalk/70"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
