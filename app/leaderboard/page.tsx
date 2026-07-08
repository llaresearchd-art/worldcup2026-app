'use client';
import { usePolling } from '@/lib/use-polling';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface LeaderboardRow { name: string; points: number; correct: number; settled: number; }
interface LeaderboardResponse { leaderboard: LeaderboardRow[]; }

const MEDALS = ['🥇','🥈','🥉'];
const RANK_COLORS = ['text-floodlight','text-chalk/60','text-chalk/40'];

export default function LeaderboardPage() {
  const { data, loading, error } = usePolling<LeaderboardResponse>('/api/leaderboard', 30_000);
  const rows = data?.leaderboard ?? [];
  return (
    <main className="page-enter">
      <PageHeader title="Leaderboard" subtitle="Prediction points — who called it right?" />
      <div className="mx-4 mb-4 rounded-2xl border border-floodlight/20 bg-floodlight/8 px-4 py-3 text-[11px] text-chalk/50">
        <strong className="text-chalk/70">Scoring:</strong> +3 for correct winner · +4 for correct draw
      </div>
      <div className="space-y-2 px-4">
        {loading && !data && <p className="py-8 text-center text-sm text-chalk/40">Loading leaderboard…</p>}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/40">{error}</p>}
        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-chalk/8 bg-pitch-mid/10 p-8 text-center">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-sm font-medium text-chalk/60">No one on the board yet</p>
            <p className="text-xs text-chalk/30 mt-1">Set your name on the homepage to join</p>
          </div>
        )}
        {rows.map((row, i) => (
          <div key={row.name + i}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 card-interactive animate-slideUp
              ${i === 0 ? 'border-floodlight/30 bg-floodlight/8' : 'border-chalk/8 bg-pitch-mid/10'}`}>
            <span className="w-7 text-center text-xl">
              {i < 3 ? MEDALS[i] : <span className={`font-score text-sm font-bold ${RANK_COLORS[i] || 'text-chalk/30'}`}>{i + 1}</span>}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-bold ${i === 0 ? 'text-floodlight' : 'text-chalk'}`}>{row.name}</p>
              <p className="text-[11px] text-chalk/40">{row.correct}/{row.settled} correct</p>
            </div>
            <div className="text-right">
              <p className={`font-score text-2xl font-bold ${i === 0 ? 'text-floodlight' : 'text-chalk'}`}>{row.points}</p>
              <p className="text-[10px] text-chalk/30">pts</p>
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </main>
  );
}
