'use client';
// app/games/keepie-uppie/page.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

interface Ball { x: number; y: number; vx: number; vy: number; }
type Phase = 'intro' | 'playing' | 'dead';

function useGameLeaderboard() {
  const [board, setBoard] = useState<{ name: string; score: number }[]>([]);
  const [myBest, setMyBest] = useState(0);
  const fetchBoard = useCallback(() => {
    fetch('/api/game-score?game=keepie-uppie')
      .then(r => r.json())
      .then(d => { setBoard(d.leaderboard || []); setMyBest(d.myBest || 0); })
      .catch(() => {});
  }, []);
  useEffect(() => { fetchBoard(); }, [fetchBoard]);
  const submit = useCallback(async (score: number) => {
    await fetch('/api/game-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'keepie-uppie', score }),
    });
    fetchBoard();
  }, [fetchBoard]);
  return { board, myBest, submit };
}

const GRAVITY = 0.35;
const BALL_SIZE = 48;

export default function KeepieUppiePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [ball, setBall] = useState<Ball>({ x: 50, y: 30, vx: 1.5, vy: 0 });
  const [touches, setTouches] = useState(0);
  const [showPulse, setShowPulse] = useState(false);
  const animRef = useRef<number>();
  const ballRef = useRef(ball);
  const phaseRef = useRef(phase);
  const touchesRef = useRef(0);
  const { board, myBest, submit } = useGameLeaderboard();

  ballRef.current = ball;
  phaseRef.current = phase;

  const die = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPhase('dead');
    submit(touchesRef.current);
  }, [submit]);

  const startGame = useCallback(() => {
    touchesRef.current = 0;
    setTouches(0);
    setBall({ x: 50, y: 25, vx: 1.5 + Math.random(), vy: 2 });
    setPhase('playing');
  }, []);

  // Physics loop
  useEffect(() => {
    if (phase !== 'playing') return;

    const tick = () => {
      setBall(prev => {
        const speed = 1 + Math.min(touchesRef.current * 0.008, 1.2);
        let { x, y, vx, vy } = prev;
        vy += GRAVITY * speed;
        x += vx * speed;
        y += vy * speed;

        // Bounce off walls
        if (x <= 3) { x = 3; vx = Math.abs(vx); }
        if (x >= 93) { x = 93; vx = -Math.abs(vx); }

        // Fell off bottom = dead
        if (y > 110) {
          requestAnimationFrame(() => die());
          return prev;
        }

        return { x, y, vx, vy };
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, die]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'playing') return;
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    let tapX: number, tapY: number;
    if ('touches' in e && e.touches.length > 0) {
      tapX = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      tapY = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
    } else if ('clientX' in e) {
      tapX = ((e.clientX - rect.left) / rect.width) * 100;
      tapY = ((e.clientY - rect.top) / rect.height) * 100;
    } else return;

    const bx = ballRef.current.x;
    const by = ballRef.current.y;
    const dist = Math.hypot(tapX - bx, tapY - by);

    // Hit if tap is within ~12% of ball center
    if (dist < 12) {
      touchesRef.current += 1;
      setTouches(t => t + 1);
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 200);

      // Kick ball upward with a bit of horizontal variation
      const angle = (Math.random() - 0.5) * 0.8;
      setBall(prev => ({
        ...prev,
        vy: -(8 + Math.random() * 3),
        vx: prev.vx * 0.7 + angle,
      }));
    }
  }, [phase]);

  const scoreLabel = (s: number) => {
    if (s >= 100) return '🏆 Legend!';
    if (s >= 50) return '⭐ Amazing!';
    if (s >= 20) return '👍 Nice!';
    if (s >= 10) return '😊 Good start!';
    return '😅 Keep trying!';
  };

  return (
    <main className="pb-28">
      <div className="flex items-center gap-2 px-4 pt-4">
        <Link href="/games" className="text-xs font-medium text-floodlight">← Games</Link>
      </div>
      <PageHeader title="Keepie-Uppie" subtitle="Tap the ball before it hits the ground!" />

      <div className="px-4 space-y-4">
        {phase === 'intro' && (
          <div className="rounded-2xl border border-floodlight/30 bg-floodlight/10 p-6 text-center">
            <p className="text-6xl mb-3">⚽</p>
            <p className="text-chalk/70 text-sm mb-4">
              Tap the ball to keep it in the air. It gets faster as your score grows. Don&apos;t let it hit the ground!
            </p>
            <button onClick={startGame} className="w-full rounded-xl bg-floodlight py-3 font-display text-2xl uppercase text-ink tracking-wide">
              Start!
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-score text-3xl font-bold text-chalk">{touches}</span>
              <span className="text-xs text-chalk/50">touches</span>
              {myBest > 0 && <span className="text-xs text-chalk/40">Best: {myBest}</span>}
            </div>

            <div
              ref={containerRef}
              onMouseDown={handleTap}
              onTouchStart={handleTap}
              className="relative w-full rounded-2xl overflow-hidden border border-chalk/10 bg-gradient-to-b from-pitch to-pitch-dark select-none cursor-pointer"
              style={{ height: 380 }}
            >
              {/* Grass lines */}
              {[...Array(4)].map((_, i) => (
                <div key={i} className="absolute w-full border-t border-pitch-light/10"
                  style={{ top: `${20 + i * 20}%` }} />
              ))}

              {/* Ball */}
              <div
                className={`absolute text-4xl -translate-x-1/2 -translate-y-1/2 transition-none select-none pointer-events-none
                  ${showPulse ? 'scale-125' : 'scale-100'}`}
                style={{
                  left: `${ball.x}%`,
                  top: `${ball.y}%`,
                  transition: showPulse ? 'transform 0.1s' : 'none',
                  fontSize: BALL_SIZE,
                }}
              >
                ⚽
              </div>

              {/* Tap hint on start */}
              {touches === 0 && (
                <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
                  <p className="text-xs text-chalk/30 animate-pulse">Tap the ball!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'dead' && (
          <div className="rounded-2xl border border-chalk/20 bg-pitch-dark/60 p-6 text-center">
            <p className="text-5xl mb-2">⚽</p>
            <h2 className="font-display text-3xl uppercase text-chalk mb-1">{touches} Touches</h2>
            <p className="text-sm text-chalk/60 mb-2">{scoreLabel(touches)}</p>
            {touches > myBest && touches > 0 && (
              <p className="text-xs text-floodlight mb-4">🎉 New personal best!</p>
            )}
            <button
              onClick={startGame}
              className="w-full rounded-xl bg-floodlight py-3 font-display text-xl uppercase text-ink tracking-wide mb-3"
            >
              Try Again
            </button>
            <Link href="/games" className="block text-sm text-chalk/50">← Back to Games</Link>
          </div>
        )}

        {/* Leaderboard */}
        {board.length > 0 && (
          <div className="rounded-xl border border-chalk/10 bg-pitch-dark/30 p-4">
            <h3 className="font-display text-lg uppercase text-chalk mb-3">Top Players</h3>
            <div className="space-y-2">
              {board.slice(0, 5).map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-center text-sm">{['🥇','🥈','🥉'][i] ?? `${i+1}.`}</span>
                  <span className="flex-1 text-sm text-chalk/80">{row.name}</span>
                  <span className="font-score text-sm font-bold text-chalk">{row.score}</span>
                </div>
              ))}
            </div>
            {myBest > 0 && <p className="mt-3 text-center text-xs text-chalk/40">Your best: {myBest} touches</p>}
          </div>
        )}
      </div>
    </main>
  );
}
