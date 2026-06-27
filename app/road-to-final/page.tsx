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

// Verified against football-data.org's documented Match.stage values for knockout
// tournaments (ROUND_OF_16, QUARTER_FINALS, SEMI_FINALS, FINAL). The 2026 World Cup's
// expanded 48-team format also has a Round of 32, which may appear as a different
// stage name than guessed initially - the STAGE_ORDER fallback below means any stage
// name we haven't mapped yet still shows up (under its raw name) instead of vanishing
// or crashing.
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

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] || stage.replace(/_/g, ' ');
}

function Crest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team) {
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

export default function RoadToFinalPage() {
  const { data, loading, error } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const matches = data?.matches ?? [];

  // Build the list of stages from STAGE_ORDER first (for correct left-to-right
  // ordering), then append any other stage actually present in the data that we
  // didn't anticipate (e.g. group stage matches are deliberately excluded here -
  // only non-group knockout stages should appear on this bracket page).
  const knownStages = new Set(STAGE_ORDER);
  const presentStages: string[] = Array.from(new Set(matches.map((m) => m.stage)));
  const extraStages = presentStages.filter(
    (s: string) => !knownStages.has(s) && s !== 'GROUP_STAGE'
  );
  const orderedStages = [...STAGE_ORDER, ...extraStages];

  const stages = orderedStages
    .map((stage) => ({
      stage,
      label: stageLabel(stage),
      fixtures: matches.filter((m) => m.stage === stage),
    }))
    .filter((s) => s.fixtures.length > 0);

  return (
    <main>
      <PageHeader title="Road to Final" subtitle="The knockout bracket, updated live" />

      <div className="px-4">
        {loading && !data && <p className="py-8 text-center text-sm text-chalk/50">Loading bracket…</p>}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/50">{error}</p>}
        {!loading && stages.length === 0 && (
          <p className="py-8 text-center text-sm text-chalk/50">
            Knockout stage hasn&apos;t started yet — group stage is still underway. Check Schedule for fixtures.
          </p>
        )}

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
          {stages.map((s) => (
            <div key={s.stage} className="flex min-w-[200px] flex-col gap-3">
              <h3 className="text-center text-[11px] font-bold uppercase tracking-widest text-floodlight">
                {s.label}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {s.fixtures.map((m) => {
                  const finished = m.status === 'FINISHED';
                  const homeWin = finished && (m.score.fullTime.home ?? 0) > (m.score.fullTime.away ?? 0);
                  const awayWin = finished && (m.score.fullTime.away ?? 0) > (m.score.fullTime.home ?? 0);
                  return (
                    <div
                      key={m.id}
                      className="rounded-lg border border-chalk/10 bg-pitch-dark/40 px-3 py-2"
                    >
                      <div
                        className={`mb-1.5 flex items-center justify-between gap-2 ${
                          homeWin ? 'opacity-100' : finished ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <Crest team={m.homeTeam} />
                          <span className="truncate text-xs text-chalk/90">
                            {teamDisplayName(m.homeTeam)}
                          </span>
                        </div>
                        <span className="font-score text-xs font-bold text-chalk">
                          {m.score.fullTime.home ?? '–'}
                        </span>
                      </div>
                      <div
                        className={`flex items-center justify-between gap-2 ${
                          awayWin ? 'opacity-100' : finished ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <Crest team={m.awayTeam} />
                          <span className="truncate text-xs text-chalk/90">
                            {teamDisplayName(m.awayTeam)}
                          </span>
                        </div>
                        <span className="font-score text-xs font-bold text-chalk">
                          {m.score.fullTime.away ?? '–'}
                        </span>
                      </div>
                      {m.venue && (
                        <p className="mt-1.5 truncate text-center text-[9px] text-chalk/30">{m.venue}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
