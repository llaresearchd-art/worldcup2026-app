'use client';
// app/games/freekick/page.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

type Phase = 'intro' | 'aiming' | 'power' | 'shooting' | 'result' | 'gameover';

function useGameLeaderboard() {
  const [board, setBoard] = useState<{ name: string; score: number }[]>([]);
  const [myBest, setMyBest] = useState(0);
  const fetchBoard = useCallback(() => {
    fetch('/api/game-score?game=freekick')
      .then(r => r.json())
      .then(d => { setBoard(d.leaderboard || []); setMyBest(d.myBest || 0); })
      .catch(() => {});
  }, []);
  useEffect(() => { fetchBoard(); }, [fetchBoard]);
  const submit = useCallback(async (score: number) => {
    await fetch('/api/game-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'freekick', score }),
    });
    fetchBoard();
  }, [fetchBoard]);
  return { board, myBest, submit };
}

const TOTAL_KICKS = 5;

export default function FreekickPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [kick, setKick] = useState(0);
  const [goals, setGoals] = useState(0);
  const [aimPos, setAimPos] = useState(50); // 0-100 horizontal
  const [powerPos, setPowerPos] = useState(50); // 0-100
  const [aimDir, setAimDir] = useState(1);
  const [powerDir, setPowerDir] = useState(1);
  const [keeperPos, setKeeperPos] = useState(50);
  const [keeperDir, setKeeperDir] = useState(1);
  const [lastResult, setLastResult] = useState<'goal' | 'miss' | 'saved' | null>(null);
  const [ballAnim, setBallAnim] = useState(false);
  const [wallJump, setWallJump] = useState(false);
  const aimRef = useRef<number>();
  const powerRef = useRef<number>();
  const keeperRef = useRef<number>();
  const { board, myBest, submit } = useGameLeaderboard();

  const startKick = useCallback(() => {
    setAimPos(50);
    setPowerPos(0);
    setAimDir(1);
    setPowerDir(1);
    setKeeperPos(50);
    setKeeperDir(1);
    setLastResult(null);
    setBallAnim(false);
    setWallJump(false);
    setPhase('aiming');
  }, []);

  // Aim bar animation
  useEffect(() => {
    if (phase !== 'aiming') return;
    const speed = 1.2 + kick * 0.25;
    const tick = () => {
      setAimPos(p => {
        let np = p + aimDir * speed;
        if (np >= 100) { np = 100; setAimDir(-1); }
        if (np <= 0) { np = 0; setAimDir(1); }
        return np;
      });
      aimRef.current = requestAnimationFrame(tick);
    };
    aimRef.current = requestAnimationFrame(tick);
    return () => { if (aimRef.current) cancelAnimationFrame(aimRef.current); };
  }, [phase, kick, aimDir]);

  // Keeper animation
  useEffect(() => {
    if (phase !== 'aiming' && phase !== 'power') return;
    const speed = 0.8 + kick * 0.15;
    const tick = () => {
      setKeeperPos(p => {
        let np = p + keeperDir * speed;
        if (np >= 85) { np = 85; setKeeperDir(-1); }
        if (np <= 15) { np = 15; setKeeperDir(1); }
        return np;
      });
      keeperRef.current = requestAnimationFrame(tick);
    };
    keeperRef.current = requestAnimationFrame(tick);
    return () => { if (keeperRef.current) cancelAnimationFrame(keeperRef.current); };
  }, [phase, kick, keeperDir]);

  const lockAim = useCallback(() => {
    if (phase !== 'aiming') return;
    if (aimRef.current) cancelAnimationFrame(aimRef.current);
    setPowerPos(0);
    setPhase('power');
    // Power bar bounces
    const speed = 1.5 + kick * 0.3;
    const pTick = () => {
      setPowerPos(p => {
        let np = p + speed;
        if (np >= 100) { np = 100; }
        return np;
      });
      powerRef.current = requestAnimationFrame(pTick);
    };
    powerRef.current = requestAnimationFrame(pTick);
  }, [phase, kick]);

  const shoot = useCallback(() => {
    if (phase !== 'power') return;
    if (powerRef.current) cancelAnimationFrame(powerRef.current);
    if (keeperRef.current) cancelAnimationFrame(keeperRef.current);

    const finalAim = aimPos;
    const finalPower = powerPos;
    const finalKeeper = keeperPos;

    setPhase('shooting');
    setBallAnim(true);
    setWallJump(true);
    setTimeout(() => setWallJump(false), 300);

    // Scoring logic
    const tooWeak = finalPower < 20;
    const tooStrong = finalPower > 95;
    const onTarget = finalAim > 10 && finalAim < 90;
    const keeperNearby = Math.abs(finalKeeper - finalAim) < 20;
    const scored = onTarget && !tooWeak && !tooStrong && !keeperNearby;
    const savedByKeeper = onTarget && !tooWeak && !tooStrong && keeperNearby;

    const result: 'goal' | 'miss' | 'saved' = scored ? 'goal' : savedByKeeper ? 'saved' : 'miss';

    setTimeout(() => {
      setLastResult(result);
      const newGoals = result === 'goal' ? goals + 1 : goals;
      const newKick = kick + 1;

      setTimeout(() => {
        if (newKick >= TOTAL_KICKS) {
          setGoals(newGoals);
          setKick(newKick);
          submit(newGoals);
          setPhase('gameover');
        } else {
          setGoals(newGoals);
          setKick(newKick);
          startKick();
        }
      }, 1200);
    }, 700);
  }, [phase, aimPos, powerPos, keeperPos, goals, kick, startKick, submit]);

  const powerColor = powerPos < 40 ? 'bg-floodlight' : powerPos < 75 ? 'bg-goal/70' : 'bg-goal';

  return (
    <main className="pb-28">
      <div className="flex items-center gap-2 px-4 pt-4">
        <Link href="/games" className="text-xs font-medium text-floodlight">← Games</Link>
      </div>
      <PageHeader title="Free Kick" subtitle="Lock aim, then shoot with perfect power" />

      <div className="px-4 space-y-4">
        {phase === 'intro' && (
          <div className="rounded-2xl border border-pitch-light/40 bg-pitch-light/10 p-6 text-center">
            <p className="text-6xl mb-3">💥</p>
            <p className="text-chalk/70 text-sm mb-6">
              Two taps to score. First — tap to lock your <strong>aim</strong> (left/right). Then tap to choose your <strong>power</strong>. Beat the keeper!
            </p>
            <button onClick={startKick} className="w-full rounded-xl bg-pitch-light py-3 font-display text-2xl uppercase text-chalk tracking-wide">
              Take Free Kick
            </button>
          </div>
        )}

        {(phase === 'aiming' || phase === 'power' || phase === 'shooting') && (
          <div className="space-y-3">
            {/* Score row */}
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {Array.from({ length: TOTAL_KICKS }).map((_, i) => (
                  <span key={i} className="text-lg">
                    {i < goals ? '⚽' : i < kick ? '❌' : '○'}
                  </span>
                ))}
              </div>
              <span className="font-score text-sm text-chalk/60">Kick {kick + 1}/{TOTAL_KICKS}</span>
            </div>

            {/* Goal view */}
            <div className="relative w-full rounded-xl overflow-hidden border-2 border-chalk/20 bg-pitch" style={{ height: 220 }}>
              {/* Net */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-t border-chalk/10" style={{ top: `${(i + 1) * 14}%` }} />
              ))}
              {[...Array(7)].map((_, i) => (
                <div key={i} className="absolute top-0 border-l border-chalk/10" style={{ left: `${(i + 1) * 12}%`, height: '80%' }} />
              ))}
              {/* Posts */}
              <div className="absolute left-0 top-0 bottom-[20%] w-1 bg-chalk/80" />
              <div className="absolute right-0 top-0 bottom-[20%] w-1 bg-chalk/80" />
              <div className="absolute left-0 right-0 border-b-2 border-chalk/80" style={{ top: '80%' }} />

              {/* Wall */}
              <div className={`absolute bottom-[20%] left-1/2 -translate-x-1/2 flex gap-0.5 transition-transform duration-300 ${wallJump ? '-translate-y-6' : ''}`}>
                {['🧍','🧍','🧍'].map((p, i) => (
                  <span key={i} className="text-2xl leading-none">{p}</span>
                ))}
              </div>

              {/* Keeper */}
              <div
                className="absolute bottom-[20%] text-3xl -translate-x-1/2 transition-all duration-150"
                style={{ left: `${keeperPos}%` }}
              >
                🧤
              </div>

              {/* Aim indicator */}
              {(phase === 'aiming' || phase === 'power') && (
                <div
                  className="absolute bottom-[18%] w-1 bg-floodlight/80 rounded-full transition-all duration-75"
                  style={{ left: `${aimPos}%`, height: '6px' }}
                />
              )}

              {/* Ball flying */}
              {ballAnim && (
                <div
                  className="absolute text-2xl transition-all duration-700 ease-in"
                  style={{
                    left: `${aimPos}%`,
                    bottom: phase === 'shooting' ? '60%' : '5%',
                    transform: 'translateX(-50%)',
                    opacity: phase === 'shooting' ? 0.3 : 1,
                  }}
                >
                  ⚽
                </div>
              )}

              {/* Result */}
              {lastResult && (
                <div className={`absolute inset-0 flex items-center justify-center font-display text-3xl uppercase tracking-widest animate-slideUp
                  ${lastResult === 'goal' ? 'text-floodlight' : 'text-goal'}`}>
                  {lastResult === 'goal' ? '⚽ GOAL!' : lastResult === 'saved' ? '🧤 SAVED!' : '❌ OFF TARGET!'}
                </div>
              )}
            </div>

            {/* Aim bar */}
            <div>
              <div className="flex justify-between text-[10px] text-chalk/40 mb-1">
                <span>LEFT</span>
                <span className="font-medium text-chalk/70">{phase === 'aiming' ? 'TAP TO LOCK AIM' : `Aim: ${aimPos < 35 ? 'Left' : aimPos > 65 ? 'Right' : 'Centre'}`}</span>
                <span>RIGHT</span>
              </div>
              <div className="relative h-3 rounded-full bg-chalk/10 overflow-hidden">
                <div className="absolute top-0 bottom-0 w-2 rounded-full bg-floodlight transition-none" style={{ left: `${aimPos}%` }} />
              </div>
            </div>

            {/* Power bar */}
            {phase === 'power' && (
              <div>
                <div className="flex justify-between text-[10px] text-chalk/40 mb-1">
                  <span>WEAK</span>
                  <span className="font-medium text-chalk/70">TAP TO SHOOT</span>
                  <span>MAX</span>
                </div>
                <div className="relative h-4 rounded-full bg-chalk/10 overflow-hidden">
                  <div className={`absolute top-0 bottom-0 left-0 rounded-full transition-none ${powerColor}`}
                    style={{ width: `${powerPos}%` }} />
                </div>
              </div>
            )}

            {/* Action button */}
            {phase === 'aiming' && (
              <button onClick={lockAim}
                className="w-full rounded-xl bg-floodlight py-4 font-display text-2xl uppercase tracking-widest text-ink active:scale-95 transition-transform">
                LOCK AIM
              </button>
            )}
            {phase === 'power' && (
              <button onClick={shoot}
                className="w-full rounded-xl bg-goal py-4 font-display text-2xl uppercase tracking-widest text-chalk active:scale-95 transition-transform">
                SHOOT!
              </button>
            )}
          </div>
        )}

        {phase === 'gameover' && (
          <div className="rounded-2xl border border-floodlight/30 bg-floodlight/10 p-6 text-center">
            <p className="text-5xl mb-2">{goals >= 4 ? '🏆' : goals >= 2 ? '💥' : '😅'}</p>
            <h2 className="font-display text-3xl uppercase text-chalk mb-1">{goals}/{TOTAL_KICKS} Goals</h2>
            <p className="text-sm text-chalk/60 mb-2">
              {goals === TOTAL_KICKS ? 'World class free kick specialist!' : goals >= 4 ? 'Brilliant technique!' : goals >= 2 ? 'Decent effort!' : 'Back to the training ground!'}
            </p>
            {goals > myBest && <p className="text-xs text-floodlight mb-4">🎉 New personal best!</p>}
            <button
              onClick={() => { setGoals(0); setKick(0); startKick(); }}
              className="w-full rounded-xl bg-floodlight py-3 font-display text-xl uppercase text-ink tracking-wide mb-3"
            >
              Try Again
            </button>
            <Link href="/games" className="block text-sm text-chalk/50">← Back to Games</Link>
          </div>
        )}

        {board.length > 0 && (
          <div className="rounded-xl border border-chalk/10 bg-pitch-dark/30 p-4">
            <h3 className="font-display text-lg uppercase text-chalk mb-3">Top Free Kick Takers</h3>
            <div className="space-y-2">
              {board.slice(0, 5).map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-center text-sm">{['🥇','🥈','🥉'][i] ?? `${i+1}.`}</span>
                  <span className="flex-1 text-sm text-chalk/80">{row.name}</span>
                  <span className="font-score text-sm font-bold text-chalk">{row.score}/{TOTAL_KICKS}</span>
                </div>
              ))}
            </div>
            {myBest > 0 && <p className="mt-3 text-center text-xs text-chalk/40">Your best: {myBest}/{TOTAL_KICKS}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
