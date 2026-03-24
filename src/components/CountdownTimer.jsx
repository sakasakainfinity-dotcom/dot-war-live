'use client';

import { useEffect, useMemo, useState } from 'react';

export function CountdownTimer({ initialSeconds, intervalSeconds = 300, onUpdateTick }) {
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

  return (
    <section className={`panel timer-panel ${remainingSeconds <= 30 ? 'timer-alert' : ''}`}>
      <p className="timer-label">NEXT UPDATE</p>
      <p className="timer-value">{mmss}</p>
      {isUpdating && <p className="timer-updating">UPDATE / 反映中</p>}
    </section>
  );
}
