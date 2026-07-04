'use client';
// app/games/page.tsx
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

const GAMES = [
  {
    href: '/games/penalty',
    title: 'Penalty Shootout',
    description: 'Time your shot perfectly. Hit the crosshair at the right moment to score.',
    emoji: '🥅',
    color: 'from-goal/20 to-goal/5',
    border: 'border-goal/30',
  },
  {
    href: '/games/keepie-uppie',
    title: 'Keepie-Uppie',
    description: 'Tap the ball to keep it in the air. Don\'t let it drop!',
    emoji: '🏃',
    color: 'from-floodlight/20 to-floodlight/5',
    border: 'border-floodlight/30',
  },
  {
    href: '/games/freekick',
    title: 'Free Kick',
    description: 'Nail the direction and power. Beat the wall and the keeper.',
    emoji: '💥',
    color: 'from-pitch-light/20 to-pitch-light/5',
    border: 'border-pitch-light/30',
  },
];

export default function GamesPage() {
  return (
    <main>
      <PageHeader title="Games" subtitle="Play solo or challenge friends" />

      <div className="space-y-4 px-4">
        {GAMES.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className={`block rounded-2xl border ${game.border} bg-gradient-to-br ${game.color} p-5 transition-transform active:scale-95`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-4xl">{game.emoji}</span>
              <div>
                <h2 className="font-display text-2xl uppercase text-chalk">{game.title}</h2>
                <p className="text-xs text-chalk/60">{game.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-chalk/50">Tap to play →</span>
              <span className="rounded-full border border-chalk/20 px-3 py-1 text-[11px] text-chalk/50">
                Leaderboard inside
              </span>
            </div>
          </Link>
        ))}

        <div className="rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3 text-center text-xs text-chalk/40">
          Scores are saved to the leaderboard automatically. Make sure you&apos;ve set your name on the homepage first!
        </div>
      </div>

      <Footer />
    </main>
  );
}
