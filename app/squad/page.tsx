'use client';
// app/squad/page.tsx
import { useState } from 'react';
import { usePolling } from '@/lib/use-polling';
import { TeamFull } from '@/lib/football-api';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface TeamsResponse {
  teams: TeamFull[];
}

const POSITION_ORDER = ['Goalkeeper', 'Defence', 'Midfield', 'Offence'];

export default function SquadPage() {
  const { data, loading, error } = usePolling<TeamsResponse>('/api/teams', 5 * 60_000);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const teams = (data?.teams ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const selected = teams.find((t) => t.id === selectedId) ?? null;

  return (
    <main>
      <PageHeader title="Squads" subtitle="All 48 teams · 2026 rosters" />

      {!selected && (
        <div className="grid grid-cols-3 gap-3 px-4">
          {loading && !data && (
            <p className="col-span-3 py-8 text-center text-sm text-chalk/50">Loading squads…</p>
          )}
          {error && !data && (
            <p className="col-span-3 py-8 text-center text-sm text-chalk/50">{error}</p>
          )}
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedId(team.id)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-chalk/10 bg-pitch-dark/30 px-2 py-3 transition-colors hover:border-floodlight/40"
            >
              {team.crest ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.crest} alt={team.name} className="h-9 w-9 object-contain" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-chalk/10 text-[10px] font-bold text-chalk/60">
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="line-clamp-2 text-center text-[10px] leading-tight text-chalk/70">
                {team.shortName || team.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="px-4">
          <button
            onClick={() => setSelectedId(null)}
            className="mb-4 text-xs font-medium text-floodlight"
          >
            ← All teams
          </button>

          <div className="mb-4 flex items-center gap-3">
            {selected.crest && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.crest} alt={selected.name} className="h-12 w-12 object-contain" />
            )}
            <div>
              <h2 className="font-display text-2xl uppercase text-chalk">{selected.name}</h2>
              {selected.venue && <p className="text-xs text-chalk/40">{selected.venue}</p>}
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-chalk/10 bg-pitch-dark/20 px-3 py-2 text-[11px] text-chalk/40">
            Club affiliations aren&apos;t available from the free data source this app
            uses — only name, position, and shirt number are shown below.
          </div>

          {POSITION_ORDER.map((pos) => {
            const players = selected.squad.filter((p) => p.position === pos);
            if (players.length === 0) return null;
            return (
              <div key={pos} className="mb-4">
                <h3 className="mb-1.5 text-[11px] uppercase tracking-widest text-chalk/40">{pos}</h3>
                <div className="space-y-1">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-lg border border-chalk/10 bg-pitch-dark/30 px-3 py-2"
                    >
                      <span className="w-6 text-center font-score text-xs text-chalk/40">
                        {p.shirtNumber ?? '–'}
                      </span>
                      <span className="flex-1 text-sm text-chalk/90">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {selected.squad.length === 0 && (
            <p className="py-6 text-center text-sm text-chalk/50">
              Squad list not published yet for this team — check back closer to kickoff.
            </p>
          )}
        </div>
      )}

      <Footer />
    </main>
  );
}
