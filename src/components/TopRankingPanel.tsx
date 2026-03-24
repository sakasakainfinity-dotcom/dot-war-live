import type { RankingEntry } from '@/lib/mockData';

interface TopRankingPanelProps {
  ranking: RankingEntry[];
}

export function TopRankingPanel({ ranking }: TopRankingPanelProps) {
  return (
    <section className="rounded-lg border border-slate-600/80 bg-slate-950/80 p-3 text-xs text-slate-100 shadow-[0_0_18px_rgba(15,23,42,0.7)] md:text-sm">
      <p className="mb-2 text-center text-[10px] font-black tracking-[0.2em] text-slate-300">TOP SUPPORTERS</p>
      <ul className="space-y-1.5">
        {ranking.map((entry) => (
          <li key={entry.rank} className="flex items-center justify-between gap-4">
            <span className="font-bold text-amber-300">#{entry.rank}</span>
            <span className="flex-1 truncate">{entry.name}</span>
            <span className="tabular-nums text-slate-200">{entry.amount}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
