'use client';
import { useEffect, useState } from 'react';
import { Match } from '@/lib/football-api';
import { countdownParts, formatKickoff, teamDisplayName } from '@/lib/match-utils';

function Crest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team) return <div className="h-12 w-12 rounded-full border border-dashed border-chalk/20" />;
  if (team.crest) return <img src={team.crest} alt={team.name} className="h-12 w-12 object-contain drop-shadow-lg" />;
  return <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pitch-mid/60 text-xs font-bold text-chalk/60">{team.name.slice(0, 2).toUpperCase()}</div>;
}

export default function UpNextCard({ match, prediction, onPredict }: {
  match: Match;
  prediction: string | undefined;
  onPredict: (pick: 'HOME' | 'DRAW' | 'AWAY') => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const { d, h, m, s, passed } = countdownParts(match.utcDate, now);
  const { date, time } = formatKickoff(match.utcDate);
  const options: { key: 'HOME' | 'DRAW' | 'AWAY'; label: string }[] = [
    { key: 'HOME', label: teamDisplayName(match.homeTeam) },
    { key: 'DRAW', label: 'Draw' },
    { key: 'AWAY', label: teamDisplayName(match.awayTeam) },
  ];

  return (
    <div className="rounded-2xl border border-chalk/10 bg-pitch-mid/15 p-4 animate-slideUp">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chalk/40">Up Next</span>
        <span className="text-[11px] text-chalk/30">{date} · {time}</span>
      </div>
      {match.venue && <p className="-mt-2 mb-3 text-center text-[10px] text-chalk/25">{match.venue}</p>}

      <div className="mb-4 grid grid-cols-3 items-center gap-2">
        <div className="flex flex-col items-center gap-1.5">
          <Crest team={match.homeTeam} />
          <span className="text-xs font-semibold text-chalk text-center">{teamDisplayName(match.homeTeam)}</span>
        </div>
        <div className="text-center text-xs font-bold text-chalk/20 uppercase tracking-widest">vs</div>
        <div className="flex flex-col items-center gap-1.5">
          <Crest team={match.awayTeam} />
          <span className="text-xs font-semibold text-chalk text-center">{teamDisplayName(match.awayTeam)}</span>
        </div>
      </div>

      {!passed ? (
        <div className="mb-4 flex justify-center gap-4">
          {[{v:d,l:'D'},{v:h,l:'H'},{v:m,l:'M'},{v:s,l:'S'}].map(u => (
            <div key={u.l} className="flex flex-col items-center">
              <div className="rounded-xl border border-chalk/10 bg-pitch-deep/60 px-3 py-1.5 min-w-[44px] text-center">
                <span className="font-score text-xl font-bold text-chalk tabular-nums">{String(u.v).padStart(2,'0')}</span>
              </div>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-chalk/30">{u.l}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-center text-xs font-medium text-floodlight animate-pulseLive">Kicking off any moment…</p>
      )}

      <p className="mb-2.5 text-center text-[11px] text-chalk/40">Who&apos;s going to win?</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map(opt => (
          <button key={opt.key} onClick={() => onPredict(opt.key)}
            className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all active:scale-95
              ${prediction === opt.key
                ? 'border-floodlight bg-floodlight text-ink shadow-glow-gold'
                : 'border-chalk/10 text-chalk/60 hover:border-chalk/30 hover:text-chalk'}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
