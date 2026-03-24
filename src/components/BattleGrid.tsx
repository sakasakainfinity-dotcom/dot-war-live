import type { Team } from '../lib/mockData';

interface BattleGridProps {
  grid: Team[][];
}

export function BattleGrid({ grid }: BattleGridProps) {
  const cols = grid[0]?.length ?? 0;

  return (
    <section className="relative flex-1 rounded-xl border border-slate-700 bg-slate-900/70 p-3 shadow-[0_0_30px_rgba(15,23,42,0.8)]">
      <div
        className="grid h-full w-full gap-[2px] rounded-md bg-slate-950/70 p-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {grid.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`aspect-square rounded-[2px] ${
                cell === 'blue'
                  ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                  : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
              }`}
            />
          )),
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] bg-white/20" />
    </section>
  );
}
