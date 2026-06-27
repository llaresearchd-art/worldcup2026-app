'use client';
// app/schedule/page.tsx
import { usePolling } from '@/lib/use-polling';
import { Match } from '@/lib/football-api';
import { scheduledMatches, teamDisplayName, formatKickoff } from '@/lib/match-utils';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface MatchesResponse {
  matches: Match[];
}

function Crest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team) {
    return <div className="h-7 w-7 rounded-full border border-dashed border-chalk/20" />;
  }
  if (team.crest) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.crest} alt={team.name} className="h-7 w-7 object-contain" />;
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-chalk/10 text-[10px] font-bold text-chalk/60">
      {team.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function SchedulePage() {
  const { data, loading, error } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const upcoming = scheduledMatches(data?.matches ?? []);

  return (
    <main>
      <PageHeader title="Schedule" subtitle={`${upcoming.length} matches remaining`} />

      <div className="space-y-2 px-4">
        {loading && !data && (
          <p className="py-8 text-center text-sm text-chalk/50">Loading schedule…</p>
        )}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/50">{error}</p>}
        {!loading && upcoming.length === 0 && (
          <p className="py-8 text-center text-sm text-chalk/50">
            No upcoming matches — the tournament may be complete, or check Results.
          </p>
        )}

        {upcoming.map((m) => {
          const { date, time } = formatKickoff(m.utcDate);
          return (
            <div key={m.id} className="rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-[10px] text-chalk/40">
                <span>{m.stage.replace(/_/g, ' ')}{m.group ? ` · Group ${m.group.slice(-1)}` : ''}</span>
                <span>
                  {date} · {time}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <div className="flex items-center gap-2">
                  <Crest team={m.homeTeam} />
                  <span className="truncate text-sm text-chalk/80">{teamDisplayName(m.homeTeam)}</span>
                </div>
                <span className="text-center text-xs font-bold text-chalk/30">vs</span>
                <div className="flex items-center justify-end gap-2">
                  <span className="truncate text-right text-sm text-chalk/80">{teamDisplayName(m.awayTeam)}</span>
                  <Crest team={m.awayTeam} />
                </div>
              </div>
              {m.venue && <p className="mt-1.5 text-center text-[10px] text-chalk/30">{m.venue}</p>}
            </div>
          );
        })}
      </div>

      <Footer />
    </main>
  );
}
