'use client';
// app/leaderboard/page.tsx
import { usePolling } from '@/lib/use-polling';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface LeaderboardRow {
  name: string;
  points: number;
  correct: number;
  settled: number;
}
interface LeaderboardResponse {
  leaderboard: LeaderboardRow[];
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { data, loading, error } = usePolling<LeaderboardResponse>('/api/leaderboard', 30_000);
  const rows = data?.leaderboard ?? [];

  return (
    <main>
      <PageHeader title="Leaderboard" subtitle="Prediction points, ranked" />

      <div className="mx-4 mb-4 rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3 text-[11px] text-chalk/50">
        <strong className="text-chalk/70">Scoring:</strong> +3 points for correctly picking the
        winner, +4 for correctly calling a draw. Names and scores here are visible to everyone
        using this app.
      </div>

      <div className="space-y-2 px-4">
        {loading && !data && (
          <p className="py-8 text-center text-sm text-chalk/50">Loading leaderboard…</p>
        )}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/50">{error}</p>}
        {!loading && rows.length === 0 && (
          <p className="py-8 text-center text-sm text-chalk/50">
            No one has set a name yet — set yours on the homepage to join the leaderboard.
          </p>
        )}

        {rows.map((row, i) => (
          <div
            key={row.name + i}
            className="flex items-center gap-3 rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3"
          >
            <span className="w-7 text-center text-lg">
              {MEDALS[i] ?? <span className="font-score text-sm text-chalk/40">{i + 1}</span>}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-chalk">{row.name}</p>
              <p className="text-[11px] text-chalk/40">
                {row.correct}/{row.settled} correct
              </p>
            </div>
            <div className="text-right">
              <p className="font-score text-lg font-bold text-chalk">{row.points}</p>
              <p className="text-[10px] text-chalk/40">pts</p>
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </main>
  );
}
