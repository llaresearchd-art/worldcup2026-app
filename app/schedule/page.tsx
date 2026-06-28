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

function safeStageGroupLabel(m: Match): string {
  try {
    const stagePart = m.stage ? String(m.stage).replace(/_/g, ' ') : 'Knockout';
    const group = m.group;
    const groupPart = group && typeof group === 'string' && group.length > 0 ? ` · Group ${group.slice(-1)}` : '';
    return stagePart + groupPart;
  } catch {
    return '';
  }
}

function Crest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team || typeof team.name !== 'string') {
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

function FixtureRow({ m }: { m: Match }) {
  // Defensive: if anything about this single fixture is malformed, show a minimal
  // fallback row instead of taking down the whole page. One bad fixture should
  // never break the other 100+.
  let date = '';
  let time = '';
  try {
    const formatted = formatKickoff(m.utcDate);
    date = formatted.date;
    time = formatted.time;
  } catch {
    date = '';
    time = '';
  }

  return (
    <div className="rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[10px] text-chalk/40">
        <span>{safeStageGroupLabel(m)}</span>
        <span>
          {date} {time && `· ${time}`}
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
      {m.venue && typeof m.venue === 'string' && (
        <p className="mt-1.5 text-center text-[10px] text-chalk/30">{m.venue}</p>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const { data, loading, error } = usePolling<MatchesResponse>('/api/matches', 30_000);

  let upcoming: Match[] = [];
  let pageError: string | null = null;
  try {
    upcoming = scheduledMatches(data?.matches ?? []);
  } catch (e: any) {
    pageError = 'There was a problem reading the schedule data. Pull to refresh, or check back shortly.';
  }

  return (
    <main>
      <PageHeader title="Schedule" subtitle={`${upcoming.length} matches remaining`} />

      <div className="space-y-2 px-4">
        {loading && !data && (
          <p className="py-8 text-center text-sm text-chalk/50">Loading schedule…</p>
        )}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/50">{error}</p>}
        {pageError && <p className="py-8 text-center text-sm text-chalk/50">{pageError}</p>}
        {!loading && !pageError && upcoming.length === 0 && (
          <p className="py-8 text-center text-sm text-chalk/50">
            No upcoming matches — the tournament may be complete, or check Results.
          </p>
        )}

        {!pageError &&
          upcoming
            .filter((m) => m && m.id != null && m.utcDate)
            .map((m) => (
              <div key={m.id}>
                {(() => {
                  try {
                    return <FixtureRow m={m} />;
                  } catch {
                    return (
                      <div className="rounded-xl border border-chalk/10 bg-pitch-dark/20 px-4 py-3 text-center text-xs text-chalk/30">
                        A fixture here couldn&apos;t be displayed.
                      </div>
                    );
                  }
                })()}
              </div>
            ))}
      </div>

      <Footer />
    </main>
  );
}
