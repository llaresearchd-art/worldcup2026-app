'use client';
import { usePolling } from '@/lib/use-polling';
import { Match } from '@/lib/football-api';
import { teamDisplayName, formatKickoff } from '@/lib/match-utils';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

interface MatchesResponse { matches: Match[]; }

const STAGE_LABELS: Record<string, string> = {
  ROUND_OF_32:'Round of 32', LAST_32:'Round of 32',
  ROUND_OF_16:'Round of 16', LAST_16:'Round of 16',
  QUARTER_FINALS:'Quarter-finals', SEMI_FINALS:'Semi-finals',
  THIRD_PLACE:'Third Place', FINAL:'Final',
};
const STAGE_ORDER = ['ROUND_OF_32','LAST_32','ROUND_OF_16','LAST_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];
const GROUP_STAGES = new Set(['GROUP_STAGE','GROUP']);

function stageLabel(s: unknown): string {
  if (typeof s !== 'string' || !s) return 'Knockout';
  return STAGE_LABELS[s] || s.replace(/_/g,' ');
}
function safeScore(m: Match, side: 'home'|'away'): number|string {
  try { const v = m.score?.fullTime?.[side]; return typeof v === 'number' ? v : '–'; } catch { return '–'; }
}

function Crest({ team }: { team: { crest: string | null; name: string } | null | undefined }) {
  if (!team) return <div className="h-6 w-6 rounded-full border border-dashed border-chalk/20" />;
  if (team.crest) return <img src={team.crest} alt={team.name} className="h-6 w-6 object-contain" />;
  return <div className="flex h-6 w-6 items-center justify-center rounded-full bg-pitch-mid/60 text-[9px] font-bold text-chalk/50">{team.name.slice(0,2).toUpperCase()}</div>;
}

function FixtureCard({ m }: { m: Match }) {
  const finished = m.status === 'FINISHED';
  const homeScore = safeScore(m,'home'), awayScore = safeScore(m,'away');
  const homeWin = finished && typeof homeScore==='number' && typeof awayScore==='number' && homeScore>awayScore;
  const awayWin = finished && typeof homeScore==='number' && typeof awayScore==='number' && awayScore>homeScore;
  let dateLabel = '', timeLabel = '';
  try { if (m.utcDate) { const f = formatKickoff(m.utcDate); dateLabel=f.date; timeLabel=f.time; } } catch {}

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${finished ? 'border-chalk/12 bg-pitch-mid/15' : 'border-chalk/8 bg-pitch-mid/10'}`}>
      {dateLabel && <p className="mb-1.5 text-center text-[9px] uppercase tracking-wide text-chalk/25">{dateLabel}{timeLabel && ` · ${timeLabel}`}</p>}
      <div className={`mb-1.5 flex items-center justify-between gap-2 ${homeWin ? '' : finished ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Crest team={m.homeTeam} />
          <span className="truncate text-xs font-medium text-chalk/90">{teamDisplayName(m.homeTeam)}</span>
        </div>
        <span className="font-score text-xs font-bold text-chalk">{homeScore}</span>
      </div>
      <div className={`flex items-center justify-between gap-2 ${awayWin ? '' : finished ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Crest team={m.awayTeam} />
          <span className="truncate text-xs font-medium text-chalk/90">{teamDisplayName(m.awayTeam)}</span>
        </div>
        <span className="font-score text-xs font-bold text-chalk">{awayScore}</span>
      </div>
      {m.venue && typeof m.venue==='string' && <p className="mt-1.5 truncate text-center text-[9px] text-chalk/20">{m.venue}</p>}
    </div>
  );
}

export default function RoadToFinalPage() {
  const { data, loading, error } = usePolling<MatchesResponse>('/api/matches', 30_000);
  const matches = data?.matches ?? [];
  let stages: { stage: string; label: string; fixtures: Match[] }[] = [];
  let pageError: string|null = null;
  try {
    const nonGroup = matches.filter(m => { const s = typeof m.stage==='string' ? m.stage : ''; return !GROUP_STAGES.has(s); });
    const known = new Set(STAGE_ORDER);
    const present = Array.from(new Set<string>(nonGroup.map(m => typeof m.stage==='string' ? m.stage : '__UNKNOWN__')));
    const extra = present.filter(s => !known.has(s));
    stages = [...STAGE_ORDER, ...extra].map(stage => ({
      stage, label: stageLabel(stage),
      fixtures: nonGroup.filter(m => (typeof m.stage==='string' ? m.stage : '__UNKNOWN__') === stage),
    })).filter(s => s.fixtures.length > 0);
  } catch { pageError = 'Could not load bracket data.'; }

  return (
    <main className="page-enter">
      <PageHeader title="Road to Final" subtitle="Knockout bracket · updated live" />
      <div className="px-4">
        {loading && !data && <p className="py-8 text-center text-sm text-chalk/40">Loading bracket…</p>}
        {error && !data && <p className="py-8 text-center text-sm text-chalk/40">{error}</p>}
        {pageError && <p className="py-8 text-center text-sm text-chalk/40">{pageError}</p>}
        {!loading && !pageError && stages.length === 0 && (
          <div className="rounded-2xl border border-chalk/8 bg-pitch-mid/10 p-8 text-center">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm font-medium text-chalk/60">Knockout stage hasn't started yet</p>
            <p className="text-xs text-chalk/30 mt-1">Group stage is still underway</p>
          </div>
        )}
        {!pageError && (
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
            {stages.map(s => (
              <div key={s.stage} className="flex min-w-[190px] flex-col gap-3">
                <h3 className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-floodlight">{s.label}</h3>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {s.fixtures.filter(m => m && m.id != null).map(m => (
                    <div key={m.id}>
                      {(() => { try { return <FixtureCard m={m} />; } catch { return <div className="rounded-xl border border-chalk/8 p-2 text-center text-[10px] text-chalk/20">–</div>; } })()}
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
