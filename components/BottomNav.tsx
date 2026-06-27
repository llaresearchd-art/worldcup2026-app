'use client';
// components/BottomNav.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Home', icon: '⚽' },
  { href: '/result', label: 'Results', icon: '🏁' },
  { href: '/schedule', label: 'Schedule', icon: '🗓' },
  { href: '/road-to-final', label: 'Bracket', icon: '🏆' },
  { href: '/my-teams', label: 'My Teams', icon: '★' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-pitch-mid/30 bg-pitch-dark/95 backdrop-blur-sm">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-body transition-colors ${
                  active ? 'text-floodlight' : 'text-chalk/50'
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
