'use client';
import { useState } from 'react';
import { usePolling } from '@/lib/use-polling';
import { TeamFull } from '@/lib/football-api';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface TeamsResponse { teams: TeamFull[]; }
const POSITION_ORDER = ['Goalkeeper','Defence','Midfield','Offence'];

export default function SquadPage() {
  const { data, loading } = usePolling<TeamsResponse>('/api/teams', 5 * 60_000);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const teams = (data?.teams ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const selected = teams.find(t => t.id === selectedId) ?? null;

  return (
    <main className="page-enter">
      <PageHeader title="Squads" subtitle="All 48 teams · 2026 rosters" />
      {!selected && (
        <div className="grid grid-cols-3 gap-2.5 px-4">
          {loading && !data && <p className="col-span-3 py-8 text-center text-sm text-chalk/40">Loading squads…</p>}
          {teams.map(team => (
            <button key={team.id} onClick={() => setSelectedId(team.id)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-chalk/8 bg-pitch-mid/10 px-2 py-3.5 transition-all active:scale-95 hover:border-floodlight/30 card-interactive">
              {team.crest
                ? <img src={team.crest} alt={team.name} className="h-10 w-10 object-contain drop-shadow" />
                : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pitch-mid/60 text-[10px] font-bold text-chalk/60">{team.name.slice(0,2).toUpperCase()}</div>}
              <span className="line-clamp-2 text-center text-[10px] leading-tight text-chalk/60">{team.shortName || team.name}</span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="px-4">
          <button onClick={() => setSelectedId(null)} className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-floodlight">
            ← All teams
          </button>
          <div className="mb-5 flex items-center gap-3">
            {selected.crest && <img src={selected.crest} alt={selected.name} className="h-14 w-14 object-contain drop-shadow-lg" />}
            <div>
              <h2 className="font-display text-3xl uppercase text-gradient">{selected.name}</h2>
              {selected.venue && <p className="text-xs text-chalk/30">{selected.venue}</p>}
            </div>
          </div>
          {POSITION_ORDER.map(pos => {
            const players = selected.squad.filter(p => p.position === pos);
            if (players.length === 0) return null;
            return (
              <div key={pos} className="mb-4">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-chalk/30">{pos}</h3>
                <div className="space-y-1.5">
                  {players.map(p => (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl border border-chalk/8 bg-pitch-mid/10 px-3 py-2.5">
                      <span className="w-6 text-center font-score text-xs font-bold text-chalk/30">{p.shirtNumber ?? '–'}</span>
                      <span className="flex-1 text-sm font-medium text-chalk/80">{p.name}</span>
                      <span className="text-[10px] text-chalk/30">{p.nationality}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {selected.squad.length === 0 && <p className="py-6 text-center text-sm text-chalk/40">Squad list not available yet.</p>}
        </div>
      )}
      <Footer />
    </main>
  );
}
