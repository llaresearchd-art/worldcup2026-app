'use client';
// components/LiveScoreCard.tsx
import { useEffect, useState } from 'react';
import { Match } from '@/lib/football-api';
import { teamDisplayName, estimatedElapsedMinutes } from '@/lib/match-utils';

function TeamCrest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team) {
    return <div className="h-9 w-9 rounded-full border border-dashed border-chalk/20" />;
  }
  if (team.crest) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.crest} alt={team.name} className="h-9 w-9 object-contain" />;
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-chalk/10 text-xs font-bold text-chalk/60">
      {team.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function LiveScoreCard({ match }: { match: Match }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const scorers = match.goals ?? [];
  const homeScorers = scorers.filter((g) => match.homeTeam && g.team.id === match.homeTeam.id);
  const awayScorers = scorers.filter((g) => match.awayTeam && g.team.id === match.awayTeam.id);

  const hasRealMinute = typeof match.minute === 'number' && match.minute > 0;
  const estimate = !hasRealMinute && match.status === 'IN_PLAY' ? estimatedElapsedMinutes(match.utcDate, now) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-floodlight/30 bg-gradient-to-b from-pitch-mid to-pitch-dark p-4 shadow-lg shadow-black/20 animate-slideUp">
      {/* scoreboard top bar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-goal animate-pulseLive" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-goal">
            {match.status === 'PAUSED' ? 'Half-time' : 'Live'}
          </span>
          {hasRealMinute && (
            <span className="ml-1 font-score text-[11px] text-chalk/70">{match.minute}&apos;</span>
          )}
          {!hasRealMinute && estimate !== null && (
            <span className="ml-1 font-score text-[11px] text-chalk/40">~{estimate}&apos;</span>
          )}
        </div>
        {match.venue && (
          <span className="truncate text-[11px] text-chalk/50">{match.venue}</span>
        )}
      </div>

      {/* scoreboard */}
      <div className="grid grid-cols-3 items-center gap-2">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <TeamCrest team={match.homeTeam} />
          <span className="text-xs font-semibold text-chalk">{teamDisplayName(match.homeTeam)}</span>
        </div>

        <div className="flex items-center justify-center gap-2 font-score text-4xl font-bold text-chalk tabular-nums">
          <span>{match.score.fullTime.home ?? 0}</span>
          <span className="text-floodlight/60">–</span>
          <span>{match.score.fullTime.away ?? 0}</span>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <TeamCrest team={match.awayTeam} />
          <span className="text-xs font-semibold text-chalk">{teamDisplayName(match.awayTeam)}</span>
        </div>
      </div>

      {/* goal scorers */}
      {(homeScorers.length > 0 || awayScorers.length > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-chalk/10 pt-2.5 text-[11px] text-chalk/60">
          <ul className="space-y-0.5">
            {homeScorers.map((g, i) => (
              <li key={i}>
                ⚽ {g.scorer.name} {g.minute ? `${g.minute}'` : ''}
              </li>
            ))}
          </ul>
          <ul className="space-y-0.5 text-right">
            {awayScorers.map((g, i) => (
              <li key={i}>
                {g.scorer.name} {g.minute ? `${g.minute}'` : ''} ⚽
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
