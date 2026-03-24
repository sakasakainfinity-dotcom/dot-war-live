import type { Team } from '../lib/mockData';

interface TeamTankProps {
  team: Team;
  value: number;
  ticks?: number;
}

export function TeamTank({ team, value, ticks = 8 }: TeamTankProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  const isBlue = team === 'blue';
  const teamLabel = isBlue ? 'BLUE' : 'RED';
  const borderColor = isBlue ? 'border-cyan-300/75' : 'border-orange-300/75';
  const sideGlow = isBlue
    ? 'shadow-[0_0_32px_rgba(56,189,248,0.3)]'
    : 'shadow-[0_0_32px_rgba(248,113,113,0.3)]';
  const fillColor = isBlue
    ? 'from-cyan-300 via-sky-500 to-blue-700'
    : 'from-orange-300 via-red-500 to-rose-700';
  const valueColor = isBlue ? 'text-cyan-100' : 'text-orange-100';

  return (
    <aside className="flex w-[105px] shrink-0 flex-col items-center gap-2 md:w-[125px]">
      <p className={`rounded-md border px-2 py-1 text-xs font-black tracking-[0.3em] ${borderColor} ${valueColor}`}>
        {teamLabel}
      </p>

      <div className={`relative h-[56vh] min-h-[280px] w-full overflow-hidden rounded-[28px] border-2 ${borderColor} bg-slate-950/85 p-2 ${sideGlow}`}>
        <div className="relative h-full overflow-hidden rounded-[22px] border border-white/25 bg-[linear-gradient(180deg,rgba(15,23,42,0.9)_0%,rgba(8,16,32,0.98)_100%)]">
          {Array.from({ length: ticks + 1 }).map((_, i) => (
            <div
              key={i}
              className="pointer-events-none absolute left-0 right-0 border-t border-white/18"
              style={{ top: `${(i / ticks) * 100}%` }}
            />
          ))}

          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${fillColor} transition-all duration-700 ease-out`}
            style={{ height: `${safeValue}%` }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.45)_0%,transparent_55%)] opacity-80" />
            <div className="absolute inset-x-0 top-0 h-2 bg-white/35 blur-[1px]" />
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.15),rgba(255,255,255,0.15)_3px,transparent_3px,transparent_9px)]" />
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-2 w-[2px] bg-white/20" />
          <div className="pointer-events-none absolute inset-y-0 right-2 w-[2px] bg-white/20" />
        </div>
      </div>

      <p className={`text-2xl font-black tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.22)] ${valueColor}`}>
        {safeValue}%
      </p>
    </aside>
  );
}
