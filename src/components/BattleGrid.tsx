import type { Team } from '../lib/mockData';

interface BattleGridProps {
  grid: Team[][];
}

export function BattleGrid({ grid }: BattleGridProps) {
  const cols = grid[0]?.length ?? 0;

  return (
    <section className="relative flex-1 rounded-2xl border border-slate-500/70 bg-slate-950/75 p-3 shadow-[0_0_45px_rgba(15,23,42,0.8)]">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(90deg,rgba(14,116,144,0.2)_0%,transparent_38%,transparent_62%,rgba(153,27,27,0.2)_100%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-cyan-300/70 via-white/20 to-red-300/70" />
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-cyan-300/50 via-white/10 to-red-300/50" />

      <div
        className="relative grid aspect-[16/9] w-full gap-[2px] rounded-xl border border-white/10 bg-slate-950/80 p-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {grid.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`aspect-square rounded-[3px] transition-colors duration-300 ${
                cell === 'blue'
                  ? 'bg-gradient-to-br from-cyan-300 to-blue-600 shadow-[inset_0_0_6px_rgba(255,255,255,0.2),0_0_7px_rgba(56,189,248,0.55)]'
                  : 'bg-gradient-to-br from-orange-300 to-red-600 shadow-[inset_0_0_6px_rgba(255,255,255,0.16),0_0_7px_rgba(248,113,113,0.5)]'
              }`}
            />
          )),
        )}

        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/15" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/12" />
      </div>
    </section>
  );
}
