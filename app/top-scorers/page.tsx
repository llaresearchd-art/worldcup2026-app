'use client';
// app/top-scorers/page.tsx
import { usePolling } from '@/lib/use-polling';
import { ScorerEntry } from '@/lib/football-api';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface ScorersResponse {
  scorers: ScorerEntry[];
}

export default function TopScorersPage() {
  const { data, loading, error } = usePolling<ScorersResponse>('/api/scorers', 30_000);
  const scorers = data?.scorers ?? [];

  return (
    <main>
      <PageHeader title="Top Scorers" subtitle="Updated after every match" />

      <div className="space-y-1 px-4">
        {loading && !data && (
          <p className="py-8 text-center text-sm text-chalk/50">Loading top scorers…</p>
        )}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/50">{error}</p>}
        {!loading && scorers.length === 0 && (
          <p className="py-8 text-center text-sm text-chalk/50">
            No goals scored yet — check back once matches kick off.
          </p>
        )}

        {scorers.map((s, i) => (
          <div
            key={s.player.id}
            className="flex items-center gap-3 rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3"
          >
            <span className="w-5 text-center font-score text-sm font-bold text-floodlight">{i + 1}</span>
            {s.team.crest ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.team.crest} alt={s.team.name} className="h-8 w-8 object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chalk/10 text-[10px] font-bold text-chalk/60">
                {s.team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-chalk">{s.player.name}</p>
              <p className="text-[11px] text-chalk/40">{s.team.shortName || s.team.name}</p>
            </div>
            <div className="text-right">
              <p className="font-score text-lg font-bold text-chalk">{s.goals}</p>
              <p className="text-[10px] text-chalk/40">goals</p>
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </main>
  );
}
