'use client';
// components/UpNextCard.tsx
import { useEffect, useState } from 'react';
import { Match } from '@/lib/football-api';
import { countdownParts, formatKickoff, teamDisplayName } from '@/lib/match-utils';

function Crest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team) {
    return <div className="h-10 w-10 rounded-full border border-dashed border-chalk/20" />;
  }
  if (team.crest) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.crest} alt={team.name} className="h-10 w-10 object-contain" />;
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chalk/10 text-xs font-bold text-chalk/60">
      {team.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function UpNextCard({
  match,
  prediction,
  onPredict,
}: {
  match: Match;
  prediction: string | undefined;
  onPredict: (pick: 'HOME' | 'DRAW' | 'AWAY') => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { d, h, m, s, passed } = countdownParts(match.utcDate, now);
  const { date, time } = formatKickoff(match.utcDate);

  const options: { key: 'HOME' | 'DRAW' | 'AWAY'; label: string }[] = [
    { key: 'HOME', label: teamDisplayName(match.homeTeam) },
    { key: 'DRAW', label: 'Draw' },
    { key: 'AWAY', label: teamDisplayName(match.awayTeam) },
  ];

  return (
    <div className="rounded-2xl border border-chalk/10 bg-pitch-dark/60 p-4">
      <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-chalk/50">
        <span>Up Next</span>
        <span>
          {date} · {time}
        </span>
      </div>
      {match.venue && (
        <p className="-mt-2 mb-3 text-center text-[10px] normal-case tracking-normal text-chalk/30">
          {match.venue}
        </p>
      )}

      <div className="mb-4 grid grid-cols-3 items-center gap-2">
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

      {!passed ? (
        <div className="mb-4 flex justify-center gap-3 font-score text-chalk">
          {[
            { v: d, l: 'D' },
            { v: h, l: 'H' },
            { v: m, l: 'M' },
            { v: s, l: 'S' },
          ].map((u) => (
            <div key={u.l} className="flex flex-col items-center">
              <span className="text-2xl font-bold tabular-nums">{String(u.v).padStart(2, '0')}</span>
              <span className="text-[10px] text-chalk/40">{u.l}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-center text-xs text-floodlight">Kicking off any moment now</p>
      )}

      <p className="mb-2 text-center text-[11px] text-chalk/50">Who&apos;s going to win?</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onPredict(opt.key)}
            className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
              prediction === opt.key
                ? 'border-floodlight bg-floodlight text-ink'
                : 'border-chalk/15 text-chalk/70 hover:border-chalk/30'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
