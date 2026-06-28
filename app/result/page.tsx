'use client';
// app/result/page.tsx
import { usePolling } from '@/lib/use-polling';
import { Match } from '@/lib/football-api';
import { finishedMatches, teamDisplayName, formatKickoff } from '@/lib/match-utils';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface MatchesResponse {
  matches: Match[];
}

function Crest({ team }: { team: { crest: string | null; name: string } | null }) {
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

export default function ResultPage() {
  const { data, loading, error } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const results = finishedMatches(data?.matches ?? []);

  return (
    <main>
      <PageHeader title="Results" subtitle={`${results.length} matches completed`} />

      <div className="space-y-2 px-4">
        {loading && !data && (
          <p className="py-8 text-center text-sm text-chalk/50">Loading results…</p>
        )}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/50">{error}</p>}
        {!loading && results.length === 0 && (
          <p className="py-8 text-center text-sm text-chalk/50">No matches completed yet.</p>
        )}

        {results.map((m) => {
          const { date } = formatKickoff(m.utcDate);
          const homeWin = (m.score.fullTime.home ?? 0) > (m.score.fullTime.away ?? 0);
          const awayWin = (m.score.fullTime.away ?? 0) > (m.score.fullTime.home ?? 0);
          const scorers = m.goals ?? [];
          const homeScorers = scorers.filter((g) => m.homeTeam && g.team.id === m.homeTeam.id);
          const awayScorers = scorers.filter((g) => m.awayTeam && g.team.id === m.awayTeam.id);
          return (
            <div
              key={m.id}
              className="rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3"
            >
              <div className="mb-2 flex items-center justify-between text-[10px] text-chalk/40">
                <span>{(m.stage || '').replace(/_/g, ' ')}{m.group ? ` · Group ${m.group.slice(-1)}` : ''}</span>
                <span>{date}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <div className="flex items-center gap-2">
                  <Crest team={m.homeTeam} />
                  <span className={`truncate text-sm ${homeWin ? 'font-bold text-chalk' : 'text-chalk/60'}`}>
                    {teamDisplayName(m.homeTeam)}
                  </span>
                </div>
                <div className="text-center font-score text-base font-bold text-chalk">
                  {m.score.fullTime.home} – {m.score.fullTime.away}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className={`truncate text-right text-sm ${awayWin ? 'font-bold text-chalk' : 'text-chalk/60'}`}>
                    {teamDisplayName(m.awayTeam)}
                  </span>
                  <Crest team={m.awayTeam} />
                </div>
              </div>

              {(homeScorers.length > 0 || awayScorers.length > 0) && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-chalk/10 pt-2 text-[11px] text-chalk/50">
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

              {m.venue && (
                <p className="mt-2 text-center text-[10px] text-chalk/30">{m.venue}</p>
              )}
            </div>
          );
        })}
      </div>

      <Footer />
    </main>
  );
}
