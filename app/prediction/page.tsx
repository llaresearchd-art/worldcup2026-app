'use client';
import { useEffect, useState } from 'react';
import { usePolling } from '@/lib/use-polling';
import { Match } from '@/lib/football-api';
import { teamDisplayName, isFinished } from '@/lib/match-utils';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface MatchesResponse { matches: Match[]; }
interface PredictResponse { predictions: Record<string, string>; }

function pickLabel(pick: string, m: Match) {
  if (pick === 'HOME') return teamDisplayName(m.homeTeam);
  if (pick === 'AWAY') return teamDisplayName(m.awayTeam);
  return 'Draw';
}
function actualResult(m: Match): 'HOME' | 'AWAY' | 'DRAW' | null {
  if (!isFinished(m)) return null;
  const h = m.score?.fullTime?.home ?? 0, a = m.score?.fullTime?.away ?? 0;
  if (h > a) return 'HOME'; if (a > h) return 'AWAY'; return 'DRAW';
}

export default function PredictionPage() {
  const { data } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/predict').then(r => r.json()).then((d: PredictResponse) => setPredictions(d.predictions || {})).finally(() => setLoading(false));
  }, []);

  const matches = data?.matches ?? [];
  const predicted = matches.filter(m => predictions[String(m.id)]).sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
  const settled = predicted.filter(m => isFinished(m));
  const correct = settled.filter(m => actualResult(m) === predictions[String(m.id)]).length;

  return (
    <main className="page-enter">
      <PageHeader title="My Prediction" subtitle="Every pick you've made" />
      {settled.length > 0 && (
        <div className="mx-4 mb-4 rounded-2xl border border-floodlight/30 bg-floodlight/10 px-5 py-4 text-center">
          <p className="font-score text-4xl font-bold text-floodlight">{correct}<span className="text-chalk/30 text-xl">/{settled.length}</span></p>
          <p className="text-xs text-chalk/50 mt-1">predictions correct</p>
          <div className="mt-2 h-1.5 rounded-full bg-chalk/10 overflow-hidden">
            <div className="h-full rounded-full bg-floodlight transition-all duration-700" style={{ width: `${(correct / settled.length) * 100}%` }} />
          </div>
        </div>
      )}
      <div className="space-y-2 px-4">
        {loading && <p className="py-8 text-center text-sm text-chalk/40">Loading…</p>}
        {!loading && predicted.length === 0 && (
          <div className="rounded-2xl border border-chalk/8 bg-pitch-mid/10 p-8 text-center">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-sm font-medium text-chalk/60">No predictions yet</p>
            <p className="text-xs text-chalk/30 mt-1">Head to the Home tab and pick a winner</p>
          </div>
        )}
        {predicted.map(m => {
          const pick = predictions[String(m.id)];
          const result = actualResult(m);
          const isCorrect = result !== null && result === pick;
          const isWrong = result !== null && result !== pick;
          return (
            <div key={m.id} className={`rounded-2xl border px-4 py-3 card-interactive animate-slideUp
              ${isCorrect ? 'border-floodlight/30 bg-floodlight/8' : isWrong ? 'border-goal/20 bg-goal/5' : 'border-chalk/8 bg-pitch-mid/10'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {m.homeTeam?.crest && <img src={m.homeTeam.crest} alt="" className="h-5 w-5 object-contain" />}
                  <span className="text-xs text-chalk/60">{teamDisplayName(m.homeTeam)} vs {teamDisplayName(m.awayTeam)}</span>
                  {m.awayTeam?.crest && <img src={m.awayTeam.crest} alt="" className="h-5 w-5 object-contain" />}
                </div>
                {result && <span className={`text-xs font-bold ${isCorrect ? 'text-floodlight' : 'text-goal'}`}>{isCorrect ? '✓ Correct' : '✗ Missed'}</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-chalk/80">Your pick: <strong>{pickLabel(pick, m)}</strong></span>
                {isFinished(m)
                  ? <span className="font-score text-sm text-chalk/50">{m.score?.fullTime?.home}–{m.score?.fullTime?.away}</span>
                  : <span className="text-xs text-chalk/30">Not played yet</span>}
              </div>
            </div>
          );
        })}
      </div>
      <Footer />
    </main>
  );
}
