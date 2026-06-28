'use client';
// app/road-to-final/page.tsx
import { usePolling } from '@/lib/use-polling';
import { Match } from '@/lib/football-api';
import { teamDisplayName } from '@/lib/match-utils';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface MatchesResponse {
  matches: Match[];
}

const STAGE_LABELS: Record<string, string> = {
  ROUND_OF_32: 'Round of 32',
  LAST_32: 'Round of 32',
  ROUND_OF_16: 'Round of 16',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-finals',
  SEMI_FINALS: 'Semi-finals',
  THIRD_PLACE: 'Third Place',
  FINAL: 'Final',
};

const STAGE_ORDER = [
  'ROUND_OF_32',
  'LAST_32',
  'ROUND_OF_16',
  'LAST_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'THIRD_PLACE',
  'FINAL',
];

const GROUP_STAGE_NAMES = new Set(['GROUP_STAGE', 'GROUP']);

function stageLabel(stage: unknown): string {
  if (typeof stage !== 'string' || !stage) return 'Knockout';
  return STAGE_LABELS[stage] || stage.replace(/_/g, ' ');
}

function safeScore(m: Match, side: 'home' | 'away'): number | string {
  try {
    const v = m.score?.fullTime?.[side];
    return typeof v === 'number' ? v : '–';
  } catch {
    return '–';
  }
}

function Crest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team || typeof team.name !== 'string') {
    return <div className="h-6 w-6 rounded-full border border-dashed border-chalk/20" />;
  }
  if (team.crest) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.crest} alt={team.name} className="h-6 w-6 object-contain" />;
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-chalk/10 text-[9px] font-bold text-chalk/60">
      {team.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function FixtureCard({ m }: { m: Match }) {
  const finished = m.status === 'FINISHED';
  const homeScore = safeScore(m, 'home');
  const awayScore = safeScore(m, 'away');
  const homeWin = finished && typeof homeScore === 'number' && typeof awayScore === 'number' && homeScore > awayScore;
  const awayWin = finished && typeof homeScore === 'number' && typeof awayScore === 'number' && awayScore > homeScore;

  return (
    <div className="rounded-lg border border-chalk/10 bg-pitch-dark/40 px-3 py-2">
      <div
        className={`mb-1.5 flex items-center justify-between gap-2 ${
          homeWin ? 'opacity-100' : finished ? 'opacity-40' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Crest team={m.homeTeam} />
          <span className="truncate text-xs text-chalk/90">{teamDisplayName(m.homeTeam)}</span>
        </div>
        <span className="font-score text-xs font-bold text-chalk">{homeScore}</span>
      </div>
      <div
        className={`flex items-center justify-between gap-2 ${
          awayWin ? 'opacity-100' : finished ? 'opacity-40' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Crest team={m.awayTeam} />
          <span className="truncate text-xs text-chalk/90">{teamDisplayName(m.awayTeam)}</span>
        </div>
        <span className="font-score text-xs font-bold text-chalk">{awayScore}</span>
      </div>
      {m.venue && typeof m.venue === 'string' && (
        <p className="mt-1.5 truncate text-center text-[9px] text-chalk/30">{m.venue}</p>
      )}
    </div>
  );
}

export default function RoadToFinalPage() {
  const { data, loading, error } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const matches = data?.matches ?? [];

  let stages: { stage: string; label: string; fixtures: Match[] }[] = [];
  let pageError: string | null = null;

  try {
    const nonGroupMatches = matches.filter((m) => {
      const stage = typeof m.stage === 'string' ? m.stage : '';
      return !GROUP_STAGE_NAMES.has(stage);
    });

    const knownStages = new Set(STAGE_ORDER);
    const presentStages = Array.from(
      new Set<string>(nonGroupMatches.map((m) => (typeof m.stage === 'string' ? m.stage : '__UNKNOWN__')))
    );
    const extraStages = presentStages.filter((s) => !knownStages.has(s));
    const orderedStages = [...STAGE_ORDER, ...extraStages];

    stages = orderedStages
      .map((stage) => ({
        stage,
        label: stageLabel(stage),
        fixtures: nonGroupMatches.filter((m) => (typeof m.stage === 'string' ? m.stage : '__UNKNOWN__') === stage),
      }))
      .filter((s) => s.fixtures.length > 0);
  } catch {
    pageError = 'There was a problem reading the bracket data. Pull to refresh, or check back shortly.';
  }

  return (
    <main>
      <PageHeader title="Road to Final" subtitle="The knockout bracket, updated live" />

      <div className="px-4">
        {loading && !data && <p className="py-8 text-center text-sm text-chalk/50">Loading bracket…</p>}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/50">{error}</p>}
        {pageError && <p className="py-8 text-center text-sm text-chalk/50">{pageError}</p>}
        {!loading && !pageError && stages.length === 0 && (
          <p className="py-8 text-center text-sm text-chalk/50">
            Knockout stage hasn&apos;t started yet — group stage is still underway. Check Schedule for fixtures.
          </p>
        )}

        {!pageError && (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
            {stages.map((s) => (
              <div key={s.stage} className="flex min-w-[200px] flex-col gap-3">
                <h3 className="text-center text-[11px] font-bold uppercase tracking-widest text-floodlight">
                  {s.label}
                </h3>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {s.fixtures
                    .filter((m) => m && m.id != null)
                    .map((m) => (
                      <div key={m.id}>
                        {(() => {
                          try {
                            return <FixtureCard m={m} />;
                          } catch {
                            return (
                              <div className="rounded-lg border border-chalk/10 bg-pitch-dark/20 px-3 py-2 text-center text-[10px] text-chalk/30">
                                Fixture unavailable
                              </div>
                            );
                          }
                        })()}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
