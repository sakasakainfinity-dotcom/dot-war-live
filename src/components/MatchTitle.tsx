import type { MatchTitleData } from '../lib/mockData';

interface MatchTitleProps {
  title: MatchTitleData;
}

export function MatchTitle({ title }: MatchTitleProps) {
  return (
    <header className="relative mx-auto w-full max-w-3xl">
      <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-cyan-500/25 via-slate-900/10 to-red-500/25 blur-xl" />
      <div className="relative overflow-hidden rounded-2xl border border-cyan-300/50 bg-slate-950/80 px-6 py-4 text-center shadow-[0_0_30px_rgba(34,211,238,0.25)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(56,189,248,0.18)_0%,rgba(15,23,42,0.06)_45%,rgba(248,113,113,0.14)_100%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-8 w-px bg-cyan-300/35" />
        <div className="pointer-events-none absolute inset-y-0 right-8 w-px bg-red-300/35" />

        <p className="relative text-[clamp(1.2rem,2.4vw,2.1rem)] font-black tracking-[0.18em] text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.25)]">
          {title.titleJa}
        </p>
        <p className="relative mt-1 text-[11px] font-bold tracking-[0.4em] text-cyan-200/90 md:text-xs">{title.titleEn}</p>
      </div>
    </header>
  );
}
