'use client';
// components/TopLinks.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/squad', label: 'Squads' },
  { href: '/top-scorers', label: 'Top Scorers' },
  { href: '/prediction', label: 'My Prediction' },
];

export default function TopLinks() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active
                ? 'border-floodlight bg-floodlight text-ink'
                : 'border-chalk/20 text-chalk/70 hover:border-chalk/40'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
