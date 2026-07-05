'use client';
// app/games/keepie-uppie/page.tsx
import { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';

export default function KeepieUppiePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [myBest, setMyBest] = useState(0);
  const [board, setBoard] = useState<{ name: string; score: number }[]>([]);
  const [justScored, setJustScored] = useState<number | null>(null);

  const fetchBoard = useCallback(() => {
    fetch('/api/game-score?game=keepie-uppie')
      .then(r => r.json())
      .then(d => {
        setBoard(d.leaderboard || []);
        setMyBest(d.myBest || 0);
        // Send high score into the game
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'SET_HIGH_SCORE', score: d.myBest || 0 },
          '*'
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type !== 'GAME_SCORE' || e.data?.game !== 'keepie-uppie') return;
      const score = e.data.score;
      setJustScored(score);
      await fetch('/api/game-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'keepie-uppie', score }),
      });
      fetchBoard();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchBoard]);

  return (
    <div className="flex flex-col h-screen bg-pitch-deep">
      {/* Slim top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-pitch-deep/90 border-b border-chalk/10 z-10 flex-shrink-0">
        <Link href="/games" className="text-xs font-medium text-floodlight">← Games</Link>
        <span className="font-display text-sm uppercase tracking-widest text-chalk/60">Keepie-Uppie</span>
        {myBest > 0 && (
          <span className="font-score text-xs text-floodlight">Best: {myBest}</span>
        )}
      </div>

      {/* Game iframe — fills remaining space */}
      <iframe
        ref={iframeRef}
        src="/games/keepie-uppie.html"
        className="flex-1 w-full border-none"
        title="Keepie-Uppie Game"
        allow="autoplay"
        scrolling="no"
      />

      {/* Leaderboard pill — slides up after a score */}
      {board.length > 0 && (
        <div className="flex-shrink-0 bg-pitch-deep/95 border-t border-chalk/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-widest text-chalk/30 mb-2">Top Players</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-none">
            {board.slice(0, 5).map((row, i) => (
              <div key={i} className="flex-shrink-0 text-center">
                <p className="text-base">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</p>
                <p className="text-[11px] font-semibold text-chalk/80 mt-0.5 max-w-[60px] truncate">{row.name}</p>
                <p className="font-score text-sm font-bold text-floodlight">{row.score}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

