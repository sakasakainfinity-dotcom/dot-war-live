import type { Team } from '@/lib/mockData';

interface TeamTankProps {
  team: Team;
  value: number;
  ticks?: number;
}

export function TeamTank({ team, value, ticks = 6 }: TeamTankProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  const teamLabel = team === 'blue' ? 'BLUE' : 'RED';
  const gradient = team === 'blue' ? 'from-sky-300 via-blue-500 to-blue-700' : 'from-rose-300 via-red-500 to-red-700';
  const borderColor = team === 'blue' ? 'border-blue-400/70' : 'border-red-400/70';
  const glow = team === 'blue' ? 'shadow-[0_0_25px_rgba(59,130,246,0.45)]' : 'shadow-[0_0_25px_rgba(248,113,113,0.45)]';

  return (
    <aside className="w-14 text-center md:w-16">
      <p className="mb-2 text-xs font-black tracking-[0.2em] text-white">{teamLabel}</p>
      <div className={`relative h-[60vh] min-h-[320px] overflow-hidden rounded-full border-2 ${borderColor} bg-slate-950 ${glow}`}>
        {Array.from({ length: ticks }).map((_, i) => (
          <div
            key={i}
            className="pointer-events-none absolute left-0 right-0 border-t border-white/35"
            style={{ top: `${(i / ticks) * 100}%` }}
          />
        ))}

        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${gradient} transition-all duration-500`}
          style={{ height: `${safeValue}%` }}
        >
          <div className="absolute inset-0 animate-pulse bg-white/10" />
          <div className="absolute left-1/2 top-3 h-2 w-2 -translate-x-1/2 rounded-full bg-white/80" />
          <div className="absolute left-1/3 top-8 h-1.5 w-1.5 rounded-full bg-white/70" />
          <div className="absolute right-1/3 top-12 h-1 w-1 rounded-full bg-white/70" />
        </div>
      </div>
      <p className="mt-2 text-sm font-black text-white">{safeValue}%</p>
    </aside>
  );
}
