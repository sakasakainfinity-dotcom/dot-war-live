import type { RankingEntry } from '../lib/mockData';

interface TopRankingPanelProps {
  ranking: RankingEntry[];
}

export function TopRankingPanel({ ranking }: TopRankingPanelProps) {
  return (
    <section className="rounded-xl border border-amber-300/40 bg-slate-950/85 p-3 text-xs text-slate-100 shadow-[0_0_20px_rgba(251,191,36,0.15)] md:text-sm">
      <p className="mb-2 text-center text-[10px] font-black tracking-[0.24em] text-amber-200">TOP SUPPORTERS</p>
      <ul className="space-y-2">
        {ranking.map((entry) => (
          <li
            key={entry.rank}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-white/10 bg-slate-900/70 px-2 py-1.5"
          >
            <span className="font-black text-amber-300">#{entry.rank}</span>
            <span className="truncate font-semibold text-slate-100">{entry.name}</span>
            <span className="tabular-nums font-bold text-amber-100">{entry.amount}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
