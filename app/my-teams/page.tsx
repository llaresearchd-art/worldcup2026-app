'use client';
import { useEffect, useState, useCallback } from 'react';
import { usePolling } from '@/lib/use-polling';
import { Match, TeamFull } from '@/lib/football-api';
import { teamDisplayName, isFinished, isUpcoming, formatKickoff } from '@/lib/match-utils';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface MatchesResponse { matches: Match[]; }
interface TeamsResponse { teams: TeamFull[]; }
interface FavoritesResponse { teamIds: number[]; }
const MAX_FAVORITES = 4;

export default function MyTeamsPage() {
  const { data: matchData } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const { data: teamData, loading: teamsLoading } = usePolling<TeamsResponse>('/api/teams', 5 * 60_000);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/favorites').then(r => r.json()).then((d: FavoritesResponse) => {
      setFavoriteIds(d.teamIds || []);
      setEditing((d.teamIds || []).length === 0);
    }).finally(() => setLoaded(true));
  }, []);

  const saveFavorites = useCallback(async (ids: number[]) => {
    setFavoriteIds(ids);
    await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIds: ids }) });
  }, []);

  const toggleTeam = (id: number) => {
    if (favoriteIds.includes(id)) saveFavorites(favoriteIds.filter(t => t !== id));
    else if (favoriteIds.length < MAX_FAVORITES) saveFavorites([...favoriteIds, id]);
  };

  const teams = teamData?.teams ?? [];
  const matches = matchData?.matches ?? [];
  const favoriteTeams = teams.filter(t => favoriteIds.includes(t.id));

  return (
    <main className="page-enter">
      <PageHeader title="My Teams" subtitle={`Follow up to ${MAX_FAVORITES} teams`} />
      <div className="px-4">
        {loaded && favoriteIds.length > 0 && (
          <button onClick={() => setEditing(e => !e)} className="mb-4 text-xs font-semibold text-floodlight">
            {editing ? '← Done' : '✏️ Edit favorites'}
          </button>
        )}

        {editing && (
          <div className="mb-6">
            {favoriteIds.length === 0 && (
              <div className="mb-4 rounded-2xl border border-floodlight/20 bg-floodlight/8 px-4 py-3">
                <p className="text-sm font-semibold text-chalk">Pick your favorite teams</p>
                <p className="mt-0.5 text-xs text-chalk/50">Choose up to {MAX_FAVORITES} — see only their matches here.</p>
              </div>
            )}
            <p className="mb-2 text-[11px] text-chalk/40">{favoriteIds.length}/{MAX_FAVORITES} selected</p>
            <div className="grid grid-cols-4 gap-2">
              {teamsLoading && !teamData && <p className="col-span-4 py-4 text-center text-sm text-chalk/40">Loading teams…</p>}
              {teams.slice().sort((a, b) => a.name.localeCompare(b.name)).map(team => {
                const active = favoriteIds.includes(team.id);
                const disabled = !active && favoriteIds.length >= MAX_FAVORITES;
                return (
                  <button key={team.id} disabled={disabled} onClick={() => toggleTeam(team.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition-all active:scale-95
                      ${active ? 'border-floodlight bg-floodlight/10' : disabled ? 'border-chalk/5 opacity-20' : 'border-chalk/10 hover:border-chalk/20'}`}>
                    {team.crest
                      ? <img src={team.crest} alt={team.name} className="h-8 w-8 object-contain" />
                      : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pitch-mid/40 text-[9px] font-bold text-chalk/60">{team.name.slice(0,2).toUpperCase()}</div>}
                    <span className="line-clamp-1 text-center text-[9px] text-chalk/60">{team.shortName || team.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!editing && favoriteTeams.map(team => {
          const teamMatches = matches.filter(m => (m.homeTeam && m.homeTeam.id === team.id) || (m.awayTeam && m.awayTeam.id === team.id));
          const played = teamMatches.filter(isFinished);
          const upcoming = teamMatches.filter(isUpcoming);
          return (
            <div key={team.id} className="mb-5">
              <div className="mb-2.5 flex items-center gap-2.5">
                {team.crest && <img src={team.crest} alt={team.name} className="h-8 w-8 object-contain" />}
                <h2 className="font-display text-2xl uppercase text-gradient">{team.name}</h2>
              </div>
              {played.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {played.map(m => {
                    const isHome = m.homeTeam && m.homeTeam.id === team.id;
                    const opponent = isHome ? m.awayTeam : m.homeTeam;
                    const myScore = isHome ? m.score.fullTime.home : m.score.fullTime.away;
                    const oppScore = isHome ? m.score.fullTime.away : m.score.fullTime.home;
                    const won = (myScore ?? 0) > (oppScore ?? 0);
                    return (
                      <div key={m.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm
                        ${won ? 'border-floodlight/20 bg-floodlight/5' : 'border-chalk/8 bg-pitch-mid/10'}`}>
                        <div className="flex items-center gap-1.5">
                          {opponent?.crest && <img src={opponent.crest} alt="" className="h-5 w-5 object-contain" />}
                          <span className="text-chalk/70">vs {teamDisplayName(opponent)}</span>
                        </div>
                        <span className={`font-score font-bold ${won ? 'text-floodlight' : 'text-chalk/60'}`}>{myScore}–{oppScore}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {upcoming.length > 0 && (
                <div className="space-y-1.5">
                  {upcoming.map(m => {
                    const isHome = m.homeTeam && m.homeTeam.id === team.id;
                    const opponent = isHome ? m.awayTeam : m.homeTeam;
                    const { date, time } = formatKickoff(m.utcDate);
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border border-chalk/8 bg-pitch-mid/8 px-3 py-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          {opponent?.crest && <img src={opponent.crest} alt="" className="h-5 w-5 object-contain" />}
                          <span className="text-chalk/60">vs {teamDisplayName(opponent)}</span>
                        </div>
                        <span className="text-[11px] text-chalk/30">{date} {time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {played.length === 0 && upcoming.length === 0 && <p className="text-xs text-chalk/30">No fixtures found.</p>}
            </div>
          );
        })}

        {!editing && favoriteTeams.length === 0 && loaded && (
          <div className="rounded-2xl border border-chalk/8 bg-pitch-mid/10 p-8 text-center">
            <p className="text-3xl mb-2">★</p>
            <p className="text-sm font-medium text-chalk/60">No favorite teams yet</p>
            <button onClick={() => setEditing(true)} className="mt-3 rounded-xl border border-floodlight px-4 py-2 text-xs font-semibold text-floodlight">Pick your teams</button>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
