'use client';
// app/prediction/page.tsx
import { useEffect, useState } from 'react';
import { usePolling } from '@/lib/use-polling';
import { Match } from '@/lib/football-api';
import { teamDisplayName, isFinished } from '@/lib/match-utils';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface MatchesResponse {
  matches: Match[];
}
interface PredictResponse {
  predictions: Record<string, string>;
}

function Crest({ team }: { team: { crest: string | null; name: string } | null }) {
  if (!team) {
    return <div className="h-5 w-5 rounded-full border border-dashed border-chalk/20" />;
  }
  if (team.crest) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.crest} alt={team.name} className="h-5 w-5 object-contain" />;
  }
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-chalk/10 text-[8px] font-bold text-chalk/60">
      {team.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function pickLabel(pick: string, m: Match) {
  if (pick === 'HOME') return teamDisplayName(m.homeTeam);
  if (pick === 'AWAY') return teamDisplayName(m.awayTeam);
  return 'Draw';
}

function actualResult(m: Match): 'HOME' | 'AWAY' | 'DRAW' | null {
  if (!isFinished(m)) return null;
  const h = m.score.fullTime.home ?? 0;
  const a = m.score.fullTime.away ?? 0;
  if (h > a) return 'HOME';
  if (a > h) return 'AWAY';
  return 'DRAW';
}

export default function PredictionPage() {
  const { data } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [loadingPreds, setLoadingPreds] = useState(true);

  useEffect(() => {
    fetch('/api/predict')
      .then((r) => r.json())
      .then((d: PredictResponse) => setPredictions(d.predictions || {}))
      .finally(() => setLoadingPreds(false));
  }, []);

  const matches = data?.matches ?? [];
  const predictedMatches = matches
    .filter((m) => predictions[String(m.id)])
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

  const settled = predictedMatches.filter((m) => isFinished(m));
  const correct = settled.filter((m) => actualResult(m) === predictions[String(m.id)]).length;

  return (
    <main>
      <PageHeader title="My Prediction" subtitle="Every pick you've made, tracked" />

      {settled.length > 0 && (
        <div className="mx-4 mb-4 rounded-xl border border-floodlight/30 bg-floodlight/10 px-4 py-3 text-center">
          <span className="font-score text-2xl font-bold text-floodlight">
            {correct}/{settled.length}
          </span>
          <p className="text-[11px] text-chalk/50">predictions correct so far</p>
        </div>
      )}

      <div className="space-y-2 px-4">
        {loadingPreds && <p className="py-8 text-center text-sm text-chalk/50">Loading your predictions…</p>}
        {!loadingPreds && predictedMatches.length === 0 && (
          <p className="py-8 text-center text-sm text-chalk/50">
            No predictions yet — head to the Home tab and pick a winner for the next match.
          </p>
        )}

        {predictedMatches.map((m) => {
          const pick = predictions[String(m.id)];
          const result = actualResult(m);
          const correctPick = result !== null && result === pick;
          const wrongPick = result !== null && result !== pick;
          return (
            <div key={m.id} className="rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-chalk/40">
                <span className="flex items-center gap-1.5">
                  <Crest team={m.homeTeam} />
                  {teamDisplayName(m.homeTeam)}
                  <span className="text-chalk/25">vs</span>
                  {teamDisplayName(m.awayTeam)}
                  <Crest team={m.awayTeam} />
                </span>
                {result && (
                  <span className={correctPick ? 'text-floodlight' : 'text-goal'}>
                    {correctPick ? '✓ Correct' : '✗ Missed'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-chalk/90">
                  Your pick: <strong>{pickLabel(pick, m)}</strong>
                </span>
                {isFinished(m) && (
                  <span className="font-score text-sm text-chalk/60">
                    {m.score.fullTime.home}–{m.score.fullTime.away}
                  </span>
                )}
                {!isFinished(m) && <span className="text-xs text-chalk/30">Not played yet</span>}
              </div>
            </div>
          );
        })}
      </div>

      <Footer />
    </main>
  );
}
