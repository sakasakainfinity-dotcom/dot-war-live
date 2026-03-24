'use client';

import { useEffect, useMemo, useState } from 'react';

interface CountdownTimerProps {
  initialSeconds: number;
  intervalSeconds?: number;
  onUpdateTick?: () => void;
}

export function CountdownTimer({
  initialSeconds,
  intervalSeconds = 300,
  onUpdateTick,
}: CountdownTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsUpdating(true);
          setTimeout(() => setIsUpdating(false), 1200);
          onUpdateTick?.();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalSeconds, onUpdateTick]);

  const mmss = useMemo(() => {
    const min = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const sec = String(remainingSeconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }, [remainingSeconds]);

  const alertLevel = remainingSeconds <= 30;

  return (
    <section className="relative w-fit min-w-[190px]">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-amber-300/20 to-red-500/20 blur-lg" />
      <div
        className={`relative overflow-hidden rounded-2xl border bg-slate-950/85 px-5 py-3 text-center transition-all ${
          alertLevel
            ? 'border-amber-300/80 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
            : 'border-slate-500/70 shadow-[0_0_22px_rgba(15,23,42,0.6)]'
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400/60 via-amber-300/80 to-red-400/60" />
        <p className="text-[10px] font-black tracking-[0.28em] text-slate-300">NEXT UPDATE</p>
        <p
          className={`mt-0.5 text-4xl font-black leading-none tabular-nums md:text-5xl ${
            alertLevel
              ? 'animate-pulse text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]'
              : 'text-slate-50 drop-shadow-[0_0_10px_rgba(125,211,252,0.35)]'
          }`}
        >
          {mmss}
        </p>
      </div>

      {isUpdating && (
        <div className="absolute inset-0 grid place-items-center rounded-2xl border border-cyan-300/80 bg-slate-950/95 text-sm font-black tracking-[0.2em] text-cyan-200">
          UPDATE / 反映中
        </div>
      )}
    </section>
  );
}
