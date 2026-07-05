'use client';
// components/BottomNav.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Home', icon: '⚽' },
  { href: '/games', label: 'Games', icon: '🎮' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/road-to-final', label: 'Bracket', icon: '📊' },
  { href: '/my-teams', label: 'My Teams', icon: '★' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-pitch-deep/95 backdrop-blur-md"
      style={{ borderTop: '1px solid rgba(244,163,0,0.12)' }}>
      {/* Gold top line — stadium scoreboard edge */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,163,0,0.3), transparent)' }} />
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all duration-200
                  ${active ? 'text-floodlight' : 'text-chalk/40 hover:text-chalk/60'}`}
              >
                {/* Spotlight beam from below when active */}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-8 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at bottom, rgba(244,163,0,0.2) 0%, transparent 70%)' }} />
                )}
                {/* Active indicator pill at top */}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-floodlight" />
                )}
                <span className={`text-xl leading-none transition-transform duration-200 ${active ? 'scale-110' : ''}`} aria-hidden>
                  {tab.icon}
                </span>
                <span className="tracking-wide">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {/* Safe area for phones with home indicator */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}
