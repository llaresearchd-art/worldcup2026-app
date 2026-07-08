'use client';
import { usePolling } from '@/lib/use-polling';
import { Match } from '@/lib/football-api';
import { finishedMatches, teamDisplayName, formatKickoff } from '@/lib/match-utils';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface MatchesResponse { matches: Match[]; }

function Crest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team) return <div className="h-8 w-8 rounded-full border border-dashed border-chalk/20" />;
  if (team.crest) return <img src={team.crest} alt={team.name} className="h-8 w-8 object-contain" />;
  return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pitch-mid/40 text-[10px] font-bold text-chalk/60">{team.name.slice(0, 2).toUpperCase()}</div>;
}

export default function ResultPage() {
  const { data, loading, error } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const results = finishedMatches(data?.matches ?? []);
  return (
    <main className="page-enter">
      <PageHeader title="Results" subtitle={`${results.length} matches played`} />
      <div className="space-y-2 px-4">
        {loading && !data && <p className="py-8 text-center text-sm text-chalk/40">Loading results…</p>}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/40">{error}</p>}
        {!loading && results.length === 0 && <p className="py-8 text-center text-sm text-chalk/40">No matches completed yet.</p>}
        {results.map((m) => {
          const { date } = formatKickoff(m.utcDate);
          const h = m.score?.fullTime?.home ?? 0;
          const a = m.score?.fullTime?.away ?? 0;
          const homeWin = h > a, awayWin = a > h;
          const goals = m.goals ?? [];
          const homeScorers = goals.filter(g => m.homeTeam && g.team.id === m.homeTeam.id);
          const awayScorers = goals.filter(g => m.awayTeam && g.team.id === m.awayTeam.id);
          return (
            <div key={m.id} className="rounded-2xl border border-chalk/8 bg-pitch-mid/10 px-4 py-3 card-interactive animate-slideUp">
              <div className="mb-2 flex items-center justify-between text-[10px] text-chalk/30">
                <span className="uppercase tracking-wide">{(m.stage || '').replace(/_/g, ' ')}{m.group ? ` · Group ${m.group.slice(-1)}` : ''}</span>
                <span>{date}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <div className="flex items-center gap-2">
                  <Crest team={m.homeTeam} />
                  <span className={`truncate text-sm font-semibold ${homeWin ? 'text-chalk' : 'text-chalk/40'}`}>{teamDisplayName(m.homeTeam)}</span>
                </div>
                <div className="text-center font-score text-xl font-bold text-chalk">{h} – {a}</div>
                <div className="flex items-center justify-end gap-2">
                  <span className={`truncate text-right text-sm font-semibold ${awayWin ? 'text-chalk' : 'text-chalk/40'}`}>{teamDisplayName(m.awayTeam)}</span>
                  <Crest team={m.awayTeam} />
                </div>
              </div>
              {(homeScorers.length > 0 || awayScorers.length > 0) && (
                <div className="mt-2 grid grid-cols-2 gap-1 border-t border-chalk/8 pt-2 text-[10px] text-chalk/40">
                  <div className="space-y-0.5">{homeScorers.map((g, i) => <p key={i}>⚽ {g.scorer.name}{g.minute ? ` ${g.minute}'` : ''}</p>)}</div>
                  <div className="space-y-0.5 text-right">{awayScorers.map((g, i) => <p key={i}>{g.scorer.name}{g.minute ? ` ${g.minute}'` : ''} ⚽</p>)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Footer />
    </main>
  );
}
