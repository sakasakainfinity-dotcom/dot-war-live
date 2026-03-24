import type { MatchTitleData } from '@/lib/mockData';

interface MatchTitleProps {
  title: MatchTitleData;
}

export function MatchTitle({ title }: MatchTitleProps) {
  return (
    <header className="mx-auto w-full max-w-4xl rounded-xl border border-cyan-400/50 bg-slate-950/80 px-4 py-3 text-center shadow-[0_0_25px_rgba(34,211,238,0.25)]">
      <p className="text-2xl font-black tracking-[0.2em] text-white md:text-4xl">{title.titleJa}</p>
      <p className="mt-1 text-xs font-semibold tracking-[0.42em] text-cyan-300 md:text-sm">{title.titleEn}</p>
    </header>
  );
}
