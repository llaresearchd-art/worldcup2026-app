'use client';
import { useEffect, useState } from 'react';
import { Match } from '@/lib/football-api';
import { teamDisplayName, estimatedElapsedMinutes } from '@/lib/match-utils';

function TeamCrest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team) return <div className="h-12 w-12 rounded-full border border-dashed border-chalk/20" />;
  if (team.crest) return <img src={team.crest} alt={team.name} className="h-12 w-12 object-contain drop-shadow-lg" />;
  return <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pitch-mid/60 text-sm font-bold text-chalk/60">{team.name.slice(0, 2).toUpperCase()}</div>;
}

export default function LiveScoreCard({ match }: { match: Match }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const scorers = match.goals ?? [];
  const homeScorers = scorers.filter(g => match.homeTeam && g.team.id === match.homeTeam.id);
  const awayScorers = scorers.filter(g => match.awayTeam && g.team.id === match.awayTeam.id);
  const hasRealMinute = typeof match.minute === 'number' && match.minute > 0;
  const estimate = !hasRealMinute && match.status === 'IN_PLAY' ? estimatedElapsedMinutes(match.utcDate, now) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-glow-red animate-slideUp"
      style={{ background: 'linear-gradient(160deg, #2D6A4F 0%, #1B4332 50%, #0C2218 100%)', border: '1px solid rgba(214,40,40,0.25)' }}>
      {/* Subtle animated gradient overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(214,40,40,0.15), transparent)' }} />

      <div className="relative p-4">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="live-glow h-2.5 w-2.5 rounded-full bg-goal" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-goal">
              {match.status === 'PAUSED' ? 'Half Time' : 'Live'}
            </span>
            {hasRealMinute && <span className="font-score text-[11px] text-chalk/50">{match.minute}&apos;</span>}
            {!hasRealMinute && estimate !== null && <span className="font-score text-[11px] text-chalk/30">~{estimate}&apos;</span>}
          </div>
          {match.venue && <span className="truncate max-w-[140px] text-[10px] text-chalk/30">{match.venue}</span>}
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-3 items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <TeamCrest team={match.homeTeam} />
            <span className="text-xs font-semibold text-chalk text-center leading-tight">{teamDisplayName(match.homeTeam)}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 font-score text-5xl font-bold text-chalk tabular-nums">
              <span className="score-pop">{match.score.fullTime.home ?? 0}</span>
              <span className="text-2xl text-chalk/20">–</span>
              <span className="score-pop">{match.score.fullTime.away ?? 0}</span>
            </div>
            <div className="mt-1 h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,163,0,0.4), transparent)' }} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <TeamCrest team={match.awayTeam} />
            <span className="text-xs font-semibold text-chalk text-center leading-tight">{teamDisplayName(match.awayTeam)}</span>
          </div>
        </div>

        {/* Goal scorers */}
        {(homeScorers.length > 0 || awayScorers.length > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-chalk/10 pt-3 text-[11px] text-chalk/50">
            <ul className="space-y-0.5">{homeScorers.map((g, i) => <li key={i}>⚽ {g.scorer.name}{g.minute ? ` ${g.minute}'` : ''}</li>)}</ul>
            <ul className="space-y-0.5 text-right">{awayScorers.map((g, i) => <li key={i}>{g.scorer.name}{g.minute ? ` ${g.minute}'` : ''} ⚽</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
