'use client';
// app/my-teams/page.tsx
import { useEffect, useState, useCallback } from 'react';
import { usePolling } from '@/lib/use-polling';
import { Match, TeamFull } from '@/lib/football-api';
import { teamDisplayName, isFinished, isUpcoming, formatKickoff } from '@/lib/match-utils';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface MatchesResponse {
  matches: Match[];
}
interface TeamsResponse {
  teams: TeamFull[];
}
interface FavoritesResponse {
  teamIds: number[];
}

const MAX_FAVORITES = 4;

export default function MyTeamsPage() {
  const { data: matchData } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const { data: teamData, loading: teamsLoading } = usePolling<TeamsResponse>('/api/teams', 5 * 60_000);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/favorites')
      .then((r) => r.json())
      .then((d: FavoritesResponse) => {
        setFavoriteIds(d.teamIds || []);
        setEditing((d.teamIds || []).length === 0);
      })
      .finally(() => setLoaded(true));
  }, []);

  const saveFavorites = useCallback(async (ids: number[]) => {
    setFavoriteIds(ids);
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamIds: ids }),
    });
  }, []);

  const toggleTeam = (id: number) => {
    if (favoriteIds.includes(id)) {
      saveFavorites(favoriteIds.filter((t) => t !== id));
    } else if (favoriteIds.length < MAX_FAVORITES) {
      saveFavorites([...favoriteIds, id]);
    }
  };

  const teams = teamData?.teams ?? [];
  const matches = matchData?.matches ?? [];
  const favoriteTeams = teams.filter((t) => favoriteIds.includes(t.id));

  return (
    <main>
      <PageHeader title="My Teams" subtitle={`Pick up to ${MAX_FAVORITES} teams to follow`} />

      <div className="px-4">
        {loaded && favoriteIds.length > 0 && (
          <button
            onClick={() => setEditing((e) => !e)}
            className="mb-4 text-xs font-medium text-floodlight"
          >
            {editing ? 'Done editing' : 'Edit favorites'}
          </button>
        )}

        {editing && (
          <div className="mb-6">
            <p className="mb-2 text-[11px] text-chalk/50">
              {favoriteIds.length}/{MAX_FAVORITES} selected
            </p>
            <div className="grid grid-cols-4 gap-2">
              {teamsLoading && !teamData && (
                <p className="col-span-4 py-4 text-center text-sm text-chalk/50">Loading teams…</p>
              )}
              {teams
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((team) => {
                  const active = favoriteIds.includes(team.id);
                  const disabled = !active && favoriteIds.length >= MAX_FAVORITES;
                  return (
                    <button
                      key={team.id}
                      disabled={disabled}
                      onClick={() => toggleTeam(team.id)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors ${
                        active
                          ? 'border-floodlight bg-floodlight/10'
                          : disabled
                          ? 'border-chalk/5 opacity-30'
                          : 'border-chalk/10'
                      }`}
                    >
                      {team.crest ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.crest} alt={team.name} className="h-7 w-7 object-contain" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-chalk/10 text-[9px] font-bold text-chalk/60">
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="line-clamp-1 text-[9px] text-chalk/60">
                        {team.shortName || team.name}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {!editing &&
          favoriteTeams.map((team) => {
            const teamMatches = matches.filter(
              (m) => m.homeTeam.id === team.id || m.awayTeam.id === team.id
            );
            const played = teamMatches.filter(isFinished);
            const upcoming = teamMatches.filter(isUpcoming);

            return (
              <div key={team.id} className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                  {team.crest && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.crest} alt={team.name} className="h-7 w-7 object-contain" />
                  )}
                  <h2 className="font-display text-xl uppercase text-chalk">{team.name}</h2>
                </div>

                {played.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {played.map((m) => {
                      const isHome = m.homeTeam.id === team.id;
                      const opponent = isHome ? m.awayTeam : m.homeTeam;
                      const myScore = isHome ? m.score.fullTime.home : m.score.fullTime.away;
                      const oppScore = isHome ? m.score.fullTime.away : m.score.fullTime.home;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg border border-chalk/10 bg-pitch-dark/30 px-3 py-2 text-sm"
                        >
                          <span className="text-chalk/70">vs {teamDisplayName(opponent)}</span>
                          <span className="font-score font-bold text-chalk">
                            {myScore}–{oppScore}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {upcoming.length > 0 && (
                  <div className="space-y-1.5">
                    {upcoming.map((m) => {
                      const isHome = m.homeTeam.id === team.id;
                      const opponent = isHome ? m.awayTeam : m.homeTeam;
                      const { date, time } = formatKickoff(m.utcDate);
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg border border-chalk/10 bg-pitch-dark/20 px-3 py-2 text-sm"
                        >
                          <span className="text-chalk/60">vs {teamDisplayName(opponent)}</span>
                          <span className="text-[11px] text-chalk/40">
                            {date} {time}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {played.length === 0 && upcoming.length === 0 && (
                  <p className="text-xs text-chalk/30">No fixtures found yet.</p>
                )}
              </div>
            );
          })}

        {!editing && favoriteTeams.length === 0 && loaded && (
          <p className="py-8 text-center text-sm text-chalk/50">
            Tap &quot;Edit favorites&quot; to choose your top teams.
          </p>
        )}
      </div>

      <Footer />
    </main>
  );
}
