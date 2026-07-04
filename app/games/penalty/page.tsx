'use client';
// app/games/penalty/page.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

type Phase = 'intro' | 'aiming' | 'shooting' | 'result' | 'gameover';

interface ScoreRow { name: string; score: number; }

const TOTAL_SHOTS = 5;
const GOAL_ZONES = [
  { id: 'top-left', x: 15, y: 20, label: 'Top Left' },
  { id: 'top-right', x: 75, y: 20, label: 'Top Right' },
  { id: 'mid-left', x: 15, y: 55, label: 'Mid Left' },
  { id: 'mid-right', x: 75, y: 55, label: 'Mid Right' },
  { id: 'center', x: 45, y: 55, label: 'Centre' },
];

function useGameLeaderboard() {
  const [board, setBoard] = useState<ScoreRow[]>([]);
  const [myBest, setMyBest] = useState(0);
  const fetch_ = useCallback(() => {
    fetch('/api/game-score?game=penalty')
      .then(r => r.json())
      .then(d => { setBoard(d.leaderboard || []); setMyBest(d.myBest || 0); })
      .catch(() => {});
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  const submit = useCallback(async (score: number) => {
    await fetch('/api/game-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'penalty', score }),
    });
    fetch_();
  }, [fetch_]);
  return { board, myBest, submit };
}

export default function PenaltyPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [shot, setShot] = useState(0);
  const [goals, setGoals] = useState(0);
  const [crosshairX, setCrosshairX] = useState(50);
  const [crosshairY, setCrosshairY] = useState(50);
  const [lastResult, setLastResult] = useState<'goal' | 'miss' | null>(null);
  const [keeperSide, setKeeperSide] = useState<'left' | 'right' | 'center'>('center');
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const [showBall, setShowBall] = useState(false);
  const animRef = useRef<number>();
  const dirRef = useRef({ dx: 1.8, dy: 1.2 });
  const { board, myBest, submit } = useGameLeaderboard();

  const startAiming = useCallback(() => {
    setCrosshairX(50);
    setCrosshairY(50);
    dirRef.current = { dx: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random()), dy: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random()) };
    setLastResult(null);
    setShowBall(false);
    setBallPos(null);
    setKeeperSide('center');
    setPhase('aiming');
  }, []);

  // Animate crosshair
  useEffect(() => {
    if (phase !== 'aiming') return;
    const speed = 1 + shot * 0.3; // gets faster each shot
    const tick = () => {
      setCrosshairX(x => {
        let nx = x + dirRef.current.dx * speed;
        if (nx <= 5 || nx >= 95) { dirRef.current.dx *= -1; nx = Math.max(5, Math.min(95, nx)); }
        return nx;
      });
      setCrosshairY(y => {
        let ny = y + dirRef.current.dy * speed;
        if (ny <= 5 || ny >= 85) { dirRef.current.dy *= -1; ny = Math.max(5, Math.min(85, ny)); }
        return ny;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, shot]);

  const shoot = useCallback(() => {
    if (phase !== 'aiming') return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPhase('shooting');

    // Keeper dives based on crosshair position
    const keeper = crosshairX < 35 ? 'right' : crosshairX > 65 ? 'left' : 'center';
    setKeeperSide(keeper);
    setBallPos({ x: crosshairX, y: crosshairY });
    setShowBall(true);

    // Score if crosshair is in a decent spot and keeper dives wrong
    const inGoal = crosshairY < 80; // must be in goal area
    const saved = keeper === (crosshairX < 35 ? 'left' : crosshairX > 65 ? 'right' : 'center');
    const scored = inGoal && !saved;

    setTimeout(() => {
      setLastResult(scored ? 'goal' : 'miss');
      const newGoals = scored ? goals + 1 : goals;
      const newShot = shot + 1;

      setTimeout(() => {
        if (newShot >= TOTAL_SHOTS) {
          setGoals(newGoals);
          setShot(newShot);
          submit(newGoals);
          setPhase('gameover');
        } else {
          setGoals(newGoals);
          setShot(newShot);
          startAiming();
        }
      }, 1200);
    }, 600);
  }, [phase, crosshairX, crosshairY, goals, shot, startAiming, submit]);

  return (
    <main className="pb-28">
      <div className="flex items-center gap-2 px-4 pt-4">
        <Link href="/games" className="text-xs font-medium text-floodlight">← Games</Link>
      </div>
      <PageHeader title="Penalty Shootout" subtitle="Tap SHOOT when the crosshair is on target" />

      <div className="px-4 space-y-4">
        {phase === 'intro' && (
          <div className="rounded-2xl border border-goal/30 bg-goal/10 p-6 text-center">
            <p className="text-5xl mb-3">🥅</p>
            <p className="text-chalk/70 text-sm mb-4">
              A crosshair sweeps across the goal. Tap <strong>SHOOT</strong> when it&apos;s where you want to place the ball. The keeper will dive — can you outsmart them?
            </p>
            <p className="text-xs text-chalk/40 mb-6">{TOTAL_SHOTS} shots per round. Gets faster each shot.</p>
            <button onClick={startAiming} className="w-full rounded-xl bg-goal py-3 font-display text-xl uppercase text-chalk tracking-wide">
              Start Shootout
            </button>
          </div>
        )}

        {(phase === 'aiming' || phase === 'shooting') && (
          <div>
            {/* Score tracker */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-1">
                {Array.from({ length: TOTAL_SHOTS }).map((_, i) => (
                  <span key={i} className={`text-lg ${i < goals ? '⚽' : i < shot ? '❌' : '○'}`}>
                    {i < goals ? '⚽' : i < shot ? '❌' : '○'}
                  </span>
                ))}
              </div>
              <span className="font-score text-sm text-chalk/60">Shot {shot + 1}/{TOTAL_SHOTS}</span>
            </div>

            {/* Goal */}
            <div
              className="relative w-full rounded-xl overflow-hidden border-2 border-chalk/20 bg-pitch"
              style={{ height: 240 }}
            >
              {/* Goal posts */}
              <div className="absolute inset-0 flex flex-col">
                <div className="border-b-2 border-chalk/60 w-full" style={{ height: '80%' }} />
              </div>
              <div className="absolute left-0 top-0 bottom-[20%] w-1 bg-chalk/60" />
              <div className="absolute right-0 top-0 bottom-[20%] w-1 bg-chalk/60" />

              {/* Net lines */}
              {[...Array(6)].map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-t border-chalk/10"
                  style={{ top: `${(i + 1) * 13}%` }} />
              ))}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute top-0 border-l border-chalk/10"
                  style={{ left: `${(i + 1) * 11}%`, height: '80%' }} />
              ))}

              {/* Crosshair */}
              {phase === 'aiming' && (
                <div
                  className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${crosshairX}%`, top: `${crosshairY}%` }}
                >
                  <div className="absolute inset-0 border-2 border-floodlight rounded-full animate-ping opacity-60" />
                  <div className="absolute inset-0 border-2 border-floodlight rounded-full" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-floodlight -translate-x-1/2" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-floodlight -translate-y-1/2" />
                </div>
              )}

              {/* Ball */}
              {showBall && ballPos && (
                <div
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 text-xl transition-all duration-500"
                  style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
                >
                  ⚽
                </div>
              )}

              {/* Keeper */}
              <div
                className={`absolute bottom-[20%] text-3xl transition-all duration-300 -translate-x-1/2`}
                style={{
                  left: keeperSide === 'left' ? '15%' : keeperSide === 'right' ? '85%' : '50%',
                  transform: `translateX(-50%) ${keeperSide !== 'center' ? 'scaleX(' + (keeperSide === 'left' ? '-1' : '1') + ')' : ''}`,
                }}
              >
                🧤
              </div>

              {/* Result flash */}
              {lastResult && (
                <div className={`absolute inset-0 flex items-center justify-center text-4xl font-display uppercase tracking-widest
                  ${lastResult === 'goal' ? 'text-floodlight' : 'text-goal'} animate-slideUp`}>
                  {lastResult === 'goal' ? '⚽ GOAL!' : '❌ SAVED!'}
                </div>
              )}
            </div>

            {/* Shoot button */}
            {phase === 'aiming' && (
              <button
                onClick={shoot}
                className="mt-4 w-full rounded-xl bg-goal py-4 font-display text-2xl uppercase tracking-widest text-chalk active:scale-95 transition-transform"
              >
                SHOOT!
              </button>
            )}
          </div>
        )}

        {phase === 'gameover' && (
          <div className="rounded-2xl border border-floodlight/30 bg-floodlight/10 p-6 text-center">
            <p className="text-5xl mb-2">{goals >= 4 ? '🏆' : goals >= 2 ? '⚽' : '😅'}</p>
            <h2 className="font-display text-3xl uppercase text-chalk mb-1">
              {goals}/{TOTAL_SHOTS} Goals
            </h2>
            <p className="text-sm text-chalk/60 mb-2">
              {goals === TOTAL_SHOTS ? 'Perfect! Unstoppable!' : goals >= 4 ? 'Great shooting!' : goals >= 2 ? 'Not bad, keep practising!' : 'The keeper had your number today!'}
            </p>
            {goals > myBest && <p className="text-xs text-floodlight mb-4">🎉 New personal best!</p>}

            <button
              onClick={() => { setGoals(0); setShot(0); startAiming(); }}
              className="w-full rounded-xl bg-floodlight py-3 font-display text-xl uppercase text-ink tracking-wide mb-3"
            >
              Play Again
            </button>
            <Link href="/games" className="block text-sm text-chalk/50">← Back to Games</Link>
          </div>
        )}

        {/* Leaderboard */}
        {board.length > 0 && (
          <div className="rounded-xl border border-chalk/10 bg-pitch-dark/30 p-4">
            <h3 className="font-display text-lg uppercase text-chalk mb-3">Top Shooters</h3>
            <div className="space-y-2">
              {board.slice(0, 5).map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-center text-sm">{['🥇','🥈','🥉'][i] ?? `${i+1}.`}</span>
                  <span className="flex-1 text-sm text-chalk/80">{row.name}</span>
                  <span className="font-score text-sm font-bold text-chalk">{row.score}/{TOTAL_SHOTS}</span>
                </div>
              ))}
            </div>
            {myBest > 0 && <p className="mt-3 text-center text-xs text-chalk/40">Your best: {myBest}/{TOTAL_SHOTS}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
