'use client';
import { usePolling } from '@/lib/use-polling';
import { ScorerEntry } from '@/lib/football-api';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface ScorersResponse { scorers: ScorerEntry[]; }

export default function TopScorersPage() {
  const { data, loading, error } = usePolling<ScorersResponse>('/api/scorers', 30_000);
  const scorers = data?.scorers ?? [];
  return (
    <main className="page-enter">
      <PageHeader title="Top Scorers" subtitle="Updated after every match" />
      <div className="space-y-2 px-4">
        {loading && !data && <p className="py-8 text-center text-sm text-chalk/40">Loading…</p>}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/40">{error}</p>}
        {!loading && scorers.length === 0 && (
          <div className="rounded-2xl border border-chalk/8 bg-pitch-mid/10 p-8 text-center">
            <p className="text-3xl mb-2">👟</p>
            <p className="text-sm text-chalk/50">No goals scored yet</p>
          </div>
        )}
        {scorers.map((s, i) => (
          <div key={s.player.id}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 card-interactive animate-slideUp
              ${i === 0 ? 'border-floodlight/30 bg-floodlight/8' : 'border-chalk/8 bg-pitch-mid/10'}`}>
            <span className={`w-7 text-center font-score text-base font-bold ${i === 0 ? 'text-floodlight' : 'text-chalk/40'}`}>{i + 1}</span>
            {s.team.crest
              ? <img src={s.team.crest} alt={s.team.name} className="h-9 w-9 object-contain" />
              : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pitch-mid/40 text-[10px] font-bold text-chalk/60">{s.team.name.slice(0,2).toUpperCase()}</div>
            }
            <div className="flex-1">
              <p className={`text-sm font-bold ${i === 0 ? 'text-chalk' : 'text-chalk/80'}`}>{s.player.name}</p>
              <p className="text-[11px] text-chalk/40">{s.team.shortName || s.team.name}{s.playedMatches ? ` · ${s.playedMatches} matches` : ''}</p>
            </div>
            <div className="text-right">
              <p className={`font-score text-2xl font-bold ${i === 0 ? 'text-floodlight' : 'text-chalk'}`}>{s.goals}</p>
              <p className="text-[10px] text-chalk/30">goals</p>
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </main>
  );
}
