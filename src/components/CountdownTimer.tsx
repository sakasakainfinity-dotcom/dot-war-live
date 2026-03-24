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

  const isAlert = remainingSeconds <= 30;

  return (
    <div className="relative mx-auto mt-3 w-fit rounded-lg border border-slate-700 bg-slate-950/90 px-6 py-2 text-center">
      <p className="text-[10px] font-bold tracking-[0.24em] text-slate-400">NEXT UPDATE</p>
      <p
        className={`text-4xl font-black tabular-nums md:text-5xl ${
          isAlert
            ? 'animate-pulse text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.8)]'
            : 'text-white'
        }`}
      >
        {mmss}
      </p>

      {isUpdating && (
        <div className="absolute inset-0 grid place-items-center rounded-lg bg-slate-950/95 text-lg font-black text-cyan-300">
          UPDATE / 反映中
        </div>
      )}
    </div>
  );
}
